import { db } from "../src/db/client.js";
import { auditLog, recoveryCases } from "../src/db/schema.js";
import { createRecoveryCases } from "../src/cases/createCases.js";
import { detectCandidates } from "../src/detection/candidates.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { DETECTION_CUTOFF, toIso } from "../src/generator/world.js";

// Wipes NIFFLER's own state (recovery_cases, audit_log) and rebuilds it from
// scratch via detection. Never touches data/world.json — the synthetic
// payment world is a fixed, seeded fixture; only our own tracked state resets.
//
// audit_log.case_id references recovery_cases.id with onDelete: "restrict",
// so a case row can't be deleted while any audit_log row still points at it.
// Delete order matters: audit_log first, then recovery_cases.

const deletedAuditRows = await db.delete(auditLog).returning({ id: auditLog.id });
console.log("deleted audit_log rows:", deletedAuditRows.length);

const deletedCaseRows = await db.delete(recoveryCases).returning({ id: recoveryCases.id });
console.log("deleted recovery_cases rows:", deletedCaseRows.length);

const source = new JsonPaymentDataSource();
const orders = await source.listOrders(toIso(DETECTION_CUTOFF));
const { candidates, revenueAtRiskPaise } = detectCandidates(orders);
const orderIds = candidates.map((o) => o.id);

const casesCreated = await createRecoveryCases(orderIds);

console.log("candidates detected:", orderIds.length);
console.log("revenue at risk (paise):", revenueAtRiskPaise);
console.log("recovery cases created:", casesCreated);

process.exit(0);
