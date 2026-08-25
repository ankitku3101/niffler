import z from "zod";
import type { PaymentDataSource } from "../data/source.js";
import type { PublicOrder } from "../domain/order.js";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema.js";
import { resolveCaseOrder } from "./resolveCase.js";

export const GetOrderInputSchema = z.object({
    caseId: z.number().int().positive()
});

export async function getOrder(dataSource: PaymentDataSource, rawInput: unknown): Promise<PublicOrder> {
    const input = GetOrderInputSchema.parse(rawInput);
    const { order } = await resolveCaseOrder(dataSource, input.caseId);

    await db.insert(auditLog).values({
        caseId: input.caseId,
        toolName: "getOrder",
        input,
        output: order,
    });

    return order;
}
