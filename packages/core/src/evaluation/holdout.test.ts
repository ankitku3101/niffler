import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isControlGroup } from "./holdout.js";

const ids = Array.from({ length: 2000 }, (_, i) => `order_test_${i}`);

describe("isControlGroup", () => {
    test("gives the same answer every time for the same order", () => {
        // Nothing stores the assignment. It has to be recomputable at report time, long after
        // the run, or attributable lift cannot be measured at all.
        for (const id of ids.slice(0, 50)) {
            assert.equal(isControlGroup(id), isControlGroup(id));
        }
    });

    test("splits roughly one order in five into the control group", () => {
        const share = ids.filter(isControlGroup).length / ids.length;
        assert.ok(share > 0.15 && share < 0.25, `share was ${share}`);
    });

    test("is not degenerate — both groups are populated", () => {
        assert.ok(ids.some(isControlGroup));
        assert.ok(ids.some((id) => !isControlGroup(id)));
    });

    test("does not depend on the order ids arriving in any particular sequence", () => {
        const forwards = ids.map(isControlGroup);
        const backwards = [...ids].reverse().map(isControlGroup).reverse();
        assert.deepEqual(forwards, backwards);
    });
});
