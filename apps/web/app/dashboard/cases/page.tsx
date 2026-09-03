import { CasesTable } from "@/components/cases-table"
import { getCases } from "@/lib/cases"

export default async function CasesPage() {
  const cases = await getCases()

  return (
    <div className="px-4 py-4 lg:px-6 md:py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Decision Explorer</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Every recovery case&apos;s full decision trail — diagnosis, policy check, and the action taken.
      </p>
      <CasesTable cases={cases} />
    </div>
  )
}
