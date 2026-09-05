import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { CaseStatusSchema, canTransition, type CaseStatus } from "./recoveryCase.js";

const ALL = CaseStatusSchema.options;
const TERMINAL: CaseStatus[] = ["RECOVERED", "FAILED", "STOPPED"];

describe("canTransition", () => {
    test("walks the happy path one step at a time", () => {
        assert.ok(canTransition("DETECTED", "INVESTIGATING"));
        assert.ok(canTransition("INVESTIGATING", "ACTION_PLANNED"));
        assert.ok(canTransition("ACTION_PLANNED", "ACTION_EXECUTED"));
        assert.ok(canTransition("ACTION_EXECUTED", "RECOVERED"));
    });

    test("refuses to skip a step", () => {
        // The guardrail is only real if nothing, including our own code, can jump ahead.
        assert.equal(canTransition("DETECTED", "ACTION_EXECUTED"), false);
        assert.equal(canTransition("DETECTED", "RECOVERED"), false);
        assert.equal(canTransition("INVESTIGATING", "ACTION_EXECUTED"), false);
        assert.equal(canTransition("ACTION_PLANNED", "RECOVERED"), false);
    });

    test("an executed action can end four ways", () => {
        for (const end of ["RECOVERED", "FAILED", "ESCALATED", "STOPPED"] as const) {
            assert.ok(canTransition("ACTION_EXECUTED", end), `ACTION_EXECUTED -> ${end}`);
        }
    });

    test("an escalated case can only be stopped", () => {
        assert.ok(canTransition("ESCALATED", "STOPPED"));
        for (const to of ALL.filter((s) => s !== "STOPPED")) {
            assert.equal(canTransition("ESCALATED", to), false, `ESCALATED -> ${to}`);
        }
    });

    test("terminal states go nowhere", () => {
        for (const from of TERMINAL) {
            for (const to of ALL) {
                assert.equal(canTransition(from, to), false, `${from} -> ${to}`);
            }
        }
    });

    test("no state transitions to itself", () => {
        // Why the action tools branch on their starting status rather than always walking two hops.
        for (const state of ALL) {
            assert.equal(canTransition(state, state), false, `${state} -> ${state}`);
        }
    });

    test("nothing goes backwards", () => {
        assert.equal(canTransition("INVESTIGATING", "DETECTED"), false);
        assert.equal(canTransition("ACTION_PLANNED", "INVESTIGATING"), false);
        assert.equal(canTransition("ACTION_EXECUTED", "ACTION_PLANNED"), false);
    });
});
