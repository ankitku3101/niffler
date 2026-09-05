import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { authorizedPayment, capturedPayment, failedPayment } from "../testing/fixtures.js";
import { baselineAction } from "./baseline.js";

describe("baselineAction", () => {
    test("captures when money is already authorized, whatever else failed", () => {
        assert.equal(
            baselineAction([failedPayment("gateway_timeout"), authorizedPayment()]),
            "CAPTURE_PAYMENT"
        );
    });

    test("gives up on a card the bank has blocked or expired", () => {
        assert.equal(baselineAction([failedPayment("card_blocked")]), "STOP");
        assert.equal(baselineAction([failedPayment("card_expired")]), "STOP");
    });

    test("sends a risk block to a human", () => {
        assert.equal(baselineAction([failedPayment("risk_blocked")]), "ESCALATE");
    });

    test("sends a link for anything that looks temporary", () => {
        assert.equal(baselineAction([failedPayment("gateway_timeout")]), "RECOVERY_LINK");
        assert.equal(baselineAction([failedPayment("insufficient_funds")]), "RECOVERY_LINK");
        assert.equal(baselineAction([failedPayment("otp_not_entered")]), "RECOVERY_LINK");
        assert.equal(baselineAction([failedPayment("issuer_unavailable")]), "RECOVERY_LINK");
    });

    test("looks at the most recent failure, not the first", () => {
        const payments = [failedPayment("gateway_timeout"), failedPayment("card_blocked")];
        assert.equal(baselineAction(payments), "STOP");
    });

    test("escalates when there is nothing to go on", () => {
        assert.equal(baselineAction([]), "ESCALATE");
        assert.equal(baselineAction([capturedPayment()]), "ESCALATE");
    });
});
