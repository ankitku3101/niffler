import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { recoveryCases } from "../src/db/schema.js";

process.loadEnvFile();

// Stage 10, Task 10.5 remediation: the first live run marked this case
// RECOVERED without capturePayment ever actually calling Razorpay (the bug
// just fixed in capturePayment.ts / the PaymentDataSource adapters). Resets
// it back to DETECTED so a clean re-run produces a truthful audit trail.
//
// Deliberately bypasses canTransition — same admin-correction category as
// requeue-blank-cases.ts, not a normal state-machine transition. Old
// audit_log rows are left in place (append-only, and they're a real record
// of what actually happened, including the bug).

const ORDER_ID = "order_TXHdgsGhT8mG05";

const [liveCase] = await db
  .select()
  .from(recoveryCases)
  .where(eq(recoveryCases.orderId, ORDER_ID))
  .limit(1);

if (!liveCase) {
  throw new Error(`no recovery case for ${ORDER_ID}`);
}

await db
  .update(recoveryCases)
  .set({ status: "DETECTED", updatedAt: new Date() })
  .where(eq(recoveryCases.id, liveCase.id));

console.log(`case ${liveCase.id} reset to DETECTED`);

process.exit(0);
