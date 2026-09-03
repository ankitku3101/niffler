// The seam between NIFFLER and the payment provider.
//
// Everything downstream — detection, the agent's tools, the policy engine —
// reads the payment world exclusively through this interface. Today it is
// backed by a generated JSON fixture; at Stage 10 a Razorpay adapter implements
// the same methods and nothing above it changes.
//
// Every method is async because the real implementation is a network call, and
// discovering that later would mean rewriting every caller.

import type { Customer, Payment, PublicOrder, ScenarioClass } from "../domain/index.js";

export interface PaymentDataSource {
  /** The provider's current time. All staleness is measured against this. */
  now(): Promise<string>;

  /**
   * Orders as they stood at `asOf` (default: now) — an order created later is
   * absent, and one paid later still reports the status it had at that instant.
   *
   * This is what makes a recovery batch a genuine snapshot: a case assembled
   * from a listing can be acted on minutes later, by which time the live order
   * may have moved on. The agent has to re-read before acting.
   */
  listOrders(asOf?: string): Promise<PublicOrder[]>;

  /** The live order, as it stands right now. */
  getOrder(orderId: string): Promise<PublicOrder | null>;

  getCustomer(customerId: string): Promise<Customer | null>;

  /** Every attempt against one order, oldest first. */
  listPaymentsForOrder(orderId: string): Promise<Payment[]>;

  /** One customer's order history, oldest first. */
  listOrdersForCustomer(customerId: string): Promise<PublicOrder[]>;

  /** One customer's payment history across all orders, oldest first. */
  listPaymentsForCustomer(customerId: string): Promise<Payment[]>;

  /**
   * Actually capture a previously authorized payment. For the synthetic
   * fixture this is a no-op — there is no real money to move, and
   * NIFFLER's own recovery_cases/audit_log already is the record of what
   * happened. A live adapter must genuinely call the provider.
   */
  capturePayment(paymentId: string, amountPaise: number): Promise<void>;

  /**
   * Actually create a payment link the customer can pay on their own time.
   * Returns the payable URL. For the synthetic fixture this returns a fake
   * placeholder — same reasoning as capturePayment's no-op. A live adapter
   * must genuinely call the provider.
   */
  createRecoveryLink(orderId: string, amountPaise: number, customer: Customer): Promise<string>;
}

/**
 * Read access to the synthetic labels, for scoring agent decisions at Stage 9.
 *
 * Deliberately a separate interface: code holding a PaymentDataSource cannot
 * reach ground truth even by accident, so only the evaluator — which is never
 * in the prompt path — needs to be audited for leaks. A live Razorpay adapter
 * implements PaymentDataSource and not this.
 */
export interface EvaluationOracle {
  groundTruthFor(orderId: string): Promise<ScenarioClass | null>;
}
