"use client"

import { useState } from "react"
import { ExternalLinkIcon } from "lucide-react"
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

export function ActionCard({
  toolName,
  action,
  // Only invite payment while the money is genuinely still outstanding. A spent link, or one from an
  // earlier attempt, must not be offered again. Defaults to the state this action itself produced,
  // which is what a live run wants.
  payable = action.status === "ACTION_EXECUTED",
}: {
  toolName: string
  action: ActionOutput
  payable?: boolean
}) {
  // Only a real Razorpay link is worth offering. Cases from the generated dataset get a
  // placeholder id instead, which as an href would resolve against this site and 404.
  const isRealLink = /^https?:\/\//.test(action.link ?? "")
  const awaitingPayment = payable && isRealLink

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{ACTION_LABELS[toolName] ?? toolName}</span>
        {action.amount_paise !== undefined && <Badge variant="outline">{formatPaise(action.amount_paise)}</Badge>}
      </div>

      {action.link && awaitingPayment && (
        <div className="mt-3 flex flex-col gap-1.5">
          <a
            href={action.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5"
          >
            Pay this link
            <ExternalLinkIcon className="size-3.5 shrink-0" />
          </a>
          <span className="text-sm text-muted-foreground">
            A real Razorpay test link. Paying it tells NIFFLER the money came in, and the case turns into
            a recovery.
          </span>
        </div>
      )}

      {action.link && isRealLink && !awaitingPayment && (
        <p className="mt-1 text-sm break-all text-muted-foreground">Link: {action.link}</p>
      )}

      {action.link && !isRealLink && (
        <p className="mt-1 text-sm text-muted-foreground">
          This case comes from the generated dataset, so the link is a stand-in rather than a real
          one you can pay. Try It Yourself creates a case with a genuine link.
        </p>
      )}
    </div>
  )
}
