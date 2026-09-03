// NIFFLER's own database: recovery cases and (later) the audit trail. This is
// separate from PaymentDataSource, which stands in for the external payment
// provider and is never written to.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

process.loadEnvFile();

const queryClient = postgres(process.env.DATABASE_URL!);

export const db = drizzle(queryClient);
