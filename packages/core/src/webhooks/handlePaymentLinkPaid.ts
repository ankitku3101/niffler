import { eq, and } from "drizzle-orm";
import z from "zod";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { canTransition } from "../domain/recoveryCase.js";

// The payload for a payment_link.paid webhook looks like this:
const PaymentLinkPaidPayloadSchema = z.object({
  event: z.literal("payment_link.paid"),
  payload: z.object({
    payment_link: z.object({
      entity: z.object({
        reference_id: z.string().nullable(),
      }),
    }),
    payment: z.object({
      entity: z.object({
        id: z.string(),
      }),
    }),
  }),
});

export interface HandleWebhookResult {
  handled: boolean;
  reason: string;
}

export async function handlePaymentLinkPaid(rawPayload: unknown): Promise<HandleWebhookResult> {
  const parsed = PaymentLinkPaidPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { handled: false, reason: "payload did not match the expected payment_link.paid shape" };
  }

  const orderId = parsed.data.payload.payment_link.entity.reference_id;
  const paymentId = parsed.data.payload.payment.entity.id;

  if (!orderId) {
    return { handled: false, reason: "payment link has no reference_id — not tied to any of our orders" };
  }

  // Idempotency: Razorpay retries webhook delivery, so the same event genuinely arrives more
  // than once. A payment can only be captured once, which makes paymentId a safe dedup key.
  return db.transaction(async (tx) => {
    const [caseRow] = await tx
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.orderId, orderId))
      .limit(1)
      .for("update");
    if (!caseRow) {
      return { handled: false, reason: `no recovery case for order ${orderId}` };
    }

    // Every webhook row for the case is checked, not just one — a single row is all this case
    // can have today (reference_id is unique per link, and a paid link cannot be paid again),
    // but "some row already has this paymentId" is what the check actually means.
    const processedRows = await tx
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.caseId, caseRow.id), eq(auditLog.toolName, "webhookPaymentLinkPaid")));
    if (processedRows.some((row) => (row.input as { paymentId?: string }).paymentId === paymentId)) {
      return { handled: false, reason: `payment ${paymentId} already processed for case ${caseRow.id}` };
    }

    if (!canTransition(caseRow.status, "RECOVERED")) {
      return {
        handled: false,
        reason: `case ${caseRow.id} cannot move to RECOVERED from status ${caseRow.status}`,
      };
    }

    await tx
      .update(recoveryCases)
      .set({ status: "RECOVERED", updatedAt: new Date() })
      .where(eq(recoveryCases.id, caseRow.id));

    await tx.insert(auditLog).values({
      caseId: caseRow.id,
      toolName: "webhookPaymentLinkPaid",
      input: { orderId, paymentId },
      output: { previousStatus: caseRow.status, newStatus: "RECOVERED" },
    });

    return { handled: true, reason: `case ${caseRow.id} recovered via payment link` };
  });
}
