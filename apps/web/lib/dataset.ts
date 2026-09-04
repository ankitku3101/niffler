import type { DatasetSummary } from "@niffler/core/evaluation/dataset"
import { apiClient } from "./apiClient"

export type { DatasetSummary }

export async function getDataset(): Promise<DatasetSummary> {
  const { data } = await apiClient.get<DatasetSummary>("/dataset")
  return data
}
