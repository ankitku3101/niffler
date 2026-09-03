import z from "zod";

// A Payment is a single attempt to satisfy an Order; one order may have many.
// The shape mirrors Razorpay's payment object so that synthetic and live data
// sources can satisfy the same schema.

export const PaymentMethodSchema = z.enum([
  "card",
  "upi",
  "netbanking",
  "wallet",
  "emi",
]);

// Razorpay's error taxonomy: source is who rejected the payment, step is where
// in the flow it broke.
// TODO: verify these values against the Razorpay API docs before live integration.
export const ErrorSourceSchema = z.enum([
  "customer",
  "bank",
  "gateway",
  "business",
  "internal",
]);

export const ErrorStepSchema = z.enum([
  "payment_initiation",
  "payment_authentication",
  "payment_authorization",
  "payment_capture",
]);

export const ErrorCodeSchema = z.enum([
  "BAD_REQUEST_ERROR",
  "GATEWAY_ERROR",
  "SERVER_ERROR",
]);

// Failure reasons covered by the synthetic dataset. Deliberately narrower than
// Razorpay's full set; each maps to a distinct recovery strategy.
export const FailureReasonSchema = z.enum([
  "gateway_timeout",
  "issuer_unavailable",
  "insufficient_funds",
  "otp_not_entered",
  "card_expired",
  "card_blocked",
  "risk_blocked",
  "unknown",
]);

export const PaymentErrorSchema = z.object({
  code: ErrorCodeSchema,
  description: z.string(),
  source: ErrorSourceSchema,
  step: ErrorStepSchema,
  reason: FailureReasonSchema,
});

const PaymentBase = z.object({
  id: z.string(),
  order_id: z.string(),
  customer_id: z.string(),
  amount_paise: z.number().int().nonnegative(),
  method: PaymentMethodSchema,
  created_at: z.iso.datetime(),
});

export const CreatedPaymentSchema = PaymentBase.extend({
  status: z.literal("created"),
});

export const AuthorizedPaymentSchema = PaymentBase.extend({
  status: z.literal("authorized"),
  authorized_at: z.iso.datetime(),
});

// Extends Authorized rather than the base: funds must be authorized before
// they can be captured, so authorized_at is always present.
export const CapturedPaymentSchema = AuthorizedPaymentSchema.extend({
  status: z.literal("captured"),
  captured_at: z.iso.datetime(),
});

export const RefundedPaymentSchema = CapturedPaymentSchema.extend({
  status: z.literal("refunded"),
  refunded_at: z.iso.datetime(),
});

// Terminal state. A failed payment cannot be revived, so recovery always means
// creating a new payment against the same order.
export const FailedPaymentSchema = PaymentBase.extend({
  status: z.literal("failed"),
  error: PaymentErrorSchema,
});

export const PaymentSchema = z.discriminatedUnion("status", [
  CreatedPaymentSchema,
  AuthorizedPaymentSchema,
  CapturedPaymentSchema,
  RefundedPaymentSchema,
  FailedPaymentSchema,
]);

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ErrorSource = z.infer<typeof ErrorSourceSchema>;
export type ErrorStep = z.infer<typeof ErrorStepSchema>;
export type FailureReason = z.infer<typeof FailureReasonSchema>;
export type PaymentError = z.infer<typeof PaymentErrorSchema>;

export type CreatedPayment = z.infer<typeof CreatedPaymentSchema>;
export type AuthorizedPayment = z.infer<typeof AuthorizedPaymentSchema>;
export type CapturedPayment = z.infer<typeof CapturedPaymentSchema>;
export type RefundedPayment = z.infer<typeof RefundedPaymentSchema>;
export type FailedPayment = z.infer<typeof FailedPaymentSchema>;

export type Payment = z.infer<typeof PaymentSchema>;
export type SettledPayment = CapturedPayment | RefundedPayment;
