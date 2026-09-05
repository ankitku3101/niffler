import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { authorizedPayment, capturedPayment, failedPayment, order } from "../testing/fixtures.js";
import {
    checkAttemptLimit,
    checkEligibility,
    checkIterationLimit,
    checkPriorRecoveryLink,
    combinePolicyChecks,
} from "./policy.js";

describe("checkEligibility", () => {
    test("denies an order that has already been paid", () => {
        const { decision, reason } = checkEligibility(order({ status: "paid" }));
        assert.equal(decision, "DENIED");
        assert.match(reason, /already paid/);
    });

    test("allows an order with failed attempts", () => {
        assert.equal(checkEligibility(order({ status: "attempted" })).decision, "ALLOWED");
    });

    test("allows an order nobody has tried to pay yet", () => {
        assert.equal(checkEligibility(order({ status: "created" })).decision, "ALLOWED");
    });
});

describe("checkAttemptLimit", () => {
    test("allows a customer who is still under the limit", () => {
        const payments = [failedPayment("gateway_timeout"), failedPayment("insufficient_funds")];
        assert.equal(checkAttemptLimit(payments, 3).decision, "ALLOWED");
    });

    test("asks for a human at the limit, rather than denying outright", () => {
        const payments = [
            failedPayment("gateway_timeout"),
            failedPayment("insufficient_funds"),
            failedPayment("otp_not_entered"),
        ];
        // Not DENIED: hitting the limit means a person should look, not that the case is dead.
        assert.equal(checkAttemptLimit(payments, 3).decision, "REQUIRES_HUMAN_APPROVAL");
    });

    test("still asks for a human past the limit", () => {
        const payments = Array.from({ length: 5 }, () => failedPayment("gateway_timeout"));
        assert.equal(checkAttemptLimit(payments, 3).decision, "REQUIRES_HUMAN_APPROVAL");
    });

    test("counts only failed payments, not successful or pending ones", () => {
        const payments = [
            failedPayment("gateway_timeout"),
            capturedPayment(),
            authorizedPayment(),
            capturedPayment({ id: "pay_captured_2" }),
        ];
        const { decision, reason } = checkAttemptLimit(payments, 2);
        assert.equal(decision, "ALLOWED");
        assert.match(reason, /^1 failed attempt /);
    });

    test("allows everything when there are no attempts at all", () => {
        assert.equal(checkAttemptLimit([], 3).decision, "ALLOWED");
    });

    test("says 'attempt' for one and 'attempts' for several", () => {
        assert.match(checkAttemptLimit([failedPayment("card_expired")], 3).reason, /1 failed attempt /);
        assert.match(
            checkAttemptLimit([failedPayment("card_expired"), failedPayment("card_blocked")], 3).reason,
            /2 failed attempts /
        );
    });
});

describe("checkPriorRecoveryLink", () => {
    test("denies a second link once one has been paid", () => {
        // A paid link collects the money without settling the original order, so this is the
        // only rule that can see it. checkEligibility would still call the order unpaid.
        const { decision, reason } = checkPriorRecoveryLink({ issued: true, paid: true });
        assert.equal(decision, "DENIED");
        assert.match(reason, /already paid/);
    });

    test("asks for a human while a link is outstanding", () => {
        assert.equal(
            checkPriorRecoveryLink({ issued: true, paid: false }).decision,
            "REQUIRES_HUMAN_APPROVAL"
        );
    });

    test("allows the first link", () => {
        assert.equal(checkPriorRecoveryLink({ issued: false, paid: false }).decision, "ALLOWED");
    });
});

describe("checkIterationLimit", () => {
    test("allows the loop to continue below the cap", () => {
        assert.equal(checkIterationLimit(3, 10).decision, "ALLOWED");
    });

    test("stops the loop at the cap by asking for a human", () => {
        assert.equal(checkIterationLimit(10, 10).decision, "REQUIRES_HUMAN_APPROVAL");
        assert.equal(checkIterationLimit(11, 10).decision, "REQUIRES_HUMAN_APPROVAL");
    });
});

describe("combinePolicyChecks", () => {
    const allowed = { decision: "ALLOWED", reason: "a" } as const;
    const human = { decision: "REQUIRES_HUMAN_APPROVAL", reason: "b" } as const;
    const denied = { decision: "DENIED", reason: "c" } as const;

    test("the strictest rule wins, whatever order the rules ran in", () => {
        assert.equal(combinePolicyChecks([allowed, human, denied]).decision, "DENIED");
        assert.equal(combinePolicyChecks([denied, allowed, human]).decision, "DENIED");
        assert.equal(combinePolicyChecks([allowed, human]).decision, "REQUIRES_HUMAN_APPROVAL");
        assert.equal(combinePolicyChecks([allowed, allowed]).decision, "ALLOWED");
    });

    test("keeps every reason, not just the deciding one", () => {
        // The audit trail should show what each rule said, including the ones that agreed.
        assert.deepEqual(combinePolicyChecks([allowed, human, denied]).reasons, ["a", "b", "c"]);
    });

    test("works with a single rule", () => {
        assert.deepEqual(combinePolicyChecks([denied]), { decision: "DENIED", reasons: ["c"] });
    });

    test("throws on no rules at all, rather than inventing a verdict", () => {
        // Deliberate: every case must be checked against at least one rule, so an empty array
        // is a caller bug that should surface loudly instead of defaulting either way.
        assert.throws(() => combinePolicyChecks([]));
    });
});
