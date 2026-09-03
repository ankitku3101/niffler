// NIFFLER's own database: recovery cases and (later) the audit trail. This is
// separate from PaymentDataSource, which stands in for the external payment
// provider and is never written to.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Missing in real deployments (gitignored) — that's expected, not an error.
try {
  process.loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"));
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
}

const queryClient = postgres(process.env.DATABASE_URL!);

export const db = drizzle(queryClient);
