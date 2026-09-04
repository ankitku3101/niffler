import Link from "next/link"
import { FaFlaskVial, FaBolt, FaArrowRight } from "react-icons/fa6"
import { SectionCards } from "@/components/section-cards"
import { LiveCasesStrip } from "@/components/live-cases-strip"
import { ScaleNote } from "@/components/scale-note"
import { ResetButton } from "@/components/reset-button"
import { RunButton } from "@/components/run-button"
import { getReport } from "@/lib/report"
import { getLiveCases } from "@/lib/liveCases"
import { getRunStatus } from "@/lib/runStatus"

// Data comes over axios, which Next cannot instrument the way it does fetch — without this the page
// is prerendered once at build time and every metric silently freezes there.
export const dynamic = "force-dynamic"

export default async function Page() {
  const [report, liveCases, runStatus] = await Promise.all([getReport(), getLiveCases(), getRunStatus()])

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
        <div className="flex items-center gap-2">
          <ResetButton />
          <RunButton initialStatus={runStatus} />
        </div>
      </div>

      <SectionCards report={report} />

      {/* Two weights on purpose: making your own failed payment is the better demo, so it gets the
          solid fill and the other sits back as a tinted alternative. */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <Link
          href="/dashboard/simulate"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-1.5 rounded-xl bg-primary p-5 text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5"
        >
          <span className="flex items-center gap-2 text-lg font-semibold">
            <FaFlaskVial className="size-4 shrink-0" />
            Make your own failed payment
            <FaArrowRight className="size-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
          <span className="text-base text-primary-foreground/80">
            One real test order. Fail it on purpose and watch the agent take it apart. Opens in a new tab.
          </span>
        </Link>

        <Link
          href="/dashboard/live"
          className="group flex flex-col gap-1.5 rounded-xl border border-primary/30 bg-primary/10 p-5 transition-colors duration-200 hover:bg-primary/15"
        >
          <span className="flex items-center gap-2 text-lg font-semibold">
            <FaBolt className="size-4 shrink-0 text-primary" />
            Watch a case run live
            <FaArrowRight className="size-3.5 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-1" />
          </span>
          <span className="text-base text-muted-foreground">
            Pick one from the dataset and follow every step as it happens.
          </span>
        </Link>
      </div>

      <LiveCasesStrip summary={liveCases} />
      <ScaleNote report={report} />
    </div>
  )
}
