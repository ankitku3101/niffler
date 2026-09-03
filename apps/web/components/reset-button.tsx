"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/apiClient"

// Hidden unless ?owner=<token> is in the URL; server also enforces this.
export function ResetButton() {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const router = useRouter()
  const ownerToken = useSearchParams().get("owner") ?? undefined

  if (!ownerToken) {
    return null
  }

  async function handleReset() {
    if (!window.confirm("Reset all recovery cases and replay the demo from scratch?")) {
      return
    }
    setPending(true)
    setFailed(false)
    try {
      await apiClient.post("/reset", undefined, { headers: { "x-owner-token": ownerToken } })
      router.refresh()
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleReset} disabled={pending}>
      {pending ? "Resetting…" : failed ? "Reset failed — try again" : "Reset"}
    </Button>
  )
}
