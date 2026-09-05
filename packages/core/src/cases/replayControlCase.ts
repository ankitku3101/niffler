import { eq } from "drizzle-orm";
import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { isControlGroup } from "../evaluation/holdout.js";

/**
 * Rewinds a control-group case to DETECTED so Agent Run can offer it again.
 *
 * The measured batch is finished, so every case the demo offers is a control-group one and each
 * visitor consumes one by running it. Safe because generateReport excludes control cases from
 * every figure it publishes, so nothing here can move a number on Command Center.
 */
export async function replayControlCase(dataSource: PaymentDataSource, caseId: number): Promise<boolean> {
    const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId)).limit(1);
    if (!caseRow) return false;

    // isControlGroup hashes any string, a real Razorpay order id included, so dataset
    // membership is checked first: a visitor's own case must never be rewound.
    const order = await dataSource.getOrder(caseRow.orderId);
    if (!order || !isControlGroup(caseRow.orderId)) return false;

    // Cleared, not kept as a reprocess would: one stacked trail per visitor would soon make
    // the case unreadable in Decision Explorer.
    await db.delete(auditLog).where(eq(auditLog.caseId, caseId));

    // Bypasses canTransition, like reset.ts — an administrative rewind, not a modelled step.
    await db
        .update(recoveryCases)
        .set({ status: "DETECTED", updatedAt: new Date() })
        .where(eq(recoveryCases.id, caseId));

    return true;
}
