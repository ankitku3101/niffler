import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"
import { formatPaise, formatPercent, formatPercentPoints } from "@/lib/format"
import type { NifflerReport } from "@/lib/report"

export function SectionCards({ report }: { report: NifflerReport }) {
  const recoveryActions = report.recoveredCases + report.actionExecutedCases
  const totalCandidates = report.treatmentCases + report.controlCases
  const liftIsPositive = report.attributableLiftRate >= 0
  const inRecoveryPaise = report.confirmedRecoveredPaise + report.pendingRecoveryPaise

  return (
    <div className="flex flex-col gap-8 px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-5 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-3 dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card gap-3 [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardDescription className="text-sm">Revenue at Risk</CardDescription>
            <CardTitle className="text-4xl font-semibold tabular-nums @[250px]/card:text-5xl">
              {formatPaise(report.revenueAtRiskPaise)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 border-t-0 bg-transparent! text-base">
            <div className="font-medium">{totalCandidates} failed orders found</div>
            <div className="text-muted-foreground">
              {report.controlCases} were left alone on purpose, as a comparison group to show what NIFFLER
              actually added
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card gap-3 [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardDescription className="text-sm">Revenue in Recovery</CardDescription>
            <CardTitle className="text-4xl font-semibold text-primary tabular-nums @[250px]/card:text-5xl">
              {formatPaise(inRecoveryPaise)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 border-t-0 bg-transparent! text-base">
            <dl className="grid w-full grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="font-medium tabular-nums">{formatPaise(report.confirmedRecoveredPaise)}</dt>
              <dd className="font-medium">confirmed</dd>
              <dt className="tabular-nums text-muted-foreground">{formatPaise(report.pendingRecoveryPaise)}</dt>
              <dd className="text-muted-foreground">waiting on payment links</dd>
            </dl>
            <div className="text-muted-foreground">
              Confirmed means the money is in. The rest are real payment links that have been sent, but
              these customers are made up, so nobody is ever going to click them.
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card gap-3 [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardDescription className="text-sm">Recovery Rate</CardDescription>
            <CardTitle className="text-4xl font-semibold tabular-nums @[250px]/card:text-5xl">
              {formatPercent(report.recoveryRate)}
            </CardTitle>
            <CardAction>
              {/* Not destructive when negative — a synthetic-data artifact, not the agent underperforming. */}
              <Badge variant={liftIsPositive ? "default" : "outline"} title="Attributable lift vs the control group">
                {liftIsPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
                {formatPercentPoints(report.attributableLiftRate)} vs control
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 border-t-0 bg-transparent! text-base">
            <div className="font-medium">
              Compared with {formatPercent(report.naturalRecoveryRate)} in the group left alone
            </div>
            <div className="text-muted-foreground">
              This only counts money that came in. Since made-up customers never pay a link, the{" "}
              {formatPaise(report.pendingRecoveryPaise)} above can never be counted here. That is a limit of
              the test data, not of the agent.
            </div>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 @lg/main:grid-cols-3 @4xl/main:grid-cols-5">
        <Card className="gap-3 py-6 [--card-spacing:--spacing(5)]">
          <CardHeader>
            <CardDescription>Recovery Cases</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{report.treatmentCases}</CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 border-t-0 bg-transparent! text-sm text-muted-foreground">
            <div>{report.controlCases} more left alone for comparison</div>
            <div>{report.notYetProcessedCases > 0 ? `${report.notYetProcessedCases} still waiting` : "All done"}</div>
          </CardFooter>
        </Card>

        <Card className="gap-3 py-6 [--card-spacing:--spacing(5)]">
          <CardHeader>
            <CardDescription>Recovery Actions</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{recoveryActions}</CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 border-t-0 bg-transparent! text-sm text-muted-foreground">
            <div>{report.recoveredCases} payments taken, {report.actionExecutedCases} links sent</div>
          </CardFooter>
        </Card>

        <Card className="gap-3 py-6 [--card-spacing:--spacing(5)]">
          <CardHeader>
            <CardDescription>Escalations</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{report.escalatedCases}</CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 border-t-0 bg-transparent! text-sm text-muted-foreground">
            <div>Routed to a human</div>
          </CardFooter>
        </Card>

        <Card className="gap-3 py-6 [--card-spacing:--spacing(5)]">
          <CardHeader>
            <CardDescription>Stopped Cases</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{report.stoppedCases}</CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 border-t-0 bg-transparent! text-sm text-muted-foreground">
            <div>The rules said stop</div>
          </CardFooter>
        </Card>

        <Card className="gap-3 py-6 [--card-spacing:--spacing(5)]">
          <CardHeader>
            <CardDescription>Policy Guardrail</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{report.policyOverrideCount}</CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 border-t-0 bg-transparent! text-sm text-muted-foreground">
            <div>Times the rules blocked the AI</div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
