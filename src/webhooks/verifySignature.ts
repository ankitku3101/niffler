import { createHmac } from "node:crypto";

// Verify the webhook signature using HMAC SHA256
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}
