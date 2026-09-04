import type { LiveCasesSummary } from "@niffler/core/evaluation/liveCases"
import { apiClient } from "./apiClient"

export type { LiveCasesSummary }

export async function getLiveCases(): Promise<LiveCasesSummary> {
  const { data } = await apiClient.get<LiveCasesSummary>("/live-cases")
  return data
}
