import Razorpay from "razorpay";

process.loadEnvFile();

// Stage 10: throwaway helper — creates a Payment Link with a timestamp-based
// reference_id (always unique, unlike order-based links) purely to trigger
// a fresh payment_link.paid webhook event while wiring up the webhook receiver (now apps/api).
// Not tied to any real recovery case.

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const link = await razorpay.paymentLink.create({
  amount: 50000,
  currency: "INR",
  reference_id: `webhook-test-${Date.now()}`,
  customer: { name: "Customer", email: "void@razorpay.com", contact: "+918822992200" },
  notify: { email: false, sms: false },
});

console.log("pay this:", link.short_url);

process.exit(0);
