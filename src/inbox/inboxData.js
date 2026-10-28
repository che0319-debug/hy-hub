// Inbox：把散在各處的訊息整理成一張一張的卡片。純函式，不碰網路也不碰畫面。
// 四類：decide 待我處理（Bot Office 待決定）、problem 問題回報（Atlas 與各 Bot 的紅色警示）、
//       overdue 過期（逾期待辦）、today 今日任務（今日待辦＋今日行程）。
// 數字（total）＝需要你動手的：decide ＋ problem ＋ overdue。今日任務是提醒，不算進數字。
import { ROSTER, HELPERS } from '../botRoster.js'
import { deriveAttention } from '../life-island/worldData.js'

export const INBOX_KINDS = [['decide', '待我處理'], ['problem', '問題回報'], ['overdue', '過期'], ['today', '今日任務']]
const normDue = due => (due ? String(due).replace(/\//g, '-') : '')
const nameOf = id => ROSTER.find(r => r.id === id)?.name || id
const GO = { office: '/bot-office' }
// 後援只認 Atlas 現在這句。其他「專案歸屬：」開頭的紅字仍走原本的連結。
const ASSIGN_OWNER_TEXT = /^專案歸屬：\d+ 個專案沒有指定 owner_bot$/

export function isAssignOwnerAttention(item) {
  if (!item || typeof item !== 'object') return false
  if (item.handle === 'assign-owner') return true
  return ASSIGN_OWNER_TEXT.test(String(item.text || ''))
}

export function assignOwnerPanelId(cardId) {
  return `assign-owner-${cardId}`
}

export function buildInbox({ decisions = [], projects = [], bots = {}, todos = null, sched = null, today = '' } = {}) {
  const items = []
  const projectTitle = id => projects.find(p => p.id === id)?.title || ''
  for (const d of decisions) items.push({ id: 'bo:' + d.id, kind: 'decide', source: 'Bot Office', meta: projectTitle(d.projectId), title: d.title, detail: d.suggestion ? '建議：' + d.suggestion : '', to: '/bot-office', action: '到 Bot Office 回答' })
  // 問題：只收紅色（有問題）。「待你確認」與逾期／今日待辦各有自己的卡片，不重複列。
  for (const id of ['atlas', ...HELPERS.map(h => h.id)]) {
    const bot = bots[id]
    if (!bot) continue
    for (const it of deriveAttention(bot).items) {
      if (it.level !== 'bad' || it.go === 'board') continue
      const r = ROSTER.find(x => x.id === id)
      const to = GO[it.go] || (it.go === 'memory' && r?.persona ? '/agent/' + r.persona : null)
      const assignOwner = isAssignOwnerAttention(it)
      items.push({ id: assignOwner ? `pb:${id}:assign-owner` : `pb:${id}:${it.text}`, kind: 'problem', source: nameOf(id), meta: '', title: it.text, detail: '', to: assignOwner ? null : to, action: (to || assignOwner) ? '處理' : '', assignOwner })
    }
  }
  if (Array.isArray(todos)) {
    for (const m of todos) {
      const due = normDue(m.due)
      if (!due || !today) continue
      const h = HELPERS.find(x => x.source === m._source)
      const base = { source: h?.name || m._source || '待辦', meta: '', title: m.title, detail: '', due, to: h?.board || null, action: h?.board ? '開看板' : '' }
      if (due < today) items.push({ ...base, id: `td:${m._source}:${m.title}:${due}`, kind: 'overdue' })
      else if (due === today) items.push({ ...base, id: `td:${m._source}:${m.title}:${due}`, kind: 'today' })
    }
  }
  if (Array.isArray(sched)) for (const e of sched) items.push({ id: `ev:${e.start}:${e.title}`, kind: 'today', source: '行程', meta: '', title: e.title, detail: '', time: e.start || '全天', to: null, action: '' })
  const order = Object.fromEntries(INBOX_KINDS.map(([k], i) => [k, i]))
  return items.map((x, i) => ({ x, i })).sort((a, b) => order[a.x.kind] - order[b.x.kind] || a.i - b.i).map(o => o.x)
}

export function inboxCounts(items) {
  const c = { decide: 0, problem: 0, overdue: 0, today: 0 }
  for (const it of items) c[it.kind]++
  return { ...c, total: c.decide + c.problem + c.overdue }
}
