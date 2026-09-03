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
      Last run {when} · {run.processed} processed, {run.succeeded} succeeded,{" "}
      {run.failed} failed · triggered by {run.triggeredBy}
    </p>
  )
}
