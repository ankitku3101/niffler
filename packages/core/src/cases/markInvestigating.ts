import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import type { OrderCaseStatus } from "../tools/stopRecovery.js";
import { canTransition } from "../domain/recoveryCase.js";

export async function markInvestigating(caseId: number) : Promise<OrderCaseStatus> {
    const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId));

    if(!caseRow) throw new Error(`${caseId} - Case not found`);

    let transitioned: boolean;

    if (caseRow.status === "INVESTIGATING") {
        transitioned = false;
    } else if (canTransition(caseRow.status, "INVESTIGATING")) {
        await db.update(recoveryCases).set({ status: "INVESTIGATING", updatedAt: new Date() }).where(eq(recoveryCases.id, caseId));
        transitioned = true;
    } else {
        throw new Error (`Cannot mark case ${caseId} as investigating from status ${caseRow.status}`);
    }

    const status = "INVESTIGATING";
    const result: OrderCaseStatus = { status, transitioned };

    await db.insert(auditLog).values({
        caseId: caseId,
        toolName: "markInvestigating",
        input: { caseId },
        output: result,
    })

    return result;

}