import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { recoveryCases } from "../db/schema.js";
import { DETECTION_CUTOFF, toIso } from "../generator/world.js";

export interface LiveCasesSummary {
  total: number;
  recovered: number;
  linkSent: number;
  recoveredPaise: number;
}

// Cases from real Razorpay orders a visitor created, which generateReport deliberately excludes from
// the measured batch. Counted separately so that work is visible without moving the fixed numbers.
export async function summariseLiveCases(
  dataSource: PaymentDataSource,
  fallback?: PaymentDataSource
): Promise<LiveCasesSummary> {
  const synthetic = new Set((await dataSource.listOrders(toIso(DETECTION_CUTOFF))).map((o) => o.id));
  const live = (await db.select().from(recoveryCases)).filter((c) => !synthetic.has(c.orderId));

  let recoveredPaise = 0;
  if (fallback) {
    for (const c of live.filter((c) => c.status === "RECOVERED")) {
      recoveredPaise += (await fallback.getOrder(c.orderId))?.amount_paise ?? 0;
    }
  }

  return {
    total: live.length,
    recovered: live.filter((c) => c.status === "RECOVERED").length,
    linkSent: live.filter((c) => c.status === "ACTION_EXECUTED").length,
    recoveredPaise,
  };
}
