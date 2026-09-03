import { JsonPaymentDataSource } from "@niffler/core/data/jsonSource"
import { generateReport } from "@niffler/core/evaluation/report"

export type NifflerReport = Awaited<ReturnType<typeof generateReport>>

export function getReport(): Promise<NifflerReport> {
  return generateReport(new JsonPaymentDataSource())
}
