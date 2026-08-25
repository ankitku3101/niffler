import { db } from "../db/client.js";
import { recoveryCases } from "../db/schema.js";


export async function createRecoveryCases(orderIds: string[]): Promise<number> {
    
    if (orderIds.length===0) return 0;
    
    const inserted = await db
        .insert(recoveryCases)
        .values(orderIds.map((orderId) => ({orderId})))
        .onConflictDoNothing({ target: recoveryCases.orderId})
        .returning({ id: recoveryCases.id });
    return inserted.length;
}
