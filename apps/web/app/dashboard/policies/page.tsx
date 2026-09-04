import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DECISION_VARIANT } from "@/lib/labels"
import {
  FaCircleCheck,
  FaBan,
  FaUserClock,
  FaClipboardCheck,
  FaArrowsRotate,
  FaLink,
  FaGaugeHigh,
} from "react-icons/fa6"

const DECISIONS = [
  { decision: "ALLOWED", icon: FaCircleCheck, detail: "Go ahead. The agent does what it planned." },
  { decision: "DENIED", icon: FaBan, detail: "Blocked. The case stops here, and there is nothing for a person to do about it." },
  { decision: "REQUIRES_HUMAN_APPROVAL", icon: FaUserClock, detail: "Blocked, but a person should take a look at it." },
]

const RULES = [
  {
    name: "Eligibility",
    icon: FaClipboardCheck,
    question: "Is this order still unpaid?",
    detail: "If the money already came in, there is nothing to recover. This holds even if the customer paid some other way that NIFFLER had nothing to do with.",
    outcomes: [{ condition: "Order already paid", decision: "DENIED" }],
  },
  {
    name: "Attempt limit",
    icon: FaArrowsRotate,
    question: "Has this already failed too many times?",
    detail: "Banks keep score of how often a shop's payments get declined. Keep retrying a card that has already been refused and the bank starts trusting that shop less, which makes future payments fail more often.",
    outcomes: [{ condition: "3 or more failed attempts", decision: "REQUIRES_HUMAN_APPROVAL" }],
  },
  {
    name: "Prior recovery link",
    icon: FaLink,
    question: "Has a payment link already gone out?",
    detail: "If the customer pays both links, they get charged twice.",
    outcomes: [
      { condition: "Link already paid", decision: "DENIED" },
      { condition: "Link outstanding, unpaid", decision: "REQUIRES_HUMAN_APPROVAL" },
    ],
  },
  {
    name: "Iteration limit",
    icon: FaGaugeHigh,
    question: "Is the agent going round in circles?",
    detail: "An AI can get stuck repeating itself forever. This cuts it off and hands the case to a person.",
    outcomes: [{ condition: "10 or more steps on one case", decision: "REQUIRES_HUMAN_APPROVAL" }],
  },
]

export default function PoliciesPage() {
  return (
    <div className="flex flex-col gap-10 px-4 py-6 lg:px-6 md:py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Policy Guardrails</h1>
        <p className="mt-1.5 text-base text-muted-foreground">
          The line between what the AI wants to do and what it is allowed to do.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Why this exists</h2>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          The AI is good at reading a situation and suggesting what to do. It is not something you want
          quietly moving money on its own.
        </p>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          <span className="font-medium text-primary">
            So it does not get to decide.
          </span>{" "}
          Whatever it suggests is checked against four plain rules first. These rules are ordinary code,
          not AI. They give the same answer every time, and the AI cannot talk them round.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">The three verdicts</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {DECISIONS.map((d) => (
            <div key={d.decision} className="rounded-lg border p-4">
              <Badge variant={DECISION_VARIANT[d.decision] ?? "outline"} className="mb-2">
                <d.icon />
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
                <CardTitle className="flex items-center gap-2 text-lg">
                  <rule.icon className="size-4 shrink-0 text-primary" />
                  {rule.name}
                </CardTitle>
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
        <h2 className="text-xl font-semibold">How the answer is decided</h2>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          All four rules run on every case, and the strictest one wins. If any rule says block, the case is
          blocked, no matter what the other three say. The agent only gets to do what it planned if every
          rule agrees.
        </p>
        <p className="text-base text-muted-foreground">
          You can see this happen on real cases in the{" "}
          <Link href="/dashboard/cases" className="text-primary underline">
            Decision Explorer
          </Link>
          . Filter it to the cases where the rules overruled the AI.
        </p>
      </section>
    </div>
  )
}
