import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import type { OrderCaseStatus } from "../tools/stopRecovery.js";
import { canTransition } from "../domain/recoveryCase.js";

export async function markActionPlanned(caseId: number) : Promise<OrderCaseStatus> {
    const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId));

    if(!caseRow) throw new Error(`${caseId} - Case not found`);

    let transitioned: boolean;

    if (caseRow.status === "ACTION_PLANNED") {
        transitioned = false;
    } else if (canTransition(caseRow.status, "ACTION_PLANNED")) {
        await db.update(recoveryCases).set({ status: "ACTION_PLANNED", updatedAt: new Date() }).where(eq(recoveryCases.id, caseId));
        transitioned = true;
    } else {
        throw new Error (`Cannot mark case ${caseId} as action planned from status ${caseRow.status}`);
    }

    const status = "ACTION_PLANNED";
    const result: OrderCaseStatus = { status, transitioned };

    await db.insert(auditLog).values({
        caseId: caseId,
        toolName: "markActionPlanned",
        input: { caseId },
        output: result,
    })

    return result;

}