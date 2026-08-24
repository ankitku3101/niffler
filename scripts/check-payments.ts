import { makeRng } from "../src/generator/random.js";
import { DAY, HOUR } from "../src/generator/world.js";
import {
  authorizedPayment,
  capturedPayment,
  errorFor,
  failedPayment,
  methodForReason,
  type PaymentSeed,
} from "../src/generator/payments.js";
import { PaymentSchema, type FailureReason } from "../src/domain/index.js";

const rng = makeRng("niffler-v1");
const seed: PaymentSeed = {
  orderId: "order_test123456",
  customerId: "cust_test123456",
  amountPaise: 149900,
};

const REASONS: FailureReason[] = [
  "gateway_timeout", "issuer_unavailable", "insufficient_funds",
  "otp_not_entered", "card_expired", "card_blocked", "risk_blocked",
];

console.log("--- one failure of each reason ---");
for (const reason of REASONS) {
  const p = failedPayment(rng, seed, 10 * DAY, reason);
  PaymentSchema.parse(p);
  console.log(reason.padEnd(20), p.method.padEnd(11), p.error.step);
}

console.log("--- authorized and captured ---");
const auth = authorizedPayment(rng, seed, 10 * DAY);
const cap = capturedPayment(rng, seed, 10 * DAY + 3 * HOUR);
PaymentSchema.parse(auth);
PaymentSchema.parse(cap);
console.log(auth);
console.log(cap);

console.log("--- method constraints hold over 2000 draws ---");
for (let i = 0; i < 2000; i++) {
  const m = methodForReason(rng, "otp_not_entered");
  if (m === "upi") throw new Error("UPI cannot fail with otp_not_entered");
}
console.log("no UPI + otp_not_entered:", true);

console.log("--- catalogue is stable ---");
console.log(JSON.stringify(errorFor("card_expired")) === JSON.stringify(errorFor("card_expired")));
