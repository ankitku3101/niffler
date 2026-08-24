import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import type { PaymentDataSource } from "../src/data/source.js";
import { DETECTION_CUTOFF, toIso, WORLD_NOW } from "../src/generator/world.js";

const concrete = new JsonPaymentDataSource();

// Held through the interface, which is all any consumer downstream ever gets.
const source: PaymentDataSource = concrete;

const now = await source.now();
console.log("now:", now, "| WORLD_NOW:", toIso(WORLD_NOW));

const live = await source.listOrders();
const atCutoff = await source.listOrders(toIso(DETECTION_CUTOFF));
console.log("orders live:", live.length, "| at detection cutoff:", atCutoff.length);

// _groundTruth must not survive the interface.
const leaked = live.filter((o) => "_groundTruth" in o);
console.log("orders leaking _groundTruth:", leaked.length);

// The self_recovered demo: unpaid when the batch was taken, paid by now.
const paidAtCutoff = new Set(atCutoff.filter((o) => o.status === "paid").map((o) => o.id));
const settledSince = live.filter((o) => o.status === "paid" && !paidAtCutoff.has(o.id));
console.log("\nunpaid at cutoff but paid now:", settledSince.length);

for (const o of settledSince.slice(0, 3)) {
  const truth = await concrete.groundTruthFor(o.id);
  const payments = await source.listPaymentsForOrder(o.id);
  console.log(
    ` ${o.id}  ${truth}  attempts=${payments.length}  final=${payments.at(-1)!.status}`
  );
}

// A customer with history worth investigating.
const counts = new Map<string, number>();
for (const o of live) counts.set(o.customer_id, (counts.get(o.customer_id) ?? 0) + 1);
const busiest = [...counts].sort((a, b) => b[1] - a[1])[0]!;

const customer = await source.getCustomer(busiest[0]);
const theirOrders = await source.listOrdersForCustomer(busiest[0]);
const theirPayments = await source.listPaymentsForCustomer(busiest[0]);
console.log(`\nbusiest customer ${customer!.email}`);
console.log(
  `  ${theirOrders.length} orders,`,
  `${theirPayments.length} payments,`,
  `${theirPayments.filter((p) => p.status === "failed").length} failed,`,
  `${theirOrders.filter((o) => o.status !== "paid").length} still unpaid`
);

// Unknown ids resolve to null rather than throwing.
console.log("\nunknown order ->", await source.getOrder("order_nope"));
console.log("unknown customer ->", await source.getCustomer("cust_nope"));
