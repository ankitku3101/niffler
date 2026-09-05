import { eq } from "drizzle-orm";
import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { isControlGroup } from "../evaluation/holdout.js";

/**
 * Rewinds a control-group case to DETECTED so the Agent Run demo can be watched again.
 *
 * The measured batch is finished, so every case still offered on Agent Run is a control-group
 * one. Each visitor consumes one by running it, and without this the demo eventually empties —
 * taking with it the already-paid case that shows the policy engine overruling the agent.
 *
 * Replaying is safe because generateReport excludes control cases from every figure it
 * publishes, so nothing done here can move a number on Command Center.
 *
 * Returns whether the case was actually rewound.
 */
export async function replayControlCase(dataSource: PaymentDataSource, caseId: number): Promise<boolean> {
    const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId)).limit(1);
    if (!caseRow) return false;

    // isControlGroup hashes any string happily, a real Razorpay order id included, so
    // membership of the generated dataset is checked first — a visitor's own Try It
    // Yourself case must never be rewound out from under them.
    const order = await dataSource.getOrder(caseRow.orderId);
    if (!order || !isControlGroup(caseRow.orderId)) return false;

    // Cleared rather than kept, unlike a genuine reprocess (see requeue-blank-cases.ts):
    // this is a demo fixture being rewound, and stacking one trail per visitor would make
    // the case unreadable in Decision Explorer within a day.
    await db.delete(auditLog).where(eq(auditLog.caseId, caseId));

    // Deliberately bypasses canTransition, like reset.ts and requeue-blank-cases.ts —
    // an administrative rewind, not a step the state machine is meant to model.
    await db
        .update(recoveryCases)
        .set({ status: "DETECTED", updatedAt: new Date() })
        .where(eq(recoveryCases.id, caseId));

    return true;
}
