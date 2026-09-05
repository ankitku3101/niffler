// Without these, a param runs straight into Drizzle or the Razorpay SDK: Number("abc") is NaN,
// which Postgres rejects and the global error handler reports as 503 "data unavailable" —
// telling a caller the database is down when all they sent was a bad id.

/** A recovery case id — a positive integer and nothing else. */
export function parseCaseId(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** A Razorpay order id, e.g. order_TXJNgtumVt8AWE. */
export function parseOrderId(raw: string | undefined): string | null {
  return raw && /^order_[A-Za-z0-9]+$/.test(raw) ? raw : null;
}
