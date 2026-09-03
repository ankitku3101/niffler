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
    fn: "checkEligibility",
    question: "Is this order still unpaid?",
    detail:
      "Denies recovery outright if the order has already been paid — including via a channel outside NIFFLER's own actions. No threshold; it's a binary fact.",
    threshold: "Order already paid → DENIED",
  },
  {
    name: "Attempt limit",
    fn: "checkAttemptLimit",
    question: "Has the customer already failed to pay too many times?",
    detail:
      "Requires human approval once a customer has repeatedly failed on this order. Retrying a card the bank has already declined risks hurting the merchant's own decline-ratio reputation with card networks — this is the rule that demonstrates the agent's proposed action getting blocked (brief's \"one important failure demo\").",
    threshold: "3 or more failed attempts → REQUIRES_HUMAN_APPROVAL",
  },
  {
    name: "Prior recovery link",
    fn: "checkPriorRecoveryLink",
    question: "Has NIFFLER already sent a payment link for this case?",
    detail:
      "Denies further action if a previously-sent link has already been paid — the money is already in. Requires human approval if a link is outstanding but unpaid, since sending a second one risks double-charging the customer if they pay both.",
    threshold: "Link paid → DENIED · Link outstanding → REQUIRES_HUMAN_APPROVAL",
  },
  {
    name: "Iteration limit",
    fn: "checkIterationLimit",
    question: "Is the agent stuck investigating?",
    detail:
      "A hard circuit breaker against infinite agent loops — bounds how many tool calls one investigation can make before a human should look at it instead.",
    threshold: "10 or more tool calls in one investigation → REQUIRES_HUMAN_APPROVAL",
  },
]

export default function PoliciesPage() {
  return (
    <div className="flex flex-col gap-8 px-4 py-4 lg:px-6 md:py-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Policy guardrails</h2>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          NIFFLER&apos;s AI never moves money directly. Every action the agent recommends is checked
          against a small set of deterministic, non-negotiable rules before anything actually
          happens — this is the boundary between AI reasoning and business-critical decisions.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">The three verdicts</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {DECISIONS.map((d) => (
            <div key={d.decision} className="rounded-lg border p-3 text-sm">
              <Badge variant={DECISION_VARIANT[d.decision] ?? "outline"} className="mb-1.5">
                {d.decision.replace(/_/g, " ")}
              </Badge>
              <div className="text-muted-foreground">{d.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">The four rules</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {RULES.map((rule) => (
            <Card key={rule.fn} className="gap-2 py-4">
              <CardHeader>
                <CardTitle className="text-base">{rule.name}</CardTitle>
                <CardDescription>{rule.question}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p className="text-muted-foreground">{rule.detail}</p>
                <p className="font-mono text-xs text-muted-foreground">{rule.threshold}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">How a verdict is reached</h2>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          All four rules are checked for every case, and the strictest verdict wins — DENIED beats
          REQUIRES_HUMAN_APPROVAL beats ALLOWED. A DENIED verdict stops the case outright.
          REQUIRES_HUMAN_APPROVAL routes it to a human instead. Only an ALLOWED verdict lets the
          agent&apos;s own recommended action — capture the payment, send a recovery link, escalate,
          or stop by its own judgment — actually execute.
        </p>
        <p className="text-sm text-muted-foreground">
          See it happen on real cases in the{" "}
          <Link href="/dashboard/cases" className="underline">
            Decision Explorer
          </Link>
          , filtered to cases where a guardrail overrode the agent.
        </p>
      </section>
    </div>
  )
}
