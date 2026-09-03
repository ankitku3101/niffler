"use client"

import { useState } from "react"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient } from "@/lib/apiClient"
import { LiveCaseRun } from "@/components/live-case-run"

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

type SimulatedOrder = { orderId: string; keyId: string; amountPaise: number }
type Phase = "idle" | "creating" | "checkout" | "polling" | "paid" | "recovering" | "timeout" | "error"

const MAX_POLL_ATTEMPTS = 15

export function SimulatePanel() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [orderId, setOrderId] = useState<string | null>(null)
  const [caseId, setCaseId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function startOrder() {
    setPhase("creating")
    setErrorMessage(null)
    try {
      const { data } = await apiClient.post<SimulatedOrder>("/simulate/order")
      setOrderId(data.orderId)
      openCheckout(data)
    } catch {
      setPhase("error")
      setErrorMessage("Could not create a test order. Try again in a moment.")
    }
  }

  function openCheckout(order: SimulatedOrder) {
    setPhase("checkout")
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: "INR",
      name: "NIFFLER",
      description: "Simulated payment — use a short OTP to fail it on purpose",
      prefill: { contact: "9876543210", email: "demo@niffler.dev" },
      handler: () => pollForOutcome(order.orderId),
      modal: { ondismiss: () => pollForOutcome(order.orderId) },
    })
    rzp.open()
  }

  async function pollForOutcome(id: string, attempt = 0) {
    setPhase("polling")
    const { data } = await apiClient.get<{ status: string }>(`/simulate/order/${id}/status`)

    if (data.status === "paid") {
      setPhase("paid")
      return
    }
    if (data.status === "attempted") {
      const { data: caseData } = await apiClient.post<{ caseId: number }>(`/simulate/order/${id}/case`)
      setCaseId(caseData.caseId)
      setPhase("recovering")
      return
    }
    if (attempt >= MAX_POLL_ATTEMPTS) {
      setPhase("timeout")
      return
    }
    setTimeout(() => pollForOutcome(id, attempt + 1), 2000)
  }

  function reset() {
    setPhase("idle")
    setOrderId(null)
    setCaseId(null)
    setErrorMessage(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <Card className="gap-3 py-4">
        <CardHeader>
          <CardTitle className="text-base">Create a real failed payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            This creates one real order in Razorpay Test Mode — no real money moves. Pay with the
            test card <span className="font-mono text-foreground">4100 2800 0000 1007</span>, any
            future expiry, any CVV — then, to see NIFFLER recover it, enter an OTP with{" "}
            <span className="font-medium text-foreground">fewer than 4 digits</span> to make the
            payment fail on purpose, and close the popup once you see the failure.
          </p>
          {phase === "idle" && <Button onClick={startOrder}>Create a test order</Button>}
          {phase === "creating" && <p>Creating order…</p>}
          {phase === "checkout" && <p>Complete the checkout in the popup…</p>}
          {phase === "polling" && <p>Checking what happened…</p>}
          {phase === "paid" && (
            <div className="flex flex-col gap-2">
              <p className="text-foreground">
                That payment succeeded — nothing for NIFFLER to recover! Try again and use a short
                OTP to fail it on purpose.
              </p>
              <Button onClick={reset} variant="outline">
                Try again
              </Button>
            </div>
          )}
          {phase === "timeout" && (
            <div className="flex flex-col gap-2">
              <p className="text-foreground">Didn&apos;t detect a completed attempt. Try again.</p>
              <Button onClick={reset} variant="outline">
                Try again
              </Button>
            </div>
          )}
          {phase === "error" && (
            <div className="flex flex-col gap-2">
              <p className="text-destructive">{errorMessage}</p>
              <Button onClick={reset} variant="outline">
                Try again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {phase === "recovering" && caseId !== null && (
        <>
          <p className="text-sm text-muted-foreground">
            Order {orderId} failed — NIFFLER just detected it. Watching it live:
          </p>
          <LiveCaseRun caseId={caseId} source="razorpay" />
        </>
      )}
    </div>
  )
}
