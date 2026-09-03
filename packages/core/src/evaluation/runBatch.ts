import { eq } from "drizzle-orm";
import type { LlmClient } from "../agent/llmClient.js";
import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { recoveryCases } from "../db/schema.js";
import { isControlGroup } from "./holdout.js";
import { recoverCase } from "../agent/recoverCase.js";

export async function runBatch(
    dataSource: PaymentDataSource,
    llmClient: LlmClient,
    maxAttempts: number,
    limit?: number
): Promise<{ processed: number; succeeded: number; failed: number }> {

    const detectedCases = await db.select().from(recoveryCases).where(eq(recoveryCases.status, "DETECTED"));

    const treatmentCases = detectedCases.filter((c) => !isControlGroup(c.orderId));
    
    const casesToProcess = limit !== undefined ? treatmentCases.slice(0, limit) : treatmentCases;

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const caseRow of casesToProcess) {
        processed++;
        try {
            const result = await recoverCase(dataSource, caseRow.id, llmClient, maxAttempts);
            succeeded++;
            console.log(`[${processed}/${casesToProcess.length}] case ${caseRow.id}: ${result.outcome.status}`);
        } catch (error) {
            failed++;
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[${processed}/${casesToProcess.length}] case ${caseRow.id} FAILED:`, message);
        }
    }

    return { processed, succeeded, failed };

}
