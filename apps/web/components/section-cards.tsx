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
            <div className="font-medium">{totalCandidates} failed orders detected</div>
            <div className="text-muted-foreground">
              {report.controlCases} deliberately left untouched, to measure what NIFFLER actually added
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card gap-3 [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardDescription className="text-sm">Revenue Recovered</CardDescription>
            <CardTitle className="text-4xl font-semibold text-primary tabular-nums @[250px]/card:text-5xl">
              {formatPaise(report.confirmedRecoveredPaise)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 border-t-0 bg-transparent! text-base">
            <div className="font-medium">Confirmed via capture or a paid recovery link</div>
            <div className="text-muted-foreground">
              {report.pendingRecoveryPaise > 0
                ? `+ ${formatPaise(report.pendingRecoveryPaise)} pending on outstanding recovery links`
                : "No recovery links outstanding"}
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
              <Badge variant={liftIsPositive ? "default" : "destructive"}>
                {liftIsPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
                {formatPercentPoints(report.attributableLiftRate)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 border-t-0 bg-transparent! text-base">
            <div className="font-medium">
              vs {formatPercent(report.naturalRecoveryRate)} recovered naturally, with no help at all
            </div>
            <div className="text-muted-foreground">
              Counts confirmed recoveries only — a negative number here mostly means recoveries are still
              pending a customer&apos;s payment, not that nothing worked.
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
            <div>{report.controlCases} more held out as control</div>
            <div>{report.notYetProcessedCases > 0 ? `${report.notYetProcessedCases} still queued` : "All processed"}</div>
          </CardFooter>
        </Card>

        <Card className="gap-3 py-6 [--card-spacing:--spacing(5)]">
          <CardHeader>
            <CardDescription>Recovery Actions</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{recoveryActions}</CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 border-t-0 bg-transparent! text-sm text-muted-foreground">
            <div>{report.recoveredCases} captured, {report.actionExecutedCases} link sent</div>
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
            <div>Policy denied further action</div>
          </CardFooter>
        </Card>

        <Card className="gap-3 py-6 [--card-spacing:--spacing(5)]">
          <CardHeader>
            <CardDescription>Policy Guardrail</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{report.policyOverrideCount}</CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 border-t-0 bg-transparent! text-sm text-muted-foreground">
            <div>Denied or needed human approval</div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
