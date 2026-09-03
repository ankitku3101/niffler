import type { Diagnosis } from "../domain/diagnosis.js";
import type { PolicyDecision } from "../domain/policy.js";

export type RecoveryStep =
    | { kind: "investigating" }
    | { kind: "tool_call"; name: string; input: unknown }
    | { kind: "tool_result"; name: string; output: unknown }
    | { kind: "diagnosis"; diagnosis: Diagnosis }
    | { kind: "policy_check"; decision: PolicyDecision; reasons: string[] }
    | { kind: "action"; toolName: string; output: unknown };

export type OnStep = (step: RecoveryStep) => void;
