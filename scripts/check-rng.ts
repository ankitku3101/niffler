import { makeRng } from "../src/generator/random.js";

const draw = (seed: string) => {
  const rng = makeRng(seed);
  return Array.from({ length: 200 }, () => rng.next());
};

const a = JSON.stringify(draw("niffler-v1"));
const b = JSON.stringify(draw("niffler-v1"));
const c = JSON.stringify(draw("niffler-v2"));

console.log("same seed reproduces:  ", a === b);
console.log("different seed differs:", a !== c);

const rng = makeRng("niffler-v1");
console.log("id:      ", rng.id("pay"));
console.log("int:     ", Array.from({ length: 10 }, () => rng.int(1, 6)));
console.log("shuffle: ", rng.shuffle(["a", "b", "c", "d", "e"]));

// 90/10 split — expect roughly 900 cheap out of 1000.
const picks = Array.from({ length: 1000 }, () =>
  rng.weighted([
    { value: "cheap", weight: 90 },
    { value: "expensive", weight: 10 },
  ])
);
console.log("weighted:", picks.filter((p) => p === "cheap").length, "cheap / 1000");

// Forked generators must be independent of each other.
const parent = makeRng("niffler-v1");
console.log("fork differs:", parent.fork("a").next() !== parent.fork("b").next());
