// Contract v0: Drive 專案卡.md / 工作卡.md, 2026-10-24; HY's Office/Brain separation applies.
// All external field mapping lives here. Unknown fields are tolerated and not rendered.
export const OFFICE_TABS = [['overview', '概況'], ['inbox', '待確認'], ['plan', '規劃書'], ['outputs', '產出'], ['log', '工作紀錄'], ['quality', '品質與審查']]
export const REFRESH_MS = 30000
const STAGES = {
  unassigned: ['待派', 'wait'], assigned: ['已派', 'wait'], running: ['執行中', 'ai'],
  review: ['待審', 'ai'], hy_decision: ['待 HY 決定', 'you'], done: ['完成', 'done'], returned: ['退回', 'bad'],
}
const CARD_GROUP = { meeting: 'overview', execution: 'plan', plan: 'plan', output: 'outputs', log: 'log', decision: 'inbox', review: 'quality' }
const array = value => Array.isArray(value) ? value : []
const text = value => typeof value === 'string' ? value : ''
export const safeDriveUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null } catch { return null }
}
const when = value => {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '尚未提供'
}

export function mapOffice(state = {}, index = {}, metadata = {}) {
  const islands = new Map(array(state.islands).map(i => [i.id, text(i.name) || text(i.id)]))
  const cards = array(index.cards).filter(c => c && typeof c === 'object').map(c => ({
    id: text(c.id), projectId: text(c.project), tab: CARD_GROUP[c.type] || null,
    title: text(c.title) || '未命名卡片', summary: text(c.summary) || '尚無摘要',
    date: text(c.date), driveUrl: safeDriveUrl(c.drive_url), type: text(c.type),
  }))
  const projectIds = new Set(array(state.buildings).map(p => p.id))
  const allDecisions = array(state.decisions).filter(d => d && ['open', 'answered'].includes(d.status)).map(d => ({
    status: d.status, answeredAt: text(d.answered_at), history: array(d.history).filter(h => h && typeof h === 'object'),
    id: text(d.id), title: text(d.title) || '待 HY 決定', suggestion: text(d.suggestion),
    kind: text(d.kind), revision: Number.isInteger(d.revision) ? d.revision : 0,
    answer: d.answer, answerSource: text(d.answer_source), answeredBy: text(d.answered_by), basis: text(d.basis), confidence: text(d.confidence),
    questions: array(d.questions).filter(q => q && Number.isInteger(q.no)).map(q => ({
      no: q.no, q: text(q.q), why: text(q.why), options: array(q.options).filter(o => typeof o === 'string'), recommend: text(q.recommend),
      answer: text(q.answer), answeredBy: text(q.answered_by), answerSource: text(q.answer_source),
      basis: text(q.basis), confidence: text(q.confidence), confirmed: q.confirmed_by === 'hy',
      answeredAt: text(q.answered_at), confirmedAt: text(q.confirmed_at),
      suggestions: array(q.bot_suggestions).filter(v => v && typeof v === 'object').map(v => ({answer: text(v.answer), answeredBy: text(v.answered_by), basis: text(v.basis), confidence: text(v.confidence), at: text(v.at)})),
    })),
    projectId: (projectIds.has(d.project) ? d.project : null)
      || cards.find(c => c.id === d.card)?.projectId
      || (projectIds.has(d.ref) ? d.ref : cards.find(c => c.id === d.ref)?.projectId) || null,
  }))
  const decisions = allDecisions.filter(d => d.status === 'open')
  // Decision summaries come from state; index may lag behind an answer.
  for (const c of cards) {
    const raw = array(state.decisions).find(d => d && (d.card === c.id || d.ref === c.id))
    const d = raw && allDecisions.find(d => d.id === raw.id)
    if (d) { c.title = d.title; c.summary = d.questions.length ? d.questions.map(q => `${q.no}. ${q.q}\n${q.answer || '尚未回答'}${q.confirmed ? '（HY 已確認）' : ''}`).join('\n\n') : typeof d.answer === 'string' ? d.answer : d.suggestion || '尚未回答' }
  }
  const cardLink = value => safeDriveUrl(value) || cards.find(c => c.id === value)?.driveUrl || null
  const projects = array(state.buildings).filter(p => p && typeof p === 'object').map(p => {
    let [stageLabel, tone] = STAGES[p.stage] || ['狀態待確認', 'wait']
    if (p.stage === 'assigned' && decisions.some(d => d.projectId === p.id && d.kind === 'intake')) { stageLabel = '等 HY 回答'; tone = 'you' }
    const groups = Object.fromEntries(OFFICE_TABS.map(([key]) => [key, cards.filter(c => c.projectId === p.id && c.tab === key)]))
    return {
      id: text(p.id), title: text(p.title) || '未命名專案', island: islands.get(p.island) || text(p.island) || '未分區',
      ownerBot: text(p.owner_bot), planUrl: cardLink(p.plan_card), folderUrl: safeDriveUrl(p.drive_folder_url),
      review: { verdict: text(p.last_review?.verdict) || text(p.last_review) || 'none',
        url: cardLink(p.review_card) || cards.filter(c => c.projectId === p.id).map(c => array(index.cards).find(raw => raw.id === c.id)?.review_card).map(cardLink).find(Boolean) || null,
        requiredChanges: array(p.required_changes || p.must_fix || p.last_review?.required_changes).filter(v => typeof v === 'string'),
        returnedCount: Number.isInteger(p.returned_count) && p.returned_count >= 0 ? p.returned_count : 0 },
      figures: array(state.figures).filter(f => f && f.project === p.id).map(f => ({ id: text(f.id), owner: text(f.owner), project: text(f.project), island: text(f.island), lookAs: text(f.look_as), status: text(f.status) })),
      logs: array(state.logs).filter(l => l && l.project === p.id), requests: array(state.requests).filter(r => r && r.project === p.id),
      allDecisions: allDecisions.filter(d => d.projectId === p.id),
      stage: text(p.stage), stageLabel, tone, executor: text(p.executor) || '尚未指定', ownerBot: text(p.owner_bot),
      decisions: decisions.filter(d => d.projectId === p.id), cards: groups,
      finished: p.stage === 'done' || p.stage === 'returned', active: ['running', 'review'].includes(p.stage),
      pending: decisions.some(d => d.projectId === p.id),
    }
  }).sort((a, b) => Number(b.pending) - Number(a.pending))
  return {
    projects, decisions, allDecisions, requests: array(state.requests), stale: Boolean(metadata.stale),
    updated: when(metadata.stateUpdated || state.updated), indexUpdated: when(metadata.indexUpdated || index.updated),
    totals: { pending: decisions.length, running: projects.filter(p => p.active).length, finished: projects.filter(p => p.finished).length, all: projects.length },
  }
}

export class OfficeReadError extends Error {
  constructor(kind, message) { super(message); this.kind = kind }
}

export async function loadBotOffice({ headers = {}, signal, fetcher = fetch, base = import.meta.env?.VITE_API_BASE || '' } = {}) {
  const results = await Promise.all(['state', 'index'].map(async name => {
    const response = await fetcher(`${base.replace(/\/$/, '')}/api/office/${name}`, { method: 'GET', headers, signal, cache: 'no-store' })
    if (response.status === 401) throw new OfficeReadError('auth', '登入已過期，請重新登入。')
    let data
    try { data = await response.json() } catch { throw new OfficeReadError('error', '資料格式異常，請稍後重新整理。') }
    if (response.status === 404 && data.error === 'brain_data_not_ready') {
      if (name === 'index') return { data: { cards: [] }, updated: null, stale: false }
      throw new OfficeReadError('empty', '尚無資料')
    }
    if (!response.ok) throw new OfficeReadError('error', '讀取失敗，請稍後重新整理。')
    return { data, updated: response.headers.get('X-Brain-Updated'), stale: response.headers.get('X-Brain-Stale') === '1' }
  }))
  return mapOffice(results[0].data, results[1].data, {
    stateUpdated: results[0].updated, indexUpdated: results[1].updated, stale: results.some(r => r.stale),
  })
}

// Entirely fictional, local demo. Never submitted to an API or mixed into real responses.
export function demoOffice() {
  const stages = Object.keys(STAGES)
  const titles = ['川嶼品牌落地', '觸覺技術簡報', '家庭週末安排', '健康課表', '年度方向確認', '研究摘要整理', '包裝提案修訂']
  const state = { updated: '2026-10-24T14:30:00+08:00', islands: [{ id: 'demo', name: '示範專案' }],
    buildings: stages.map((stage, i) => ({ id: `demo-${i}`, title: titles[i], island: 'demo', stage, executor: i % 2 ? 'gpt' : 'grok-build' })),
    decisions: [{ id: 'decision-demo', status: 'open', ref: 'demo-4', title: '確認年度方向與優先順序', suggestion: '先完成驗收，再安排下一階段。' },
      { id: 'answered-demo', status: 'answered', ref: 'demo-1', title: '已回答的示範決策' }],
  }
  const summaries = {
    meeting: '已整理本週討論重點：先核對方向、再確認工作範圍，所有意見留待正式寫入介面接上。',
    execution: '本階段先確認交付範圍與驗收條件，接著整理初稿，最後交獨立審查。',
    output: '示範成果摘要：內容與呈現已整理完成，等待對照驗收條件；此處只顯示卡片摘要。',
    log: '已完成示範資料整理。這是本機展示紀錄，沒有寫入任何正式專案。',
    decision: '建議先完成本階段核對，正式核准與驗收仍由 HY 決定。',
  }
  const cards = state.buildings.flatMap(p => Object.keys(CARD_GROUP).map(type => ({
    id: `${p.id}-${type}`, project: p.id, type, title: `${p.title}・${{ meeting: '討論重點', execution: '執行安排', output: '成果摘要', log: '工作紀錄', decision: '決策摘要' }[type]}`,
    summary: summaries[type], date: '2026-10-24', drive_url: '',
  })))
  return mapOffice(state, { updated: state.updated, cards })
}


export async function answerOfficeDecision(id, payload, { headers = {}, fetcher = fetch, base = import.meta.env?.VITE_API_BASE || '' } = {}) {
  const response = await fetcher(`${base.replace(/\/$/, '')}/api/office/decisions/${encodeURIComponent(id)}/answer`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401) throw new OfficeReadError('auth', '登入已過期，請重新登入。')
  if (response.status === 409) throw new OfficeReadError('conflict', '資料已更新，請重新讀取後確認再送出；你的輸入會保留。')
  if (!response.ok) throw new OfficeReadError('error', response.status === 413 ? '資料已達大小上限，請由 Atlas 整理後再試。' : '未儲存成功，請稍後重試。')
  return data
}


export async function writeOffice(path, payload, { headers = {}, fetcher = fetch, base = import.meta.env?.VITE_API_BASE || '' } = {}) {
  const response = await fetcher(`${base.replace(/\/$/, '')}/api/office/${path}`, {
    method: 'POST', headers: {...headers, 'Content-Type': 'application/json'}, body: JSON.stringify(payload), cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401) throw new OfficeReadError('auth', '登入已過期，請重新登入。')
  if (response.status === 409) throw new OfficeReadError('conflict', '資料已更新，請重新讀取後再送出；輸入已保留。')
  if (!response.ok) throw new OfficeReadError('error', response.status === 413 ? '資料已達大小上限，請由 Atlas 整理後再試。' : '未儲存成功，請稍後重試。')
  return data
}
