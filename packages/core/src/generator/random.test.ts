import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { makeRng } from "./random.js";

const draw = (seed: string, n = 20) => {
    const rng = makeRng(seed);
    return Array.from({ length: n }, () => rng.next());
};

describe("makeRng", () => {
    test("the same seed reproduces the same sequence", () => {
        // data/world.json is committed and the metrics are compared across runs, so this has
        // to hold forever, not just within one session.
        assert.deepEqual(draw("niffler-v1", 50), draw("niffler-v1", 50));
    });

    test("different seeds produce different sequences", () => {
        assert.notDeepEqual(draw("seed-a"), draw("seed-b"));
    });

    test("stays inside [0, 1)", () => {
        const rng = makeRng("bounds");
        for (let i = 0; i < 1000; i++) {
            const value = rng.next();
            assert.ok(value >= 0 && value < 1, `got ${value}`);
        }
    });

    test("int() reaches both ends and never leaves them", () => {
        const rng = makeRng("ints");
        const seen = new Set<number>();
        for (let i = 0; i < 500; i++) seen.add(rng.int(1, 4));
        assert.deepEqual([...seen].sort(), [1, 2, 3, 4]);
    });

    test("a fork is deterministic and independent of its parent", () => {
        // What the control-group split rests on: forking by order id gives a stable draw that
        // nothing else consuming the parent generator can shift.
        assert.equal(makeRng("s").fork("order_1").next(), makeRng("s").fork("order_1").next());
        assert.notEqual(makeRng("s").fork("order_1").next(), makeRng("s").fork("order_2").next());

        const used = makeRng("s");
        used.next();
        used.next();
        assert.equal(used.fork("order_1").next(), makeRng("s").fork("order_1").next());
    });

    test("shuffle keeps every element", () => {
        const input = [1, 2, 3, 4, 5, 6, 7, 8];
        const out = makeRng("shuffle").shuffle(input);
        assert.deepEqual([...out].sort((a, b) => a - b), input);
    });
});
