import { getOrder } from "../tools/getOrder.js";
import { getCustomerHistory } from "../tools/getCustomerHistory.js";
import { listPreviousAttempts } from "../tools/listPreviousAttempts.js";
import type { AgentMessage, LlmClient, ToolDefinition } from "./llmClient.js";
import type { PaymentDataSource } from "../data/source.js";
import { checkIterationLimit } from "../domain/policy.js";

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
    }
]

export async function investigateCase(dataSource: PaymentDataSource, llmClient: LlmClient, caseId: number) : Promise<string> {
    const messages: AgentMessage[] = [
        { kind: "system", text: "You are investigating a failed payment recovery case. Use the provided tools to look up order and payment details before responding." },
        { kind: "user", text: `Investigate recovery case ${caseId}.` }
    ];

    let iteration = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (true) {
        iteration++;

        const { decision, reason } = checkIterationLimit(iteration, maxIterations);
        if (decision === "REQUIRES_HUMAN_APPROVAL") {
            return `ESCALATE: ${reason}`;
        }

        const turn = await llmClient.converse(messages, TOOL_DEFS);

        if (turn.type === "final") {
            return turn.text;
        }

        messages.push({ kind: "tool_call", id: turn.id, name: turn.name, input: turn.input });

        const tool = TOOLS[turn.name as keyof typeof TOOLS];
        try {
            const output = await tool(dataSource, turn.input);
            messages.push({ kind: "tool_result", id: turn.id, name: turn.name, output });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            messages.push({ kind: "tool_result", id: turn.id, name: turn.name, output: { error: message } });
        }
    }
}