"use client"

import { useState } from "react"
import { ShieldAlert } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { formatPaise, formatWhen } from "@/lib/format"
import { getCaseDetail, type CaseDetail, type CaseSummary } from "@/lib/cases"
import { CaseTimeline } from "@/components/case-timeline"
import { RECOMMENDED_ACTION_LABELS } from "@/lib/labels"

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  RECOVERED: "default",
  ACTION_EXECUTED: "secondary",
  STOPPED: "destructive",
  FAILED: "destructive",
}

const STATUS_ORDER = [
  "DETECTED",
  "INVESTIGATING",
  "ACTION_PLANNED",
  "ACTION_EXECUTED",
  "RECOVERED",
  "ESCALATED",
  "STOPPED",
  "FAILED",
] as const

const STATUS_LEGEND: Record<string, string> = {
  DETECTED: "Found and waiting. Nobody has looked at it yet.",
  INVESTIGATING: "The agent is reading the order and the customer's history right now.",
  ACTION_PLANNED: "The agent has decided. The rules are checking that decision.",
  ACTION_EXECUTED: "A payment link was sent. Waiting to see if the customer pays.",
  RECOVERED: "The money came in.",
  ESCALATED: "Handed to a person, either because the rules said so or because the agent was unsure.",
  STOPPED: "The rules said stop. Usually because it was already paid, or there was nothing left to try.",
  FAILED: "Something broke while trying to act on it.",
}

export function CasesTable({ cases }: { cases: CaseSummary[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<CaseDetail | null>(null)
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [guardrailOnly, setGuardrailOnly] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  async function openCase(id: number) {
    setOpen(true)
    setLoading(true)
    setError(false)
    setSelected(null)
    try {
      const detail = await getCaseDetail(id)
      setSelected(detail)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const guardrailCount = cases.filter((c) => c.policyOverridden).length
  const statusesPresent = STATUS_ORDER.filter((status) => cases.some((c) => c.status === status))
  const statusCounts = new Map(statusesPresent.map((status) => [status, cases.filter((c) => c.status === status).length]))
  const filtered = cases.filter(
    (c) => (statusFilter === null || c.status === statusFilter) && (!guardrailOnly || c.policyOverridden)
  )

  return (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <FilterChip label={`All (${cases.length})`} active={statusFilter === null} onClick={() => setStatusFilter(null)} />
        {statusesPresent.map((status) => (
          <FilterChip
            key={status}
            label={`${status} (${statusCounts.get(status)})`}
            active={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          />
        ))}
        {guardrailCount > 0 && (
          <button type="button" onClick={() => setGuardrailOnly((v) => !v)} className="cursor-pointer">
            <Badge variant={guardrailOnly ? "destructive" : "outline"} className="gap-1">
              <ShieldAlert className="size-3" />
              Guardrail overrides ({guardrailCount})
            </Badge>
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          className="cursor-pointer text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          {showLegend ? "Hide" : "What do these mean?"}
        </button>
      </div>

      {showLegend && (
        <dl className="mb-4 grid grid-cols-1 gap-x-6 gap-y-1.5 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
          {statusesPresent.map((status) => (
            <div key={status} className="flex gap-1.5">
              <dt className="shrink-0 font-medium">{status}</dt>
              <dd className="text-muted-foreground">{STATUS_LEGEND[status]}</dd>
            </div>
          ))}
          {guardrailCount > 0 && (
            <div className="flex gap-1.5 sm:col-span-2">
              <dt className="flex shrink-0 items-center gap-1 font-medium">
                <ShieldAlert className="size-3" /> Guardrail
              </dt>
              <dd className="text-muted-foreground">
                The rules overruled the AI. They either blocked it outright or handed it to a person.
              </dd>
            </div>
          )}
        </dl>
      )}

      {!showLegend && <div className="mb-3" />}

      {/* Below sm, only status and diagnosis survive — the rest is one tap away in the case sheet. */}
      <Table className="table-fixed min-w-0 sm:min-w-190">
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-24 truncate sm:table-cell">Order</TableHead>
            <TableHead className="w-32 truncate sm:w-32.5">Status</TableHead>
            <TableHead className="hidden truncate sm:table-cell sm:w-18">Amount</TableHead>
            {/* auto on mobile: absorbs the leftover width instead of forcing the table off-screen. */}
            <TableHead className="w-auto sm:w-80">Diagnosis</TableHead>
            <TableHead className="hidden w-36 sm:table-cell">Recommended Action</TableHead>
            <TableHead className="hidden w-26 sm:table-cell">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={() => openCase(c.id)}
            >
              <TableCell className="hidden truncate sm:table-cell" title={c.orderId}>{c.orderId}</TableCell>
              <TableCell className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <Badge variant={statusVariant[c.status] ?? "outline"}>
                    {c.status}
                  </Badge>
                  {c.policyOverridden && <ShieldAlert className="size-3.5 shrink-0 text-muted-foreground" />}
                </div>
              </TableCell>
              <TableCell className="hidden truncate sm:table-cell">{formatPaise(c.amountPaise)}</TableCell>
              {/* Clamp on an inner div — -webkit-box on a cell fights table-cell and bleeds a half line. */}
              <TableCell className="py-2.5 align-top text-sm whitespace-normal">
                <div className="line-clamp-3 leading-snug" title={c.diagnosis ?? undefined}>
                  {c.diagnosis ?? "—"}
                </div>
              </TableCell>
              <TableCell className="hidden align-top text-sm whitespace-normal text-muted-foreground sm:table-cell">
                {c.recommendedAction ? RECOMMENDED_ACTION_LABELS[c.recommendedAction] ?? c.recommendedAction : "—"}
              </TableCell>
              <TableCell className="hidden align-top text-sm whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                {formatWhen(c.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={open} onOpenChange={setOpen}>
        {/* Widths carry the same data-[side] prefix the base component uses, or its own
            sm:max-w-sm wins on specificity and the sheet stays narrow. */}
        <SheetContent className="data-[side=right]:sm:max-w-lg data-[side=right]:lg:max-w-2xl data-[side=right]:xl:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{selected ? selected.orderId : error ? "Data unavailable" : "Loading…"}</SheetTitle>
            <SheetDescription>
              {selected ? `${selected.status} — ${formatPaise(selected.amountPaise)}` : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {error && (
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load this case&apos;s details right now. Try again in a moment.
              </p>
            )}
            {selected && <CaseTimeline auditTrail={selected.auditTrail} caseStatus={selected.status} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="cursor-pointer">
      <Badge variant={active ? "default" : "outline"}>{label}</Badge>
    </button>
  )
}
