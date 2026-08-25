import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema.js";
import type { Payment } from "../domain/payment.js";
import { GetOrderInputSchema } from "./getOrder.js";
import { resolveCaseOrder } from "./resolveCase.js";

export async function listPreviousAttempts(dataSource: PaymentDataSource, rawInput: unknown): Promise<Payment[]> {
    
    const input = GetOrderInputSchema.parse(rawInput);
    const { order } = await resolveCaseOrder(dataSource, input.caseId);

    const payments = await dataSource.listPaymentsForOrder(order.id);

    await db.insert(auditLog).values({
        caseId: input.caseId,
        toolName: "listPreviousAttempts",
        input,
        output: payments,
    });

    return payments;
}