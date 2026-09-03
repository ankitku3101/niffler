// The synthetic world has a fixed clock. Every timestamp is derived from
// WORLD_EPOCH rather than the real current time, so the dataset — and every
// metric computed from it — stays identical no matter when it is generated.

/** The instant the observation window opens. */
export const WORLD_EPOCH = Date.UTC(2026, 2, 1, 0, 0, 0); // 2026-03-01T00:00:00Z

export const MINUTE = 1;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** How long the observation window runs. Orders are created inside it. */
export const WORLD_SPAN = 90 * DAY;

/** The snapshot instant. Everything in the dataset happened before this. */
export const WORLD_NOW = WORLD_SPAN;

/** Converts a world minute into the ISO timestamp the domain schemas expect. */
export function toIso(minute: number): string {
  return new Date(WORLD_EPOCH + minute * 60_000).toISOString();
}

const FIRST_NAMES = [
  "aarav", "diya", "vihaan", "ananya", "arjun", "isha", "kabir", "meera",
  "rohan", "priya", "aditya", "sneha", "karthik", "nisha", "rahul", "tanvi",
  "siddharth", "pooja", "manav", "riya", "ankit", "adyasha", "anish", "debasish", "hitesh", "syed",
];

const LAST_NAMES = [
  "sharma", "patel", "reddy", "iyer", "nair", "gupta", "mehta", "singh",
  "banerjee", "kulkarni", "chopra", "desai", "rao", "verma", "joshi", "bose",
  "kumar", "nanda", "anand", "sahu", "mohanty", "hussain",
];

const EMAIL_DOMAINS = ["gmail.com", "outlook.com", "yahoo.in", "protonmail.com"];


import type { Rng } from "./random.js";
import type { Customer } from "../domain/index.js";

function makeCustomer(rng: Rng): Customer {
  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);

  // Customers signed up before the observation window opened, so every order
  // inside the window belongs to an account that already existed.
  const createdAt = -rng.int(1 * DAY, 540 * DAY);

  return {
    id: rng.id("cust"),
    email: `${first}.${last}${rng.int(1, 99)}@${rng.pick(EMAIL_DOMAINS)}`,
    contact: `+91${rng.int(6, 9)}${String(rng.int(0, 999_999_999)).padStart(9, "0")}`,
    created_at: toIso(createdAt),
  };
}


export const CUSTOMER_COUNT = 200;

export function makeCustomers(rng: Rng): Customer[] {
  return Array.from({ length: CUSTOMER_COUNT }, (_, i) =>
    makeCustomer(rng.fork(`customer:${i}`))
  );
}

/**
 * When the recovery batch is assembled. Orders are selected as candidates from
 * the state of the world at this instant, then acted on shortly after — so an
 * order can be paid between selection and action. That gap is what the
 * self_recovered scenario exercises.
 */
export const DETECTION_CUTOFF = WORLD_NOW - 6 * HOUR;
