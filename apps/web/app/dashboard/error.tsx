"use client"

import { AlertTriangleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

// Catches render-time failures for every page under /dashboard that doesn't
// define its own error.tsx (page, cases, live, policies, simulate, welcome) —
// e.g. the API being unreachable when Postgres is down. The sidebar and
// header in layout.tsx keep rendering; only this content area falls back.
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <AlertTriangleIcon className="size-8 text-muted-foreground" />
      <div>
        <p className="text-base font-medium">Data unavailable</p>
        <p className="mt-1 max-w-[45ch] text-sm text-muted-foreground">
          NIFFLER couldn&apos;t reach its data right now. This page will work again once the
          connection is back.
        </p>
      </div>
      <Button variant="outline" onClick={reset} className="mt-2">
        Try again
      </Button>
    </div>
  )
}
