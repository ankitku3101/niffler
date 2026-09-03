import type { PublicOrder } from "../domain/order.js";

export interface DetectionResult {
    candidates: PublicOrder[];
    revenueAtRiskPaise: number;
}

export function detectCandidates(orders: PublicOrder[]): DetectionResult {
    const candidates = orders.filter(order => order.status === 'attempted' );
    const revenueAtRiskPaise = candidates.reduce((total, current) => {
        return total + current.amount_paise;
    }, 0);
    return {candidates, revenueAtRiskPaise};
}