import { RazorpayDataSource } from "../src/data/razorpayDataSource.js";

process.loadEnvFile();

// Stage 10, Task 10.4: proves RazorpayDataSource actually satisfies
// PaymentDataSource against real Razorpay data, before it's ever passed to
// recoverCase(). Exercises the same order checkout.html was used to pay.

const ORDER_ID = "order_TXHdgsGhT8mG05";

const dataSource = new RazorpayDataSource();

const order = await dataSource.getOrder(ORDER_ID);
console.log("order:", order);
if (!order) throw new Error("getOrder returned null for a known real order");

const payments = await dataSource.listPaymentsForOrder(ORDER_ID);
console.log("payments:", payments);

const customer = await dataSource.getCustomer(order.customer_id);
console.log("customer:", customer);

const allOrders = await dataSource.listOrders();
console.log("listOrders count:", allOrders.length);

const customerOrders = await dataSource.listOrdersForCustomer(order.customer_id);
console.log("listOrdersForCustomer count:", customerOrders.length);

const customerPayments = await dataSource.listPaymentsForCustomer(order.customer_id);
console.log("listPaymentsForCustomer count:", customerPayments.length);

process.exit(0);
