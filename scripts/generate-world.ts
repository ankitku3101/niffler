// Generates data/world.json and prints a summary of what was produced.
// Deterministic: the same seed always writes a byte-identical file.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { assertWorldInvariants, buildWorld } from "../src/generator/build.js";
import type { ScenarioClass } from "../src/domain/index.js";

const SEED = process.argv[2] ?? "niffler-v1";
const OUT = resolve(process.cwd(), "data/world.json");

const world = buildWorld(SEED);
assertWorldInvariants(world);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(world, null, 2) + "\n", "utf8");

const rupees = (paise: number) =>
  "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const unpaid = world.orders.filter((o) => o.status !== "paid");
const paid = world.orders.filter((o) => o.status === "paid");
const atRisk = unpaid.reduce((sum, o) => sum + o.amount_paise, 0);
const collected = paid.reduce((sum, o) => sum + o.amount_paise, 0);

console.log(`seed "${SEED}" -> ${OUT}`);
console.log(`snapshot taken at ${world.world_now}\n`);

console.log("customers        ", world.customers.length);
console.log("orders           ", world.orders.length);
console.log("payments         ", world.payments.length);
console.log("failed payments  ", world.payments.filter((p) => p.status === "failed").length);
console.log();
console.log("collected        ", rupees(collected), `(${paid.length} orders)`);
console.log("REVENUE AT RISK  ", rupees(atRisk), `(${unpaid.length} orders)`);
console.log();

const counts = new Map<ScenarioClass, { orders: number; paise: number }>();
for (const o of world.orders) {
  const c = counts.get(o._groundTruth) ?? { orders: 0, paise: 0 };
  c.orders++;
  c.paise += o.amount_paise;
  counts.set(o._groundTruth, c);
}

console.log("scenario               orders   value");
for (const [scenario, c] of [...counts].sort((a, b) => b[1].orders - a[1].orders)) {
  console.log(
    "  " + scenario.padEnd(22),
    String(c.orders).padStart(4),
    rupees(c.paise).padStart(12)
  );
}
