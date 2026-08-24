import type { Rng } from "./random.js";
import type {
  AuthorizedPayment,
  CapturedPayment,
  FailedPayment,
  FailureReason,
  PaymentError,
  PaymentMethod,
} from "../domain/index.js";
import { toIso } from "./world.js";

// Each failure reason has fixed error fields. Randomising them would produce
// incoherent records — an expired card is never the gateway's fault — and would
// leave the agent no stable signal to reason from.
// TODO: check these descriptions against Razorpay's live error strings at Stage 10.
const FAILURE_CATALOGUE: Record<FailureReason, Omit<PaymentError, "reason">> = {
  gateway_timeout: {
    code: "GATEWAY_ERROR",
    description: "Payment processing failed due to a timeout at the gateway.",
    source: "gateway",
    step: "payment_authorization",
  },
  issuer_unavailable: {
    code: "GATEWAY_ERROR",
    description: "Payment failed because the issuing bank was unavailable.",
    source: "bank",
    step: "payment_authorization",
  },
  insufficient_funds: {
    code: "BAD_REQUEST_ERROR",
    description: "Payment failed due to insufficient funds in the account.",
    source: "customer",
    step: "payment_authorization",
  },
  otp_not_entered: {
    code: "BAD_REQUEST_ERROR",
    description: "Payment was not completed as the OTP was not entered in time.",
    source: "customer",
    step: "payment_authentication",
  },
  card_expired: {
    code: "BAD_REQUEST_ERROR",
    description: "Payment failed because the card has expired.",
    source: "customer",
    step: "payment_authorization",
  },
  card_blocked: {
    code: "BAD_REQUEST_ERROR",
    description: "Payment failed because the card is blocked by the issuing bank.",
    source: "customer",
    step: "payment_authorization",
  },
  risk_blocked: {
    code: "BAD_REQUEST_ERROR",
    description: "Payment was blocked by the issuing bank's risk checks.",
    source: "bank",
    step: "payment_authorization",
  },
};

export function errorFor(reason: FailureReason): PaymentError {
  return { ...FAILURE_CATALOGUE[reason], reason };
}

const METHOD_WEIGHTS: Record<PaymentMethod, number> = {
  card: 45,
  upi: 35,
  netbanking: 12,
  wallet: 6,
  emi: 2,
};

// Not every failure is possible on every method: UPI authenticates with a PIN
// rather than an OTP, and wallets have no issuing bank to be unavailable.
const METHODS_BY_REASON: Record<FailureReason, PaymentMethod[]> = {
  gateway_timeout: ["card", "upi", "netbanking", "wallet", "emi"],
  issuer_unavailable: ["card", "upi", "netbanking"],
  insufficient_funds: ["card", "upi", "netbanking", "wallet"],
  otp_not_entered: ["card", "netbanking"],
  card_expired: ["card", "emi"],
  card_blocked: ["card", "emi"],
  risk_blocked: ["card", "upi", "netbanking"],
};

function weightedMethod(rng: Rng, allowed: PaymentMethod[]): PaymentMethod {
  return rng.weighted(
    allowed.map((m) => ({ value: m, weight: METHOD_WEIGHTS[m] }))
  );
}

/** A method consistent with the given failure reason. */
export function methodForReason(rng: Rng, reason: FailureReason): PaymentMethod {
  return weightedMethod(rng, METHODS_BY_REASON[reason]);
}

/** A method for a payment that is going to succeed. */
export function anyMethod(rng: Rng): PaymentMethod {
  return weightedMethod(rng, ["card", "upi", "netbanking", "wallet", "emi"]);
}

/** The order-level facts every payment against that order inherits. */
export interface PaymentSeed {
  orderId: string;
  customerId: string;
  amountPaise: number;
}

export function failedPayment(
  rng: Rng,
  seed: PaymentSeed,
  minute: number,
  reason: FailureReason,
  method?: PaymentMethod
): FailedPayment {
  return {
    id: rng.id("pay"),
    order_id: seed.orderId,
    customer_id: seed.customerId,
    amount_paise: seed.amountPaise,
    method: method ?? methodForReason(rng, reason),
    created_at: toIso(minute),
    status: "failed",
    error: errorFor(reason),
  };
}

export function authorizedPayment(
  rng: Rng,
  seed: PaymentSeed,
  minute: number,
  method?: PaymentMethod
): AuthorizedPayment {
  return {
    id: rng.id("pay"),
    order_id: seed.orderId,
    customer_id: seed.customerId,
    amount_paise: seed.amountPaise,
    method: method ?? anyMethod(rng),
    created_at: toIso(minute),
    status: "authorized",
    // Authorization comes back within a couple of minutes of the attempt.
    authorized_at: toIso(minute + rng.int(0, 2)),
  };
}

export function capturedPayment(
  rng: Rng,
  seed: PaymentSeed,
  minute: number,
  method?: PaymentMethod
): CapturedPayment {
  const authorizedMinute = minute + rng.int(0, 2);
  return {
    id: rng.id("pay"),
    order_id: seed.orderId,
    customer_id: seed.customerId,
    amount_paise: seed.amountPaise,
    method: method ?? anyMethod(rng),
    created_at: toIso(minute),
    status: "captured",
    authorized_at: toIso(authorizedMinute),
    captured_at: toIso(authorizedMinute + rng.int(0, 3)),
  };
}
