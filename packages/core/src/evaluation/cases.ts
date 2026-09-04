import { asc, eq } from "drizzle-orm";
import type { Diagnosis } from "../domain/diagnosis.js";
import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { DETECTION_CUTOFF, toIso } from "../generator/world.js";

export interface CaseSummary {
  id: number;
  orderId: string;
  status: string;
  amountPaise: number;
  diagnosis: string | null;
  recommendedAction: string | null;
  confidence: number | null;
  policyOverridden: boolean;
  /** When the case was last acted on. Drives the newest-first ordering. */
  updatedAt: string;
  // Order facts for describing a case with no diagnosis yet; only populated while it is DETECTED.
  failedAttempts: number;
  hasAuthorizedPayment: boolean;
  alreadyPaid: boolean;
}

export async function listCases(dataSource: PaymentDataSource, fallback?: PaymentDataSource): Promise<CaseSummary[]> {
  const orders = await dataSource.listOrders(toIso(DETECTION_CUTOFF));
  const amountByOrderId = new Map(orders.map((o) => [o.id, o.amount_paise]));

  // Live status, not the snapshot — an order paid since detection is what makes it a policy block.
  const liveOrders = await dataSource.listOrders();
  const paidOrderIds = new Set(liveOrders.filter((o) => o.status === "paid").map((o) => o.id));

  const cases = await db.select().from(recoveryCases);
  const diagnosisRows = await db.select().from(auditLog).where(eq(auditLog.toolName, "submitDiagnosis"));
  const diagnosisByCaseId = new Map(diagnosisRows.map((row) => [row.caseId, row.output as Diagnosis]));

  const policyRows = await db.select().from(auditLog).where(eq(auditLog.toolName, "policyCheck"));
  const overriddenCaseIds = new Set(
    policyRows.filter((row) => (row.output as { decision: string }).decision !== "ALLOWED").map((row) => row.caseId)
  );

  const summaries = await Promise.all(
    cases.map(async (c) => {
      const diagnosis = diagnosisByCaseId.get(c.id);
      const isSynthetic = amountByOrderId.has(c.orderId);
      let amountPaise = amountByOrderId.get(c.orderId);
      if (amountPaise === undefined && fallback) {
        amountPaise = (await fallback.getOrder(c.orderId))?.amount_paise;
      }

      // Primary source only: against a live provider this would be a network call per row.
      const needsSignals = isSynthetic && c.status === "DETECTED";
      const payments = needsSignals ? await dataSource.listPaymentsForOrder(c.orderId) : [];

      return {
        id: c.id,
        orderId: c.orderId,
        status: c.status,
        amountPaise: amountPaise ?? 0,
        diagnosis: diagnosis?.diagnosis ?? null,
        recommendedAction: diagnosis?.recommendedAction ?? null,
        confidence: diagnosis?.confidence ?? null,
        policyOverridden: overriddenCaseIds.has(c.id),
        updatedAt: c.updatedAt.toISOString(),
        failedAttempts: payments.filter((p) => p.status === "failed").length,
        hasAuthorizedPayment: payments.some((p) => p.status === "authorized"),
        alreadyPaid: needsSignals && paidOrderIds.has(c.orderId),
      };
    })
  );

  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface CaseDetail {
  id: number;
  orderId: string;
  status: string;
  amountPaise: number;
  auditTrail: {
    id: number;
    toolName: string;
    input: unknown;
    output: unknown;
    createdAt: string;
  }[];
}

export async function getCaseDetail(
  dataSource: PaymentDataSource,
  caseId: number,
  fallback?: PaymentDataSource
): Promise<CaseDetail | null> {
  const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId)).limit(1);
  if (!caseRow) return null;

  const order = (await dataSource.getOrder(caseRow.orderId)) ?? (await fallback?.getOrder(caseRow.orderId));
  const auditRows = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.caseId, caseId))
    .orderBy(asc(auditLog.createdAt));

  return {
    id: caseRow.id,
    orderId: caseRow.orderId,
    status: caseRow.status,
    amountPaise: order?.amount_paise ?? 0,
    auditTrail: auditRows.map((row) => ({
      id: row.id,
      toolName: row.toolName,
      input: row.input,
      output: row.output,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
