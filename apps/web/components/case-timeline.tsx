"use client"

import type { CaseDetail } from "@/lib/cases"
import {
  ActionCard,
  DiagnosisCard,
  InvestigatedSummary,
  PolicyCard,
  type ActionOutput,
  type DiagnosisOutput,
  type PolicyOutput,
} from "@/components/timeline-cards"

type AuditRow = CaseDetail["auditTrail"][number]

const READ_TOOLS = new Set(["getOrder", "listPreviousAttempts", "getCustomerHistory"])
const ACTION_TOOLS = new Set(["capturePayment", "createRecoveryLink", "escalateCase", "stopRecovery"])

// Splits a case's flat audit trail into per-attempt cycles at each markInvestigating.
function groupIntoCycles(trail: AuditRow[]): AuditRow[][] {
  const cycles: AuditRow[][] = []
  for (const row of trail) {
    if (row.toolName === "markInvestigating" || cycles.length === 0) {
      cycles.push([])
    }
    cycles[cycles.length - 1]!.push(row)
  }
  return cycles
}

export function CaseTimeline({ auditTrail, caseStatus }: { auditTrail: AuditRow[]; caseStatus?: string }) {
  if (auditTrail.length === 0) {
    return <p className="text-sm text-muted-foreground">Not yet investigated.</p>
  }

  const cycles = groupIntoCycles(auditTrail)

  return (
    <div className="flex flex-col gap-5">
      {cycles.map((cycle, i) => (
        <Cycle
          key={cycle[0]!.id}
          cycle={cycle}
          attempt={i + 1}
          isLast={i === cycles.length - 1}
          caseStatus={caseStatus}
        />
      ))}
    </div>
  )
}

function Cycle({
  cycle,
  attempt,
  isLast,
  caseStatus,
}: {
  cycle: AuditRow[]
  attempt: number
  isLast: boolean
  caseStatus?: string
}) {
  const reads = cycle.filter((r) => READ_TOOLS.has(r.toolName)).map((r) => ({ tool: r.toolName, output: r.output }))
  const diagnosisRow = cycle.find((r) => r.toolName === "submitDiagnosis")
  const policyRow = cycle.find((r) => r.toolName === "policyCheck")
  const actionRow = cycle.find((r) => ACTION_TOOLS.has(r.toolName))

  return (
    <div className="flex flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-medium text-muted-foreground">
        {isLast ? "Latest attempt" : `Attempt ${attempt}`} · {new Date(cycle[0]!.createdAt).toLocaleString()}
      </h3>
      <div className="flex flex-col gap-3 text-sm">
        <InvestigatedSummary reads={reads} />
        {diagnosisRow && <DiagnosisCard diagnosis={diagnosisRow.output as DiagnosisOutput} />}
        {policyRow && <PolicyCard policy={policyRow.output as PolicyOutput} />}
        {actionRow && (
          <ActionCard
            toolName={actionRow.toolName}
            action={actionRow.output as ActionOutput}
            payable={isLast && caseStatus === "ACTION_EXECUTED"}
          />
        )}
      </div>
    </div>
  )
}
