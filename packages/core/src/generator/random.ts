// A seeded random number generator. Unlike Math.random(), the same seed always
// produces the same sequence, which is what makes the synthetic dataset
// reproducible across runs.

// Converts a text seed like "niffler-v1" into the 32-bit number the generator
// needs to start from.
function seedFromString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

// mulberry32: a small, well-known PRNG. Returns a function that yields the next
// value in [0, 1) on each call.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


export interface Rng {
  /** A value in [0, 1), like Math.random(). */
  next(): number;
  /** A whole number from min to max, both ends included. */
  int(min: number, max: number): number;
  /** One element, every element equally likely. */
  pick<T>(items: readonly T[]): T;
  /** One element, chosen in proportion to its weight. */
  weighted<T>(items: readonly { value: T; weight: number }[]): T;
  /** A new array with the same elements in random order. */
  shuffle<T>(items: readonly T[]): T[];
  /** A Razorpay-shaped id, e.g. id("pay") -> "pay_9Kx7fQ2mVnB3dR". */
  id(prefix: string): string;
  /** An independent generator, so changes to one part of the dataset
   *  cannot shift the values used by another. */
  fork(label: string): Rng;
}


const ID_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_LENGTH = 14;


export function makeRng(seed: string): Rng {
  const rand = mulberry32(seedFromString(seed));

  const next = (): number => rand();

  const int = (min: number, max: number): number =>
    min + Math.floor(rand() * (max - min + 1));

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error("pick() called on empty array");
    return items[int(0, items.length - 1)]!;
  };

  const weighted = <T,>(items: readonly { value: T; weight: number }[]): T => {
    if (items.length === 0) throw new Error("weighted() called on empty array");

    let total = 0;
    for (const item of items) total += item.weight;

    let r = rand() * total;
    for (const item of items) {
      r -= item.weight;
      if (r < 0) return item.value;
    }

    // Only reachable through floating-point rounding at the very top of the range.
    return items[items.length - 1]!.value;
  };

  const shuffle = <T,>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      const temp = out[i]!;
      out[i] = out[j]!;
      out[j] = temp;
    }
    return out;
  };

  const id = (prefix: string): string => {
    let out = "";
    for (let i = 0; i < ID_LENGTH; i++) {
      out += ID_ALPHABET.charAt(int(0, ID_ALPHABET.length - 1));
    }
    return `${prefix}_${out}`;
  };

  const fork = (label: string): Rng => makeRng(`${seed}:${label}`);

  return { next, int, pick, weighted, shuffle, id, fork };
}
