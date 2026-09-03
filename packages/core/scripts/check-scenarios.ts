import { makeRng } from "../src/generator/random.js";
import { DAY, toIso, WORLD_NOW } from "../src/generator/world.js";
import { SCENARIO_SPAN, SCENARIO_WRITERS } from "../src/generator/scenarios.js";
import { PaymentSchema, ScenarioClassSchema } from "../src/domain/index.js";

const rng = makeRng("niffler-v1");

for (const scenario of ScenarioClassSchema.options) {
  const writer = SCENARIO_WRITERS[scenario];
  let minAttempts = Infinity;
  let maxAttempts = 0;
  let paid = 0;

  for (let i = 0; i < 300; i++) {
    const latest = WORLD_NOW - SCENARIO_SPAN[scenario];
    // Every 10th sample is placed at the last permitted minute. Ordering bugs
    // live at the end of the window and random placement rarely reaches it.
    const orderMinute = i % 10 === 0 ? latest : rng.int(0, latest);

    const payments = writer({
      rng: rng.fork(`${scenario}:${i}`),
      seed: { orderId: "order_x", customerId: "cust_x", amountPaise: 149900 },
      orderMinute,
    });

    for (const p of payments) PaymentSchema.parse(p);

    // Attempts must be in chronological order.
    const times = payments.map((p) => Date.parse(p.created_at));
    for (let k = 1; k < times.length; k++) {
      if (times[k]! < times[k - 1]!) throw new Error(`${scenario}: out of order`);
    }

    minAttempts = Math.min(minAttempts, payments.length);
    maxAttempts = Math.max(maxAttempts, payments.length);
    if (payments.some((p) => p.status === "captured")) paid++;

    // Nothing may happen after the snapshot instant.
    const lastEvent = Math.max(
      ...payments.map((p) =>
        Date.parse("captured_at" in p ? p.captured_at : p.created_at)
      )
    );
    if (lastEvent > Date.parse(toIso(WORLD_NOW))) {
      throw new Error(`${scenario}: payment after WORLD_NOW`);
    }
  }

  console.log(
    scenario.padEnd(22),
    `attempts ${minAttempts}-${maxAttempts}`.padEnd(16),
    `paid ${((paid / 300) * 100).toFixed(0)}%`.padEnd(10),
    `span ${(SCENARIO_SPAN[scenario] / DAY).toFixed(1)}d`
  );
}

console.log("WORLD_NOW is world minute", WORLD_NOW);
