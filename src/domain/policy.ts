import z from "zod";
import type { PublicOrder } from "./order.js";

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