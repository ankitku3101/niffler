import type { generateReport } from "@niffler/core/evaluation/report"
import { apiClient } from "./apiClient"

export type NifflerReport = Awaited<ReturnType<typeof generateReport>>

export async function getReport(): Promise<NifflerReport> {
  const { data } = await apiClient.get<NifflerReport>("/report")
  return data
}
