import type { BaselineComparison } from "@niffler/core/evaluation/baseline"
import { apiClient } from "./apiClient"

export type { BaselineComparison }

export async function getBaseline(): Promise<BaselineComparison> {
  const { data } = await apiClient.get<BaselineComparison>("/baseline")
  return data
}
