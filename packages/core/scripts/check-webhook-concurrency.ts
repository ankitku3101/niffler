import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { auditLog, recoveryCases } from "../src/db/schema.js";
import { handlePaymentLinkPaid } from "../src/webhooks/handlePaymentLinkPaid.js";

// Razorpay retries a delivery it does not hear back from, so the same event can arrive while
// the previous copy is still being handled. Cases here are created and removed by this script.

const HOLD_MS = 2500;

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
    ok ? pass++ : fail++;
}

async function seedCase() {
    const orderId = `order_CHECKWH${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [row] = await db.insert(recoveryCases).values({ orderId, status: "ACTION_EXECUTED" }).returning();
    return {
        caseId: row!.id,
        orderId,
        payload: {
            event: "payment_link.paid",
            payload: {
                payment_link: { entity: { reference_id: orderId } },
                payment: { entity: { id: `pay_CHECKWH${Date.now()}` } },
            },
        },
    };
}

async function auditRowCount(caseId: number) {
    return (await db.select().from(auditLog).where(eq(auditLog.caseId, caseId))).length;
}

async function cleanUp(caseId: number) {
    await db.delete(auditLog).where(eq(auditLog.caseId, caseId));
    await db.delete(recoveryCases).where(eq(recoveryCases.id, caseId));
}

// 1. Two deliveries of the same event at once, plus a later retry.
{
    const { caseId, payload } = await seedCase();
    const [first, second] = await Promise.all([
        handlePaymentLinkPaid(payload),
        handlePaymentLinkPaid(payload),
    ]);
    const retry = await handlePaymentLinkPaid(payload);
    const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId));

    check("only one of two simultaneous deliveries is handled",
        [first, second].filter((r) => r.handled).length === 1);
    check("a later retry is rejected too", retry.handled === false);
    check("the case is left at RECOVERED", caseRow?.status === "RECOVERED", `got ${caseRow?.status}`);
    check("exactly one webhook row was written", (await auditRowCount(caseId)) === 1);
    await cleanUp(caseId);
}

// 2. The lock itself. Holding the case row proves the handler waits for it rather than
//    reading through it — the property the test above relies on but cannot force to happen.
{
    const { caseId, payload } = await seedCase();
    const holder = db.transaction(async (tx) => {
        await tx.select().from(recoveryCases).where(eq(recoveryCases.id, caseId)).for("update");
        await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const startedAt = Date.now();
    const result = await handlePaymentLinkPaid(payload);
    const waitedMs = Date.now() - startedAt;
    await holder;

    check("the handler waits on a held row lock", waitedMs > HOLD_MS - 500, `waited ${waitedMs}ms`);
    check("and completes once the lock is released", result.handled === true);
    await cleanUp(caseId);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
