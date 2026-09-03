"use client"

import { useState } from "react"
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

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  RECOVERED: "default",
  ACTION_EXECUTED: "secondary",
  STOPPED: "destructive",
  FAILED: "destructive",
}

export function CasesTable({ cases }: { cases: CaseSummary[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<CaseDetail | null>(null)

  async function openCase(id: number) {
    setOpen(true)
    setLoading(true)
    const detail = await getCaseDetail(id)
    setSelected(detail)
    setLoading(false)
  }

  return (
    <>
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
          {cases.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={() => openCase(c.id)}
            >
              <TableCell className="truncate">{c.orderId}</TableCell>
              <TableCell className="overflow-hidden">
                <Badge variant={statusVariant[c.status] ?? "outline"}>
                  {c.status}
                </Badge>
              </TableCell>
              <TableCell className="truncate">{formatPaise(c.amountPaise)}</TableCell>
              <TableCell className="truncate">{c.diagnosis ?? "—"}</TableCell>
              <TableCell className="truncate">{c.recommendedAction ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selected ? selected.orderId : "Loading…"}</SheetTitle>
            <SheetDescription>
              {selected ? `${selected.status} — ${formatPaise(selected.amountPaise)}` : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {selected?.auditTrail.map((row) => (
              <div key={row.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{row.toolName}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </div>
                <pre className="mt-2 overflow-x-auto text-xs">
                  {JSON.stringify(row.output, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
