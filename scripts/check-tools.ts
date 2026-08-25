import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { auditLog, recoveryCases } from "../src/db/schema.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { getOrder } from "../src/tools/getOrder.js";

const dataSource = new JsonPaymentDataSource();

const [existingCase] = await db.select().from(recoveryCases).limit(1);
if (!existingCase) {
  throw new Error("no recovery cases in DB — run `npm run check:cases` first");
}

const order = await getOrder(dataSource, { caseId: existingCase.id });
console.log("getOrder returned:", order.id, order.status);

if (order.id !== existingCase.orderId) {
  throw new Error("returned order does not match the case's order_id");
}

const auditRows = await db
  .select()
  .from(auditLog)
  .where(eq(auditLog.caseId, existingCase.id));

const wroteAuditRow = auditRows.some((row) => row.toolName === "getOrder");
if (!wroteAuditRow) {
  throw new Error("getOrder did not write an audit_log row");
}
console.log("audit rows for this case:", auditRows.length);

try {
  await getOrder(dataSource, { caseId: 999999 });
  throw new Error("expected getOrder to throw for a nonexistent case");
} catch (err) {
  if (!(err instanceof Error) || !err.message.includes("Case not found")) {
    throw err;
  }
  console.log("correctly rejected a nonexistent case");
}

process.exit(0);
