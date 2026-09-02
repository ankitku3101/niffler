// A PaymentDataSource backed by real Razorpay Test Mode API calls, not the
// synthetic fixture. Genuinely implements the same interface
// JsonPaymentDataSource does — this is the seam described in source.ts
// actually doing its job: everything above this file (tools, the agent,
// the policy engine, recoverCase()) is completely unmodified.
//
// Deliberately scoped to a handful of real orders, not a full account: Test
// Mode starts empty and cannot be backdated (§22.5), so this adapter was
// never meant to replace the 500-order synthetic world — only to prove the
// same code genuinely works against Razorpay for at least one real case.
//
// One real, load-bearing limitation, stated rather than hidden: Razorpay's
// plain guest checkout (what checkout.html drives) never attaches a
// customer_id to an order or a payment — there is no Customer entity
// involved. We derive a stand-in customer_id from a payment's `contact`
// field instead. An order with no payment attempts yet genuinely has no
// knowable customer, so getOrder falls back to "razorpay:unknown" for it,
// and getCustomer returns null for that id — an honest answer, not a bug.

import Razorpay from "razorpay";
import type { Customer, Payment, PaymentMethod, PublicOrder } from "../domain/index.js";
import type { PaymentDataSource } from "./source.js";

function toIso(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

function toPaise(amount: number | string): number {
  return typeof amount === "string" ? Number(amount) : amount;
}

function deriveCustomerId(payments: Array<{ contact?: string | number | null }>): string {
  const contact = payments[0]?.contact;
  return contact ? `razorpay:${contact}` : "razorpay:unknown";
}

// Maps one raw Razorpay payment into our domain's discriminated union.
// authorized_at/captured_at/refunded_at aren't separate fields Razorpay
// exposes for a simple card payment — created_at is the closest honest
// stand-in for all of them here.
function toDomainPayment(
  raw: {
    id: string;
    order_id: string;
    amount: number | string;
    method: string;
    status: "created" | "authorized" | "captured" | "refunded" | "failed";
    created_at: number;
  },
  customerId: string
): Payment {
  const created_at = toIso(raw.created_at);
  const base = {
    id: raw.id,
    order_id: raw.order_id,
    customer_id: customerId,
    amount_paise: toPaise(raw.amount),
    method: raw.method as PaymentMethod,
    created_at,
  };

  switch (raw.status) {
    case "created":
      return { ...base, status: "created" };
    case "authorized":
      return { ...base, status: "authorized", authorized_at: created_at };
    case "captured":
      return { ...base, status: "captured", authorized_at: created_at, captured_at: created_at };
    case "refunded":
      return {
        ...base,
        status: "refunded",
        authorized_at: created_at,
        captured_at: created_at,
        refunded_at: created_at,
      };
    case "failed":
      // Not exercised by the authorized_uncaptured demo this adapter is
      // built for. Razorpay's real error_reason taxonomy is far larger
      // than FailureReasonSchema (see the TODO in payment.ts) — mapping it
      // honestly needs its own pass before this branch is trustworthy.
      throw new Error(
        `RazorpayDataSource cannot yet map a failed payment (${raw.id}) — see the comment above this line before removing it.`
      );
  }
}

export class RazorpayDataSource implements PaymentDataSource {
  private readonly razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  async now(): Promise<string> {
    return new Date().toISOString();
  }

  async getOrder(orderId: string): Promise<PublicOrder | null> {
    const order = await this.razorpay.orders.fetch(orderId).catch(() => null);
    if (!order) return null;

    const { items: payments } = await this.razorpay.orders.fetchPayments(orderId);
    const customerId = deriveCustomerId(payments);

    return {
      id: order.id,
      customer_id: customerId,
      amount_paise: toPaise(order.amount),
      currency: "INR",
      receipt: order.receipt ?? "",
      status: order.status,
      created_at: toIso(order.created_at),
    };
  }

  // Razorpay has no way to ask "what did my account look like at some past
  // instant" — unlike JsonPaymentDataSource, this always reports current
  // state regardless of `asOf`. A real limitation, not an oversight; see
  // the file header.
  async listOrders(_asOf?: string): Promise<PublicOrder[]> {
    const { items: orders } = await this.razorpay.orders.all();
    const mapped = await Promise.all(orders.map((o) => this.getOrder(o.id)));
    return mapped.filter((o): o is PublicOrder => o !== null);
  }

  async listPaymentsForOrder(orderId: string): Promise<Payment[]> {
    const { items: payments } = await this.razorpay.orders.fetchPayments(orderId);
    const customerId = deriveCustomerId(payments);
    return payments
      .map((p) => toDomainPayment(p, customerId))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // Linear scan over the whole Test Mode account — fine at demo scale (a
  // handful of orders we created ourselves); would need a real index at
  // any real scale.
  async getCustomer(customerId: string): Promise<Customer | null> {
    if (customerId === "razorpay:unknown") return null;

    const { items: orders } = await this.razorpay.orders.all();
    for (const order of orders) {
      const { items: payments } = await this.razorpay.orders.fetchPayments(order.id);
      const match = payments.find((p) => deriveCustomerId([p]) === customerId);
      if (match) {
        return {
          id: customerId,
          email: match.email,
          contact: String(match.contact),
          created_at: toIso(match.created_at),
        };
      }
    }
    return null;
  }

  async listOrdersForCustomer(customerId: string): Promise<PublicOrder[]> {
    const orders = await this.listOrders();
    return orders.filter((o) => o.customer_id === customerId);
  }

  async listPaymentsForCustomer(customerId: string): Promise<Payment[]> {
    const orders = await this.listOrders();
    const perOrder = await Promise.all(
      orders
        .filter((o) => o.customer_id === customerId)
        .map((o) => this.listPaymentsForOrder(o.id))
    );
    return perOrder.flat().sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // The one real write this adapter makes: an actual Razorpay API call
  // that moves the authorized hold into a captured, settled payment.
  async capturePayment(paymentId: string, amountPaise: number): Promise<void> {
    await this.razorpay.payments.capture(paymentId, amountPaise, "INR");
  }

  // A real Payment Link, payable by the customer on their own time. We
  // never collect a name anywhere in this system (synthetic or real), so
  // "Customer" is an honest placeholder, not a fabricated identity.
  async createRecoveryLink(orderId: string, amountPaise: number, customer: Customer): Promise<string> {
    const link = await this.razorpay.paymentLink.create({
      amount: amountPaise,
      currency: "INR",
      reference_id: orderId,
      customer: { name: "Customer", email: customer.email, contact: customer.contact },
      notify: { email: false, sms: false },
    });
    return link.short_url;
  }
}
