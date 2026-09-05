import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseCaseId, parseOrderId } from "./params.js";

describe("parseCaseId", () => {
    test("accepts a positive integer", () => {
        assert.equal(parseCaseId("1"), 1);
        assert.equal(parseCaseId("576"), 576);
    });

    test("rejects anything that is not one", () => {
        // Without this, Number("abc") is NaN, Postgres rejects the bind, and the caller is
        // told the database is unavailable when all they sent was a bad id.
        for (const input of ["abc", "", "0", "-1", "1.5", "1e3", " 1", "1 ", "0x10", "NaN"]) {
            assert.equal(parseCaseId(input), null, `expected ${JSON.stringify(input)} to be rejected`);
        }
    });

    test("rejects a missing param", () => {
        assert.equal(parseCaseId(undefined), null);
    });

    test("rejects a number too large to be a real id", () => {
        assert.equal(parseCaseId("9".repeat(30)), null);
    });
});

describe("parseOrderId", () => {
    test("accepts a Razorpay order id", () => {
        assert.equal(parseOrderId("order_TXJNgtumVt8AWE"), "order_TXJNgtumVt8AWE");
    });

    test("rejects anything else", () => {
        for (const input of ["junk", "", "order_", "pay_TXJNgtumVt8AWE", "order_ABC DEF", "order_ABC/../x"]) {
            assert.equal(parseOrderId(input), null, `expected ${JSON.stringify(input)} to be rejected`);
        }
    });

    test("rejects a missing param", () => {
        assert.equal(parseOrderId(undefined), null);
    });
});
