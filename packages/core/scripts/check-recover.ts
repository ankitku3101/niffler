import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { auditLog, recoveryCases } from "../src/db/schema.js";
import { isControlGroup } from "../src/evaluation/holdout.js";
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

const NORMAL_MAX_ATTEMPTS = 5;

// Cases NIFFLER has already sent a recovery link for. Both runs avoid these:
// checkPriorRecoveryLink returns REQUIRES_HUMAN_APPROVAL for them, which would
// quietly turn run 1 into an escalation demo and make run 2 escalate for the
// wrong reason.
const linkRows = await db
  .select()
  .from(auditLog)
  .where(eq(auditLog.toolName, "createRecoveryLink"));
const casesWithPriorLink = new Set(linkRows.map((row) => row.caseId));

const allCases = await db.select().from(recoveryCases);

// Control-group cases are deliberately never processed: they are the holdout
// the attributable-lift number is measured against (Task 9.2). This script
// predates that holdout and used to take whatever DETECTED case came first,
// which by now is almost always a control case — processing one silently
// corrupts the experiment runBatch is careful to protect.
//
// Like run 2 below, the case is seeded rather than hunted for, so the demo
// stays runnable no matter how much of the dataset has been processed. Every
// filter here exists to guarantee the policy engine actually returns ALLOWED:
// an unpaid order (checkEligibility), under the attempt limit
// (checkAttemptLimit), and no outstanding link (checkPriorRecoveryLink).
let normalCase: typeof recoveryCases.$inferSelect | undefined;

for (const candidate of allCases) {
  if (isControlGroup(candidate.orderId)) continue;
  if (casesWithPriorLink.has(candidate.id)) continue;

  // A self_recovered order is paid by the time it is read live, which would
  // make checkEligibility deny it — a legitimate outcome, but not this demo.
  const order = await dataSource.getOrder(candidate.orderId);
  if (!order || order.status === "paid") continue;

  const payments = await dataSource.listPaymentsForOrder(candidate.orderId);
  const failedCount = payments.filter((p) => p.status === "failed").length;
  if (failedCount > 0 && failedCount < NORMAL_MAX_ATTEMPTS) {
    normalCase = candidate;
    break;
  }
}

if (!normalCase) {
  throw new Error(`no non-control, link-free case found whose order has 1-${NORMAL_MAX_ATTEMPTS - 1} failed payments`);
}

await db
  .update(recoveryCases)
  .set({ status: "DETECTED", updatedAt: new Date() })
  .where(eq(recoveryCases.id, normalCase.id));

console.log(`\n=== run 1: case ${normalCase.id} (order ${normalCase.orderId}), maxAttempts=${NORMAL_MAX_ATTEMPTS}, via ${provider} ===`);
const normalResult = await recoverCase(dataSource, normalCase.id, llmClient, NORMAL_MAX_ATTEMPTS);
console.log("diagnosis:", normalResult.diagnosis);
console.log("policy decision:", normalResult.policyDecision);
console.log("outcome:", normalResult.outcome);

// The case was selected so that every rule returns ALLOWED. If policy blocked
// it anyway, this run is demonstrating something other than the happy path.
if (normalResult.policyDecision.decision !== "ALLOWED") {
  throw new Error(
    `expected policy to allow the happy-path case, got ${normalResult.policyDecision.decision}`
  );
}

// ---------------------------------------------------------------------------
// Run 2: brief §11 — an order with several failed attempts, tight limit.
// Whatever the LLM recommends, the policy layer should force ESCALATE.
// ---------------------------------------------------------------------------

// The case is seeded rather than hunted for. Every batch run consumes the
// pristine high-attempt cases, so requiring one to still be sitting at
// DETECTED made this demo silently unrunnable once the dataset had been
// processed — which is exactly what happened. Seeding with a direct
// db.update stands in for "the agent has not looked at this case yet", the
// same thing check-tools.ts does to test action tools in isolation.
//
// A case with no prior recovery link is preferred so the escalation is
// unambiguously the attempt limit's doing, rather than
// checkPriorRecoveryLink's (both return REQUIRES_HUMAN_APPROVAL, so the
// assertion would pass either way and prove less than it claims).
const MAX_ATTEMPTS = 3;

let blockedCase: typeof recoveryCases.$inferSelect | undefined;
let caseWithPriorLink: typeof recoveryCases.$inferSelect | undefined;

for (const candidate of allCases) {
  if (isControlGroup(candidate.orderId)) continue;

  const payments = await dataSource.listPaymentsForOrder(candidate.orderId);
  const failedCount = payments.filter((p) => p.status === "failed").length;
  if (failedCount < MAX_ATTEMPTS) continue;

  if (!casesWithPriorLink.has(candidate.id)) {
    blockedCase = candidate;
    break;
  }
  caseWithPriorLink ??= candidate;
}

blockedCase ??= caseWithPriorLink;

if (!blockedCase) {
  throw new Error(`no non-control case found whose order has >= ${MAX_ATTEMPTS} failed payments`);
}

await db
  .update(recoveryCases)
  .set({ status: "DETECTED", updatedAt: new Date() })
  .where(eq(recoveryCases.id, blockedCase.id));

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
// Assert the verdict came from the attempt limit specifically. Without this,
// any other rule returning REQUIRES_HUMAN_APPROVAL would satisfy the check
// above and the demo would claim something it had not actually shown.
if (!blockedResult.policyDecision.reasons.some((reason) => reason.includes("max attempts limit reached"))) {
  throw new Error("policy escalated, but not because of the attempt limit this demo is meant to show");
}
if (blockedResult.outcome.status !== "ESCALATED") {
  throw new Error("expected the blocked case to be escalated, not whatever the LLM recommended");
}

console.log("\npolicy blocked the agent's proposal and forced escalation instead.");

process.exit(0);
