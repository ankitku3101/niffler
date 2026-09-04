import type { EvaluationOracle, PaymentDataSource } from "../data/source.js";
import type { Customer, Payment, PublicOrder, ScenarioClass } from "../domain/index.js";

export interface DatasetSummary {
  totals: {
    customers: number;
    orders: number;
    payments: number;
    failedPayments: number;
    collectedPaise: number;
    atRiskPaise: number;
  };
  scenarios: { name: ScenarioClass; count: number }[];
  sample: {
    order: PublicOrder;
    payments: Payment[];
    customer: Customer | null;
  };
}

// Aggregate counts only. Per-order scenario labels stay behind EvaluationOracle so the separation
// that keeps ground truth away from the model isn't undone by a transparency endpoint.
export async function summariseDataset(
  dataSource: PaymentDataSource & EvaluationOracle
): Promise<DatasetSummary> {
  const orders = await dataSource.listOrders();

  const customerIds = new Set<string>();
  const scenarioCounts = new Map<ScenarioClass, number>();
  let payments = 0;
  let failedPayments = 0;
  let collectedPaise = 0;
  let atRiskPaise = 0;

  for (const order of orders) {
    customerIds.add(order.customer_id);

    const scenario = await dataSource.groundTruthFor(order.id);
    if (scenario) scenarioCounts.set(scenario, (scenarioCounts.get(scenario) ?? 0) + 1);

    const orderPayments = await dataSource.listPaymentsForOrder(order.id);
    payments += orderPayments.length;
    failedPayments += orderPayments.filter((p) => p.status === "failed").length;

    if (order.status === "paid") collectedPaise += order.amount_paise;
    else if (order.status === "attempted") atRiskPaise += order.amount_paise;
  }

  // A repeat_failure order shows the most: several attempts, several failure reasons, one customer.
  const sampleOrder =
    (await firstMatching(dataSource, orders, "repeat_failure")) ?? orders[0]!;

  return {
    totals: {
      customers: customerIds.size,
      orders: orders.length,
      payments,
      failedPayments,
      collectedPaise,
      atRiskPaise,
    },
    scenarios: [...scenarioCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    sample: {
      order: sampleOrder,
      payments: await dataSource.listPaymentsForOrder(sampleOrder.id),
      customer: await dataSource.getCustomer(sampleOrder.customer_id),
    },
  };
}

async function firstMatching(
  oracle: EvaluationOracle,
  orders: PublicOrder[],
  scenario: ScenarioClass
): Promise<PublicOrder | null> {
  for (const order of orders) {
    if ((await oracle.groundTruthFor(order.id)) === scenario) return order;
  }
  return null;
}
