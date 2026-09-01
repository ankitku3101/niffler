import { JsonPaymentDataSource } from "../src/data/jsonSource.js";
import { generateReport } from "../src/evaluation/report.js";

// Task 9.4: reads recovery_cases/audit_log + the payment world fresh and
// reports the actual outcome of whatever batch run(s) have happened so far.
// No writes, no LLM calls — pure reporting over what already happened.

const rupees = (paise: number) =>
  "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const pct = (rate: number) => (Number.isFinite(rate) ? `${(rate * 100).toFixed(1)}%` : "n/a");

const dataSource = new JsonPaymentDataSource();
const report = await generateReport(dataSource);

console.log("=== NIFFLER recovery report ===\n");

console.log(`revenue at risk (full batch)   ${rupees(report.revenueAtRiskPaise)}`);
console.log(`treatment cases                ${report.treatmentCases}  (${rupees(report.treatmentAtRiskPaise)} at risk)`);
console.log(`control cases (held out)       ${report.controlCases}\n`);

console.log(`recovered (confirmed)          ${report.recoveredCases}  (${rupees(report.confirmedRecoveredPaise)})`);
console.log(`recovery link pending          ${report.actionExecutedCases}  (${rupees(report.pendingRecoveryPaise)})`);
console.log(`escalated                      ${report.escalatedCases}`);
console.log(`stopped                        ${report.stoppedCases}`);
console.log(`failed interventions           ${report.failedCases}`);
console.log(`not yet processed              ${report.notYetProcessedCases}\n`);

console.log(`recovery rate (treatment)      ${pct(report.recoveryRate)}`);
console.log(`natural recovery rate (control) ${pct(report.naturalRecoveryRate)}`);
console.log(`attributable lift              ${pct(report.attributableLiftRate)}\n`);

console.log(`policy overrides               ${report.policyOverrideCount}  (cases where policy forced an outcome the LLM did not recommend)`);

process.exit(0);
