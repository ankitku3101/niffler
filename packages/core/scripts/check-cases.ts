import { createRecoveryCases } from "../src/cases/createCases.js";
import { detectCandidates } from "../src/detection/candidates.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { DETECTION_CUTOFF, toIso } from "../src/generator/world.js";

const source = new JsonPaymentDataSource();

const orders = await source.listOrders(toIso(DETECTION_CUTOFF));
const { candidates } = detectCandidates(orders);
const orderIds = candidates.map((o) => o.id);

const firstRun = await createRecoveryCases(orderIds);
console.log("first run — cases created:", firstRun, "/ candidates:", orderIds.length);

const secondRun = await createRecoveryCases(orderIds);
console.log("second run (same candidates) — cases created:", secondRun);

if (secondRun !== 0) {
  throw new Error("idempotency broken: re-running created duplicate cases");
}

process.exit(0);
