import Link from "next/link"
import { formatPaise } from "@/lib/format"
import type { LiveCasesSummary } from "@/lib/liveCases"

export function LiveCasesStrip({ summary }: { summary: LiveCasesSummary }) {
  if (summary.total === 0) return null

  return (
    <div className="px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-dashed p-4 text-base">
        <span className="font-medium">
          {summary.total} case{summary.total === 1 ? "" : "s"} created by visitors
        </span>
        <span className="text-muted-foreground">
          {summary.recovered} recovered
          {summary.recoveredPaise > 0 && ` (${formatPaise(summary.recoveredPaise)})`}
          {summary.linkSent > 0 && `, ${summary.linkSent} waiting on a payment link`}
        </span>
        <Link href="/dashboard/cases" className="text-sm text-primary underline">
          See them
        </Link>
      </div>
      <p className="mt-2 max-w-[75ch] text-sm text-muted-foreground">
        These came from real Razorpay test payments people made on this site. They are kept out of the
        numbers above on purpose, so the measured batch stays fixed and comparable.
      </p>
    </div>
  )
}
