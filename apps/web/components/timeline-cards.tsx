"use client"

import { useState } from "react"
import { DECISION_VARIANT, RECOMMENDED_ACTION_LABELS } from "@/lib/labels"
import { Badge } from "@/components/ui/badge"
import { formatPaise, formatPercent } from "@/lib/format"

export type DiagnosisOutput = { diagnosis: string; confidence: number; evidence: string[]; recommendedAction: string }
export type PolicyOutput = { decision: string; reasons: string[] }
export type ActionOutput = { status: string; transitioned?: boolean; amount_paise?: number; link?: string }

export const ACTION_LABELS: Record<string, string> = {
  capturePayment: "Payment taken",
  createRecoveryLink: "Payment link sent",
  escalateCase: "Handed to a person",
  stopRecovery: "Stopped here",
}


export function InvestigatedSummary({ reads }: { reads: { tool: string; output: unknown }[] }) {
  const [showRaw, setShowRaw] = useState(false)

  if (reads.length === 0) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowRaw((v) => !v)}
        className="cursor-pointer text-muted-foreground underline-offset-2 hover:underline"
      >
        Checked {reads.length} source{reads.length === 1 ? "" : "s"}: the order, past attempts, and customer history
        {showRaw ? " · hide the raw data" : " · show the raw data"}
      </button>
      {showRaw && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg border bg-muted/40 p-2 text-xs">
          {JSON.stringify(reads, null, 2)}
        </pre>
      )}
    </div>
  )
}

export function DiagnosisCard({ diagnosis }: { diagnosis: DiagnosisOutput }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="font-medium">Diagnosis</span>
        <Badge variant="outline">{formatPercent(diagnosis.confidence)} confidence</Badge>
        <Badge>{RECOMMENDED_ACTION_LABELS[diagnosis.recommendedAction] ?? diagnosis.recommendedAction}</Badge>
      </div>
      <p className="text-muted-foreground">{diagnosis.diagnosis}</p>
      {diagnosis.evidence.length > 0 && (
        <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
          {diagnosis.evidence.map((e, idx) => (
            <li key={idx}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PolicyCard({ policy }: { policy: PolicyOutput }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="font-medium">Policy check</span>
        <Badge variant={DECISION_VARIANT[policy.decision] ?? "outline"}>{policy.decision.replace(/_/g, " ")}</Badge>
        {/* Policy rules independently, and sometimes agrees with the agent — so don't claim an override. */}
        {policy.decision === "DENIED" && (
          <span className="text-sm text-muted-foreground">blocked, whatever the AI wanted</span>
        )}
        {policy.decision === "REQUIRES_HUMAN_APPROVAL" && (
          <span className="text-sm text-muted-foreground">handed to a person, whatever the AI wanted</span>
        )}
      </div>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
        {policy.reasons.map((r, idx) => (
          <li key={idx}>{r}</li>
        ))}
      </ul>
    </div>
  )
}

export function ActionCard({ toolName, action }: { toolName: string; action: ActionOutput }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{ACTION_LABELS[toolName] ?? toolName}</span>
        {action.amount_paise !== undefined && <Badge variant="outline">{formatPaise(action.amount_paise)}</Badge>}
      </div>
      {action.link && <p className="mt-1 text-xs break-all text-muted-foreground">Link: {action.link}</p>}
    </div>
  )
}
