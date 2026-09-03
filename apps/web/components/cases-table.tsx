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
import { formatPaise } from "@/lib/format"
import { getCaseDetail, type CaseDetail, type CaseSummary } from "@/lib/cases"
import { CaseTimeline } from "@/components/case-timeline"

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
  DETECTED: "Flagged as a recovery candidate; not yet investigated.",
  INVESTIGATING: "Agent is gathering context — order, payment history, customer history.",
  ACTION_PLANNED: "Diagnosis complete; policy check in progress.",
  ACTION_EXECUTED: "A recovery link was sent; outcome not yet confirmed.",
  RECOVERED: "Payment captured or link paid — revenue confirmed recovered.",
  ESCALATED: "Routed to a human — policy required approval, or the agent judged it ambiguous.",
  STOPPED: "Policy denied further action — already paid, or judged unrecoverable.",
  FAILED: "Recovery action failed for a technical reason.",
}

export function CasesTable({ cases }: { cases: CaseSummary[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<CaseDetail | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [guardrailOnly, setGuardrailOnly] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  async function openCase(id: number) {
    setOpen(true)
    setLoading(true)
    const detail = await getCaseDetail(id)
    setSelected(detail)
    setLoading(false)
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
          className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {showLegend ? "Hide" : "What do these mean?"}
        </button>
      </div>

      {showLegend && (
        <dl className="mb-4 grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg border bg-muted/30 p-3 text-xs sm:grid-cols-2">
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
                Policy overrode the agent&apos;s proposed action — denied it outright, or routed it to a human.
              </dd>
            </div>
          )}
        </dl>
      )}

      {!showLegend && <div className="mb-3" />}

      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-28 truncate">Order</TableHead>
            <TableHead className="w-32.5 truncate">Status</TableHead>
            <TableHead className="w-17.5 truncate">Amount</TableHead>
            <TableHead className="w-40 truncate">Diagnosis</TableHead>
            <TableHead className="w-30 truncate">Recommended Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={() => openCase(c.id)}
            >
              <TableCell className="truncate">{c.orderId}</TableCell>
              <TableCell className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <Badge variant={statusVariant[c.status] ?? "outline"}>
                    {c.status}
                  </Badge>
                  {c.policyOverridden && <ShieldAlert className="size-3.5 shrink-0 text-muted-foreground" />}
                </div>
              </TableCell>
              <TableCell className="truncate">{formatPaise(c.amountPaise)}</TableCell>
              <TableCell className="truncate">{c.diagnosis ?? "—"}</TableCell>
              <TableCell className="truncate">{c.recommendedAction ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected ? selected.orderId : "Loading…"}</SheetTitle>
            <SheetDescription>
              {selected ? `${selected.status} — ${formatPaise(selected.amountPaise)}` : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {selected && <CaseTimeline auditTrail={selected.auditTrail} />}
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
