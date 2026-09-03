"use client"

import { useState } from "react"
import Script from "next/script"
import { CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/apiClient"
import { LiveCaseRun } from "@/components/live-case-run"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

type SimulatedOrder = { orderId: string; keyId: string; amountPaise: number }
type Phase = "idle" | "creating" | "checkout" | "polling" | "paid" | "recovering" | "timeout" | "error"

const MAX_POLL_ATTEMPTS = 15

const STEPS = ["Create order", "Pay with test card", "Fail on purpose", "Watch it recover"]

const STEP_FOR_PHASE: Record<Phase, number> = {
  idle: 0,
  creating: 0,
  checkout: 1,
  polling: 2,
  paid: 1,
  recovering: 3,
  timeout: 2,
  error: 0,
}

export function SimulatePanel() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [orderId, setOrderId] = useState<string | null>(null)
  const [caseId, setCaseId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [runFinished, setRunFinished] = useState(false)

  async function startOrder() {
    if (typeof window.Razorpay === "undefined") {
      setPhase("error")
      setErrorMessage("Checkout couldn't load — an ad blocker or privacy extension may be blocking it. Try disabling it and reload.")
      return
    }
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
      setRunFinished(false)
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

  const activeStep = STEP_FOR_PHASE[phase]

  return (
    <div className="flex flex-col gap-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <ol className="flex max-w-2xl items-start">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col items-start last:flex-none">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  i < activeStep && "bg-primary text-primary-foreground",
                  i === activeStep && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  i > activeStep && "bg-muted text-muted-foreground"
                )}
              >
                {i < activeStep ? <CheckIcon className="size-4" /> : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn("mx-2 h-0.5 flex-1", i < activeStep ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <div
              className={cn(
                "mt-3 max-w-28 text-sm font-medium",
                i === activeStep ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </div>
          </li>
        ))}
      </ol>

      <div className="max-w-xl rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Create a real failed payment</h2>
        <p className="mt-1.5 text-base text-muted-foreground">
          One real order in Razorpay Test Mode — no real money moves.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-muted/60 px-3.5 py-2.5 text-sm">
          <span className="text-muted-foreground">Test card</span>
          <span className="font-mono text-base font-medium">4100 2800 0000 1007</span>
          <span className="text-muted-foreground">· any future expiry · any CVV</span>
        </div>

        <p className="mt-4 text-base text-muted-foreground">
          Then, to see NIFFLER recover it, enter an OTP with{" "}
          <span className="font-semibold text-primary">fewer than 4 digits</span> — that fails the
          payment on purpose. Close the popup once you see the failure.
        </p>

        <div className="mt-6">
          {phase === "idle" && (
            <Button size="lg" className="px-6" onClick={startOrder}>
              Create a test order
            </Button>
          )}
          {phase === "creating" && <p className="text-base text-muted-foreground">Creating order…</p>}
          {phase === "checkout" && (
            <p className="text-base text-muted-foreground">Complete the checkout in the popup…</p>
          )}
          {phase === "polling" && <p className="text-base text-muted-foreground">Checking what happened…</p>}
          {phase === "paid" && (
            <div className="flex flex-col gap-3">
              <p className="text-base text-foreground">
                That payment succeeded — nothing for NIFFLER to recover! Try again and use a short OTP
                to fail it on purpose.
              </p>
              <Button onClick={reset} variant="outline" size="lg" className="w-fit px-6">
                Try again
              </Button>
            </div>
          )}
          {phase === "timeout" && (
            <div className="flex flex-col gap-3">
              <p className="text-base text-foreground">Didn&apos;t detect a completed attempt. Try again.</p>
              <Button onClick={reset} variant="outline" size="lg" className="w-fit px-6">
                Try again
              </Button>
            </div>
          )}
          {phase === "error" && (
            <div className="flex flex-col gap-3">
              <p className="text-base text-destructive">{errorMessage}</p>
              <Button onClick={reset} variant="outline" size="lg" className="w-fit px-6">
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>

      {phase === "recovering" && caseId !== null && (
        <div className="max-w-xl">
          <p className="mb-3 text-base text-muted-foreground">
            Order {orderId} failed — NIFFLER just detected it. Watching it live:
          </p>
          <LiveCaseRun caseId={caseId} source="razorpay" onFinished={() => setRunFinished(true)} />
          {runFinished && (
            <p className="mt-3 text-sm text-muted-foreground">
              This case now lives in Decision Explorer too, alongside every other case NIFFLER has
              processed.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
