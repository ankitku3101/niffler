import { createHmac, timingSafeEqual } from "node:crypto";

// Verify the webhook signature using HMAC SHA256
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const provided = Buffer.from(signature, "hex");

  // timingSafeEqual throws on length mismatch, so that is checked first — a
  // malformed hex signature simply decodes to a shorter buffer.
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
