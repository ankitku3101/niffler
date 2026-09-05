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

    // Already captured on an earlier run: nothing to do but record that it was asked again.
    if(caseRow.status === "RECOVERED") {
        const result: CapturePaymentResult = { status: "RECOVERED" };
        await db.insert(auditLog).values({
            caseId: input.caseId,
            toolName: "capturePayment",
            input,
            output: result,
        })
        return result
    }

    if (!canTransition(caseRow.status, "ACTION_EXECUTED")) {
        throw new Error (`Cannot capture case ${input.caseId} from status ${caseRow.status}`);
    }

    const payments = await dataSource.listPaymentsForOrder(order.id);
    const authorizedPayment = payments.find(p => p.status === "authorized");

    if(!authorizedPayment) {
        throw new Error (`No authorized payment to capture for case ${input.caseId}`);
    }

    // Outside the transaction on purpose: an API call cannot be rolled back, and holding one
    // open across a request to Razorpay would be worse than the window it closes.
    await dataSource.capturePayment(authorizedPayment.id, authorizedPayment.amount_paise);

    const result: CapturePaymentResult = {
        status: "RECOVERED",
        amount_paise: authorizedPayment.amount_paise,
    };

    // The status and the row that explains it commit together, or neither does.
    await db.transaction(async (tx) => {
        await tx.update(recoveryCases).set({ status: "ACTION_EXECUTED", updatedAt: new Date() }).where(eq(recoveryCases.id, input.caseId));
        await tx.update(recoveryCases).set({ status: "RECOVERED", updatedAt: new Date() }).where(eq(recoveryCases.id, input.caseId));

        await tx.insert(auditLog).values({
            caseId: input.caseId,
            toolName: "capturePayment",
            input,
            output: result,
        })
    });

    return result
}