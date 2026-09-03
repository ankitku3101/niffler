import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { createRecoveryCases } from "./createCases.js";
import { detectCandidates } from "../detection/candidates.js";
import { DETECTION_CUTOFF, toIso } from "../generator/world.js";
import type { PaymentDataSource } from "../data/source.js";

export interface ResetSummary {
  auditRowsDeleted: number;
  casesDeleted: number;
  candidatesDetected: number;
  revenueAtRiskPaise: number;
  casesCreated: number;
}

// audit_log.case_id is onDelete: "restrict", so audit_log must be deleted first.
export async function resetRecovery(dataSource: PaymentDataSource): Promise<ResetSummary> {
  const deletedAuditRows = await db.delete(auditLog).returning({ id: auditLog.id });
  const deletedCaseRows = await db.delete(recoveryCases).returning({ id: recoveryCases.id });

  const orders = await dataSource.listOrders(toIso(DETECTION_CUTOFF));
  const { candidates, revenueAtRiskPaise } = detectCandidates(orders);
  const orderIds = candidates.map((o) => o.id);

  const casesCreated = await createRecoveryCases(orderIds);

  return {
    auditRowsDeleted: deletedAuditRows.length,
    casesDeleted: deletedCaseRows.length,
    candidatesDetected: orderIds.length,
    revenueAtRiskPaise,
    casesCreated,
  };
}
