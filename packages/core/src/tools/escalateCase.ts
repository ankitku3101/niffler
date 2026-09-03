import type { PaymentDataSource } from "../data/source.js";
import { GetOrderInputSchema } from "./getOrder.js";
import { resolveCaseOrder } from "./resolveCase.js";
import type { OrderCaseStatus } from "./stopRecovery.js";
import { canTransition } from "../domain/recoveryCase.js";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function escalateCase(dataSource: PaymentDataSource, rawInput: unknown) : Promise<OrderCaseStatus> {
    const input = GetOrderInputSchema.parse(rawInput);
    const { caseRow } = await resolveCaseOrder(dataSource, input.caseId);
    
    let result : OrderCaseStatus; 
    let transitioned: boolean;

    if(caseRow.status === "ESCALATED") {
            const status = "ESCALATED"
            transitioned = false
            result = { status, transitioned }
        } else if (canTransition(caseRow.status, "ESCALATED")) {
            // already at ACTION_EXECUTED — one legal hop straight to ESCALATED
            await db.update(recoveryCases).set({ status: "ESCALATED", updatedAt: new Date() }).where(eq(recoveryCases.id, input.caseId));

            const status = "ESCALATED"
            transitioned = true
            result = { status, transitioned }
        } else if (canTransition(caseRow.status, "ACTION_EXECUTED")) {
            // at ACTION_PLANNED — ACTION_PLANNED can't jump to ESCALATED directly, so two hops
            await db.update(recoveryCases).set({ status: "ACTION_EXECUTED", updatedAt: new Date() }).where(eq(recoveryCases.id, input.caseId));
            await db.update(recoveryCases).set({ status: "ESCALATED", updatedAt: new Date() }).where(eq(recoveryCases.id, input.caseId));

            const status = "ESCALATED"
            transitioned = true
            result = { status, transitioned }
        } else {
            throw new Error (`Cannot escalate case ${input.caseId} from status ${caseRow.status}`);
        }
    
        await db.insert(auditLog).values({
            caseId: input.caseId,
            toolName: "escalateCase",
            input,
            output: result,
        })
    
        return result;
}