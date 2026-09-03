import { getCases } from "@/lib/cases"
import { LiveRunPicker } from "@/components/live-run-picker"

export default async function LiveRunPage() {
  const cases = await getCases()
  const detected = cases.filter((c) => c.status === "DETECTED")

  return (
    <div className="px-4 py-4 lg:px-6 md:py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Agent Run</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Click any case below to watch NIFFLER investigate, diagnose, check policy, and act on it —
        live, step by step, in real time.
      </p>
      <LiveRunPicker cases={detected} />
    </div>
  )
}
