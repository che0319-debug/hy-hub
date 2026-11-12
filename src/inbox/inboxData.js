// 「待你處理」：把散在各處的訊息整理成一張一張的卡片（Bot Office 首頁最上方；舊 /inbox 已導到 Bot Office）。純函式，不碰網路也不碰畫面。
// 四類：decide 待我處理（Bot Office 待決定）、problem 問題回報（Atlas 與各 Bot 的紅色警示）、
//       overdue 過期（逾期待辦）、today 今日任務（今日待辦＋今日行程）。
// 數字（total）＝需要你動手的：decide ＋ problem ＋ overdue。今日任務是提醒，不算進數字。
import { ROSTER, HELPERS } from '../botRoster.js'
import { deriveAttention } from '../life-island/worldData.js'

export const INBOX_KINDS = [['decide', '待我處理'], ['problem', '問題回報'], ['overdue', '過期'], ['today', '今日任務']]
// Bot Office「待你處理」的屬性。前四種是 Office 卡片；問題與待辦來自巡檢和看板。
export const INBOX_CATEGORIES = [['approval', '核示'], ['data', '確認資料'], ['suggestion', '建議'], ['report', '報告'], ['problem', '問題'], ['todo', '待辦']]
export const INBOX_OWNERS = [['hy', 'HY'], ['sam', 'Sam'], ['family', '小因'], ['950157', '950157'], ['atlas', 'Atlas']]
// 名冊 id → Office owner_bot id
const OWNER_OF_ROSTER = { hy: 'hy', sam: 'sam', xiaoyin: 'family', p950157: '950157', atlas: 'atlas' }
const OFFICE_CATEGORIES = new Set(['approval', 'data', 'suggestion', 'report'])
export function decisionCategory(d) {
  if (d && OFFICE_CATEGORIES.has(d.category)) return d.category
  return d?.kind === 'intake' ? 'data' : 'approval'
}
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
  const projectOwner = id => projects.find(p => p.id === id)?.ownerBot || ''
  for (const d of decisions) {
    const item = d.isItem === true || (d.isItem === undefined && !d.projectId)
    const owner = d.ownerBot || projectOwner(d.projectId) || d.createdBy || ''
    items.push({ id: 'bo:' + d.id, kind: 'decide', decisionId: d.id, projectId: d.projectId || null, isItem: item, light: item || d.light === true,
      owner, category: decisionCategory(d), source: d.source || (item ? '小案' : 'Bot Office'), meta: item ? '' : projectTitle(d.projectId),
      title: d.title, detail: d.suggestion ? '建議：' + d.suggestion : '', due: d.deadline ? normDue(d.deadline) : '',
      to: item ? '/bot-office?item=' + encodeURIComponent(d.id) : d.projectId ? '/bot-office?project=' + encodeURIComponent(d.projectId) + '&tab=meeting' : '/bot-office',
      action: '到會議室' })
  }
  // 問題：只收紅色（有問題）。「待你確認」與逾期／今日待辦各有自己的卡片，不重複列。
  for (const id of ['atlas', ...HELPERS.map(h => h.id)]) {
    const bot = bots[id]
    if (!bot) continue
    for (const it of deriveAttention(bot).items) {
      if (it.level !== 'bad' || it.go === 'board') continue
      const r = ROSTER.find(x => x.id === id)
      const to = GO[it.go] || (it.go === 'memory' && r?.persona ? '/agent/' + r.persona : null)
      const assignOwner = isAssignOwnerAttention(it)
      items.push({ id: assignOwner ? `pb:${id}:assign-owner` : `pb:${id}:${it.text}`, kind: 'problem', owner: OWNER_OF_ROSTER[id] || id, category: 'problem', source: nameOf(id), meta: '', title: it.text, detail: '', to: assignOwner ? null : to, action: (to || assignOwner) ? '處理' : '', assignOwner })
    }
  }
  if (Array.isArray(todos)) {
    for (const m of todos) {
      const due = normDue(m.due)
      if (!due || !today) continue
      const h = HELPERS.find(x => x.source === m._source)
      const base = { owner: OWNER_OF_ROSTER[h?.id] || '', category: 'todo', source: h?.name || m._source || '待辦', meta: '', title: m.title, detail: '', due, to: h?.board || null, action: h?.board ? '開看板' : '' }
      if (due < today) items.push({ ...base, id: `td:${m._source}:${m.title}:${due}`, kind: 'overdue' })
      else if (due === today) items.push({ ...base, id: `td:${m._source}:${m.title}:${due}`, kind: 'today' })
    }
  }
  if (Array.isArray(sched)) for (const e of sched) items.push({ id: `ev:${e.start}:${e.title}`, kind: 'today', owner: 'hy', category: 'todo', source: '行程', meta: '', title: e.title, detail: '', time: e.start || '全天', to: null, action: '' })
  const order = Object.fromEntries(INBOX_KINDS.map(([k], i) => [k, i]))
  return items.map((x, i) => ({ x, i })).sort((a, b) => order[a.x.kind] - order[b.x.kind] || a.i - b.i).map(o => o.x)
}

export function inboxCounts(items) {
  const c = { decide: 0, problem: 0, overdue: 0, today: 0 }
  for (const it of items) c[it.kind]++
  return { ...c, total: c.decide + c.problem + c.overdue }
}

// 依負責 Bot 與屬性篩選；'all' 不篩。
export function filterInbox(items, { owner = 'all', category = 'all' } = {}) {
  return items.filter(it => (owner === 'all' || it.owner === owner) && (category === 'all' || it.category === category))
}
