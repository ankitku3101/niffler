import { detectCandidates } from "../src/detection/candidates.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { DETECTION_CUTOFF, toIso } from "../src/generator/world.js";

const rupees = (paise: number) =>
  "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const source = new JsonPaymentDataSource();

const orders = await source.listOrders(toIso(DETECTION_CUTOFF));
const { candidates, revenueAtRiskPaise } = detectCandidates(orders);

console.log("orders at detection cutoff:", orders.length);
console.log("recovery candidates:", candidates.length);
console.log("revenue at risk:", rupees(revenueAtRiskPaise), `(${revenueAtRiskPaise} paise)`);
