import type { getLastFinishedRun } from "@niffler/core/evaluation/lastRun"
import { apiClient } from "./apiClient"

export type LastRun = Awaited<ReturnType<typeof getLastFinishedRun>>

export async function getLastRun(): Promise<LastRun> {
  const { data } = await apiClient.get<LastRun>("/run/last")
  return data
}
