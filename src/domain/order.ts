import z from "zod";

// An Order is a merchant's intent to collect an amount, and is the unit of
// recovery: one unpaid order becomes one recovery case.

// Derived from the order's payments: created (no attempts), attempted (at least
// one attempt, none successful), paid (a payment was captured).
export const OrderStatusSchema = z.enum(["created", "attempted", "paid"]);

// Synthetic-data label describing the scenario an order was generated to
// represent, used to score the agent's decisions during evaluation. Several of
// these describe patterns across multiple payments, which is why the label sits
// on the order rather than on a payment. Excluded from any context sent to the
// model.
export const ScenarioClassSchema = z.enum([
  "success",
  "transient_gateway",
  "bank_downtime",
  "insufficient_funds",
  "auth_dropoff",
  "hard_decline",
  "fraud_block",
  "repeat_failure",
  "authorized_uncaptured",
  "self_recovered",
]);

export const OrderSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  amount_paise: z.number().int().nonnegative(),
  currency: z.literal("INR"),
  receipt: z.string(),
  status: OrderStatusSchema,
  created_at: z.iso.datetime(),

  _groundTruth: ScenarioClassSchema,
});

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type ScenarioClass = z.infer<typeof ScenarioClassSchema>;
export type Order = z.infer<typeof OrderSchema>;
