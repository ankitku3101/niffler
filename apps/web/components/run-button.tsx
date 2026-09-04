"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/apiClient"
import type { RunGateStatus } from "@/lib/runStatus"

// Owner-only, like ResetButton. Publicly there is nothing left to batch — the measured run is
// finished — so the dashboard offers the two live demos instead. After a Reset this has real work again.
export function RunButton({ initialStatus }: { initialStatus: RunGateStatus }) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const router = useRouter()
  const ownerToken = useSearchParams().get("owner") ?? undefined

  if (!ownerToken) {
    return null
  }

  async function handleRun() {
    setPending(true)
    setFailed(false)
    try {
      await apiClient.post("/run", undefined, {
        headers: ownerToken ? { "x-owner-token": ownerToken } : undefined,
      })
      router.refresh()
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  const gated = false

  return (
    <Button onClick={handleRun} disabled={pending || gated}>
      {label(pending, failed, gated, initialStatus)}
    </Button>
  )
}

function label(
  pending: boolean,
  failed: boolean,
  gated: boolean,
  status: RunGateStatus
): string {
  if (pending) return "Running…"
  if (failed) return "Run failed — try again"
  if (gated && status.reason === "in_progress") return "Agent is running…"
  if (gated && status.reason === "cooldown" && status.nextAvailableAt) {
    const minutes = Math.max(
      1,
      Math.round((new Date(status.nextAvailableAt).getTime() - Date.now()) / 60_000)
    )
    return `Next run in ${minutes}m`
  }
  return "Run Recovery Agent"
}
