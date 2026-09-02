import Razorpay from "razorpay";

process.loadEnvFile();

// Stage 10, Task 10.1: the smallest possible proof that we can talk to
// Razorpay's real Test Mode API, before any RazorpayClient/adapter exists.
// One order, created with payment.capture: "manual" so it stays authorized
// rather than auto-capturing — the authorized_uncaptured state our
// capturePayment tool already knows how to act on. No tool, no synthetic
// data involved.

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const order = await razorpay.orders.create({
  amount: 50000,
  currency: "INR",
  receipt: "niffler-check-1",
  payment: {
    capture: "manual",
    capture_options: {
      manual_expiry_period: 4320,
      automatic_expiry_period: 4320,
      refund_speed: "normal",
    },
  },
});

console.log("order created:", order);

process.exit(0);
