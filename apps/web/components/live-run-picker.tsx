"use client"

import { useState } from "react"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPaise } from "@/lib/format"
import type { CaseSummary } from "@/lib/cases"
import { LiveCaseRun } from "@/components/live-case-run"
import { cn } from "@/lib/utils"

const MAX_SHOWN = 12

const STEPS = [
  { name: "Investigate", detail: "Reads the order, the past attempts, and the customer's history." },
  { name: "Diagnose", detail: "Explains why it failed, and how sure it is." },
  { name: "Policy check", detail: "The rules decide whether that is allowed." },
  { name: "Act", detail: "Take the payment, send a link, ask a human, or stop." },
]

// Only alreadyPaid predicts an outcome, and deterministically — checkEligibility denies a paid order.
function caseLabel(c: CaseSummary): { text: string; guardrail: boolean } {
  if (c.alreadyPaid) return { text: "Already paid — policy will block this", guardrail: true }
  if (c.hasAuthorizedPayment) return { text: "Authorized, never captured", guardrail: false }
  if (c.failedAttempts === 1) return { text: "1 failed attempt", guardrail: false }
  return { text: `${c.failedAttempts} failed attempts`, guardrail: false }
}

// Surfaces the two cases that end somewhere other than "sent a link" first.
function interestRank(c: CaseSummary): number {
  if (c.alreadyPaid) return 0
  if (c.hasAuthorizedPayment) return 1
  return 2
}

export function LiveRunPicker({ cases }: { cases: CaseSummary[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [runKey, setRunKey] = useState(0)

  if (cases.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        No un-run cases left right now — every case has already been processed. Reset restores them, or
        head to Try It Yourself to create a brand-new one.
      </p>
    )
  }

  const shown = [...cases]
    .sort((a, b) => interestRank(a) - interestRank(b) || b.failedAttempts - a.failedAttempts)
    .slice(0, MAX_SHOWN)

  function select(id: number) {
    setSelectedId(id)
    setRunKey((k) => k + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {shown.map((c) => {
          const label = caseLabel(c)
          const active = selectedId === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-1 rounded-lg border px-3.5 py-2.5 text-left transition-all duration-200",
                active
                  ? "border-primary bg-primary/10"
                  : "hover:border-primary/40 hover:bg-muted/40",
                label.guardrail && !active && "border-primary/40"
              )}
            >
              <span className="text-sm font-medium tabular-nums">{formatPaise(c.amountPaise)}</span>
              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  label.guardrail ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label.guardrail && <ShieldAlert className="size-3.5 shrink-0" />}
                {label.text}
              </span>
            </button>
          )
        })}
      </div>

      {selectedId === null ? (
        <div className="flex flex-col gap-4 rounded-xl border border-dashed p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-medium">What you&apos;ll watch</span>
            <Badge variant="outline">live · one case at a time</Badge>
          </div>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.name} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-base font-medium">{step.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{step.detail}</span>
              </li>
            ))}
          </ol>
          <p className="max-w-[75ch] text-sm text-muted-foreground">
            This is not a recording. The AI is thinking it through as you watch, which takes a few
            seconds, and it writes a fresh answer every time.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <LiveCaseRun key={runKey} caseId={selectedId} />
          <div>
            <Button variant="outline" size="sm" onClick={() => select(selectedId)}>
              Run it again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
