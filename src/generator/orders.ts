// Decides what the dataset contains before anything is built: which scenario
// each order represents, who placed it, for how much, and when. Keeping the
// plan separate from construction puts every distribution decision in one place.

import type { Customer, ScenarioClass } from "../domain/index.js";
import type { Rng } from "./random.js";
import { SCENARIO_SPAN } from "./scenarios.js";
import { DAY, WORLD_NOW } from "./world.js";

export const ORDER_COUNT = 500;

// Most orders resolve on their own. A merchant whose payments mostly fail is
// not a realistic merchant, and customers need a payment history worth
// investigating before a failure means anything.
export const SUCCESS_COUNT = 300;

export interface OrderPlan {
  scenario: ScenarioClass;
  customerId: string;
  amountPaise: number;
  orderMinute: number;
}

// Shares of the orders that do not resolve on their own (project brief §22.4).
const FAILURE_SHARES: Record<Exclude<ScenarioClass, "success">, number> = {
  transient_gateway: 0.2,
  auth_dropoff: 0.2,
  insufficient_funds: 0.15,
  hard_decline: 0.15,
  bank_downtime: 0.08,
  repeat_failure: 0.08,
  authorized_uncaptured: 0.05,
  self_recovered: 0.05,
  fraud_block: 0.04,
};

// Realistic price points, weighted so small orders dominate. Spreading amounts
// evenly across a range would put the average order in the tens of thousands
// and make every revenue figure downstream implausible.
const PRICE_POINTS = [
  { value: 29_900, weight: 30 },
  { value: 59_900, weight: 25 },
  { value: 99_900, weight: 20 },
  { value: 249_900, weight: 12 },
  { value: 499_900, weight: 8 },
  { value: 1_299_900, weight: 4 },
  { value: 4_499_900, weight: 1 },
];

// One bank outage: a narrow window in which issuer_unavailable failures cluster.
// Everything else in the dataset is independent, which on its own would make the
// data unrealistically tidy — real incidents arrive in bursts.
const DOWNTIME_DURATION = 90;

/**
 * Builds the exact multiset of scenario labels, then shuffles it. Sampling each
 * order independently would leave the realised shares a few percent off spec;
 * dealing a fixed deck makes them exact.
 */
function dealScenarios(rng: Rng): ScenarioClass[] {
  const failureCount = ORDER_COUNT - SUCCESS_COUNT;
  const deck: ScenarioClass[] = Array.from({ length: SUCCESS_COUNT }, () => "success");

  for (const [scenario, share] of Object.entries(FAILURE_SHARES) as [
    ScenarioClass,
    number,
  ][]) {
    const n = Math.floor(failureCount * share);
    for (let i = 0; i < n; i++) deck.push(scenario);
  }

  // Rounding can leave the deck short; top it up so the count is always exact.
  while (deck.length < ORDER_COUNT) deck.push("transient_gateway");

  return rng.shuffle(deck);
}

/**
 * Assigns each customer a relative purchase frequency. Real merchants have a
 * few frequent buyers and a long tail of one-time customers, and that shape is
 * what gives some recovery cases a history to reason about.
 */
function customerWeights(rng: Rng, customers: Customer[]) {
  return customers.map((c) => ({
    value: c.id,
    weight: rng.weighted([
      { value: 1, weight: 50 },
      { value: 2, weight: 25 },
      { value: 4, weight: 15 },
      { value: 8, weight: 8 },
      { value: 16, weight: 2 },
    ]),
  }));
}

export function planOrders(rng: Rng, customers: Customer[]): OrderPlan[] {
  const scenarios = dealScenarios(rng);
  const weights = customerWeights(rng, customers);
  const downtimeStart = rng.int(10 * DAY, 80 * DAY);

  return scenarios.map((scenario, i) => {
    const plan = rng.fork(`order:${i}`);

    // SCENARIO_SPAN reserves room at the end of the window, so no order can be
    // placed so late that its own payments would fall after WORLD_NOW.
    const orderMinute =
      scenario === "bank_downtime"
        ? downtimeStart + plan.int(0, DOWNTIME_DURATION)
        : plan.int(0, WORLD_NOW - SCENARIO_SPAN[scenario]);

    return {
      scenario,
      customerId: plan.weighted(weights),
      amountPaise: plan.weighted(PRICE_POINTS),
      orderMinute,
    };
  });
}
