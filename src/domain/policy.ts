import z from "zod";
import type { PublicOrder } from "./order.js";
import type { Payment } from "./payment.js";

export const PolicyDecisionSchema = z.enum([
    "ALLOWED",
    "DENIED",
    "REQUIRES_HUMAN_APPROVAL"
])

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>

export function checkEligibility(order: PublicOrder) : { decision: PolicyDecision, reason: string } {
    
    let decision: PolicyDecision;
    let reason: string;
    
    if(order.status === "paid") {
        decision = "DENIED";
        reason = `Order ${order.id} is already paid; no recovery action applies.`;
    } else {
        decision = "ALLOWED";
        reason = `Order ${order.id} is unpaid; eligible for recovery.`;
    }

    const result = {decision, reason};
    return result
}

export function checkAttemptLimit(attempts: Payment[], maxAttempts: number): { decision: PolicyDecision, reason: string } {
    let decision: PolicyDecision;
    let reason: string;

    const failedAttempts = attempts.filter( attempt => attempt.status === "failed").length

    if(failedAttempts<maxAttempts) {
        decision = "ALLOWED";
        reason = `${failedAttempts} Attempts done; Eligible for another payment attempt`; 
    } else {
        decision = "REQUIRES_HUMAN_APPROVAL";
        reason = `${failedAttempts} Attempts done; Not eligible for another payment attempt; max attempts limit reached.`
    }

    const result = { decision, reason }
    return result
}


export function combinePolicyChecks (
    results: { decision: PolicyDecision; reason: string }[] 
) : { decision: PolicyDecision; reasons: string[] } {

    const rank: Record<PolicyDecision, number> = {
        ALLOWED: 0,
        REQUIRES_HUMAN_APPROVAL: 1,
        DENIED: 2,
    };

    // results must have at least one entry, reduce with no seed throws otherwise.
    const strictestResult = results.reduce((worstSoFar, current) => {
        return rank[current.decision] > rank[worstSoFar.decision] ? current : worstSoFar;
    });
    
    const reasons = results.map(result => result.reason);

    return { decision: strictestResult.decision, reasons };
}

export function checkIterationLimit(toolCallCount: number, maxToolCalls: number): { decision: PolicyDecision, reason: string } {
    let decision: PolicyDecision;
    let reason: string;

    if (toolCallCount < maxToolCalls) {
        decision = "ALLOWED";
        reason = `Tool calls made: ${toolCallCount}; Eligible for more tool calls.`;
    } else {
        decision = "REQUIRES_HUMAN_APPROVAL";
        reason = `Tool calls made: ${toolCallCount}; Max tool calls limit reached.`;
    }

    return { decision, reason };
}