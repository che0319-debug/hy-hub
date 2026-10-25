// 小人資料的轉換層：純函式，不碰網路也不碰畫面。
// 來源：Bot Office（專案與決策，由 Atlas 寫入）、首頁待辦、memory-health、AI Work runner 活動。
// 「我的小幫手」分頁與 3D 世界都讀這裡整理好的格式；後端欄位改了只要改這裡。
import { HELPERS } from '../botRoster.js'

const clip = (text, n) => { const t = String(text || '').trim().replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1) + '…' : t }
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const normDue = due => (due ? String(due).replace(/\//g, '-') : '')

// ---- 小幫手：Bot Office ----
// 狀態與 Bot Office 一致：有待你決定的 → 待你確認（橘）；專案執行中／待審 → AI 執行中（藍）；其他 → 等待（灰）。
// 專案歸屬看 owner_bot（hy／950157／family／sam）；沒有歸屬的專案不算在任何一位身上，另外回報 unowned。
export function deriveOffice(office) {
  const byAgent = {}
  if (!office) return { byAgent, pending: null, unowned: 0 }
  const projects = office.projects || [], decisions = office.decisions || []
  for (const h of HELPERS) {
    const mine = projects.filter(p => p.ownerBot === h.agent)
    const ids = new Set(mine.map(p => p.id))
    const n = stage => mine.filter(p => p.stage === stage).length
    const counts = { total: mine.length, running: n('running'), review: n('review'), hyDecision: n('hy_decision'), waiting: n('unassigned') + n('assigned'), done: n('done'), returned: n('returned') }
    const asks = decisions.filter(d => ids.has(d.projectId)).length
    const active = counts.running + counts.review
    const first = mine.find(p => p.stage === 'running') || mine.find(p => p.stage === 'review')
    byAgent[h.agent] = {
      status: asks > 0 || counts.hyDecision > 0 ? 'you' : active > 0 ? 'ai' : 'wait',
      asks, counts,
      doing: active ? `${active} 個專案進行中${first ? `：${clip(first.title, 24)}` : ''}`
        : counts.waiting ? `${counts.waiting} 個專案等待派工`
        : counts.total ? '目前沒有進行中的專案' : '名下還沒有專案',
    }
  }
  const knownBots = new Set(HELPERS.map(h => h.agent))
  return { byAgent, pending: num(office.totals?.pending), unowned: projects.filter(p => !knownBots.has(p.ownerBot)).length }
}

// ---- 小幫手：待辦（逾期／今日） ----
export function deriveTodos(list, today) {
  const out = {}
  if (!Array.isArray(list)) return out
  for (const h of HELPERS) {
    const mine = list.filter(m => m._source === h.source)
    out[h.agent] = { overdue: mine.filter(m => normDue(m.due) && normDue(m.due) < today).length, today: mine.filter(m => normDue(m.due) === today).length }
  }
  return out
}

// ---- 執行者：後端 runner → 3D 小人 id ----
// GPT Chat 與 GPT Work 合為一位（GPT 小人含工作）；Grok 先接到 Grok Build；Atlas 還沒接。
export const RUNNER_FIG = { 'gpt-chat': 'gpt', 'chatgpt-work': 'gpt', 'claude-worker': 'claude', 'claude-review': 'claude', grok: 'grokbuild', 'grok-review': 'grokbuild' }
export const LIVE_FIGS = new Set([...HELPERS.map(h => h.id), ...Object.values(RUNNER_FIG)])

// 工作中＝有工作包執行中；其他＝等待。沒有資料就回空物件，不編造。
export function deriveRunners(activity) {
  if (!activity || typeof activity.runners !== 'object' || !activity.runners) return {}
  const out = {}
  for (const fig of new Set(Object.values(RUNNER_FIG))) out[fig] = { running: 0, ready: 0, inferred: 0, current: '' }
  for (const [runner, v] of Object.entries(activity.runners)) {
    const fig = RUNNER_FIG[runner]
    if (!fig) continue
    const o = out[fig]
    o.running += num(v?.running); o.ready += num(v?.ready); o.inferred += num(v?.inferred)
    if (!o.current && v?.current) o.current = clip(v.current, 40)
  }
  const res = {}
  for (const [fig, o] of Object.entries(out)) {
    const counts = [o.running && `${o.running} 件執行中`, o.ready && `${o.ready} 件排隊`].filter(Boolean).join('、')
    res[fig] = {
      status: o.running > 0 ? 'ai' : 'wait',
      doing: o.current ? `${o.current}${counts ? `（${counts}）` : ''}` : counts || '目前沒有工作',
      inferred: o.inferred > 0,
    }
  }
  return res
}

// ---- 狀態列：兩個數字 ----
//   待你確認：Bot Office 待你決定的題數（與 Bot Office 頁「待你決定」同一個數字）
//   系統：讀不到資料的來源數，0 代表正常；還沒載入完成時是 null
export function deriveSummary({ pending, failedCount, loaded }) {
  return { needsYou: Number.isFinite(pending) ? pending : null, systemIssues: loaded ? failedCount : null }
}
