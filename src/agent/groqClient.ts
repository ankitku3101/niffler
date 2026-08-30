import Groq from "groq-sdk";
import type { AgentMessage, AgentTurn, LlmClient, ToolDefinition } from "./llmClient.js";

const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

// Converts a ToolDefinition to the format expected by the Groq API
function toGroqTool(tool: ToolDefinition) {
    return {
        type : "function" as const,
        function : {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }
    }
}

// Converts an AgentMessage to the format expected by the Groq API
function toGroqMessage(message: AgentMessage) {
    switch(message.kind) {
        case "system":
            return { role: "system" as const, content: message.text };
        case "user":
            return { role: "user" as const, content: message.text };
        case "tool_call":
            return {
                role: "assistant" as const,
                tool_calls: [
                    {
                        id: message.id,
                        type: "function" as const,
                        function: {
                            name: message.name,
                            arguments: JSON.stringify(message.input)
                        }
                    }
                ]
            };
        case "tool_result":
            return {
                role: "tool" as const,
                tool_call_id: message.id,
                content: JSON.stringify(message.output)
            };
    }
}

// Implements the LlmClient interface using the Groq API
export class GroqClient implements LlmClient {
    async converse(messages: AgentMessage[], tools: ToolDefinition[]): Promise<AgentTurn> {
        const groq = new Groq();

        // Call the Groq API to get a response based on the provided messages and tools
        const response = await groq.chat.completions.create({
            model: MODEL,
            messages: messages.map(toGroqMessage),
            tools: tools.map(toGroqTool)
        });

        // Extract the first choice from the response
        const choice = response.choices[0];
        if (!choice) {
            throw new Error("Groq returned no choices");
        }

        // Check if the choice includes any tool calls
        const call = choice.message.tool_calls?.[0];
        
        // If a tool call is present, return it as a tool_call AgentTurn
        if(call) {
            return {
                type: "tool_call",
                id: call.id,
                name: call.function.name,
                input: JSON.parse(call.function.arguments)
            };
        }

        // If no tool call is present, return the final message content as a final AgentTurn
        return {
            type: "final",
            text: choice.message.content ?? ""
        };
    }
}