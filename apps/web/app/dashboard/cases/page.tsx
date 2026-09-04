import { CasesTable } from "@/components/cases-table"
import { getCases } from "@/lib/cases"

// See the note in dashboard/page.tsx — axios is invisible to Next, so this must be opted out of prerender.
export const dynamic = "force-dynamic"

export default async function CasesPage() {
  const cases = await getCases()

  return (
    <div className="px-4 py-4 lg:px-6 md:py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Decision Explorer</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Every case the agent has handled. Click any row to see what it decided and why.
      </p>
      <CasesTable cases={cases} />
    </div>
  )
}
