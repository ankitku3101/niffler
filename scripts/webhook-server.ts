import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { verifyWebhookSignature } from "../src/webhooks/verifySignature.js";
import { handlePaymentLinkPaid } from "../src/webhooks/handlePaymentLinkPaid.js";

process.loadEnvFile();

// Stage 10, Task 10.7. First pass just logged the verified payload — the
// real payment_link.paid shape (CLAUDE.md §22.1) was confirmed from that,
// not guessed, before handlePaymentLinkPaid was written.

const app = new Hono();

app.post("/webhook/razorpay", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET!)) {
    console.warn("webhook signature verification FAILED");
    return c.text("invalid signature", 400);
  }

  const payload = JSON.parse(rawBody);
  console.log("verified webhook:", payload.event);

  if (payload.event === "payment_link.paid") {
    const result = await handlePaymentLinkPaid(payload);
    console.log(result.handled ? "handled:" : "not handled:", result.reason);
  }

  return c.text("ok", 200);
});

const port = 3000;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`webhook server listening on http://localhost:${info.port}`);
});
