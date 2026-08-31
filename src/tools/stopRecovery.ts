import { eq } from "drizzle-orm";
import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { canTransition, type CaseStatus } from "../domain/recoveryCase.js";
import { GetOrderInputSchema } from "./getOrder.js";
import { resolveCaseOrder } from "./resolveCase.js";

export interface OrderCaseStatus {
    status: CaseStatus,
    transitioned: boolean
}

export async function stopRecovery(dataSource: PaymentDataSource, rawInput: unknown) : Promise<OrderCaseStatus> {
    const input = GetOrderInputSchema.parse(rawInput);
    const { caseRow } = await resolveCaseOrder(dataSource, input.caseId);

    let transitioned: boolean;

    if (caseRow.status === "STOPPED") {
        transitioned = false;
    } else if (canTransition(caseRow.status, "ACTION_EXECUTED")) {
        await db.update(recoveryCases).set({ status: "ACTION_EXECUTED", updatedAt: new Date() }).where(eq(recoveryCases.id, input.caseId));
        await db.update(recoveryCases)
            .set({ status: "STOPPED", updatedAt: new Date() })
            .where(eq(recoveryCases.id, input.caseId));
        transitioned = true;
    } else {
        throw new Error (`Cannot stop case ${input.caseId} from status ${caseRow.status}`);
    };

    const status = "STOPPED";
    const result: OrderCaseStatus = { status, transitioned };

    await db.insert(auditLog).values({
        caseId: input.caseId,
        toolName: "stopRecovery",
        input,
        output: result,
    })

    return result;
}