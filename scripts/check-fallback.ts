import { RateLimitError } from "groq-sdk";
import type { AgentMessage, AgentTurn, LlmClient, ToolDefinition } from "../src/agent/llmClient.js";
import { FallbackLlmClient } from "../src/agent/fallbackClient.js";

// Fake clients let us test the fallback LOGIC deterministically, without
// depending on actually exhausting a real provider's rate limit on demand.

class AlwaysRateLimited implements LlmClient {
    async converse(_messages: AgentMessage[], _tools: ToolDefinition[]): Promise<AgentTurn> {
        throw new RateLimitError(429, undefined, "rate limited", new Headers());
    }
}

class AlwaysFails implements LlmClient {
    async converse(_messages: AgentMessage[], _tools: ToolDefinition[]): Promise<AgentTurn> {
        throw new Error("something unrelated to rate limits broke");
    }
}

class AlwaysFinal implements LlmClient {
    async converse(_messages: AgentMessage[], _tools: ToolDefinition[]): Promise<AgentTurn> {
        return { type: "final", text: "secondary answered" };
    }
}

// A rate-limited primary should fall back to the secondary.
const fallback = new FallbackLlmClient(new AlwaysRateLimited(), new AlwaysFinal());
const turn = await fallback.converse([], []);
if (turn.type !== "final" || turn.text !== "secondary answered") {
    throw new Error("expected the fallback to reach the secondary client on a rate limit");
}
console.log("rate-limited primary correctly falls back to secondary");

// A non-rate-limit error should propagate, not silently fall back.
const noFallback = new FallbackLlmClient(new AlwaysFails(), new AlwaysFinal());
try {
    await noFallback.converse([], []);
    throw new Error("expected a non-rate-limit error to propagate, not fall back");
} catch (err) {
    if (!(err instanceof Error) || err.message !== "something unrelated to rate limits broke") {
        throw err;
    }
    console.log("non-rate-limit error correctly propagates instead of falling back");
}

process.exit(0);
