import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import type { Content } from "@google/genai";
import type { AgentMessage, AgentTurn, LlmClient, ToolDefinition } from "./llmClient.js";

const MODEL = "gemini-3.5-flash";

function isNotSystem(message: AgentMessage): message is Exclude<AgentMessage, { kind: "system" }> {
    return message.kind !== "system";
}

// Converts a ToolDefinition to Gemini's function declaration format
function toGeminiFunctionDeclaration(tool: ToolDefinition) {
    return {
        name: tool.name,
        description: tool.description,
        parametersJsonSchema: tool.parameters // raw JSON Schema, accepted directly
    }
}

// Converts an AgentMessage to Gemini's Content format
function toGeminiContent(
    message: Exclude<AgentMessage, { kind: "system" }>,
    thoughtSignatures: Map<string, string>
): Content {
    switch (message.kind) {
        case "user":
            return { role: "user", parts: [{ text: message.text }] };
        case "tool_call": {
            const signature = thoughtSignatures.get(message.id);
            return {
                role: "model",
                parts: [
                    {
                        functionCall: {
                            id: message.id,
                            name: message.name,
                            args: message.input as Record<string, unknown>
                        },
                        ...(signature ? { thoughtSignature: signature } : {})
                    }
                ]
            };
        }
        case "tool_result":
            return {
                role: "user",
                parts: [
                    {
                        functionResponse: {
                            id: message.id,
                            name: message.name,
                            response: { output: message.output }
                        }
                    }
                ]
            };
    }
}

export class GeminiClient implements LlmClient {
    // Gemini requires a tool call's thoughtSignature to be echoed back
    // verbatim on the next request; tracked here by call id since AgentTurn
    // has no field for it (it's a pure Gemini quirk, not shared with Groq)
    private readonly thoughtSignatures = new Map<string, string>();

    async converse(messages: AgentMessage[], tools: ToolDefinition[]): Promise<AgentTurn> {
        const ai = new GoogleGenAI();

        // Gemini has no "system" role inside contents — pulled out separately
        const systemText = messages
            .filter((m) => m.kind === "system")
            .map((m) => m.text)
            .join("\n");

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: messages.filter(isNotSystem).map((m) => toGeminiContent(m, this.thoughtSignatures)),
            config: {
                ...(systemText ? { systemInstruction: systemText } : {}),
                tools: [{ functionDeclarations: tools.map(toGeminiFunctionDeclaration) }]
            }
        });

        // Reading the raw part, not the functionCalls getter, since
        // thoughtSignature lives on the part, not on the function call itself
        const part = response.candidates?.[0]?.content?.parts?.find((p) => p.functionCall);
        const call = part?.functionCall;

        if (call) {
            if (!call.name) {
                throw new Error("Gemini returned a function call with no name");
            }
            const id = call.id ?? randomUUID(); // Gemini doesn't always assign one
            if (part.thoughtSignature) {
                this.thoughtSignatures.set(id, part.thoughtSignature);
            }
            return {
                type: "tool_call",
                id,
                name: call.name,
                input: call.args ?? {} // already parsed, unlike Groq's JSON string
            };
        }

        return {
            type: "final",
            text: response.text ?? ""
        };
    }
}
