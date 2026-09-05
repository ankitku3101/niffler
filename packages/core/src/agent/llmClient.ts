export type AgentMessage = 
    | { kind: "system"; text: string }
    | { kind: "user"; text: string }
    | { kind: "tool_call"; id: string; name: string; input: unknown }
    | { kind: "tool_result"; id: string; name: string; output: unknown };

export type AgentTurn = 
    | { type: "tool_call"; id: string; name: string; input: unknown }
    | { type: "final"; text: string };


export type ToolDefinition = {
    name: string,
    description: string,
    parameters: Record<string, unknown>
}

export interface LlmClient {
    converse(messages: AgentMessage[], tools: ToolDefinition[]): Promise<AgentTurn>;
}

/**
 * Every configured provider is rate-limited or out of quota.
 *
 * Kept distinct from an ordinary provider error because the agent loop retries those as model
 * mistakes; retrying this one only spends the iteration budget and ends in an empty diagnosis.
 */
export class AllProvidersExhaustedError extends Error {
    constructor(message = "Both AI providers are out of quota right now — please try again later.") {
        super(message);
        this.name = "AllProvidersExhaustedError";
    }
}