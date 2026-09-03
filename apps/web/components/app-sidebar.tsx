"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { RadarIcon } from "lucide-react"

const navMain = [
  {
    title: "Command Center",
    url: "/dashboard",
  },
  {
    title: "Help",
    url: "/dashboard/help",
  },
  {
    title: "Agent Run",
    url: "/dashboard/live",
  },
  {
    title: "Decision Explorer",
    url: "/dashboard/cases",
  },
  {
    title: "Try It Yourself",
    url: "/dashboard/simulate",
  },
  {
    title: "Policy Guardrails",
    url: "/dashboard/policies",
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              <RadarIcon className="size-5!" />
              <span className="font-heading text-base font-semibold tracking-[0.02em]">
                NIFFLER
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
    </Sidebar>
  )
}
