import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { RunButton } from "@/components/run-button"
import type { RunGateStatus } from "@/lib/runStatus"

export function SiteHeader({ runStatus }: { runStatus: RunGateStatus }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">Command Center</h1>
        <div className="ml-auto flex items-center gap-2">
          <RunButton initialStatus={runStatus} />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
