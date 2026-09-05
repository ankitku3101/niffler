import { RateLimitError } from "groq-sdk";
import { ApiError } from "@google/genai";
import { AllProvidersExhaustedError } from "./llmClient.js";
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

            try {
                return await this.secondary.converse(messages, tools);
            } catch (secondaryErr) {
                // Only when the backup is rate-limited too. Any other failure is the
                // secondary's own problem and should surface as itself, same reasoning as
                // the primary check above.
                if (isRateLimitError(secondaryErr)) throw new AllProvidersExhaustedError();
                throw secondaryErr;
            }
        }
    }
}
