// Bot Office 首頁只有一張專案列表。待決件數只算掛在該專案、尚未結案的核示。
import { isPending } from './aiOffice.mjs'
import { shownStage } from './officeFlow.mjs'

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

export function isListedDone(project) {
  return shownStage(project) === 'done'
}

// 完成的專案固定在最下面。未完成的仍依待核示數量（多的在前）。
// 同組之內件數相同時維持原相對次序（Array#sort 穩定）。
export function sortByPending(projects, countOf) {
  return (projects || []).slice().sort((a, b) => {
    const aDone = isListedDone(a)
    const bDone = isListedDone(b)
    if (aDone !== bDone) return aDone ? 1 : -1
    return countOf(b) - countOf(a)
  })
}
