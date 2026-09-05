// Builders for the tests, so each one reads as the case it describes rather than as a wall of
// fields the rule under test never looks at.

import type { PublicOrder } from "../domain/order.js";
import type { FailedPayment, FailureReason, Payment } from "../domain/payment.js";

const AT = "2026-05-01T00:00:00.000Z";

export function order(overrides: Partial<PublicOrder> = {}): PublicOrder {
    return {
        id: "order_test",
        customer_id: "cust_test",
        amount_paise: 249900,
        currency: "INR",
        receipt: "rcpt_test",
        status: "attempted",
        created_at: AT,
        ...overrides,
    };
}

export function failedPayment(reason: FailureReason, overrides: Partial<FailedPayment> = {}): Payment {
    return {
        id: `pay_${reason}`,
        order_id: "order_test",
        customer_id: "cust_test",
        amount_paise: 249900,
        method: "card",
        created_at: AT,
        status: "failed",
        error: {
            code: "BAD_REQUEST_ERROR",
            description: `payment failed: ${reason}`,
            source: "customer",
            step: "payment_authorization",
            reason,
        },
        ...overrides,
    };
}

export function authorizedPayment(overrides: Partial<Payment> = {}): Payment {
    return {
        id: "pay_authorized",
        order_id: "order_test",
        customer_id: "cust_test",
        amount_paise: 249900,
        method: "card",
        created_at: AT,
        status: "authorized",
        authorized_at: AT,
        ...overrides,
    } as Payment;
}

export function capturedPayment(overrides: Partial<Payment> = {}): Payment {
    return {
        id: "pay_captured",
        order_id: "order_test",
        customer_id: "cust_test",
        amount_paise: 249900,
        method: "upi",
        created_at: AT,
        status: "captured",
        authorized_at: AT,
        captured_at: AT,
        ...overrides,
    } as Payment;
}
