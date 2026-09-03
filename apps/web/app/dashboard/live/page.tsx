import { getCases } from "@/lib/cases"
import { LiveRunPicker } from "@/components/live-run-picker"

export default async function LiveRunPage() {
  const cases = await getCases()
  const detected = cases.filter((c) => c.status === "DETECTED")

  return (
    <div className="px-4 py-4 lg:px-6 md:py-6">
      <LiveRunPicker cases={detected} />
    </div>
  )
}
