// Work Lab 純邏輯（無 React），供頁面與 node --test 共用。

export const TASK_COLUMNS = ['待辦', '進行中', '待審', '退回', '完成', '受阻']

// 風格 A 五種狀態色：wait／ai／you／done／bad
const TASK_STATE = { 待辦: 'wait', 進行中: 'ai', 待審: 'ai', 退回: 'bad', 完成: 'done', 受阻: 'bad' }
const PROJECT_STATE = { 規劃中: 'ai', 進行中: 'ai', 暫停: 'wait', 結案: 'done' }
const HEALTH_STATE = { 正常: 'done', 需關注: 'you', 卡住: 'bad' }
const EVIDENCE_STATE = { 假設: 'you', 外部資料: 'ai', 實測: 'done' }
const FEEDBACK_STATE = { 待處理: 'ai', 處理中: 'ai', 再議: 'ai', 待你驗收: 'you', 已結案: 'done' }

export const taskPill = s => TASK_STATE[s] || 'wait'
export const projectPill = s => PROJECT_STATE[s] || 'wait'
export const healthPill = s => HEALTH_STATE[s] || 'wait'
export const evidencePill = s => EVIDENCE_STATE[s] || 'wait'
export const feedbackPill = s => FEEDBACK_STATE[s] || 'wait'

// 「待審」由 PI 審查，對 HY 而言是 AI 執行中
export const taskLabel = s => (s === '待審' ? 'PI 審查中' : s)

export function groupTasks(tasks = []) {
  const out = Object.fromEntries(TASK_COLUMNS.map(c => [c, []]))
  for (const t of tasks) (out[t.status] ||= []).push(t)
  return out
}

export function progress(tasks = []) {
  const total = tasks.length
  const done = tasks.filter(t => t.status === '完成').length
  const blocked = tasks.filter(t => t.status === '受阻').length
  return { total, done, blocked, pct: total ? Math.round((done / total) * 100) : 0 }
}

export function inboxCount(ov) {
  if (!ov) return 0
  return (ov.decisions?.length || 0) + (ov.feedback_to_accept?.length || 0) + (ov.to_rate?.length || 0)
}

export function decisionTitle(d) {
  if (d.kind === 'plan_approval') return '核准專案規劃'
  if (d.kind === 'next_cycle') return d.title || '核准下一期'
  return d.title
}

export function isOverdue(due, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(due) && due < today
}

export function shortTime(iso) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!m) return iso
  return m[4] ? `${+m[2]}/${+m[3]} ${m[4]}:${m[5]}` : `${+m[2]}/${+m[3]}`
}

export function ratingPayload(scores, usability, comment = '') {
  const keys = ['正確性', '完成度', '一致性']
  for (const k of keys) {
    const v = scores?.[k]
    if (!Number.isInteger(v) || v < 1 || v > 5) return { error: `請給「${k}」1–5 分` }
  }
  if (!['直接用', '小修', '重做'].includes(usability)) return { error: '請選可用度' }
  return { body: { scores: Object.fromEntries(keys.map(k => [k, scores[k]])), usability, comment: comment.trim() } }
}

export function filterLogs(logs = [], { actor = '', cred = '' } = {}) {
  return logs.filter(l => (!actor || l.actor === actor) && (!cred || l.cred === cred))
}

export function nextRunText(lastRun) {
  return lastRun ? `排程上次領件 ${shortTime(lastRun)}` : '排程還沒來過'
}
