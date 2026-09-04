import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FaGithub } from "react-icons/fa"
import {
  FaChartLine,
  FaBolt,
  FaMagnifyingGlassChart,
  FaFlaskVial,
  FaShieldHalved,
  FaArrowRight,
  FaScaleBalanced,
  FaDatabase,
} from "react-icons/fa6"

const STEPS = [
  { name: "Detect", detail: "Plain code finds the failed orders. No AI involved yet." },
  { name: "Investigate", detail: "The agent reads the order, the past attempts, and the customer's history." },
  { name: "Diagnose", detail: "It explains why the payment failed, and how sure it is." },
  { name: "Decide", detail: "It picks one action: capture, send a link, ask a human, or stop." },
  { name: "Policy check", detail: "A fixed set of rules checks that choice before anything happens." },
  { name: "Act", detail: "Only an approved action is sent to Razorpay." },
  { name: "Observe", detail: "The result is saved: recovered, waiting, escalated, or stopped." },
]

const NAV_CARDS = [
  { title: "Command Center", url: "/dashboard", icon: FaChartLine, detail: "The totals so far. How much was at risk, how much came back, and how well it worked." },
  { title: "Agent Run", url: "/dashboard/live", icon: FaBolt, detail: "Pick a case and watch the agent work through it, step by step, right now." },
  { title: "Decision Explorer", url: "/dashboard/cases", icon: FaMagnifyingGlassChart, detail: "Every case it has already handled, and the full reasoning behind each one." },
  { title: "Try It Yourself", url: "/dashboard/simulate", icon: FaFlaskVial, detail: "Make a real test payment, fail it on purpose, and watch the agent handle a case it has never seen." },
  { title: "Policy Guardrails", url: "/dashboard/policies", icon: FaShieldHalved, detail: "The rules that sit between what the agent wants to do and what actually happens." },
  { title: "Agent vs. Rules", url: "/dashboard/baseline", icon: FaScaleBalanced, detail: "Could simple rules have done the same job? I checked every case to find out." },
  { title: "The Dataset", url: "/dashboard/dataset", icon: FaDatabase, detail: "All the data the agent reads. None of it is private, so all of it is shown." },
]

export default function WelcomePage() {
  return (
    <div className="flex flex-col gap-10 px-4 py-6 lg:px-6 md:py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="mt-1.5 text-base text-muted-foreground">
          Niffler is an AI revenue recovery agent, built to find and act on lost revenue opportunities.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">What NIFFLER does</h2>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          When a customer tries to pay and the payment fails, that money is not always gone. Sometimes a
          second chance is all it takes. NIFFLER is an AI agent that looks at each failed payment, works
          out why it failed, and decides what to do about it.
        </p>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          <span className="font-medium text-primary">
            The AI never moves money on its own.
          </span>{" "}
          Whatever it decides is checked against a fixed set of rules first. If the rules say no, nothing
          happens.
        </p>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          One failed order becomes one <span className="font-medium text-foreground">recovery case</span>.
          Both words mean the same payment. It is an order before NIFFLER picks it up, and a case after.
        </p>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          Niffler is a personal project and runs entirely on Razorpay Test Mode. All payments and transactions are simulated, so no real money moves anywhere here.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">The loop</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.name}
              className="rounded-lg border p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
            >
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
              <CardTitle className="text-lg">The made-up dataset</CardTitle>
              <CardDescription className="text-base">
                500 orders, generated once and saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-base text-muted-foreground">
              You can&apos;t add to this one, but you can see it three ways. Command Center has the
              totals. Agent Run lets you watch a fresh case being handled. Decision Explorer shows the
              reasoning behind every case already done.
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
              Fail it on purpose and watch NIFFLER handle a case it has never seen. If it decides to send
              a payment link, that link is real and you can actually pay it.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">How NIFFLER finds out what happened</h2>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          Some actions give an answer straight away. If NIFFLER captures a payment, it asks Razorpay and
          knows at once whether it worked.
        </p>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          A payment link is different. The customer might pay it in five minutes or in three days, long
          after the agent has finished. So for this last step, NIFFLER does not ask Razorpay. Razorpay
          calls NIFFLER instead. That message is called a webhook.
        </p>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          A message like that cannot be trusted on sight, so three things are checked first. Is it really
          from Razorpay, proven by its signature? Has this payment already been counted? Does the case
          allow this change? Only if all three pass does the case move from{" "}
          <span className="font-medium text-foreground">link sent</span> to{" "}
          <span className="font-medium text-foreground">recovered</span>.
        </p>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          The duplicate check earns its place. Razorpay sends the same message again if it does not hear
          back, which I found out by accident while setting this up.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Where to go next</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {NAV_CARDS.map((card) => (
            <Link key={card.url} href={card.url} className="group block">
              <Card className="h-full gap-1.5 border-primary/15 py-5 transition-all duration-300 hover:border-primary/40 hover:bg-muted/40 hover:shadow-lg hover:shadow-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-lg">
                    <span className="flex items-center gap-2">
                      <card.icon className="size-4 shrink-0 text-primary" />
                      {card.title}
                    </span>
                    <FaArrowRight className="size-3.5 shrink-0 text-primary/50 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </CardTitle>
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
