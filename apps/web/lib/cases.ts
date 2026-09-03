import type { CaseSummary, CaseDetail } from "@niffler/core/evaluation/cases"
import { apiClient } from "./apiClient"

export type { CaseSummary, CaseDetail }

export async function getCases(): Promise<CaseSummary[]> {
  const { data } = await apiClient.get<CaseSummary[]>("/cases")
  return data
}

export async function getCaseDetail(id: number): Promise<CaseDetail> {
  const { data } = await apiClient.get<CaseDetail>(`/cases/${id}`)
  return data
}
