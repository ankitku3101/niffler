import { getOrder } from "../tools/getOrder.js";
import { getCustomerHistory } from "../tools/getCustomerHistory.js";
import { listPreviousAttempts } from "../tools/listPreviousAttempts.js";
import { AllProvidersExhaustedError } from "./llmClient.js";
import type { AgentMessage, LlmClient, ToolDefinition } from "./llmClient.js";
import type { PaymentDataSource } from "../data/source.js";
import { checkIterationLimit } from "../domain/policy.js";
import { DiagnosisSchema, RecommendedActionSchema, type Diagnosis } from "../domain/diagnosis.js";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema.js";
import type { OnStep } from "./recoveryStep.js";

const TOOLS = {
    getOrder: getOrder,
    listPreviousAttempts: listPreviousAttempts,
    getCustomerHistory: getCustomerHistory,
}

const TOOL_DEFS: ToolDefinition[] = [
    {
        name: "getOrder",
        description: "Fetch the order (and its payment status) for a recovery case.",
        parameters: {
            type: "object",
            properties: {
                caseId: { type: "integer", description: "The recovery case id to look up." },
            },
            required: ["caseId"],
        }
    },
    {
        name: "listPreviousAttempts",
        description: "List every payment attempt made against this case's order, oldest first.",
        parameters: {
            type: "object",
            properties: {
                caseId: { type: "integer", description: "The recovery case id to look up." },
            },
            required: ["caseId"],
        }
    },
    {
        name: "getCustomerHistory",
        description: "Fetch the customer's full order and payment history across all their orders.",
        parameters: {
            type: "object",
            properties: {
                caseId: { type: "integer", description: "The recovery case id to look up." },
            },
            required: ["caseId"],
        }
    },
    {
        name: "submitDiagnosis",
        description: "Submit your final diagnosis and recommended action for this recovery case.",
        parameters: {
            type: "object",
            properties: {
                diagnosis: { type: "string", description: "A concise summary of the diagnosis." },
                confidence: { type: "number", description: "A number between 0 and 1 representing your confidence in the diagnosis." },
                evidence: { type: "array", items: { type: "string" }, description: "Supporting evidence for the diagnosis." },
                recommendedAction: {
                    type: "string",
                    enum: RecommendedActionSchema.options,
                    description: "The recommended action to take."
                },
            },
            required: ["diagnosis", "confidence", "evidence", "recommendedAction"],
        }
    }
]

export async function investigateCase(dataSource: PaymentDataSource, llmClient: LlmClient, caseId: number, onStep?: OnStep) : Promise<Diagnosis> {
    onStep?.({ kind: "investigating" });

    const messages: AgentMessage[] = [
        { kind: "system", text: "You are investigating a failed payment recovery case. Use the provided tools to look up order and payment details before responding. You must always end with a diagnosis by calling the submitDiagnosis tool." },
        { kind: "user", text: `Investigate recovery case ${caseId}.` }
    ];

    let iteration = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (true) {
        iteration++;

        const { decision, reason } = checkIterationLimit(iteration, maxIterations);
        if (decision === "REQUIRES_HUMAN_APPROVAL") {
            return {
                diagnosis: "investigation_incomplete",
                confidence: 0,
                evidence: [reason],
                recommendedAction: "ESCALATE"
            }
        }

        let turn;
        try {
            turn = await llmClient.converse(messages, TOOL_DEFS);
        } catch (error) {
            // Not a model mistake and not retryable: pushing a corrective message and going
            // round again only spends the iteration budget and ends in an empty diagnosis,
            // which reads as a broken agent instead of an exhausted quota.
            if (error instanceof AllProvidersExhaustedError) throw error;

            const message = error instanceof Error ? error.message : String(error);
            console.warn(`converse() failed on case ${caseId}, iteration ${iteration}:`, message);
            messages.push({ kind: "user", text: "Your last response could not be processed. Use one of the available tools, and finish by calling submitDiagnosis." });
            continue;
        }


        if (turn.type === "final") {
            messages.push({ kind: "user", text: "You must call submitDiagnosis with your findings before finishing." });
            continue;
        }

        if (turn.type === "tool_call" && turn.name === "submitDiagnosis") {
            // Handle the diagnosis submission
            const result = DiagnosisSchema.safeParse(turn.input); // Validate the input
            if (!result.success) {
                messages.push({ kind: "tool_result", id: turn.id, name: turn.name, output: result.error.message });
                continue;
            } else {
                await db.insert(auditLog).values({
                    caseId: caseId,
                    toolName: "submitDiagnosis",
                    input: result.data,
                    output: result.data,
                });
                onStep?.({ kind: "diagnosis", diagnosis: result.data });
                return result.data;
            }
        }

        messages.push({ kind: "tool_call", id: turn.id, name: turn.name, input: turn.input });
        onStep?.({ kind: "tool_call", name: turn.name, input: turn.input });

        const tool = TOOLS[turn.name as keyof typeof TOOLS];
        try {
            const output = await tool(dataSource, turn.input);
            messages.push({ kind: "tool_result", id: turn.id, name: turn.name, output });
            onStep?.({ kind: "tool_result", name: turn.name, output });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            messages.push({ kind: "tool_result", id: turn.id, name: turn.name, output: { error: message } });
            onStep?.({ kind: "tool_result", name: turn.name, output: { error: message } });
        }
    }
}