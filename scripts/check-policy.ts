import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { checkEligibility, checkAttemptLimit, combinePolicyChecks } from "../src/domain/policy.js";
import { DETECTION_CUTOFF, toIso } from "../src/generator/world.js";

const MAX_ATTEMPTS = 3;

const source = new JsonPaymentDataSource();
const orders = await source.listOrders(toIso(DETECTION_CUTOFF));

// ---------------------------------------------------------------------------
// checkEligibility: a paid order is DENIED, an unpaid one is ALLOWED
// ---------------------------------------------------------------------------

const paidOrder = orders.find((o) => o.status === "paid");
const unpaidOrder = orders.find((o) => o.status !== "paid");
if (!paidOrder || !unpaidOrder) {
  throw new Error("dataset needs at least one paid and one unpaid order");
}

const paidResult = checkEligibility(paidOrder);
if (paidResult.decision !== "DENIED") {
  throw new Error("checkEligibility allowed a paid order");
}

const unpaidResult = checkEligibility(unpaidOrder);
if (unpaidResult.decision !== "ALLOWED") {
  throw new Error("checkEligibility denied an unpaid order");
}
console.log("checkEligibility: paid -> DENIED, unpaid -> ALLOWED");

// ---------------------------------------------------------------------------
// checkAttemptLimit: enough failed attempts -> REQUIRES_HUMAN_APPROVAL
// ---------------------------------------------------------------------------

let orderOverLimit: { id: string } | undefined;
let orderUnderLimit: { id: string } | undefined;
let attemptsOverLimit: Awaited<ReturnType<typeof source.listPaymentsForOrder>> = [];
let attemptsUnderLimit: Awaited<ReturnType<typeof source.listPaymentsForOrder>> = [];

for (const order of orders) {
  const payments = await source.listPaymentsForOrder(order.id);
  const failedCount = payments.filter((p) => p.status === "failed").length;

  if (failedCount >= MAX_ATTEMPTS && !orderOverLimit) {
    orderOverLimit = order;
    attemptsOverLimit = payments;
  }
  if (failedCount > 0 && failedCount < MAX_ATTEMPTS && !orderUnderLimit) {
    orderUnderLimit = order;
    attemptsUnderLimit = payments;
  }
  if (orderOverLimit && orderUnderLimit) break;
}
if (!orderOverLimit || !orderUnderLimit) {
  throw new Error("dataset needs an order at/over and one under the attempt limit");
}

const overLimitResult = checkAttemptLimit(attemptsOverLimit, MAX_ATTEMPTS);
if (overLimitResult.decision !== "REQUIRES_HUMAN_APPROVAL") {
  throw new Error("checkAttemptLimit did not flag an order at the attempt limit");
}

const underLimitResult = checkAttemptLimit(attemptsUnderLimit, MAX_ATTEMPTS);
if (underLimitResult.decision !== "ALLOWED") {
  throw new Error("checkAttemptLimit blocked an order under the attempt limit");
}
console.log("checkAttemptLimit: at/over limit -> REQUIRES_HUMAN_APPROVAL, under limit -> ALLOWED");

// ---------------------------------------------------------------------------
// combinePolicyChecks: the strictest verdict wins, every reason survives
// ---------------------------------------------------------------------------

const combinedStrict = combinePolicyChecks([
  { decision: "ALLOWED", reason: "eligible" },
  { decision: "REQUIRES_HUMAN_APPROVAL", reason: "at attempt limit" },
]);
if (combinedStrict.decision !== "REQUIRES_HUMAN_APPROVAL" || combinedStrict.reasons.length !== 2) {
  throw new Error("combinePolicyChecks did not pick the strictest verdict, or dropped a reason");
}

const combinedDenied = combinePolicyChecks([
  { decision: "DENIED", reason: "already paid" },
  { decision: "REQUIRES_HUMAN_APPROVAL", reason: "at attempt limit" },
]);
if (combinedDenied.decision !== "DENIED") {
  throw new Error("combinePolicyChecks let a weaker verdict override DENIED");
}

const combinedAllAllowed = combinePolicyChecks([
  { decision: "ALLOWED", reason: "eligible" },
  { decision: "ALLOWED", reason: "under attempt limit" },
]);
if (combinedAllAllowed.decision !== "ALLOWED") {
  throw new Error("combinePolicyChecks should allow when every input allows");
}
console.log("combinePolicyChecks: strictest verdict wins, all reasons preserved");

process.exit(0);
