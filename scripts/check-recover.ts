import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { recoveryCases } from "../src/db/schema.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { GroqClient } from "../src/agent/groqClient.js";
import { GeminiClient } from "../src/agent/geminiClient.js";
import { FallbackLlmClient } from "../src/agent/fallbackClient.js";
import type { LlmClient } from "../src/agent/llmClient.js";
import { recoverCase } from "../src/agent/recoverCase.js";

// Stage 8, Task 8.4: the real end-to-end closed loop, run twice against real
// DETECTED cases. Run 1 is the normal path with a generous attempt limit.
// Run 2 is brief §11's required demonstration — an order that already has
// several failed payments, checked against a tight attempt limit, so the
// policy engine forces REQUIRES_HUMAN_APPROVAL (-> escalateCase) regardless
// of what the LLM itself recommended. Pass "gemini" or "fallback" as an argv
// to exercise the other adapters; defaults to Groq.

const provider = process.argv[2] ?? "groq";
const llmClient: LlmClient =
  provider === "gemini"
    ? new GeminiClient()
    : provider === "fallback"
      ? new FallbackLlmClient(new GroqClient(), new GeminiClient())
      : new GroqClient();

const dataSource = new JsonPaymentDataSource();

// ---------------------------------------------------------------------------
// Run 1: a normal case, generous attempt limit — the happy path
// ---------------------------------------------------------------------------

const [normalCase] = await db
  .select()
  .from(recoveryCases)
  .where(eq(recoveryCases.status, "DETECTED"))
  .limit(1);

if (!normalCase) {
  throw new Error("no DETECTED recovery case in DB — run `npm run check:cases` first");
}

console.log(`\n=== run 1: case ${normalCase.id} (order ${normalCase.orderId}), maxAttempts=5, via ${provider} ===`);
const normalResult = await recoverCase(dataSource, normalCase.id, llmClient, 5);
console.log("diagnosis:", normalResult.diagnosis);
console.log("policy decision:", normalResult.policyDecision);
console.log("outcome:", normalResult.outcome);

// ---------------------------------------------------------------------------
// Run 2: brief §11 — an order with several failed attempts, tight limit.
// Whatever the LLM recommends, the policy layer should force ESCALATE.
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 3;
let blockedCase: typeof recoveryCases.$inferSelect | undefined;

const detectedCases = await db.select().from(recoveryCases).where(eq(recoveryCases.status, "DETECTED"));
for (const candidate of detectedCases) {
  const payments = await dataSource.listPaymentsForOrder(candidate.orderId);
  const failedCount = payments.filter((p) => p.status === "failed").length;
  if (failedCount >= MAX_ATTEMPTS) {
    blockedCase = candidate;
    break;
  }
}

if (!blockedCase) {
  throw new Error(`no DETECTED case found with >= ${MAX_ATTEMPTS} failed payments`);
}

console.log(
  `\n=== run 2: case ${blockedCase.id} (order ${blockedCase.orderId}), maxAttempts=${MAX_ATTEMPTS}, via ${provider} ===`
);
const blockedResult = await recoverCase(dataSource, blockedCase.id, llmClient, MAX_ATTEMPTS);
console.log("diagnosis:", blockedResult.diagnosis);
console.log("policy decision:", blockedResult.policyDecision);
console.log("outcome:", blockedResult.outcome);

if (blockedResult.policyDecision.decision !== "REQUIRES_HUMAN_APPROVAL") {
  throw new Error("expected policy to require human approval for an order at/over the attempt limit");
}
if (blockedResult.outcome.status !== "ESCALATED") {
  throw new Error("expected the blocked case to be escalated, not whatever the LLM recommended");
}

console.log("\npolicy blocked the agent's proposal and forced escalation instead.");

process.exit(0);
