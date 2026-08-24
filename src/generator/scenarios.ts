import { DAY, DETECTION_CUTOFF, HOUR } from "./world.js";
import {
  authorizedPayment,
  capturedPayment,
  failedPayment,
  methodForReason,
  type PaymentSeed,
} from "./payments.js";
import type { Rng } from "./random.js";
import type { FailureReason, Payment, ScenarioClass } from "../domain/index.js";

/** Everything a writer needs: who, how much, and when the order was placed. */
export interface ScenarioContext {
  rng: Rng;
  seed: PaymentSeed;
  /** World minute at which the order was created. */
  orderMinute: number;
}

/** Produces the full payment history for one order. */
export type ScenarioWriter = (ctx: ScenarioContext) => Payment[];

/** Customers reach the payment page within a few minutes of the order. */
function firstAttempt(ctx: ScenarioContext): number {
  return ctx.orderMinute + ctx.rng.int(0, 20);
}

/**
 * Longest stretch a scenario's payments can span. Order placement uses this to
 * avoid generating attempts that fall after WORLD_NOW — i.e. in the future.
 */
export const SCENARIO_SPAN: Record<ScenarioClass, number> = {
  success: 1 * HOUR,
  transient_gateway: 1 * HOUR,
  bank_downtime: 1 * HOUR,
  insufficient_funds: 4 * HOUR,
  auth_dropoff: 4 * HOUR,
  hard_decline: 1 * HOUR,
  fraud_block: 4 * HOUR,
  repeat_failure: 11 * DAY,
  authorized_uncaptured: 1 * HOUR,
  self_recovered: 8 * DAY,
};

// A momentary gateway problem. One attempt, no customer fault, nothing about
// the instrument is wrong — the most straightforwardly recoverable case.
const transientGateway: ScenarioWriter = (ctx) => [
  failedPayment(ctx.rng, ctx.seed, firstAttempt(ctx), "gateway_timeout"),
];

const bankDowntime: ScenarioWriter = (ctx) => [
  failedPayment(ctx.rng, ctx.seed, firstAttempt(ctx), "issuer_unavailable"),
];

const hardDecline: ScenarioWriter = (ctx) => [
  failedPayment(ctx.rng, ctx.seed, firstAttempt(ctx), ctx.rng.pick(["card_expired", "card_blocked"])),
];

const insufficientFunds: ScenarioWriter = (ctx) => {
  const first = firstAttempt(ctx);
  const payments = [failedPayment(ctx.rng, ctx.seed, first, "insufficient_funds")];

  // Some customers immediately try again without topping up first.
  if (ctx.rng.next() < 0.4) {
    payments.push(
      failedPayment(ctx.rng, ctx.seed, first + ctx.rng.int(2, 90), "insufficient_funds")
    );
  }
  return payments;
};


const authDropoff: ScenarioWriter = (ctx) => {
  const first = firstAttempt(ctx);
  const payments = [failedPayment(ctx.rng, ctx.seed, first, "otp_not_entered")];

  // Some customers restart the flow and abandon it a second time.
  if (ctx.rng.next() < 0.35) {
    payments.push(
      failedPayment(ctx.rng, ctx.seed, first + ctx.rng.int(5, 180), "otp_not_entered")
    );
  }
  return payments;
};

const fraudBlock: ScenarioWriter = (ctx) => {
  const first = firstAttempt(ctx);
  const payments = [failedPayment(ctx.rng, ctx.seed, first, "risk_blocked")];

  // Some customers restart the flow and are blocked again.
  if (ctx.rng.next() < 0.3) {
    payments.push(
      failedPayment(ctx.rng, ctx.seed, first + ctx.rng.int(10, 120), "risk_blocked")
    );
  }
  return payments;
};

const success: ScenarioWriter = (ctx) => {
  const first = firstAttempt(ctx);

  // A minority of paid orders contain a benign retry, so that a past failure on
  // a customer's record is not by itself evidence of a problem.
  if (ctx.rng.next() < 0.2) {
    return [
      failedPayment(ctx.rng, ctx.seed, first, "gateway_timeout"),
      capturedPayment(ctx.rng, ctx.seed, first + ctx.rng.int(1, 8)),
    ];
  }
  return [capturedPayment(ctx.rng, ctx.seed, first)];
};

const repeatFailure: ScenarioWriter = (ctx) => {
  const reason = ctx.rng.pick<FailureReason>([
    "insufficient_funds",
    "card_blocked",
    "gateway_timeout",
  ]);
  // The same instrument throughout: one card failing over and over, which is
  // what makes further retries pointless rather than merely unlucky.
  const method = methodForReason(ctx.rng, reason);

  const payments: Payment[] = [];
  let minute = firstAttempt(ctx);
  const attempts = ctx.rng.int(3, 5);

  for (let i = 0; i < attempts; i++) {
    payments.push(failedPayment(ctx.rng, ctx.seed, minute, reason, method));
    minute += ctx.rng.int(4 * HOUR, 2 * DAY);
  }
  return payments;
};

const authorizedUncaptured: ScenarioWriter = (ctx) => [
  authorizedPayment(ctx.rng, ctx.seed, firstAttempt(ctx)),
];

const selfRecovered: ScenarioWriter = (ctx) => {
  const first = firstAttempt(ctx);
  const reason = ctx.rng.pick<FailureReason>(["gateway_timeout", "otp_not_entered"]);

  return [
    failedPayment(ctx.rng, ctx.seed, first, reason),
    // Captured after the batch was assembled: a recovery case will exist for an
    // order that has already been paid. The agent must check current state
    // before acting rather than trusting the case it was handed.
    capturedPayment(ctx.rng, ctx.seed, DETECTION_CUTOFF + ctx.rng.int(10, 5 * HOUR)),
  ];
};

export const SCENARIO_WRITERS: Record<ScenarioClass, ScenarioWriter> = {
  success,
  transient_gateway: transientGateway,
  bank_downtime: bankDowntime,
  insufficient_funds: insufficientFunds,
  auth_dropoff: authDropoff,
  hard_decline: hardDecline,
  fraud_block: fraudBlock,
  repeat_failure: repeatFailure,
  authorized_uncaptured: authorizedUncaptured,
  self_recovered: selfRecovered,
};
