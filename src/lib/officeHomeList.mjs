// Bot Office 首頁只有一張專案列表。待決件數只算掛在該專案、尚未結案的核示。
import { isPending } from './aiOffice.mjs'

export function openApprovalCount(projectId, inbox = []) {
  if (!projectId) return 0
  return (inbox || []).filter(action => action && action.project_id === projectId && isPending(action)).length
}

// 首頁「待你決定」＝列表上各專案卡「待你核示 N 則」的總和。
// 沒有對到列表專案的 open 核示（含 project_id 為空）不計，也不另顯示。
export function listedPendingTotal(projects, inbox = []) {
  return (projects || []).reduce((sum, project) => sum + openApprovalCount(project?.id, inbox), 0)
}

export function pendingLabel(count) {
  const n = Number(count) || 0
  return n > 0 ? `待你核示 ${n} 則` : ''
}

export function sortByPending(projects, countOf) {
  return (projects || []).slice().sort((a, b) => countOf(b) - countOf(a))
}
