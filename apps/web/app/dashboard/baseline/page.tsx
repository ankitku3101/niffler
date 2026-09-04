import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPaise, formatPercent } from "@/lib/format"
import { getBaseline } from "@/lib/baseline"
import { RECOMMENDED_ACTION_LABELS } from "@/lib/labels"

const RULES = [
  "Money already approved but not taken → take it",
  "Card blocked or expired → stop",
  "Bank flagged it as risky → ask a human",
  "Anything else → send a payment link",
]

function actionLabel(action: string) {
  return RECOMMENDED_ACTION_LABELS[action] ?? action
}

// See the note in dashboard/page.tsx — axios is invisible to Next, so this must be opted out of prerender.
export const dynamic = "force-dynamic"

export default async function BaselinePage() {
  const baseline = await getBaseline()

  const shapes = new Map<string, number>()
  for (const d of baseline.divergences) {
    const key = `${d.baseline}→${d.agent}`
    shapes.set(key, (shapes.get(key) ?? 0) + 1)
  }
  const ranked = [...shapes.entries()].sort((a, b) => b[1] - a[1])
  const exampleFor = (key: string) =>
    baseline.divergences.find((d) => `${d.baseline}→${d.agent}` === key)

  return (
    <div className="flex flex-col gap-10 px-4 py-6 lg:px-6 md:py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Agent vs. Rules</h1>
        <p className="mt-1.5 max-w-[70ch] text-base text-muted-foreground">
          It is fair to ask whether this needs AI at all. Could a few simple rules do the same job? So
          instead of guessing, I ran every case through a basic rules engine and compared the two.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">The rules I compared against</h2>
        <div className="max-w-[70ch] rounded-lg border p-4">
          <ol className="flex flex-col gap-1.5 text-base text-muted-foreground">
            {RULES.map((rule, i) => (
              <li key={rule} className="flex gap-2.5">
                <span className="text-muted-foreground/60 tabular-nums">{i + 1}.</span>
                {rule}
              </li>
            ))}
          </ol>
        </div>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          That is about fifteen lines of code. It only looks at the last error and nothing else. If the
          AI cannot beat this, it is not worth having.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 @xl/main:grid-cols-3">
        <Card className="@container/card gap-3 [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardDescription className="text-sm">Same answer</CardDescription>
            <CardTitle className="text-4xl font-semibold tabular-nums">
              {formatPercent(baseline.agreementRate)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-base text-muted-foreground">
            In {baseline.agreed} of {baseline.compared} cases, the AI picked exactly what the rules would
            have picked. Most cases are easy, and on those the AI adds nothing.
          </CardContent>
        </Card>

        <Card className="@container/card gap-3 [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardDescription className="text-sm">Decided differently</CardDescription>
            <CardTitle className="text-4xl font-semibold text-primary tabular-nums">
              {baseline.divergences.length}
            </CardTitle>
          </CardHeader>
            <CardContent className="text-base text-muted-foreground">
            Cases where the AI chose something else. These are the only cases where it is really doing
            any work.
          </CardContent>
        </Card>

        <Card className="@container/card gap-3 [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardDescription className="text-sm">After reading history</CardDescription>
            <CardTitle className="text-4xl font-semibold tabular-nums">
              {baseline.divergedWithHistory} of {baseline.divergences.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-base text-muted-foreground">
            Most of those disagreements came after the AI looked up how the customer had paid in the
            past. That is something the error code alone cannot tell you.
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Where they disagreed, and why</h2>
        <div className="flex flex-col gap-4">
          {ranked.map(([key, count]) => {
            const example = exampleFor(key)
            if (!example) return null
            return (
              <Card key={key} className="gap-3 py-5">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <Badge variant="outline">{actionLabel(example.baseline)}</Badge>
                    <span className="text-muted-foreground">rules →</span>
                    <Badge>{actionLabel(example.agent)}</Badge>
                    <span className="text-muted-foreground">agent</span>
                    <span className="ml-auto text-sm font-normal text-muted-foreground tabular-nums">
                      {count} case{count === 1 ? "" : "s"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2.5">
                  <p className="text-base">{example.diagnosis}</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {example.evidence.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Example: order {example.orderId} · {formatPaise(example.amountPaise)}
                    {example.readCustomerHistory && " · the AI checked the customer's history first"}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">What this tells me</h2>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          Three quarters of this job does not need AI, and it would be silly to claim otherwise. The last
          quarter is where it helps. Take a customer whose card was just blocked. The rules give up. But
          if that same customer has paid happily by UPI twice this month, it is worth sending them a
          link.
        </p>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          It also catches mistakes. In ten cases the rules wanted to send a payment link to someone who
          had already paid on a later attempt. That would have charged them twice.
        </p>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          Even so, none of these choices went through unchecked. Every one still had to pass the{" "}
          <Link href="/dashboard/policies" className="text-primary underline">
            rules
          </Link>{" "}
          before anything happened.
        </p>
      </section>
    </div>
  )
}
