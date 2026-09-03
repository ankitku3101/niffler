import { eq } from "drizzle-orm";
import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { auditLog, recoveryCases } from "../db/schema.js";
import { detectCandidates } from "../detection/candidates.js";
import { DETECTION_CUTOFF, toIso } from "../generator/world.js";
import { isControlGroup } from "./holdout.js";

export async function generateReport(dataSource: PaymentDataSource) {

    const orders = await dataSource.listOrders(toIso(DETECTION_CUTOFF));
    const { revenueAtRiskPaise } = detectCandidates(orders);

    const amountByOrderId = new Map(orders.map((o) => [o.id, o.amount_paise]));

    const allCases = await db.select().from(recoveryCases);

    const treatmentCases = allCases.filter((c) => !isControlGroup(c.orderId));
    const treatmentAtRiskPaise = treatmentCases.reduce((sum, c) => {
        return sum + (amountByOrderId.get(c.orderId) ?? 0);
    }, 0);

    const controlCases = allCases.filter((c) => isControlGroup(c.orderId));

    const recoveredCases = treatmentCases.filter((c) => c.status === "RECOVERED");
    const confirmedRecoveredPaise = recoveredCases.reduce((sum, c) => {
        return sum + (amountByOrderId.get(c.orderId) ?? 0);
    }, 0);

    const actionExecutedCases = treatmentCases.filter((c) => c.status === "ACTION_EXECUTED");
    const pendingRecoveryPaise = actionExecutedCases.reduce((sum, c) => {
        return sum + (amountByOrderId.get(c.orderId) ?? 0);
    }, 0);

    const escalatedCases = treatmentCases.filter((c) => c.status === "ESCALATED");

    const stoppedCases = treatmentCases.filter((c) => c.status === "STOPPED");

    const notYetProcessedCases = treatmentCases.filter((c) => c.status === "DETECTED");
    const failedCases = treatmentCases.filter((c) => c.status === "INVESTIGATING" || c.status === "ACTION_PLANNED");

    const diagnosisRows = await db.select().from(auditLog).where(eq(auditLog.toolName, "submitDiagnosis"));
    const caseIdsWithDiagnosis = new Set(diagnosisRows.map((r) => r.caseId));
    const terminalStatuses = new Set(["RECOVERED", "ACTION_EXECUTED", "ESCALATED", "STOPPED"]);
    const blankDiagnosisCases = treatmentCases.filter(
        (c) => terminalStatuses.has(c.status) && !caseIdsWithDiagnosis.has(c.id)
    );

    const recoveryRate = confirmedRecoveredPaise / treatmentAtRiskPaise;

    const liveOrders = await dataSource.listOrders();
    const liveStatusByOrderId = new Map(liveOrders.map((o) => [o.id, o.status]));

    const controlAtRiskPaise = controlCases.reduce((sum, c) => {
        return sum + (amountByOrderId.get(c.orderId) ?? 0);
    }, 0);

    const controlNaturallyRecoveredPaise = controlCases
        .filter((c) => liveStatusByOrderId.get(c.orderId) === "paid")
        .reduce((sum, c) => sum + (amountByOrderId.get(c.orderId) ?? 0), 0);

    const naturalRecoveryRate = controlNaturallyRecoveredPaise / controlAtRiskPaise;
    const attributableLiftRate = recoveryRate - naturalRecoveryRate;

    const policyRows = await db.select().from(auditLog).where(eq(auditLog.toolName, "policyCheck"));
    const policyOverrideCount = policyRows.filter((r) => (r.output as { decision: string }).decision !== "ALLOWED").length;


    const result = { 
        treatmentCases: treatmentCases.length,
        controlCases: controlCases.length,
        recoveredCases: recoveredCases.length,
        actionExecutedCases: actionExecutedCases.length,
        escalatedCases: escalatedCases.length,
        stoppedCases: stoppedCases.length,
        failedCases: failedCases.length,
        notYetProcessedCases: notYetProcessedCases.length,
        blankDiagnosisCases: blankDiagnosisCases.length,
        revenueAtRiskPaise,
        treatmentAtRiskPaise,
        confirmedRecoveredPaise,
        pendingRecoveryPaise,
        recoveryRate,
        naturalRecoveryRate,
        attributableLiftRate,
        policyOverrideCount
    };

    return result;
}