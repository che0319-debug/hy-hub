// Bot Office 專案階段固定 5 種（HY 2026-11-01 定案）。全站顯示名稱與顏色都從這裡讀。
// 後端值不改名：assigned＝規劃中、hy_decision＝待你決定、running＝執行中、review＝待審、done＝完成。
// 退回是動作不是階段：規劃書被退回回到規劃中，交件被退回回到執行中。
export const PROJECT_STAGES = [
  { key: 'assigned', label: '規劃中', tone: 'wait' },
  { key: 'hy_decision', label: '待你決定', tone: 'you' },
  { key: 'running', label: '執行中', tone: 'ai' },
  { key: 'review', label: '待審', tone: 'ai' },
  { key: 'done', label: '完成', tone: 'done' },
]
export const STAGE_KEYS = PROJECT_STAGES.map(s => s.key)
export const STAGE_LABEL = Object.fromEntries(PROJECT_STAGES.map(s => [s.key, s.label]))
export const STAGE_TONE = Object.fromEntries(PROJECT_STAGES.map(s => [s.key, s.tone]))

// 舊資料可能還有已停用的 unassigned（待派）／returned（退回）。只在讀取時換算，不寫回：
// returned → assigned；unassigned 有負責 Bot 才算 assigned，沒有就回空字串（畫面顯示「狀態待確認」）。
export function normalizeStage(stage, ownerBot = '') {
  const value = typeof stage === 'string' ? stage.trim() : ''
  if (value === 'returned') return 'assigned'
  if (value === 'unassigned') return typeof ownerBot === 'string' && ownerBot.trim() ? 'assigned' : ''
  return STAGE_KEYS.includes(value) ? value : ''
}
