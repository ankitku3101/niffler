import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FaGithub } from "react-icons/fa"

const STEPS = [
  { name: "Detect", detail: "Deterministic code scans failed orders for revenue at risk. No AI yet." },
  { name: "Investigate", detail: "The agent reads the order, prior attempts, and the customer's history." },
  { name: "Diagnose", detail: "The agent explains why the payment failed, with evidence and a confidence score." },
  { name: "Decide", detail: "The agent recommends one action: capture, send a link, escalate, or stop." },
  { name: "Policy check", detail: "Deterministic rules check the recommendation before anything happens." },
  { name: "Act", detail: "Only a policy-approved action is executed against Razorpay." },
  { name: "Observe", detail: "The outcome is recorded and measured — recovered, pending, escalated, or stopped." },
]

const NAV_CARDS = [
  { title: "Command Center", url: "/dashboard", detail: "Aggregate outcome of the last full batch run — revenue at risk, recovered, and the recovery rate." },
  { title: "Agent Run", url: "/dashboard/live", detail: "Pick one undetected synthetic case and watch NIFFLER investigate, diagnose, and act on it live." },
  { title: "Decision Explorer", url: "/dashboard/cases", detail: "Inspect the full decision trail of every case that's already been processed." },
  { title: "Try It Yourself", url: "/dashboard/simulate", detail: "Create one real Razorpay Test Mode order, fail it on purpose, and watch NIFFLER handle a case it's never seen before." },
  { title: "Policy Guardrails", url: "/dashboard/policies", detail: "The deterministic rules that stand between the agent's recommendation and any real action." },
]

export default function WelcomePage() {
  return (
    <div className="flex flex-col gap-10 px-4 py-6 lg:px-6 md:py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to NIFFLER</h1>
        <p className="mt-1.5 text-base text-muted-foreground">
          A quick orientation before you dive in — what this does, and where to go.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">What this is</h2>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          NIFFLER is an autonomous AI agent that investigates failed payments, diagnoses why each one
          was lost, and recommends a recovery action.{" "}
          <span className="font-medium text-primary">
            Every action passes through a deterministic policy engine before it touches money
          </span>{" "}
          — the model recommends, but it never decides alone. It&apos;s an independent project
          inspired by Razorpay&apos;s AI Revenue Recovery Buildathon track, built on Razorpay Test
          Mode — no real money moves anywhere in this app.
        </p>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          Every failed order worth investigating becomes one <span className="font-medium text-foreground">recovery case</span> —
          &quot;order&quot; and &quot;case&quot; mean the same underlying payment, just before and after NIFFLER picks it up.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">The loop</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.name} className="rounded-lg border p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="text-base font-medium">{step.name}</div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{step.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Two datasets, both real</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="gap-2 py-5">
            <CardHeader>
              <CardTitle className="text-lg">The synthetic dataset</CardTitle>
              <CardDescription className="text-base">
                ~500 orders, generated once and seeded into the database.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-base text-muted-foreground">
              You can&apos;t add to it, but you can watch NIFFLER work on it three ways: Command
              Center shows the aggregate result of a full batch run, Agent Run lets you watch one
              still-undetected case live, and Decision Explorer lets you inspect the full trail of
              every case already processed.
            </CardContent>
          </Card>
          <Card className="gap-2 py-5">
            <CardHeader>
              <CardTitle className="text-lg">Your own real order</CardTitle>
              <CardDescription className="text-base">
                Try It Yourself creates one real Razorpay Test Mode order.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-base text-muted-foreground">
              Fail it on purpose, and NIFFLER detects, investigates, and acts on a case it has
              genuinely never seen before — live, ending in a real, payable Razorpay Payment Link if
              that&apos;s what it decides.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Where to go next</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {NAV_CARDS.map((card) => (
            <Link key={card.url} href={card.url} className="block">
              <Card className="h-full gap-1.5 py-5 transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-base text-muted-foreground">{card.detail}</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex items-center gap-2 text-sm text-muted-foreground">
        <FaGithub className="size-4" />
        <Link href="https://github.com/ankitku3101/niffler" target="_blank" className="underline">
          ankitku3101/niffler
        </Link>
      </section>
    </div>
  )
}
