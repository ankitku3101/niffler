import { Skeleton } from "@/components/ui/skeleton";

// The API spins down when idle, so this can be on screen long enough that an empty div reads as broken.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 px-4 py-6 lg:px-6 md:py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-full max-w-[52ch]" />
      </div>

      <div className="grid grid-cols-1 gap-5 @xl/main:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 @lg/main:grid-cols-3 @4xl/main:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-xl border p-5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
