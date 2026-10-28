// 小人資料的轉換層：純函式，不碰網路也不碰畫面。
// 來源：Bot Office（專案與決策，由 Atlas 寫入）、首頁待辦、memory-health、AI Work runner 活動。
// 「我的小幫手」分頁與 3D 世界都讀這裡整理好的格式；後端欄位改了只要改這裡。
import { HELPERS } from '../botRoster.js'
import { freshness } from '../lib/memoryFreshness.js'

const clip = (text, n) => { const t = String(text || '').trim().replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1) + '…' : t }
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const normDue = due => (due ? String(due).replace(/\//g, '-') : '')

// ---- 小幫手：Bot Office ----
// 狀態與 Bot Office 一致：有待你決定的 → 待你確認（橘）；專案執行中／待審 → AI 執行中（藍）；其他 → 等待（灰）。
// 專案歸屬看 owner_bot（hy／950157／family／sam）；沒有歸屬的專案不算在任何一位身上，另外回報 unowned。
// 選單順序：Sam、小因、950157、HY。名稱跟 botRoster 的小幫手一致。
export const OWNER_BOT_ORDER = ['sam', 'family', '950157', 'hy']

export function ownerBotChoices() {
  return OWNER_BOT_ORDER.map(agent => ({ value: agent, label: HELPERS.find(h => h.agent === agent)?.name || agent }))
}

export function canonicalOwnerBot(value) {
  return OWNER_BOT_ORDER.includes(value) ? value : ''
}

export function unownedProjects(projects = []) {
  const list = Array.isArray(projects) ? projects : []
  return list.filter(p => p && typeof p === 'object' && !OWNER_BOT_ORDER.includes(p.ownerBot)).map(p => ({
    id: typeof p.id === 'string' ? p.id : '',
    title: typeof p.title === 'string' && p.title ? p.title : '未命名專案',
    stage: typeof p.stage === 'string' ? p.stage : '',
    stageLabel: typeof p.stageLabel === 'string' ? p.stageLabel : '',
    ownerBot: canonicalOwnerBot(p.ownerBot),
    revision: Number.isInteger(p.revision) && p.revision >= 0 ? p.revision : 0,
  }))
}

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
  return { byAgent, pending: num(office.totals?.pending), unowned: unownedProjects(projects).length }
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
export const LIVE_FIGS = new Set([...HELPERS.map(h => h.id), 'atlas', ...Object.values(RUNNER_FIG)])

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
// 頭上提醒標：有問題（紅 bad）或待你處理（琥珀 you）才出現；reasons 供提示文字。
// 紅：被退回、逾期待辦、長期記憶超過 7 天沒更新、執行者異常。琥珀：待你確認、今日待辦。
export function deriveAttention(bot, now = Date.now()) {
  if (!bot) return { level: null, reasons: [], items: [] }
  if (bot.attention) return { level: bot.attention.some(i => i.level === 'bad') ? 'bad' : bot.attention.length ? 'you' : null, reasons: bot.attention.map(i => i.text), items: bot.attention }
  const items = []   // { level, text, go }：go = 'office' | 'board' | 'memory'，由畫面決定連到哪
  const o = bot.office, t = bot.todos
  if (o?.returned > 0) items.push({ level: 'bad', text: `專案被退回 ${o.returned} 件`, go: 'office' })
  if (t?.overdue > 0) items.push({ level: 'bad', text: `逾期待辦 ${t.overdue} 件`, go: 'board' })
  const lt = bot.memory?.memory_last ? freshness(bot.memory.memory_last, now) : null
  if (lt?.level === 'stale') items.push({ level: 'bad', text: `長期記憶 ${lt.days} 天沒更新`, go: 'memory' })
  if (bot.status === 'bad') items.push({ level: 'bad', text: '執行異常', go: 'office' })
  if (bot.status === 'you' || o?.asks > 0 || o?.hyDecision > 0) { const n = o?.asks || o?.hyDecision; items.push({ level: 'you', text: n ? `待你確認 ${n} 件` : '待你確認', go: 'office' }) }
  if (t?.today > 0) items.push({ level: 'you', text: `今日待辦 ${t.today} 件`, go: 'board' })
  return { level: items.some(i => i.level === 'bad') ? 'bad' : items.length ? 'you' : null, reasons: items.map(i => i.text), items }
}

export function deriveSummary({ pending, failedCount, loaded }) {
  return { needsYou: Number.isFinite(pending) ? pending : null, systemIssues: loaded ? failedCount : null }
}


// Atlas＝營運長（COO）：維運 HY Life OS。不做專案工作，只看「系統有沒有問題」。
// 只用前端讀得到的資料判斷；沒有問題就是待命（灰），有問題就是紅（會停在原地並出現「!」）。
export const ATLAS_STALE_HOURS = 24   // Bot Office 超過這麼久沒更新，視為 Atlas 沒在維護

export function deriveAtlas({ office, officeEmpty, failed = {}, todoFailed = false, unowned = 0, loaded = true }, now = Date.now()) {
  const checks = []   // { label, ok, detail }：卡片上完整列出，包含正常的項目
  const check = (label, ok, detail, go, handle) => checks.push({ label, ok, detail, go, ...(handle ? { handle } : {}) })
  if (!loaded) return { status: 'wait', doing: '正在檢查系統…', attention: [], checks: [], updatedAt: null }
  const ageH = office?.updatedAt ? (now - new Date(office.updatedAt).getTime()) / 3600e3 : null
  check('Bot Office 讀取', !failed.office, failed.office ? '讀取失敗' : officeEmpty ? 'Atlas 尚未產生第一份狀態' : '正常', 'office')
  check('Bot Office 更新', !officeEmpty && !failed.office && !office?.stale && (ageH === null || ageH <= ATLAS_STALE_HOURS),
    officeEmpty ? '尚無資料' : failed.office ? '無法判斷' : office?.stale ? '資料標示為過期' : ageH === null ? '沒有更新時間' : ageH <= ATLAS_STALE_HOURS ? (ageH < 1 ? '剛剛' : `${Math.round(ageH)} 小時前`) : `${Math.round(ageH)} 小時沒更新`, 'office')
  check('專案歸屬', !(unowned > 0), unowned > 0 ? `${unowned} 個專案沒有指定 owner_bot` : '全部有歸屬', 'office', 'assign-owner')
  check('記憶健康資料', !failed.memory, failed.memory ? '讀取失敗' : '正常')
  check('AI 工作包活動', !failed.runners, failed.runners ? '讀取失敗' : '正常', 'models')
  check('待辦資料', !todoFailed, todoFailed ? '讀取失敗' : '正常')
  const attention = checks.filter(c => !c.ok).map(c => ({ level: 'bad', text: `${c.label}：${c.detail}`, go: c.go, ...(c.handle ? { handle: c.handle } : {}) }))
  return {
    status: attention.length ? 'bad' : 'wait',
    doing: attention.length ? `${attention.length} 項系統問題待處理` : '系統運作正常，持續巡檢',
    attention, checks, updatedAt: office?.updatedAt || null,
  }
}
