// Assembles the complete synthetic payment world and checks it for internal
// consistency. This is the last step of generation: plans in, validated
// customers/orders/payments out.

import {
  CustomerSchema,
  OrderSchema,
  PaymentSchema,
  type Customer,
  type Order,
  type OrderStatus,
  type Payment,
} from "../domain/index.js";
import { planOrders, type OrderPlan } from "./orders.js";
import { makeRng, type Rng } from "./random.js";
import { SCENARIO_WRITERS } from "./scenarios.js";
import { makeCustomers, toIso, WORLD_NOW } from "./world.js";

export interface PaymentWorld {
  /** Seed the world was generated from. Regenerating with it reproduces this file. */
  seed: string;
  /** The snapshot instant. Nothing in the world happens after this. */
  world_now: string;
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
}

/**
 * Order status is derived from its payments rather than set directly, so an
 * order can never disagree with its own payment history. Razorpay behaves the
 * same way: an order stays `attempted` until a payment against it is captured,
 * which is why an authorized-but-uncaptured payment does not make it `paid`.
 */
function deriveStatus(payments: Payment[]): OrderStatus {
  if (payments.some((p) => p.status === "captured" || p.status === "refunded")) {
    return "paid";
  }
  return payments.length > 0 ? "attempted" : "created";
}

function buildOrder(
  rng: Rng,
  plan: OrderPlan,
  index: number
): { order: Order; payments: Payment[] } {
  const orderId = rng.id("order");
  const payments = SCENARIO_WRITERS[plan.scenario]({
    rng,
    seed: {
      orderId,
      customerId: plan.customerId,
      amountPaise: plan.amountPaise,
    },
    orderMinute: plan.orderMinute,
  });

  const order: Order = {
    id: orderId,
    customer_id: plan.customerId,
    amount_paise: plan.amountPaise,
    currency: "INR",
    receipt: `rcpt_${String(index + 1).padStart(5, "0")}`,
    status: deriveStatus(payments),
    created_at: toIso(plan.orderMinute),
    _groundTruth: plan.scenario,
  };

  return { order, payments };
}

export function buildWorld(seed: string): PaymentWorld {
  const rng = makeRng(seed);
  const customers = makeCustomers(rng.fork("customers"));
  const plans = planOrders(rng.fork("orders"), customers);

  const orders: Order[] = [];
  const payments: Payment[] = [];

  plans.forEach((plan, i) => {
    const built = buildOrder(rng.fork(`build:${i}`), plan, i);
    orders.push(built.order);
    payments.push(...built.payments);
  });

  // Chronological, the way a paginated API listing would hand them over.
  orders.sort((a, b) => a.created_at.localeCompare(b.created_at));
  payments.sort((a, b) => a.created_at.localeCompare(b.created_at));

  return {
    seed,
    world_now: toIso(WORLD_NOW),
    customers,
    orders,
    payments,
  };
}

/**
 * Fails loudly on any world that could not exist. Generation is the one place
 * these guarantees can be established; every stage after this one assumes them.
 */
export function assertWorldInvariants(world: PaymentWorld): void {
  const fail = (msg: string): never => {
    throw new Error(`world invariant violated: ${msg}`);
  };

  for (const c of world.customers) CustomerSchema.parse(c);
  for (const o of world.orders) OrderSchema.parse(o);
  for (const p of world.payments) PaymentSchema.parse(p);

  const customers = new Map(world.customers.map((c) => [c.id, c]));
  const orders = new Map(world.orders.map((o) => [o.id, o]));

  if (customers.size !== world.customers.length) fail("duplicate customer id");
  if (orders.size !== world.orders.length) fail("duplicate order id");

  const paymentIds = new Set(world.payments.map((p) => p.id));
  if (paymentIds.size !== world.payments.length) fail("duplicate payment id");

  const now = Date.parse(world.world_now);
  const paymentsByOrder = new Map<string, Payment[]>();

  for (const p of world.payments) {
    const order = orders.get(p.order_id);
    if (!order) fail(`payment ${p.id} references unknown order ${p.order_id}`);

    if (p.customer_id !== order!.customer_id) {
      fail(`payment ${p.id} customer does not match its order`);
    }
    if (p.amount_paise !== order!.amount_paise) {
      fail(`payment ${p.id} amount does not match its order`);
    }
    if (Date.parse(p.created_at) < Date.parse(order!.created_at)) {
      fail(`payment ${p.id} predates its order`);
    }

    // Within a payment, the lifecycle timestamps must run forwards. Reading them
    // off the discriminated union rather than indexing by key keeps the compiler
    // able to prove each field exists on the variant it is read from.
    const lifecycle: string[] = [p.created_at];
    if (p.status === "authorized" || p.status === "captured" || p.status === "refunded") {
      lifecycle.push(p.authorized_at);
    }
    if (p.status === "captured" || p.status === "refunded") {
      lifecycle.push(p.captured_at);
    }
    if (p.status === "refunded") {
      lifecycle.push(p.refunded_at);
    }

    for (let i = 1; i < lifecycle.length; i++) {
      if (Date.parse(lifecycle[i]!) < Date.parse(lifecycle[i - 1]!)) {
        fail(`payment ${p.id} lifecycle timestamps run backwards`);
      }
    }
    if (Date.parse(lifecycle.at(-1)!) > now) {
      fail(`payment ${p.id} happens after world_now`);
    }

    const bucket = paymentsByOrder.get(p.order_id) ?? [];
    bucket.push(p);
    paymentsByOrder.set(p.order_id, bucket);
  }

  for (const o of world.orders) {
    const customer = customers.get(o.customer_id);
    if (!customer) fail(`order ${o.id} references unknown customer ${o.customer_id}`);
    if (Date.parse(o.created_at) < Date.parse(customer!.created_at)) {
      fail(`order ${o.id} predates its customer`);
    }
    if (Date.parse(o.created_at) > now) fail(`order ${o.id} is created after world_now`);

    const own = (paymentsByOrder.get(o.id) ?? []).sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );

    if (o.status !== deriveStatus(own)) {
      fail(`order ${o.id} status ${o.status} disagrees with its payments`);
    }

    const captures = own.filter((p) => p.status === "captured" || p.status === "refunded");
    if (captures.length > 1) fail(`order ${o.id} was captured more than once`);

    // A capture ends the order: nothing may be attempted against it afterwards.
    const capture = captures[0];
    if (capture && own.at(-1)!.id !== capture.id) {
      fail(`order ${o.id} has attempts after it was captured`);
    }
  }
}
