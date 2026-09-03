import { resetRecovery } from "../src/cases/resetRecovery.js";
import { JsonPaymentDataSource } from "../src/data/jsonSource.js";

const summary = await resetRecovery(new JsonPaymentDataSource());

console.log("deleted audit_log rows:", summary.auditRowsDeleted);
console.log("deleted recovery_cases rows:", summary.casesDeleted);
console.log("candidates detected:", summary.candidatesDetected);
console.log("revenue at risk (paise):", summary.revenueAtRiskPaise);
console.log("recovery cases created:", summary.casesCreated);

process.exit(0);
