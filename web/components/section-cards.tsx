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
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Revenue at Risk</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPaise(report.revenueAtRiskPaise)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            {totalCandidates} failed orders detected
          </div>
          <div className="text-muted-foreground">
            {report.controlCases} held out as an untouched control group
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Revenue Recovered</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPaise(report.confirmedRecoveredPaise)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Confirmed via capture or a paid recovery link
          </div>
          <div className="text-muted-foreground">
            {report.pendingRecoveryPaise > 0
              ? `+ ${formatPaise(report.pendingRecoveryPaise)} pending on outstanding recovery links`
              : "No recovery links outstanding"}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Recovery Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatPercent(report.recoveryRate)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {liftIsPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {formatPercentPoints(report.attributableLiftRate)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            Attributable lift over the control group
          </div>
          <div className="text-muted-foreground">
            vs {formatPercent(report.naturalRecoveryRate)} recovered naturally, untouched
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Recovery Cases</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {report.treatmentCases}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            {report.controlCases} more held out as control
          </div>
          <div className="text-muted-foreground">
            {report.notYetProcessedCases > 0
              ? `${report.notYetProcessedCases} still queued`
              : "All cases processed"}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Recovery Actions</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {recoveryActions}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            {report.recoveredCases} captured, {report.actionExecutedCases} recovery link sent
          </div>
          <div className="text-muted-foreground">Money-moving actions attempted</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Escalations</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {report.escalatedCases}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">Routed to a human</div>
          <div className="text-muted-foreground">
            Policy required approval, or the agent judged the case ambiguous
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Stopped Cases</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {report.stoppedCases}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">Policy denied further action</div>
          <div className="text-muted-foreground">Already paid, or judged unrecoverable</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Policy Guardrail</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {report.policyOverrideCount}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">Deterministic policy interventions</div>
          <div className="text-muted-foreground">
            Times the agent&apos;s proposed action was denied or required human approval
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
