import { eq } from "drizzle-orm";
import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { canTransition, type CaseStatus } from "../domain/recoveryCase.js";
import { GetOrderInputSchema } from "./getOrder.js";
import { resolveCaseOrder } from "./resolveCase.js";

export interface CapturePaymentResult {
    status: CaseStatus;
    amount_paise?: number;
}

export async function capturePayment(dataSource: PaymentDataSource, rawInput: unknown) : Promise<CapturePaymentResult> {
    const input = GetOrderInputSchema.parse(rawInput);
    const { order, caseRow } = await resolveCaseOrder(dataSource, input.caseId);

    let result: CapturePaymentResult;

    if(caseRow.status === "RECOVERED") {
        const status = "RECOVERED"
        result = { status }
    } else if (!canTransition(caseRow.status, "ACTION_EXECUTED")) {
        throw new Error (`Cannot capture case ${input.caseId} from status ${caseRow.status}`);
    } else {
        const payments = await dataSource.listPaymentsForOrder(order.id);
        const authorizedPayment = payments.find(p => p.status === "authorized");

        if(!authorizedPayment) {
            throw new Error (`No authorized payment to capture for case ${input.caseId}`);
        }

        await dataSource.capturePayment(authorizedPayment.id, authorizedPayment.amount_paise);

        await db.update(recoveryCases).set({ status: "ACTION_EXECUTED", updatedAt: new Date() }).where(eq(recoveryCases.id, input.caseId));
        await db.update(recoveryCases).set({ status: "RECOVERED", updatedAt: new Date() }).where(eq(recoveryCases.id, input.caseId));

        const status = "RECOVERED"
        const amount_paise = authorizedPayment.amount_paise;
        result = { status, amount_paise }
    }

    await db.insert(auditLog).values({
        caseId: input.caseId,
        toolName: "capturePayment",
        input,
        output: result,
    })

    return result
}