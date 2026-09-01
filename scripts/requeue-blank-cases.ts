import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { auditLog, recoveryCases } from "../src/db/schema.js";

// One-off remediation: a run of cases reached a terminal-ish status
// (ESCALATED/STOPPED) without ever getting a real diagnosis, because every
// converse() call failed on a provider rate limit and checkIterationLimit's
// fallback fired instead (recommendedAction: "ESCALATE", confidence: 0, no
// real reasoning). Resets exactly those cases back to DETECTED so the next
// batch run gives them a genuine investigation.
//
// Deliberately bypasses canTransition — this isn't a normal state-machine
// transition, it's an admin correction for a data-quality issue, the same
// category of operation as reset.ts's table wipe. Old audit_log rows are
// left in place (append-only, and they're a real record of what actually
// happened); a reprocessed case will simply carry both the failed attempt
// and the real one in its trail.

const diagnosisRows = await db.select().from(auditLog).where(eq(auditLog.toolName, "submitDiagnosis"));
const caseIdsWithDiagnosis = new Set(diagnosisRows.map((r) => r.caseId));

const terminalStatuses = new Set(["RECOVERED", "ACTION_EXECUTED", "ESCALATED", "STOPPED"]);

const allCases = await db.select().from(recoveryCases);
const blankCases = allCases.filter(
  (c) => terminalStatuses.has(c.status) && !caseIdsWithDiagnosis.has(c.id)
);

if (blankCases.length === 0) {
  console.log("no blank-diagnosis cases found — nothing to requeue");
  process.exit(0);
}

const blankCaseIds = blankCases.map((c) => c.id);

await db
  .update(recoveryCases)
  .set({ status: "DETECTED", updatedAt: new Date() })
  .where(inArray(recoveryCases.id, blankCaseIds));

console.log(`requeued ${blankCaseIds.length} blank-diagnosis cases back to DETECTED:`, blankCaseIds);

process.exit(0);
