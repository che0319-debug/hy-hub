// Contract v0: Drive 專案卡.md / 工作卡.md, 2026-10-24; HY's Office/Brain separation applies.
// All external field mapping lives here. Unknown fields are tolerated and not rendered.
import { OFFICE_TABS as AI_OFFICE_TABS } from './lib/aiOffice.mjs'
import { officeFailureMessage } from './lib/botOfficeView.mjs'
export const OFFICE_TABS = AI_OFFICE_TABS
export const REFRESH_MS = 30000
const STAGES = {
  unassigned: ['待派', 'wait'], assigned: ['已派', 'wait'], running: ['執行中', 'ai'],
  review: ['待審', 'ai'], hy_decision: ['待 HY 決定', 'you'], done: ['完成', 'done'], returned: ['退回', 'bad'],
}
const DELETE_HOLD = {
  running: '目前專案執行中，需等結束後才能刪除。',
  review: '目前專案在審查中，需等審查結束後才能刪除。',
}
const CARD_GROUP = { meeting: 'meeting', note: 'meeting', execution: 'execution', plan: 'execution', output: 'outputs', log: 'log', decision: 'overview', review: 'outputs' }
const array = value => Array.isArray(value) ? value : []
const text = value => typeof value === 'string' ? value : ''
// project.stage 是 text(p.stage)，與 STAGES 的鍵相同；審查階段是 'review'，不是 stageLabel「待審」。
export function officeDeleteHold(project) {
  const stage = text(project?.stage)
  if (!Object.prototype.hasOwnProperty.call(STAGES, stage)) return ''
  return DELETE_HOLD[stage] || ''
}
export const safeDriveUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null } catch { return null }
}
const when = value => {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '尚未提供'
}

export const OFFICE_NAMES = {hy: 'HY Bot', sam: 'Sam', family: '小因', '950157': '950157', 'grok-build': 'Grok Build', claude: 'Claude', gpt: 'GPT'}

export function officeTeam(building, figures = []) {
  const names = new Map(array(figures).filter(f => f && f.id && f.name).map(f => [f.id, text(f.name)]))
  const result = [], seen = new Set()
  const add = (role, id, name) => {
    if (!id || seen.has(`${role}:${id}`)) return
    seen.add(`${role}:${id}`)
    result.push({role, id, name: name || names.get(id) || OFFICE_NAMES[id] || id})
  }
  add('負責 Bot', text(building.owner_bot))
  for (const f of array(figures)) if (f && f.project === building.id && f.role === 'pi') add('PI', text(f.id), text(f.name))
  add('執行者', text(building.executor))
  add('審查者', text(building.reviewer))
  return result
}

export function mapOffice(state = {}, index = {}, metadata = {}) {
  const islands = new Map(array(state.islands).map(i => [i.id, text(i.name) || text(i.id)]))
  const reviewIds = new Set([...array(state.buildings).map(p => p?.review_card), ...array(index.cards).map(c => c?.review_card)].filter(v => typeof v === 'string'))
  const decisionIds = new Set(array(state.decisions).flatMap(d => [d?.card, d?.ref]).filter(v => typeof v === 'string'))
  const cards = array(index.cards).filter(c => c && typeof c === 'object').map(c => ({
    id: text(c.id), projectId: text(c.project), tab: decisionIds.has(c.id) ? 'overview' : reviewIds.has(c.id) ? 'outputs' : CARD_GROUP[c.type] || null,
    isReview: reviewIds.has(c.id) || c.type === 'review',
    title: text(c.title) || '未命名卡片', summary: text(c.summary) || '尚無摘要',
    date: reviewIds.has(c.id) || c.type === 'review' ? (text(c.drive_created_at) ? `Drive 建立：${when(c.drive_created_at)}` : 'Drive 建立時間待補') : text(c.date),
    driveCreatedAt: text(c.drive_created_at), driveUrl: safeDriveUrl(c.drive_url), type: text(c.type),
    reviewCard: text(c.review_card), createdAt: text(c.created_at) || text(c.date),
    verdict: text(c.verdict), round: Number.isInteger(c.round) ? c.round : null,
    criteria: array(c.criteria).map(item => typeof item === 'string' ? item : (item && typeof item.label === 'string' ? item.label : '')).filter(Boolean),
  }))
  const projectIds = new Set(array(state.buildings).map(p => p.id))
  const allDecisions = array(state.decisions).filter(d => d && ['open', 'answered'].includes(d.status)).map(d => ({
    needsAdvance: d.needs_advance === true, advance: d.advance && typeof d.advance === 'object' ? d.advance : null,
    status: d.status, answeredAt: text(d.answered_at), history: array(d.history).filter(h => h && typeof h === 'object'),
    id: text(d.id), title: text(d.title) || '待 HY 決定', suggestion: text(d.suggestion),
    kind: text(d.kind), revision: Number.isInteger(d.revision) ? d.revision : 0,
    answer: d.answer, answerSource: text(d.answer_source), answeredBy: text(d.answered_by), basis: text(d.basis), confidence: text(d.confidence),
    why: text(d.why), askedAt: text(d.asked_at), deadline: text(d.deadline),
    evidence: array(d.evidence).filter(v => typeof v === 'string'),
    choiceOptions: array(d.options).map(o => typeof o === 'string' ? { label: o, impact: '' } : (o && typeof o.label === 'string' ? { label: o.label, impact: text(o.impact) } : null)).filter(Boolean),
    questions: array(d.questions).filter(q => q && Number.isInteger(q.no)).map(q => ({
      no: q.no, q: text(q.q), why: text(q.why), options: array(q.options).map(o => typeof o === 'string' ? o : (o && typeof o.label === 'string' ? o.label : '')).filter(Boolean), recommend: text(q.recommend),
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
    const planCard = cards.find(c => c.id === p.plan_card) || null
    const groups = Object.fromEntries(OFFICE_TABS.map(([key]) => [key, cards.filter(c => c.projectId === p.id && c.tab === key)]))
    return {
      source: p, id: text(p.id), title: text(p.title) || '未命名專案', island: islands.get(p.island) || text(p.island) || '未分區',
      latestCardId: text(p.card), team: officeTeam(p, state.figures), reviewer: text(p.reviewer), planCard,
      ownerBot: text(p.owner_bot), planUrl: cardLink(p.plan_card), folderUrl: safeDriveUrl(p.drive_folder_url),
      review: { verdict: text(p.last_review?.verdict) || text(p.last_review) || 'none',
        url: cardLink(p.review_card) || cards.filter(c => c.projectId === p.id).map(c => array(index.cards).find(raw => raw.id === c.id)?.review_card).map(cardLink).find(Boolean) || null,
        requiredChanges: array(p.required_changes || p.must_fix || p.last_review?.required_changes).filter(v => typeof v === 'string'),
        returnedCount: Number.isInteger(p.returned_count) && p.returned_count >= 0 ? p.returned_count : 0 },
      figures: array(state.figures).filter(f => f && f.project === p.id).map(f => ({ id: text(f.id), owner: text(f.owner), project: text(f.project), island: text(f.island), lookAs: text(f.look_as), status: text(f.status), role: text(f.role), name: text(f.name), startedAt: text(f.started_at), finishedAt: text(f.finished_at), card: text(f.card) })),
      followUps: array(p.follow_ups).filter(v => v && typeof v === 'object').map(v => ({id: text(v.id), text: text(v.text), status: text(v.status), source: text(v.source), sourceUrl: cardLink(v.source)})),
      pendingAdvances: allDecisions.filter(d => d.projectId === p.id && d.needsAdvance),
      logs: array(state.logs).filter(l => l && l.project === p.id), requests: array(state.requests).filter(r => r && r.project === p.id),
      allDecisions: allDecisions.filter(d => d.projectId === p.id),
      stage: text(p.stage), stageLabel, tone, executor: text(p.executor) || '尚未指定', ownerBot: text(p.owner_bot),
      revision: Number.isInteger(p.revision) && p.revision >= 0 ? p.revision : 0,
      decisions: decisions.filter(d => d.projectId === p.id), cards: groups,
      finished: p.stage === 'done' || p.stage === 'returned', active: ['running', 'review'].includes(p.stage),
      pending: decisions.some(d => d.projectId === p.id),
    }
  }).sort((a, b) => Number(b.pending) - Number(a.pending))
  return {
    projects, decisions, allDecisions, requests: array(state.requests), stale: Boolean(metadata.stale),
    state, index, updatedRaw: text(state.updated),
    updated: when(metadata.stateUpdated || state.updated), updatedAt: metadata.stateUpdated || state.updated || null, indexUpdated: when(metadata.indexUpdated || index.updated),
    totals: { pending: decisions.length, running: projects.filter(p => p.active).length, finished: projects.filter(p => p.finished).length, all: projects.length },
  }
}

export class OfficeReadError extends Error {
  constructor(kind, message, code = '') { super(message); this.kind = kind; this.code = code }
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

export async function answerOfficeDecision(id, payload, { headers = {}, fetcher = fetch, base = import.meta.env?.VITE_API_BASE || '' } = {}) {
  const response = await fetcher(`${base.replace(/\/$/, '')}/api/office/decisions/${encodeURIComponent(id)}/answer`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401) throw new OfficeReadError('auth', '登入已過期，請重新登入。')
  if (response.status === 409 && data?.error === 'office_project_deleting') throw new OfficeReadError('conflict', officeFailureMessage(409, data), data.error)
  if (response.status === 409) throw new OfficeReadError('conflict', '資料已更新，請重新讀取後確認再送出；你的輸入會保留。')
  if (!response.ok) throw new OfficeReadError('error', response.status === 413 ? '資料已達大小上限，請由 Atlas 整理後再試。' : '未儲存成功，請稍後重試。')
  return data
}


// 只給 GUI 已登入的 HY 設定負責 Bot。不帶 X-Brain-Write-Token，也不走 MCP。
export function ownerBotFailureMessage(status, body = {}) {
  const error = typeof body?.error === 'string' ? body.error : ''
  if (status === 401) return '登入已過期，請重新登入。'
  if (error === 'office_owner_changed' || error === 'office_revision_conflict') return '資料已被更新，請重新讀取'
  if (status === 404 || status === 405) return '此功能尚未上線或專案不存在'
  if (status === 409) return officeFailureMessage(status, body)
  if (!status) return '無法連線，請稍後重試。'
  return '沒有儲存成功，請稍後重試。'
}

export async function assignProjectOwnerBot(projectId, payload = {}, { headers = {}, fetcher = fetch, base = import.meta.env?.VITE_API_BASE || '' } = {}) {
  const body = {
    request_id: payload.request_id,
    owner_bot: payload.owner_bot,
    expected_owner_bot: typeof payload.expected_owner_bot === 'string' ? payload.expected_owner_bot : '',
    expected_revision: Number.isInteger(payload.expected_revision) && payload.expected_revision >= 0 ? payload.expected_revision : 0,
  }
  let response
  try {
    response = await fetcher(`${String(base || '').replace(/\/$/, '')}/api/office/hy/projects/${encodeURIComponent(projectId)}/owner-bot`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new OfficeReadError('network', ownerBotFailureMessage(0, {}))
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const code = typeof data?.error === 'string' ? data.error : ''
    const kind = response.status === 401 ? 'auth' : response.status === 409 ? 'conflict' : 'error'
    throw new OfficeReadError(kind, ownerBotFailureMessage(response.status, data), code)
  }
  return data
}

export async function writeOffice(path, payload, { headers = {}, fetcher = fetch, base = import.meta.env?.VITE_API_BASE || '' } = {}) {
  const response = await fetcher(`${base.replace(/\/$/, '')}/api/office/${path}`, {
    method: 'POST', headers: {...headers, 'Content-Type': 'application/json'}, body: JSON.stringify(payload), cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401) throw new OfficeReadError('auth', '登入已過期，請重新登入。')
  if (response.status === 409 && data?.error === 'office_project_deleting') throw new OfficeReadError('conflict', officeFailureMessage(409, data), data.error)
  if (response.status === 409) throw new OfficeReadError('conflict', '資料已更新，請重新讀取後再送出；輸入已保留。')
  if (!response.ok) throw new OfficeReadError('error', response.status === 413 ? '資料已達大小上限，請由 Atlas 整理後再試。' : '未儲存成功，請稍後重試。')
  return data
}

const httpError = (kind, message, status, body, code = '') => {
  const data = body && typeof body === 'object' ? body : {}
  const error = new OfficeReadError(kind, message, code || (typeof data.error === 'string' ? data.error : ''))
  error.status = status
  error.body = data
  return error
}

export async function officeApi(path, { method = 'GET', headers = {}, body, fetcher = fetch, base = import.meta.env?.VITE_API_BASE || '', signal, expect = 'json', topic = 'office' } = {}) {
  const root = String(base || '').replace(/\/$/, '')
  let response
  try {
    const init = { method, headers: { ...headers }, signal, cache: 'no-store' }
    if (body instanceof FormData) init.body = body
    else if (body !== undefined) { init.headers = { ...init.headers, 'Content-Type': 'application/json' }; init.body = JSON.stringify(body) }
    response = await fetcher(`${root}/api/office/${path}`, init)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw httpError('network', officeFailureMessage(0, {}, topic), 0, {})
  }
  if (response.status === 401) throw httpError('auth', '登入已過期，請重新登入。', 401, {})
  const type = response.headers?.get?.('content-type') || ''
  if (expect === 'html') {
    if (!response.ok || type.includes('json')) {
      const data = await response.json().catch(() => ({}))
      throw httpError('error', officeFailureMessage(response.status, data, topic), response.status, data, data?.error || '')
    }
    return response.text()
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || data == null) throw httpError(response.status === 409 ? 'conflict' : 'error', officeFailureMessage(response.status, data || {}, topic), response.status, data || {}, data?.error || '')
  return data
}

const projectPath = id => `projects/${encodeURIComponent(id)}`
export const loadOfficeReport = (id, opts) => officeApi(`${projectPath(id)}/report`, { ...opts, topic: 'report' })
export const loadOfficeReportHtml = (id, fileId, opts) => officeApi(`${projectPath(id)}/report/html${fileId ? `?file_id=${encodeURIComponent(fileId)}` : ''}`, { ...opts, expect: 'html', topic: 'report' })
export const loadOfficeDocument = (cardId, opts) => officeApi(`cards/${encodeURIComponent(cardId)}/document`, opts)
export const loadOfficeFiles = (id, opts) => officeApi(`${projectPath(id)}/files`, opts)
export const deleteOfficeProject = (id, payload, opts) => officeApi(`${projectPath(id)}/delete`, { ...opts, method: 'POST', body: payload, topic: 'delete' })
export const uploadOfficeFile = (id, file, opts) => { const body = new FormData(); body.append('file', file); return officeApi(`${projectPath(id)}/files`, { ...opts, method: 'POST', body }) }
export const importOfficeReference = (id, fileId, opts) => officeApi(`${projectPath(id)}/drive-reference`, { ...opts, method: 'POST', body: { file_id: fileId } })
