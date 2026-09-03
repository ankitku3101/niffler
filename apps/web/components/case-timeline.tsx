"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPaise, formatPercent } from "@/lib/format"
import type { CaseDetail } from "@/lib/cases"

type AuditRow = CaseDetail["auditTrail"][number]
type DiagnosisOutput = { diagnosis: string; confidence: number; evidence: string[]; recommendedAction: string }
type PolicyOutput = { decision: string; reasons: string[] }
type ActionOutput = { status: string; transitioned?: boolean; amount_paise?: number; link?: string }

const READ_TOOLS = new Set(["getOrder", "listPreviousAttempts", "getCustomerHistory"])
const ACTION_TOOLS = new Set(["capturePayment", "createRecoveryLink", "escalateCase", "stopRecovery"])

const ACTION_LABELS: Record<string, string> = {
  capturePayment: "Payment captured",
  createRecoveryLink: "Recovery link sent",
  escalateCase: "Escalated to a human",
  stopRecovery: "Recovery stopped",
}

const RECOMMENDED_ACTION_LABELS: Record<string, string> = {
  CAPTURE_PAYMENT: "Capture the payment",
  RECOVERY_LINK: "Send a recovery link",
  ESCALATE: "Escalate to a human",
  STOP: "Stop recovery",
}

const DECISION_VARIANT: Record<string, "outline" | "destructive" | "secondary"> = {
  ALLOWED: "outline",
  DENIED: "destructive",
  REQUIRES_HUMAN_APPROVAL: "secondary",
}

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

export function CaseTimeline({ auditTrail }: { auditTrail: AuditRow[] }) {
  if (auditTrail.length === 0) {
    return <p className="text-sm text-muted-foreground">Not yet investigated.</p>
  }

  const cycles = groupIntoCycles(auditTrail)

  return (
    <div className="flex flex-col gap-4">
      {cycles.map((cycle, i) => (
        <Cycle key={cycle[0]!.id} cycle={cycle} attempt={i + 1} isLast={i === cycles.length - 1} />
      ))}
    </div>
  )
}

function Cycle({ cycle, attempt, isLast }: { cycle: AuditRow[]; attempt: number; isLast: boolean }) {
  const [showRaw, setShowRaw] = useState(false)

  const reads = cycle.filter((r) => READ_TOOLS.has(r.toolName))
  const diagnosisRow = cycle.find((r) => r.toolName === "submitDiagnosis")
  const policyRow = cycle.find((r) => r.toolName === "policyCheck")
  const actionRow = cycle.find((r) => ACTION_TOOLS.has(r.toolName))

  const diagnosis = diagnosisRow?.output as DiagnosisOutput | undefined
  const policy = policyRow?.output as PolicyOutput | undefined
  const action = actionRow?.output as ActionOutput | undefined

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {isLast ? "Latest attempt" : `Attempt ${attempt}`} · {new Date(cycle[0]!.createdAt).toLocaleString()}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {reads.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="cursor-pointer text-muted-foreground underline-offset-2 hover:underline"
            >
              Investigated {reads.length} sources (order, previous attempts, customer history)
              {showRaw ? " — hide raw data" : " — show raw data"}
            </button>
            {showRaw && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg border bg-muted/40 p-2 text-xs">
                {JSON.stringify(reads.map((r) => ({ tool: r.toolName, output: r.output })), null, 2)}
              </pre>
            )}
          </div>
        )}

        {diagnosis && (
          <div className="rounded-lg border p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-medium">Diagnosis</span>
              <Badge variant="outline">{formatPercent(diagnosis.confidence)} confidence</Badge>
              <Badge>{RECOMMENDED_ACTION_LABELS[diagnosis.recommendedAction] ?? diagnosis.recommendedAction}</Badge>
            </div>
            <p className="text-muted-foreground">{diagnosis.diagnosis}</p>
            {diagnosis.evidence.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                {diagnosis.evidence.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {policy && (
          <div className="rounded-lg border p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-medium">Policy check</span>
              <Badge variant={DECISION_VARIANT[policy.decision] ?? "outline"}>
                {policy.decision.replace(/_/g, " ")}
              </Badge>
              {policy.decision !== "ALLOWED" && (
                <span className="text-xs text-muted-foreground">— overrode the agent&apos;s proposal</span>
              )}
            </div>
            <ul className="list-disc pl-5 text-xs text-muted-foreground">
              {policy.reasons.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {action && actionRow && (
          <div className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{ACTION_LABELS[actionRow.toolName] ?? actionRow.toolName}</span>
              {action.amount_paise !== undefined && <Badge variant="outline">{formatPaise(action.amount_paise)}</Badge>}
            </div>
            {action.link && <p className="mt-1 text-xs break-all text-muted-foreground">Link: {action.link}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
