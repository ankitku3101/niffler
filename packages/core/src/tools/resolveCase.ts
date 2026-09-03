import { eq } from "drizzle-orm";
import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { recoveryCases } from "../db/schema.js";
import type { PublicOrder } from "../domain/order.js";


export async function resolveCaseOrder(
  dataSource: PaymentDataSource,
  caseId: number
): Promise<{ caseRow: typeof recoveryCases.$inferSelect; order: PublicOrder }> {
    
    const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId))

    if(!caseRow) throw new Error(`${caseId} - Case not found`);

    const order = await dataSource.getOrder(caseRow.orderId);

    if(!order) throw new Error(`${caseRow.orderId} -  Order not found`);

    return {caseRow, order}
}