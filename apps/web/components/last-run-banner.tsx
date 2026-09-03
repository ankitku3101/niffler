import type { LastRun } from "@/lib/lastRun"

export function LastRunBanner({ run }: { run: LastRun }) {
  if (!run) {
    return (
      <p className="px-4 text-sm text-muted-foreground lg:px-6">
        No runs yet — click Run Recovery Agent to start.
      </p>
    )
  }

  const when = new Date(run.finishedAt!).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <p className="px-4 text-sm text-muted-foreground lg:px-6">
      Most recent click ({when}, by {run.triggeredBy}): {run.processed} case{run.processed === 1 ? "" : "s"}{" "}
      processed, {run.succeeded} succeeded, {run.failed} failed. The totals below are cumulative across
      every run, not just this one.
    </p>
  )
}
