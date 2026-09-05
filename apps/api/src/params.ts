// Route params arrive as untrusted strings. Without a check they run straight into Drizzle
// and the Razorpay SDK: Number("abc") is NaN, which Postgres rejects as an invalid bind and
// the global error handler then reports as 503 "data unavailable" — telling a caller the
// database is down when all they sent was a bad id.
//
// Plain predicates rather than Zod: these are two shape checks, and the API package has no
// other reason to depend on a validation library.

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
