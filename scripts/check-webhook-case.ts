import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { auditLog, recoveryCases } from "../src/db/schema.js";

process.loadEnvFile();

const caseId = Number(process.argv[2]);
if (!caseId) throw new Error("usage: tsx scripts/check-webhook-case.ts <caseId>");

const [caseRow] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId)).limit(1);
console.log("case:", caseRow);

const rows = await db.select().from(auditLog).where(eq(auditLog.caseId, caseId));
console.log("audit_log rows:", rows);

process.exit(0);
