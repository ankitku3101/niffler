// A PaymentDataSource backed by the generated fixture.
//
// Stands in for Razorpay: it holds the 90 days of history that Test Mode cannot
// provide, since test payments are always stamped with the current time and a
// failure can only be produced by driving the checkout flow in a browser.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Customer,
  Order,
  OrderStatus,
  Payment,
  PublicOrder,
  ScenarioClass,
} from "../domain/index.js";
import type { EvaluationOracle, PaymentDataSource } from "./source.js";

interface WorldFile {
  seed: string;
  world_now: string;
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
}

const DEFAULT_PATH = "data/world.json";

function statusFrom(payments: Payment[]): OrderStatus {
  if (payments.some((p) => p.status === "captured" || p.status === "refunded")) {
    return "paid";
  }
  return payments.length > 0 ? "attempted" : "created";
}

/** Strips the synthetic label. The only place an Order becomes a PublicOrder. */
function toPublic(order: Order): PublicOrder {
  const { _groundTruth, ...rest } = order;
  void _groundTruth;
  return rest;
}

export class JsonPaymentDataSource implements PaymentDataSource, EvaluationOracle {
  private readonly world: WorldFile;
  private readonly ordersById: Map<string, Order>;
  private readonly customersById: Map<string, Customer>;
  private readonly paymentsByOrder: Map<string, Payment[]>;
  private readonly ordersByCustomer: Map<string, Order[]>;

  constructor(path: string = DEFAULT_PATH) {
    this.world = JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as WorldFile;

    this.ordersById = new Map(this.world.orders.map((o) => [o.id, o]));
    this.customersById = new Map(this.world.customers.map((c) => [c.id, c]));

    // Indexed once at load. A live adapter would issue a request per lookup;
    // callers see the same async interface either way.
    this.paymentsByOrder = new Map();
    for (const p of this.world.payments) {
      const bucket = this.paymentsByOrder.get(p.order_id);
      if (bucket) bucket.push(p);
      else this.paymentsByOrder.set(p.order_id, [p]);
    }

    this.ordersByCustomer = new Map();
    for (const o of this.world.orders) {
      const bucket = this.ordersByCustomer.get(o.customer_id);
      if (bucket) bucket.push(o);
      else this.ordersByCustomer.set(o.customer_id, [o]);
    }
  }

  async now(): Promise<string> {
    return this.world.world_now;
  }

  async listOrders(asOf?: string): Promise<PublicOrder[]> {
    const cutoff = asOf ?? this.world.world_now;

    return this.world.orders
      .filter((o) => o.created_at <= cutoff)
      .map((o) => {
        const visible = (this.paymentsByOrder.get(o.id) ?? []).filter(
          (p) => p.created_at <= cutoff
        );
        // Recomputed rather than copied: the stored status reflects the end of
        // the world, and a listing must report the order as it was at `cutoff`.
        return { ...toPublic(o), status: statusFrom(visible) };
      });
  }

  async getOrder(orderId: string): Promise<PublicOrder | null> {
    const order = this.ordersById.get(orderId);
    return order ? toPublic(order) : null;
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    return this.customersById.get(customerId) ?? null;
  }

  async listPaymentsForOrder(orderId: string): Promise<Payment[]> {
    return [...(this.paymentsByOrder.get(orderId) ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );
  }

  async listOrdersForCustomer(customerId: string): Promise<PublicOrder[]> {
    return [...(this.ordersByCustomer.get(customerId) ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(toPublic);
  }

  async listPaymentsForCustomer(customerId: string): Promise<Payment[]> {
    return this.world.payments
      .filter((p) => p.customer_id === customerId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async groundTruthFor(orderId: string): Promise<ScenarioClass | null> {
    return this.ordersById.get(orderId)?._groundTruth ?? null;
  }
}
