import { SectionCards } from "@/components/section-cards"
import { getReport } from "@/lib/report"

export default async function Page() {
  const report = await getReport()

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards report={report} />
    </div>
  )
}
