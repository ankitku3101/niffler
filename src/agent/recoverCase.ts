import { markActionPlanned } from "../cases/markActionPlanned.js";
import { markInvestigating } from "../cases/markInvestigating.js";
import type { PaymentDataSource } from "../data/source.js";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema.js";
import type { Diagnosis } from "../domain/diagnosis.js";
import { checkAttemptLimit, checkEligibility, combinePolicyChecks, type PolicyDecision } from "../domain/policy.js";
import { capturePayment, type CapturePaymentResult } from "../tools/capturePayment.js";
import { createRecoveryLink, type CreateRecoveryLink } from "../tools/createRecoveryLink.js";
import { escalateCase } from "../tools/escalateCase.js";
import { resolveCaseOrder } from "../tools/resolveCase.js";
import { stopRecovery, type OrderCaseStatus } from "../tools/stopRecovery.js";
import { investigateCase } from "./investigate.js";
import type { LlmClient } from "./llmClient.js";

export type RecoveryCaseOutcome = {
    diagnosis: Diagnosis;
    policyDecision: {
        decision: PolicyDecision;
        reasons: string[];
    };
    outcome: OrderCaseStatus | CapturePaymentResult | CreateRecoveryLink;
};

export async function recoverCase(dataSource: PaymentDataSource, caseId: number, llmClient: LlmClient, maxAttempts: number) : Promise<RecoveryCaseOutcome> {

    await markInvestigating(caseId);
    const diagnosis = await investigateCase(dataSource, llmClient, caseId);

    const { order } = await resolveCaseOrder(dataSource, caseId);
    const payments = await dataSource.listPaymentsForOrder(order.id);

    await markActionPlanned(caseId);

    const { decision, reasons } = combinePolicyChecks([checkEligibility(order), checkAttemptLimit(payments, maxAttempts)]);

    await db.insert(auditLog).values({
        caseId: caseId,
        toolName: "policyCheck",
        input: {caseId},
        output: { decision, reasons },
    })

    let outcome : OrderCaseStatus | CapturePaymentResult | CreateRecoveryLink;

    try {
        if (decision === "DENIED") {
            outcome = await stopRecovery(dataSource, { caseId });
        } else if (decision === "REQUIRES_HUMAN_APPROVAL") {
            outcome = await escalateCase(dataSource, { caseId });
        } else {
            switch (diagnosis.recommendedAction) {
                case "CAPTURE_PAYMENT":
                    outcome = await capturePayment(dataSource, { caseId });
                    break;                    
                case "RECOVERY_LINK":
                    outcome = await createRecoveryLink(dataSource, { caseId });
                    break;
                case "ESCALATE":
                    outcome = await escalateCase(dataSource, { caseId });
                    break;
                case "STOP":
                    outcome = await stopRecovery(dataSource, { caseId });
                    break;
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`action execution failed for case ${caseId}:`, message);
        outcome = await escalateCase(dataSource, { caseId });
    }

    return { diagnosis, policyDecision: { decision, reasons }, outcome };
}