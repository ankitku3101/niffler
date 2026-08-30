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