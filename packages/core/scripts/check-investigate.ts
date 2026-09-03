import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { recoveryCases } from "../src/db/schema.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { GroqClient } from "../src/agent/groqClient.js";
import { GeminiClient } from "../src/agent/geminiClient.js";
import { FallbackLlmClient } from "../src/agent/fallbackClient.js";
import type { LlmClient } from "../src/agent/llmClient.js";
import { investigateCase } from "../src/agent/investigate.js";

// Stage 6/7: the real end-to-end run of the agent loop — an LlmClient
// adapter + the three read tools, driven by investigateCase, against one
// real DETECTED case. The loop terminates by calling submitDiagnosis,
// returning a structured Diagnosis rather than free text. No action tools
// yet — that's Stage 8. Pass "gemini" or "fallback" as an argv to exercise
// the other adapters behind the same LlmClient interface; defaults to Groq.

const provider = process.argv[2] ?? "groq";
const llmClient: LlmClient =
  provider === "gemini"
    ? new GeminiClient()
    : provider === "fallback"
      ? new FallbackLlmClient(new GroqClient(), new GeminiClient())
      : new GroqClient();

const [existingCase] = await db
  .select()
  .from(recoveryCases)
  .where(eq(recoveryCases.status, "DETECTED"))
  .limit(1);

if (!existingCase) {
  throw new Error("no DETECTED recovery case in DB — run `npm run check:cases` first");
}

console.log("investigating case:", existingCase.id, "order:", existingCase.orderId, "via", provider);

const dataSource = new JsonPaymentDataSource();

const result = await investigateCase(dataSource, llmClient, existingCase.id);

console.log("\nfinal investigation summary:\n", result);

process.exit(0);
