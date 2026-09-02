import { createHmac } from "node:crypto";
import Razorpay from "razorpay";

process.loadEnvFile();

// Stage 10, Task 10.3: before trusting anything checkout.html's handler
// received, verify it actually came from Razorpay. The browser is not a
// trusted source — anyone could fake a call to that handler with a made-up
// payment_id. Razorpay signs the real response server-side with key_secret;
// we recompute the same signature here and compare, per Razorpay's own
// formula (confirmed against node_modules/razorpay/dist/utils/
// razorpay-utils.js, not guessed): HMAC-SHA256(order_id + "|" + payment_id,
// key_secret). Only once that matches do we trust the payment_id enough to
// fetch its real, server-side status.

const orderId = "order_TXHdgsGhT8mG05";
const paymentId = "pay_TXHqAbY6577cET";
const signature =
  "c194c235cbbbfcb9820c14dda1ec5d8101bacda16d2629f1376fae9f73b221b0";

const expectedSignature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
  .update(`${orderId}|${paymentId}`)
  .digest("hex");

if (expectedSignature !== signature) {
  throw new Error("signature mismatch — this payment response cannot be trusted");
}

console.log("signature verified");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const payment = await razorpay.payments.fetch(paymentId);
console.log("payment status:", payment.status);
console.log(payment);

process.exit(0);
