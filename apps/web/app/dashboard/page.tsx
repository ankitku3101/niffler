import { SectionCards } from "@/components/section-cards"
import { LastRunBanner } from "@/components/last-run-banner"
import { getReport } from "@/lib/report"
import { getLastRun } from "@/lib/lastRun"

export default async function Page() {
  const [report, lastRun] = await Promise.all([getReport(), getLastRun()])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <LastRunBanner run={lastRun} />
      <SectionCards report={report} />
    </div>
  )
}
