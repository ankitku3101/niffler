"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { RunButton } from "@/components/run-button"
import { ResetButton } from "@/components/reset-button"
import type { RunGateStatus } from "@/lib/runStatus"

const titles: Record<string, string> = {
  "/dashboard": "Command Center",
  "/dashboard/live": "Agent Run",
  "/dashboard/cases": "Decision Explorer",
  "/dashboard/simulate": "Try It Yourself",
}

export function SiteHeader({ runStatus }: { runStatus: RunGateStatus }) {
  const pathname = usePathname()
  const title = titles[pathname] ?? "NIFFLER"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ResetButton />
          <RunButton initialStatus={runStatus} />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
