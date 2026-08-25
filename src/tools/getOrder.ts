import z from "zod";
import type { PaymentDataSource } from "../data/source.js";
import type { PublicOrder } from "../domain/order.js";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const GetOrderInputSchema = z.object({
    caseId: z.number().int().positive()
});


export async function getOrder(dataSource: PaymentDataSource, rawInput: unknown): Promise<PublicOrder> {
    const input = GetOrderInputSchema.parse(rawInput);

    const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, input.caseId))

    if(!caseRow) throw new Error(`${input.caseId} - Case not found`);

    const order = await dataSource.getOrder(caseRow.orderId);

    if(!order) throw new Error(`${caseRow.orderId} -  Order not found`);

    await db.insert(auditLog).values({
        caseId: input.caseId,
        toolName: "getOrder",
        input,
        output: order,
    });

    return order;
}
