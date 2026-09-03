import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DECISION_VARIANT } from "@/components/timeline-cards"

const DECISIONS = [
  { decision: "ALLOWED", detail: "The recommended action goes ahead." },
  { decision: "DENIED", detail: "The action is blocked outright — the case is stopped, nothing more for a human to do." },
  { decision: "REQUIRES_HUMAN_APPROVAL", detail: "The action is blocked and routed to a human instead." },
]

const RULES = [
  {
    name: "Eligibility",
    question: "Is this order still unpaid?",
    detail: "Denies recovery outright if the order has already been paid — including via a channel outside NIFFLER's own actions.",
    outcomes: [{ condition: "Order already paid", decision: "DENIED" }],
  },
  {
    name: "Attempt limit",
    question: "Has the customer already failed to pay too many times?",
    detail: "Retrying a card the bank has already declined risks hurting the merchant's own decline-ratio reputation with card networks. This is the rule that demonstrates the agent's own proposal getting blocked.",
    outcomes: [{ condition: "3 or more failed attempts", decision: "REQUIRES_HUMAN_APPROVAL" }],
  },
  {
    name: "Prior recovery link",
    question: "Has NIFFLER already sent a payment link for this case?",
    detail: "Sending a second link risks double-charging the customer if they pay both.",
    outcomes: [
      { condition: "Link already paid", decision: "DENIED" },
      { condition: "Link outstanding, unpaid", decision: "REQUIRES_HUMAN_APPROVAL" },
    ],
  },
  {
    name: "Iteration limit",
    question: "Is the agent stuck investigating?",
    detail: "A hard circuit breaker against infinite agent loops.",
    outcomes: [{ condition: "10 or more tool calls in one investigation", decision: "REQUIRES_HUMAN_APPROVAL" }],
  },
]

export default function PoliciesPage() {
  return (
    <div className="flex flex-col gap-10 px-4 py-6 lg:px-6 md:py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Policy Guardrails</h1>
        <p className="mt-1.5 text-base text-muted-foreground">
          The deterministic boundary between AI reasoning and business-critical decisions.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Why this exists</h2>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          NIFFLER&apos;s AI never moves money directly.{" "}
          <span className="font-medium text-primary">
            Every action the agent recommends is checked against a small set of deterministic,
            non-negotiable rules
          </span>{" "}
          before anything actually happens.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">The three verdicts</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {DECISIONS.map((d) => (
            <div key={d.decision} className="rounded-lg border p-4">
              <Badge variant={DECISION_VARIANT[d.decision] ?? "outline"} className="mb-2">
                {d.decision.replace(/_/g, " ")}
              </Badge>
              <div className="text-base text-muted-foreground">{d.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">The four rules</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {RULES.map((rule) => (
            <Card key={rule.name} className="gap-3 py-5">
              <CardHeader>
                <CardTitle className="text-lg">{rule.name}</CardTitle>
                <CardDescription className="text-base">{rule.question}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-base text-muted-foreground">{rule.detail}</p>
                <div className="flex flex-col gap-1.5">
                  {rule.outcomes.map((o) => (
                    <div key={o.condition} className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant={DECISION_VARIANT[o.decision] ?? "outline"}>
                        {o.decision.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-muted-foreground">{o.condition}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">How a verdict is reached</h2>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          All four rules are checked for every case, and the strictest verdict wins — DENIED beats
          REQUIRES HUMAN APPROVAL beats ALLOWED. Only an ALLOWED verdict lets the agent&apos;s own
          recommended action — capture the payment, send a recovery link, escalate, or stop by its
          own judgment — actually execute.
        </p>
        <p className="text-base text-muted-foreground">
          See it happen on real cases in the{" "}
          <Link href="/dashboard/cases" className="text-primary underline">
            Decision Explorer
          </Link>
          , filtered to cases where a guardrail overrode the agent.
        </p>
      </section>
    </div>
  )
}
