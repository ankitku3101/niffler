import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPaise } from "@/lib/format"
import { getDataset } from "@/lib/dataset"

// See the note in dashboard/page.tsx — axios is invisible to Next, so this must be opted out of prerender.
export const dynamic = "force-dynamic"

const SCENARIOS: Record<string, string> = {
  success: "Paid with no trouble. These exist so customers have a real payment history to look back on.",
  transient_gateway: "The connection timed out. Nothing wrong with the customer or the card.",
  auth_dropoff: "The customer never typed the OTP. They walked away at the last step.",
  insufficient_funds: "Not enough money in the account.",
  hard_decline: "The card is expired or blocked. The card is the problem, not the customer.",
  bank_downtime:
    "The bank was down. These are grouped around the same bank and time, the way a real outage would be.",
  repeat_failure: "Three to five tries over several days. These are the ones that hit the retry limit.",
  authorized_uncaptured: "The money was approved but never actually taken. A direct capture fixes these.",
  self_recovered:
    "Failed, then the customer paid on their own later. These check that the agent looks again before acting.",
  fraud_block: "The bank thought it looked risky and blocked it.",
}

const ENTITIES = [
  {
    name: "Order",
    razorpay: "Razorpay Order",
    detail:
      "A request to collect some money. One unpaid order becomes one recovery case. An order can have several failed payments, but it is still only one debt.",
    fields: ["id", "customer_id", "amount_paise", "currency", "receipt", "status", "created_at"],
  },
  {
    name: "Payment",
    razorpay: "Razorpay Payment",
    detail:
      "One attempt to pay an order. It can be created, authorized, captured, refunded or failed. Once a payment fails it stays failed forever, so recovery always means making a new one.",
    fields: ["id", "order_id", "customer_id", "amount_paise", "method", "status", "created_at", "error"],
  },
  {
    name: "Failure",
    razorpay: "error fields on a failed Payment",
    detail:
      "Not a separate record. It is a set of fields on a failed payment. The step it died at matters most: failing at authentication means the person gave up, failing at authorization means the bank said no.",
    fields: ["code", "description", "source", "step", "reason"],
  },
]

export default async function DatasetPage() {
  const { totals, scenarios, sample } = await getDataset()
  const failedOrders = scenarios.filter((s) => s.name !== "success").reduce((n, s) => n + s.count, 0)

  return (
    <div className="flex flex-col gap-10 px-4 py-6 lg:px-6 md:py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">The Dataset</h1>
        <p className="mt-1.5 max-w-[72ch] text-base text-muted-foreground">
          None of this data is private, so here is all of it. Every order, every reason a payment failed,
          and the exact shape of the records the agent reads.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Why the data is made up</h2>
        <p className="max-w-[72ch] text-base leading-relaxed text-muted-foreground">
          A Razorpay test account starts empty. You cannot fill it with a year of payment history, and you
          cannot make old payments fail on demand. To show recovery working at any scale, the history had
          to be created.
        </p>
        <p className="max-w-[72ch] text-base leading-relaxed text-muted-foreground">
          So the <span className="font-medium text-foreground">history is made up, but the actions are
          real</span>. The agent thinks about this data, but when it takes a payment or sends a link, that
          is a real call to Razorpay.
        </p>
        <p className="max-w-[72ch] text-base leading-relaxed text-muted-foreground">
          The data is built from a fixed starting number, so it comes out identical every single time. That
          keeps the numbers on Command Center comparable, instead of quietly shifting underneath you.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 @lg/main:grid-cols-3 @4xl/main:grid-cols-6">
        {[
          { label: "Orders", value: totals.orders.toString(), note: `${failedOrders} of them failed` },
          { label: "Payments", value: totals.payments.toString(), note: `${totals.failedPayments} failed attempts` },
          { label: "Customers", value: totals.customers.toString(), note: "with at least one order" },
          { label: "Collected", value: formatPaise(totals.collectedPaise), note: "orders that ended paid" },
          { label: "At risk", value: formatPaise(totals.atRiskPaise), note: "unpaid at last read" },
          { label: "Scenarios", value: scenarios.length.toString(), note: "distinct failure shapes" },
        ].map((stat) => (
          <Card key={stat.label} className="gap-3 py-5 [--card-spacing:--spacing(5)]">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{stat.note}</CardContent>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">What each order is meant to be</h2>
          <p className="mt-1 max-w-[72ch] text-base text-muted-foreground">
            Every order has a hidden label saying what kind of situation it was built to represent. The
            agent never sees these labels. Only the scoring code can read them, so the answer cannot leak
            into the AI&apos;s view by accident.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {scenarios.map((s) => (
            <div
              key={s.name}
              className="flex flex-col gap-1 rounded-lg border p-4 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <div className="flex shrink-0 items-baseline gap-2 sm:w-56">
                <span className="font-mono text-sm">{s.name}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{s.count}</span>
              </div>
              <p className="text-sm text-muted-foreground">{SCENARIOS[s.name] ?? ""}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">How the records are shaped</h2>
          <p className="mt-1 max-w-[72ch] text-base text-muted-foreground">
            These shapes are not invented. They copy Razorpay&apos;s own, which is why the exact same code
            works on this made-up data and on a real test account, with nothing in between to translate.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {ENTITIES.map((e) => (
            <Card key={e.name} className="gap-3 py-5">
              <CardHeader>
                <CardTitle className="text-lg">{e.name}</CardTitle>
                <CardDescription className="text-base">{e.razorpay}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">{e.detail}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {e.fields.map((f) => (
                    <li key={f} className="rounded border px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="max-w-[72ch] text-sm text-muted-foreground">
          Money is always counted in whole paise, never as a decimal, so rounding can never lose a rupee.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-semibold">A real record</h2>
          <p className="mt-1 max-w-[72ch] text-base text-muted-foreground">
            Order {sample.order.id}, taken straight from the data. This customer tried several times and
            failed each time, so you can see the full error detail the agent reads. This is exactly what
            the agent gets back, minus the hidden label.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-muted/30 p-4">
          <pre className="font-mono text-xs leading-relaxed">
            {JSON.stringify({ order: sample.order, customer: sample.customer, payments: sample.payments }, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  )
}
