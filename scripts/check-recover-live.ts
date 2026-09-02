import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { recoveryCases } from "../src/db/schema.js";
import { RazorpayDataSource } from "../src/data/razorpayDataSource.js";
import { GroqClient } from "../src/agent/groqClient.js";
import { GeminiClient } from "../src/agent/geminiClient.js";
import { FallbackLlmClient } from "../src/agent/fallbackClient.js";
import type { LlmClient } from "../src/agent/llmClient.js";
import { recoverCase } from "../src/agent/recoverCase.js";

process.loadEnvFile();

// Stage 10, Task 10.5: the real closed loop, against a real Razorpay order.
// This is the exact same recoverCase() Stage 8 built and Stage 9 ran 166
// times over synthetic data — the only thing different is the dataSource.
// Pass "gemini" or "fallback" as an argv to exercise the other adapters;
// defaults to Groq.

const provider = process.argv[2] ?? "groq";
const llmClient: LlmClient =
  provider === "gemini"
    ? new GeminiClient()
    : provider === "fallback"
      ? new FallbackLlmClient(new GroqClient(), new GeminiClient())
      : new GroqClient();

const dataSource = new RazorpayDataSource();

const ORDER_ID = "order_TXHdgsGhT8mG05";

const [liveCase] = await db
  .select()
  .from(recoveryCases)
  .where(eq(recoveryCases.orderId, ORDER_ID))
  .limit(1);

if (!liveCase) {
  throw new Error(`no recovery case for ${ORDER_ID} — run \`npm run seed-live-case\` first`);
}

console.log(`\n=== live run: case ${liveCase.id} (order ${liveCase.orderId}), via ${provider} ===`);
const result = await recoverCase(dataSource, liveCase.id, llmClient, 5);
console.log("diagnosis:", result.diagnosis);
console.log("policy decision:", result.policyDecision);
console.log("outcome:", result.outcome);

process.exit(0);
