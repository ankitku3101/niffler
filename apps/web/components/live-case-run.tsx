"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ActionCard,
  DiagnosisCard,
  InvestigatedSummary,
  PolicyCard,
  type ActionOutput,
  type DiagnosisOutput,
} from "@/components/timeline-cards"

type RecoveryStep =
  | { kind: "investigating" }
  | { kind: "tool_call"; name: string; input: unknown }
  | { kind: "tool_result"; name: string; output: unknown }
  | { kind: "diagnosis"; diagnosis: DiagnosisOutput }
  | { kind: "policy_check"; decision: string; reasons: string[] }
  | { kind: "action"; toolName: string; output: ActionOutput }

const ACTION_TOOLS = new Set(["capturePayment", "createRecoveryLink", "escalateCase", "stopRecovery"])

export function LiveCaseRun({
  caseId,
  source,
  onFinished,
}: {
  caseId: number
  source?: "razorpay"
  onFinished?: () => void
}) {
  const [steps, setSteps] = useState<RecoveryStep[]>([])
  const [status, setStatus] = useState<"running" | "done" | "failed">("running")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Each step appears below the last, so a run quickly grows past the fold and the reader has to
  // chase it. The view follows along instead — until they scroll away themselves, at which point
  // it stops fighting them and resumes only if they come back down.
  const endRef = useRef<HTMLDivElement>(null)
  const following = useRef(true)

  useEffect(() => {
    const atBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 150

    // Deliberately wheel/touch rather than `scroll`: a smooth programmatic scroll also fires
    // `scroll`, at intermediate positions that don't look like the bottom, so following would
    // switch itself off part-way through its own animation and strand the last card off-screen.
    function onWheel(event: WheelEvent) {
      if (event.deltaY < 0) following.current = false
      else if (atBottom()) following.current = true
    }
    function onTouchMove() {
      following.current = atBottom()
    }

    window.addEventListener("wheel", onWheel, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: true })
    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchmove", onTouchMove)
    }
  }, [])

  useEffect(() => {
    if (steps.length === 0 || !following.current) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" })
  }, [steps.length, status])

  useEffect(() => {
    setSteps([])
    setStatus("running")
    setErrorMessage(null)
    following.current = true

    const query = source === "razorpay" ? "?source=razorpay" : ""
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/cases/${caseId}/live${query}`)

    eventSource.addEventListener("step", (event) => {
      setSteps((prev) => [...prev, JSON.parse(event.data)])
    })
    eventSource.addEventListener("done", () => {
      setStatus("done")
      eventSource.close()
      onFinished?.()
    })
    eventSource.addEventListener("failed", (event) => {
      setErrorMessage(JSON.parse(event.data).message)
      setStatus("failed")
      eventSource.close()
    })
    eventSource.addEventListener("error", () => {
      setErrorMessage((prev) => prev ?? "Connection to the agent was lost.")
      setStatus("failed")
      eventSource.close()
    })

    return () => eventSource.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, source])

  const reads = steps
    .filter((s) => s.kind === "tool_result" && !ACTION_TOOLS.has(s.name))
    .map((s) => (s.kind === "tool_result" ? { tool: s.name, output: s.output } : null))
    .filter((r) => r !== null)
  const diagnosisStep = steps.find((s) => s.kind === "diagnosis")
  const policyStep = steps.find((s) => s.kind === "policy_check")
  const actionStep = steps.find((s) => s.kind === "action")

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {status === "running" && <span className="size-2 animate-pulse rounded-full bg-primary" />}
          Case {caseId}
          {status === "running" && " — running live…"}
          {status === "done" && " — complete"}
          {status === "failed" && " — failed"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {steps.length === 0 && status === "running" && (
          <p className="text-muted-foreground">Starting investigation…</p>
        )}
        <InvestigatedSummary reads={reads} />
        {diagnosisStep?.kind === "diagnosis" && <DiagnosisCard diagnosis={diagnosisStep.diagnosis} />}
        {policyStep?.kind === "policy_check" && (
          <PolicyCard policy={{ decision: policyStep.decision, reasons: policyStep.reasons }} />
        )}
        {actionStep?.kind === "action" && <ActionCard toolName={actionStep.toolName} action={actionStep.output} />}
        {errorMessage && <p className="text-destructive">{errorMessage}</p>}
        <div ref={endRef} />
      </CardContent>
    </Card>
  )
}
