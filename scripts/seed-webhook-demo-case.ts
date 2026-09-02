import { eq } from "drizzle-orm";
import Razorpay from "razorpay";
import { db } from "../src/db/client.js";
import { recoveryCases } from "../src/db/schema.js";
import { createRecoveryCases } from "../src/cases/createCases.js";

process.loadEnvFile();

// Stage 10, Task 10.7 end-to-end proof: a real order + a real recovery case
// + a real Payment Link tied to that order's id (via reference_id), seeded
// straight to ACTION_EXECUTED — the same manual-seeding pattern
// check-tools.ts uses to test action tools in isolation. This tests the
// webhook handler's own transition logic (ACTION_EXECUTED -> RECOVERED),
// not createRecoveryLink itself, which Task 10.6 already proved.

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const order = await razorpay.orders.create({
  amount: 50000,
  currency: "INR",
  receipt: `niffler-webhook-demo-${Date.now()}`,
});

await createRecoveryCases([order.id]);
await db.update(recoveryCases).set({ status: "ACTION_EXECUTED" }).where(eq(recoveryCases.orderId, order.id));

const link = await razorpay.paymentLink.create({
  amount: 50000,
  currency: "INR",
  reference_id: order.id,
  customer: { name: "Customer", email: "void@razorpay.com", contact: "+918822992200" },
  notify: { email: false, sms: false },
});

console.log("order:", order.id);
console.log("pay this:", link.short_url);
console.log("watch for the case flipping to RECOVERED after payment");

process.exit(0);
