import type { LastRun } from "@/lib/lastRun"

export function LastRunBanner({ run }: { run: LastRun }) {
  if (!run) {
    return (
      <p className="px-4 text-sm text-muted-foreground lg:px-6">
        Nobody has run the agent yet. Click Run Recovery Agent to start.
      </p>
    )
  }

  const when = new Date(run.finishedAt!).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <p className="px-4 text-sm text-muted-foreground lg:px-6">
      Last run ({when}, by {run.triggeredBy}): {run.processed} case{run.processed === 1 ? "" : "s"} handled,{" "}
      {run.succeeded} worked, {run.failed} failed. The numbers below cover every run so far, not just this
      one.
    </p>
  )
}
