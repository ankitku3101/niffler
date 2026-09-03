import { CasesTable } from "@/components/cases-table"
import { getCases } from "@/lib/cases"

export default async function CasesPage() {
  const cases = await getCases()

  return (
    <div className="px-4 py-4 lg:px-6 md:py-6">
      <CasesTable cases={cases} />
    </div>
  )
}
