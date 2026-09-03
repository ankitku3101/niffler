import { eq } from "drizzle-orm";
import { markActionPlanned } from "../cases/markActionPlanned.js";
import { markInvestigating } from "../cases/markInvestigating.js";
import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema.js";
import type { Diagnosis } from "../domain/diagnosis.js";
import { checkAttemptLimit, checkEligibility, checkPriorRecoveryLink, combinePolicyChecks, type PolicyDecision } from "../domain/policy.js";
import { capturePayment, type CapturePaymentResult } from "../tools/capturePayment.js";
import { createRecoveryLink, type CreateRecoveryLink } from "../tools/createRecoveryLink.js";
import { escalateCase } from "../tools/escalateCase.js";
import { resolveCaseOrder } from "../tools/resolveCase.js";
import { stopRecovery, type OrderCaseStatus } from "../tools/stopRecovery.js";
import { investigateCase } from "./investigate.js";
import type { LlmClient } from "./llmClient.js";
import type { OnStep } from "./recoveryStep.js";

export type RecoveryCaseOutcome = {
    diagnosis: Diagnosis;
    policyDecision: {
        decision: PolicyDecision;
        reasons: string[];
    };
    outcome: OrderCaseStatus | CapturePaymentResult | CreateRecoveryLink;
};

export async function recoverCase(dataSource: PaymentDataSource, caseId: number, llmClient: LlmClient, maxAttempts: number, onStep?: OnStep) : Promise<RecoveryCaseOutcome> {

    await markInvestigating(caseId);
    const diagnosis = await investigateCase(dataSource, llmClient, caseId, onStep);

    const { order } = await resolveCaseOrder(dataSource, caseId);
    const payments = await dataSource.listPaymentsForOrder(order.id);

    // Our own record of what has already been done for this case. The rule that
    // consumes it stays pure; fetching is the caller's job, same as payments above.
    const history = await db.select().from(auditLog).where(eq(auditLog.caseId, caseId));
    const priorLink = {
        issued: history.some((row) => row.toolName === "createRecoveryLink"),
        paid: history.some((row) => row.toolName === "webhookPaymentLinkPaid"),
    };

    await markActionPlanned(caseId);

    const { decision, reasons } = combinePolicyChecks([
        checkEligibility(order),
        checkAttemptLimit(payments, maxAttempts),
        checkPriorRecoveryLink(priorLink),
    ]);

    await db.insert(auditLog).values({
        caseId: caseId,
        toolName: "policyCheck",
        input: {caseId},
        output: { decision, reasons },
    })
    onStep?.({ kind: "policy_check", decision, reasons });

    let outcome : OrderCaseStatus | CapturePaymentResult | CreateRecoveryLink;
    let actionToolName: string;

    try {
        if (decision === "DENIED") {
            actionToolName = "stopRecovery";
            outcome = await stopRecovery(dataSource, { caseId });
        } else if (decision === "REQUIRES_HUMAN_APPROVAL") {
            actionToolName = "escalateCase";
            outcome = await escalateCase(dataSource, { caseId });
        } else {
            switch (diagnosis.recommendedAction) {
                case "CAPTURE_PAYMENT":
                    actionToolName = "capturePayment";
                    outcome = await capturePayment(dataSource, { caseId });
                    break;
                case "RECOVERY_LINK":
                    actionToolName = "createRecoveryLink";
                    outcome = await createRecoveryLink(dataSource, { caseId });
                    break;
                case "ESCALATE":
                    actionToolName = "escalateCase";
                    outcome = await escalateCase(dataSource, { caseId });
                    break;
                case "STOP":
                    actionToolName = "stopRecovery";
                    outcome = await stopRecovery(dataSource, { caseId });
                    break;
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`action execution failed for case ${caseId}:`, message);
        actionToolName = "escalateCase";
        outcome = await escalateCase(dataSource, { caseId });
    }

    onStep?.({ kind: "action", toolName: actionToolName, output: outcome });

    return { diagnosis, policyDecision: { decision, reasons }, outcome };
}