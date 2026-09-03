import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { GroqClient } from "../src/agent/groqClient.js";
import { GeminiClient } from "../src/agent/geminiClient.js";
import { FallbackLlmClient } from "../src/agent/fallbackClient.js";
import type { LlmClient } from "../src/agent/llmClient.js";
import { runBatch } from "../src/evaluation/runBatch.js";

// Task 9.3: runs the closed loop over every treatment-group DETECTED case.
// Usage: npm run batch -- [provider] [limit] [maxAttempts]
//   provider    "groq" (default) | "gemini" | "fallback"
//   limit       cases to process, e.g. 5 for a quick test run (default: all)
//   maxAttempts passed straight through to recoverCase (default: 3)
//
// Run with a small limit first — this hits a real LLM once per case, and a
// full run is slow and burns real quota. Re-runnable safely: only DETECTED
// cases are picked up, so anything already processed is skipped.

const provider = process.argv[2] ?? "groq";
const limitArg = process.argv[3];
const maxAttemptsArg = process.argv[4];

const limit = limitArg ? Number(limitArg) : undefined;
const maxAttempts = maxAttemptsArg ? Number(maxAttemptsArg) : 3;

const llmClient: LlmClient =
  provider === "gemini"
    ? new GeminiClient()
    : provider === "fallback"
      ? new FallbackLlmClient(new GroqClient(), new GeminiClient())
      : new GroqClient();

const dataSource = new JsonPaymentDataSource();

console.log(`running batch via ${provider}, maxAttempts=${maxAttempts}, limit=${limit ?? "none"}`);

const summary = await runBatch(dataSource, llmClient, maxAttempts, limit);

console.log("\nbatch complete:", summary);

process.exit(0);
