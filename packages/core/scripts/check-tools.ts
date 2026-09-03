import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { auditLog, recoveryCases } from "../src/db/schema.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import type { CaseStatus } from "../src/domain/recoveryCase.js";
import { getOrder } from "../src/tools/getOrder.js";
import { listPreviousAttempts } from "../src/tools/listPreviousAttempts.js";
import { getCustomerHistory } from "../src/tools/getCustomerHistory.js";
import { stopRecovery } from "../src/tools/stopRecovery.js";
import { escalateCase } from "../src/tools/escalateCase.js";
import { createRecoveryLink } from "../src/tools/createRecoveryLink.js";
import { capturePayment } from "../src/tools/capturePayment.js";

const dataSource = new JsonPaymentDataSource();

// ---------------------------------------------------------------------------
// Read tools: getOrder, listPreviousAttempts, getCustomerHistory
// ---------------------------------------------------------------------------

const [existingCase] = await db.select().from(recoveryCases).limit(1);
if (!existingCase) {
  throw new Error("no recovery cases in DB — run `npm run check:cases` first");
}

const order = await getOrder(dataSource, { caseId: existingCase.id });
console.log("getOrder returned:", order.id, order.status);

if (order.id !== existingCase.orderId) {
  throw new Error("returned order does not match the case's order_id");
}

const payments = await listPreviousAttempts(dataSource, { caseId: existingCase.id });
console.log("listPreviousAttempts returned:", payments.length, "payments");

if (payments.some((p) => p.order_id !== order.id)) {
  throw new Error("listPreviousAttempts returned a payment for the wrong order");
}

const history = await getCustomerHistory(dataSource, { caseId: existingCase.id });
console.log(
  "getCustomerHistory returned:",
  history.customer.id,
  "-",
  history.orders.length,
  "orders,",
  history.payments.length,
  "payments"
);

if (history.customer.id !== order.customer_id) {
  throw new Error("getCustomerHistory returned the wrong customer");
}
if (!history.orders.some((o) => o.id === order.id)) {
  throw new Error("getCustomerHistory's order list is missing the current order");
}

const auditRows = await db
  .select()
  .from(auditLog)
  .where(eq(auditLog.caseId, existingCase.id));

for (const toolName of ["getOrder", "listPreviousAttempts", "getCustomerHistory"]) {
  if (!auditRows.some((row) => row.toolName === toolName)) {
    throw new Error(`${toolName} did not write an audit_log row`);
  }
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

// ---------------------------------------------------------------------------
// Action tools: stopRecovery, escalateCase, createRecoveryLink, capturePayment
//
// Fresh cases from `createCases` sit at DETECTED, which none of these tools
// can act on directly — each needs to be seeded into the state it's meant to
// transition out of. That seeding is done with a direct db.update, something
// no tool itself would ever do to another case; it stands in here for "the
// agent already walked this case through INVESTIGATING/ACTION_PLANNED",
// which doesn't exist yet.
// ---------------------------------------------------------------------------

async function setStatus(caseId: number, status: CaseStatus): Promise<void> {
  await db.update(recoveryCases).set({ status, updatedAt: new Date() }).where(eq(recoveryCases.id, caseId));
}

async function auditRowExists(caseId: number, toolName: string): Promise<boolean> {
  const rows = await db.select().from(auditLog).where(eq(auditLog.caseId, caseId));
  return rows.some((row) => row.toolName === toolName);
}

const allCases = await db.select().from(recoveryCases).limit(200);
if (allCases.length < 6) {
  throw new Error("need at least 6 recovery cases in DB — run `npm run check:cases` first");
}

// capturePayment needs one order with an authorized-but-uncaptured payment
// (the happy path) and one without (the "nothing to capture" rejection).
let caseWithAuthorized: (typeof allCases)[number] | undefined;
let caseWithoutAuthorized: (typeof allCases)[number] | undefined;
for (const c of allCases) {
  const orderPayments = await dataSource.listPaymentsForOrder(c.orderId);
  const hasAuthorized = orderPayments.some((p) => p.status === "authorized");
  if (hasAuthorized && !caseWithAuthorized) caseWithAuthorized = c;
  if (!hasAuthorized && !caseWithoutAuthorized) caseWithoutAuthorized = c;
  if (caseWithAuthorized && caseWithoutAuthorized) break;
}
if (!caseWithAuthorized) {
  throw new Error("no recovery case has an authorized-uncaptured payment — dataset may have changed");
}
if (!caseWithoutAuthorized) {
  throw new Error("every recovery case has an authorized payment — need one without, for the negative test");
}

const remaining = allCases.filter(
  (c) => c.id !== caseWithAuthorized!.id && c.id !== caseWithoutAuthorized!.id
);
const [caseA, caseC, caseD, caseInvalid] = remaining;
if (!caseA || !caseC || !caseD || !caseInvalid) {
  throw new Error("not enough distinct recovery cases to isolate each tool's test");
}

// --- stopRecovery: ACTION_EXECUTED -> STOPPED, idempotent on repeat ---
await setStatus(caseA.id, "ACTION_EXECUTED");
const stop1 = await stopRecovery(dataSource, { caseId: caseA.id });
if (stop1.status !== "STOPPED" || !stop1.transitioned) {
  throw new Error("stopRecovery did not transition ACTION_EXECUTED -> STOPPED");
}
const stop2 = await stopRecovery(dataSource, { caseId: caseA.id });
if (stop2.transitioned) {
  throw new Error("stopRecovery is not idempotent: second call transitioned again");
}
if (!(await auditRowExists(caseA.id, "stopRecovery"))) {
  throw new Error("stopRecovery did not write an audit_log row");
}
console.log("stopRecovery: ACTION_EXECUTED -> STOPPED, idempotent on repeat");

// --- escalateCase: ACTION_EXECUTED -> ESCALATED, idempotent on repeat ---
await setStatus(caseC.id, "ACTION_EXECUTED");
const esc1 = await escalateCase(dataSource, { caseId: caseC.id });
if (esc1.status !== "ESCALATED" || !esc1.transitioned) {
  throw new Error("escalateCase did not transition ACTION_EXECUTED -> ESCALATED");
}
const esc2 = await escalateCase(dataSource, { caseId: caseC.id });
if (esc2.transitioned) {
  throw new Error("escalateCase is not idempotent: second call transitioned again");
}
if (!(await auditRowExists(caseC.id, "escalateCase"))) {
  throw new Error("escalateCase did not write an audit_log row");
}
console.log("escalateCase: ACTION_EXECUTED -> ESCALATED, idempotent on repeat");

// --- createRecoveryLink: ACTION_PLANNED -> ACTION_EXECUTED, idempotent on repeat ---
await setStatus(caseD.id, "ACTION_PLANNED");
const link1 = await createRecoveryLink(dataSource, { caseId: caseD.id });
if (link1.status !== "ACTION_EXECUTED" || !link1.transitioned || !link1.link) {
  throw new Error("createRecoveryLink did not transition ACTION_PLANNED -> ACTION_EXECUTED with a link");
}
const link2 = await createRecoveryLink(dataSource, { caseId: caseD.id });
if (link2.transitioned) {
  throw new Error("createRecoveryLink is not idempotent: second call transitioned again");
}
if (!(await auditRowExists(caseD.id, "createRecoveryLink"))) {
  throw new Error("createRecoveryLink did not write an audit_log row");
}
console.log("createRecoveryLink: ACTION_PLANNED -> ACTION_EXECUTED, link:", link1.link);

// --- capturePayment: ACTION_PLANNED -> RECOVERED (two legal hops), idempotent on repeat ---
await setStatus(caseWithAuthorized.id, "ACTION_PLANNED");
const cap1 = await capturePayment(dataSource, { caseId: caseWithAuthorized.id });
if (cap1.status !== "RECOVERED" || cap1.amount_paise === undefined) {
  throw new Error("capturePayment did not walk ACTION_PLANNED -> ACTION_EXECUTED -> RECOVERED with an amount");
}
const cap2 = await capturePayment(dataSource, { caseId: caseWithAuthorized.id });
if (cap2.amount_paise !== undefined) {
  throw new Error("capturePayment's no-op branch should not report an amount");
}
if (!(await auditRowExists(caseWithAuthorized.id, "capturePayment"))) {
  throw new Error("capturePayment did not write an audit_log row");
}
console.log("capturePayment: ACTION_PLANNED -> RECOVERED, captured", cap1.amount_paise, "paise");

// --- capturePayment: rejects a case with nothing authorized to capture ---
await setStatus(caseWithoutAuthorized.id, "ACTION_PLANNED");
try {
  await capturePayment(dataSource, { caseId: caseWithoutAuthorized.id });
  throw new Error("expected capturePayment to throw when no authorized payment exists");
} catch (err) {
  if (!(err instanceof Error) || !err.message.includes("No authorized payment")) throw err;
  console.log("capturePayment correctly rejected a case with no authorized payment");
}

// --- all four action tools reject a case sitting at DETECTED ---
await setStatus(caseInvalid.id, "DETECTED");

try {
  await stopRecovery(dataSource, { caseId: caseInvalid.id });
  throw new Error("expected stopRecovery to throw from DETECTED");
} catch (err) {
  if (!(err instanceof Error) || !err.message.startsWith("Cannot")) throw err;
}

try {
  await escalateCase(dataSource, { caseId: caseInvalid.id });
  throw new Error("expected escalateCase to throw from DETECTED");
} catch (err) {
  if (!(err instanceof Error) || !err.message.startsWith("Cannot")) throw err;
}

try {
  await createRecoveryLink(dataSource, { caseId: caseInvalid.id });
  throw new Error("expected createRecoveryLink to throw from DETECTED");
} catch (err) {
  if (!(err instanceof Error) || !err.message.startsWith("Cannot")) throw err;
}

try {
  await capturePayment(dataSource, { caseId: caseInvalid.id });
  throw new Error("expected capturePayment to throw from DETECTED");
} catch (err) {
  if (!(err instanceof Error) || !err.message.startsWith("Cannot")) throw err;
}

console.log("all four action tools correctly reject an invalid transition from DETECTED");

process.exit(0);
