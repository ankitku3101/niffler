import { isControlGroup } from "../src/evaluation/holdout.js";
import { detectCandidates } from "../src/detection/candidates.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { DETECTION_CUTOFF, toIso } from "../src/generator/world.js";

const source = new JsonPaymentDataSource();
const orders = await source.listOrders(toIso(DETECTION_CUTOFF));
const { candidates } = detectCandidates(orders);

// ---------------------------------------------------------------------------
// Deterministic: the same orderId always gets the same assignment.
// ---------------------------------------------------------------------------

for (const order of candidates.slice(0, 20)) {
  const first = isControlGroup(order.id);
  const second = isControlGroup(order.id);
  if (first !== second) {
    throw new Error(`isControlGroup(${order.id}) is not deterministic`);
  }
}
console.log("deterministic: same orderId -> same assignment, checked on 20 orders");

// ---------------------------------------------------------------------------
// Roughly 20% control across the real candidate set, and not degenerate
// (i.e. fork() is actually giving each order an independent draw, not the
// same value for every order).
// ---------------------------------------------------------------------------

const controlOrders = candidates.filter((o) => isControlGroup(o.id));
const controlFraction = controlOrders.length / candidates.length;

console.log(
  `control: ${controlOrders.length} / ${candidates.length} candidates (${(controlFraction * 100).toFixed(1)}%)`
);

if (controlFraction < 0.1 || controlFraction > 0.3) {
  throw new Error(`control fraction ${controlFraction} is too far from the target 20% (also rules out every order landing in the same group)`);
}

console.log("check-holdout: OK");
