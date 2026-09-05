import { getCases } from "@/lib/cases"
import { LiveRunPicker } from "@/components/live-run-picker"

// See the note in dashboard/page.tsx — axios is invisible to Next, so this must be opted out of prerender.
export const dynamic = "force-dynamic"

export default async function LiveRunPage() {
  const cases = await getCases()
  const detected = cases.filter((c) => c.status === "DETECTED")
  const hasGuardrailCase = detected.some((c) => c.alreadyPaid)

  return (
    <div className="px-4 py-4 lg:px-6 md:py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Agent Run</h1>
      <p className="mt-1 max-w-[75ch] text-base text-muted-foreground">
        Pick a case below and watch the agent work through it, step by step, right now.
        {hasGuardrailCase && (
          <>
            {" "}
            Start with the marked one. That order has already been paid, so the rules will block it
            whatever the AI decides.
          </>
        )}
      </p>
      <p className="mt-2 mb-5 max-w-[75ch] text-sm text-muted-foreground">
        These cases were all set aside on purpose and left out of the totals, so running them here can
        never change the numbers on Command Center. Each one rewinds when it finishes, so the next
        person gets to watch it too.
      </p>
      <LiveRunPicker cases={detected} />
    </div>
  )
}
