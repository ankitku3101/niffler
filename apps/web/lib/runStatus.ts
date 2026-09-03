import { apiClient } from "./apiClient"

export interface RunGateStatus {
  canRun: boolean
  reason?: "cooldown" | "in_progress"
  nextAvailableAt?: string
}

export async function getRunStatus(): Promise<RunGateStatus> {
  const { data } = await apiClient.get<RunGateStatus>("/run/status")
  return data
}
