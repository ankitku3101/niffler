import { RateLimitError } from "groq-sdk";
import { ApiError } from "@google/genai";
import type { AgentMessage, AgentTurn, LlmClient, ToolDefinition } from "./llmClient.js";

// Helper function to determine if an error is a rate limit error
function isRateLimitError(err: unknown): boolean {
    if (err instanceof RateLimitError) return true;
    if (err instanceof ApiError && err.status === 429) return true;
    return false;
}

export class FallbackLlmClient implements LlmClient {
    constructor(
        private readonly primary: LlmClient,
        private readonly secondary: LlmClient
    ) {}

    async converse(messages: AgentMessage[], tools: ToolDefinition[]): Promise<AgentTurn> {
        try {
            return await this.primary.converse(messages, tools);
        } catch (err) {
            if (!isRateLimitError(err)) throw err;
            return await this.secondary.converse(messages, tools);
        }
    }
}
