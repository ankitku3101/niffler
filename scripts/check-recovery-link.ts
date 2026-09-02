import { RazorpayDataSource } from "../src/data/razorpayDataSource.js";

process.loadEnvFile();

// Stage 10: proves RazorpayDataSource.createRecoveryLink actually calls
// Razorpay's real Payment Links API, before check-recover-live.ts ever
// exercises it through the full agent loop.

const ORDER_ID = "order_TXHdgsGhT8mG05";

const dataSource = new RazorpayDataSource();
const order = await dataSource.getOrder(ORDER_ID);
if (!order) throw new Error("order not found");

const customer = await dataSource.getCustomer(order.customer_id);
if (!customer) throw new Error("customer not found");

const link = await dataSource.createRecoveryLink(order.id, order.amount_paise, customer);
console.log("recovery link:", link);

process.exit(0);
