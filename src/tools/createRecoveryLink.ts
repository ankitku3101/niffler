import { eq } from "drizzle-orm";
import type { PaymentDataSource } from "../data/source.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { canTransition } from "../domain/recoveryCase.js";
import { GetOrderInputSchema } from "./getOrder.js";
import { resolveCaseOrder } from "./resolveCase.js";
import type { OrderCaseStatus } from "./stopRecovery.js";
import { db } from "../db/client.js";

export interface CreateRecoveryLink extends OrderCaseStatus {
    link?: string
}

export async function createRecoveryLink (dataSource: PaymentDataSource, rawInput: unknown) : Promise<CreateRecoveryLink> {
    const input = GetOrderInputSchema.parse(rawInput);
    const { caseRow } = await resolveCaseOrder(dataSource, input.caseId);    

    let result : CreateRecoveryLink; 
    let transitioned: boolean;

    if(caseRow.status === "ACTION_EXECUTED") {
        const status = "ACTION_EXECUTED"
        transitioned = false
        result = { status, transitioned }
    } else if (!canTransition(caseRow.status, "ACTION_EXECUTED")) {
        throw new Error (`Cannot create recovery link for ${input.caseId} from status ${caseRow.status}`);
    } else {
        await db.update(recoveryCases).set({ status: "ACTION_EXECUTED", updatedAt: new Date() }).where(eq(recoveryCases.id, input.caseId));
        const status = "ACTION_EXECUTED"
        transitioned = true
        const link = crypto.randomUUID();
        result = { status, transitioned, link }; 
    }
    await db.insert(auditLog).values({
        caseId: input.caseId,
        toolName: "createRecoveryLink",
        input,
        output: result,
    })

    return result;
}