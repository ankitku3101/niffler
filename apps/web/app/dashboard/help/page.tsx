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

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-8 px-4 py-4 lg:px-6 md:py-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">What this is</h2>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          NIFFLER is an autonomous AI agent that investigates failed payments, diagnoses why each one
          was lost, and recommends a recovery action. Every action passes through a deterministic
          policy engine before it touches money — the model recommends, but it never decides alone.
          It&apos;s an independent project inspired by Razorpay&apos;s AI Revenue Recovery Buildathon
          track, built on Razorpay Test Mode — no real money moves anywhere in this app.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">The loop</h2>
        <div className="flex flex-wrap gap-x-1 gap-y-2 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
          {STEPS.map((step, i) => (
            <span key={step.name}>
              {step.name}
              {i < STEPS.length - 1 && <span className="px-1.5 text-foreground/40">→</span>}
            </span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STEPS.map((step) => (
            <div key={step.name} className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{step.name}</div>
              <div className="text-muted-foreground">{step.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Two datasets, both real</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="gap-2 py-4">
            <CardHeader>
              <CardTitle className="text-base">The synthetic dataset</CardTitle>
              <CardDescription>~500 orders, generated once and seeded into the database.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              You can&apos;t add to it, but you can watch NIFFLER work on it in three ways: Command
              Center shows the aggregate result of a full batch run, Agent Run lets you watch one
              still-undetected case live, and Decision Explorer lets you inspect the full trail of
              every case already processed.
            </CardContent>
          </Card>
          <Card className="gap-2 py-4">
            <CardHeader>
              <CardTitle className="text-base">Your own real order</CardTitle>
              <CardDescription>Try It Yourself creates one real Razorpay Test Mode order.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Fail it on purpose (the trick is documented on that page), and NIFFLER detects,
              investigates, and acts on a case it has genuinely never seen before — live, in real
              time, ending in a real, payable Razorpay Payment Link if that&apos;s what it decides.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Where to go next</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {NAV_CARDS.map((card) => (
            <Link key={card.url} href={card.url}>
              <Card className="gap-1.5 py-4 transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="text-base">{card.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{card.detail}</CardContent>
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
