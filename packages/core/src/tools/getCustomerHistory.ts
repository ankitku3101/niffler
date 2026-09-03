import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema.js";
import type { Customer } from "../domain/customer.js";
import type { PublicOrder } from "../domain/order.js";
import type { Payment } from "../domain/payment.js";
import { GetOrderInputSchema } from "./getOrder.js";
import { resolveCaseOrder } from "./resolveCase.js";

export interface CustomerHistory {
  customer: Customer;
  orders: PublicOrder[];
  payments: Payment[];
}


export async function getCustomerHistory(dataSource: PaymentDataSource, rawInput: unknown): Promise<CustomerHistory> {
    
    const input = GetOrderInputSchema.parse(rawInput);
    const { order } = await resolveCaseOrder(dataSource, input.caseId);
    const customer = await dataSource.getCustomer(order.customer_id);

    if(!customer) throw new Error (`${order.customer_id} - Customer not found`);

    const orders = await dataSource.listOrdersForCustomer(order.customer_id);
    const payments = await dataSource.listPaymentsForCustomer(order.customer_id);

    const customerHistory = {customer, orders, payments};
    
    await db.insert(auditLog).values({
        caseId: input.caseId,
        toolName: "getCustomerHistory",
        input,
        output: customerHistory,
    });

    return customerHistory;
}