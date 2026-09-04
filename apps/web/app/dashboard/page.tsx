import Link from "next/link"
import { SectionCards } from "@/components/section-cards"
import { LastRunBanner } from "@/components/last-run-banner"
import { RunButton } from "@/components/run-button"
import { ResetButton } from "@/components/reset-button"
import { getReport } from "@/lib/report"
import { getLastRun } from "@/lib/lastRun"
import { getRunStatus } from "@/lib/runStatus"

// Data comes over axios, which Next cannot instrument the way it does fetch — without this the page
// is prerendered once at build time and every metric silently freezes there.
export const dynamic = "force-dynamic"

export default async function Page() {
  const [report, lastRun, runStatus] = await Promise.all([getReport(), getLastRun(), getRunStatus()])

  return (
    <div className="flex flex-col gap-8 py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Command Center</h1>
          <p className="mt-1.5 max-w-[65ch] text-base text-muted-foreground">
            How NIFFLER has done on a fixed set of 500 made-up orders. See{" "}
            <Link href="/dashboard/welcome" className="text-primary underline">
              Getting Started
            </Link>{" "}
            for where this data comes from.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <ResetButton />
            <RunButton initialStatus={runStatus} />
          </div>
          <p className="text-sm text-muted-foreground">Handles up to 10 new cases · takes a minute or two</p>
        </div>
      </div>
      <LastRunBanner run={lastRun} />
      <SectionCards report={report} />
    </div>
  )
}
