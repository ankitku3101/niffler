import { eq } from "drizzle-orm";
import type { PaymentDataSource } from "../data/source.js";
import type { Diagnosis, RecommendedAction } from "../domain/diagnosis.js";
import type { Payment } from "../domain/payment.js";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { DETECTION_CUTOFF, toIso } from "../generator/world.js";
import { isControlGroup } from "./holdout.js";

// The rules engine NIFFLER could have been: latest failure reason -> one action, no model involved.
// It exists to be compared against, not used — if the agent only ever reproduces this, the agent is
// not earning its place, and that is worth measuring rather than assuming either way.
export function baselineAction(payments: Payment[]): RecommendedAction {
  if (payments.some((p) => p.status === "authorized")) return "CAPTURE_PAYMENT";

  const lastFailure = [...payments].reverse().find((p) => p.status === "failed");
  if (!lastFailure || lastFailure.status !== "failed") return "ESCALATE";

  switch (lastFailure.error.reason) {
    case "card_blocked":
    case "card_expired":
      return "STOP";
    case "risk_blocked":
      return "ESCALATE";
    default:
      return "RECOVERY_LINK";
  }
}

export interface BaselineDivergence {
  caseId: number;
  orderId: string;
  amountPaise: number;
  baseline: RecommendedAction;
  agent: RecommendedAction;
  diagnosis: string;
  evidence: string[];
  readCustomerHistory: boolean;
}

export interface BaselineComparison {
  compared: number;
  agreed: number;
  agreementRate: number;
  /** Divergences where the agent had read beyond the error code before deciding. */
  divergedWithHistory: number;
  divergences: BaselineDivergence[];
}

export async function compareToBaseline(dataSource: PaymentDataSource): Promise<BaselineComparison> {
  const orders = await dataSource.listOrders(toIso(DETECTION_CUTOFF));
  const amountByOrderId = new Map(orders.map((o) => [o.id, o.amount_paise]));

  const allCases = await db.select().from(recoveryCases);
  const treatment = allCases.filter((c) => amountByOrderId.has(c.orderId) && !isControlGroup(c.orderId));

  const diagnosisRows = await db.select().from(auditLog).where(eq(auditLog.toolName, "submitDiagnosis"));
  const diagnosisByCaseId = new Map(diagnosisRows.map((r) => [r.caseId, r.output as Diagnosis]));

  const historyRows = await db.select().from(auditLog).where(eq(auditLog.toolName, "getCustomerHistory"));
  const readHistoryCaseIds = new Set(historyRows.map((r) => r.caseId));

  let compared = 0;
  let agreed = 0;
  const divergences: BaselineDivergence[] = [];

  for (const c of treatment) {
    const diagnosis = diagnosisByCaseId.get(c.id);
    if (!diagnosis) continue;

    const payments = await dataSource.listPaymentsForOrder(c.orderId);
    const baseline = baselineAction(payments);
    compared++;

    if (baseline === diagnosis.recommendedAction) {
      agreed++;
      continue;
    }

    divergences.push({
      caseId: c.id,
      orderId: c.orderId,
      amountPaise: amountByOrderId.get(c.orderId) ?? 0,
      baseline,
      agent: diagnosis.recommendedAction,
      diagnosis: diagnosis.diagnosis,
      evidence: diagnosis.evidence,
      readCustomerHistory: readHistoryCaseIds.has(c.id),
    });
  }

  return {
    compared,
    agreed,
    agreementRate: compared === 0 ? 0 : agreed / compared,
    divergedWithHistory: divergences.filter((d) => d.readCustomerHistory).length,
    divergences,
  };
}
