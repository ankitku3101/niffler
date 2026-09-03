"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatPaise } from "@/lib/format"
import type { CaseSummary } from "@/lib/cases"
import { LiveCaseRun } from "@/components/live-case-run"

const MAX_SHOWN = 12

export function LiveRunPicker({ cases }: { cases: CaseSummary[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [runKey, setRunKey] = useState(0)

  if (cases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No undetected cases left to run live right now — try Reset, or check back after the next batch.
      </p>
    )
  }

  const shown = cases.slice(0, MAX_SHOWN)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Pick a case below and watch NIFFLER investigate, diagnose, check policy, and act on it live.
      </p>
      <div className="flex flex-wrap gap-2">
        {shown.map((c) => (
          <Button
            key={c.id}
            variant={selectedId === c.id ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedId(c.id)
              setRunKey((k) => k + 1)
            }}
          >
            {c.orderId} · {formatPaise(c.amountPaise)}
          </Button>
        ))}
      </div>

      {selectedId !== null && <LiveCaseRun key={runKey} caseId={selectedId} />}
    </div>
  )
}
