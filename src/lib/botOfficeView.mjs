const list = value => Array.isArray(value) ? value : []
export const officeTime = value => { const n = typeof value === 'number' ? value : Date.parse(value) / 1000; return Number.isFinite(n) && n > 0 ? n : null }
const DONE_MILESTONE = new Set(['done', 'completed', 'complete', 'closed', 'passed', '完成', '已完成'])
const DONE_ROUND = new Set(['done', 'completed', 'finished', 'complete', 'closed'])
const ACTIVE_ROUND = new Set(['running', 'ready', 'blocked', 'failed', 'waiting', 'active'])
const textOf = value => typeof value === 'string' ? value.trim() : ''
const decode = value => textOf(value)
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
const plain = value => decode(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

export const REPORT_FRAME = { sandbox: 'allow-popups allow-popups-to-escape-sandbox', referrerPolicy: 'no-referrer' }

export function isHyOwnerSession(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false
  try {
    const payload = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')
    const data = JSON.parse(atob(payload))
    return data?.sub === 'hy'
  } catch { return false }
}

export function isMilestoneDone(milestone) {
  const status = textOf(milestone?.status)
  return DONE_MILESTONE.has(status) || DONE_MILESTONE.has(status.toLowerCase())
}

export function officeMilestones(building = {}) {
  return list(building?.milestones).filter(item => item && typeof item === 'object').map(item => ({
    id: item.id == null ? '' : String(item.id),
    name: textOf(item.name) || textOf(item.title),
    due: textOf(item.due),
    output: textOf(item.output),
    status: textOf(item.status),
    major: item.major === true || item.is_major === true,
    goal: textOf(item.goal) || textOf(item.objective),
    deliverables: list(item.deliverables).length ? list(item.deliverables) : (textOf(item.output) ? [textOf(item.output)] : []),
    acceptance: list(item.acceptance).length ? list(item.acceptance) : list(item.acceptance_criteria),
    packages: [],
  }))
}

export function currentMilestoneId(milestones = []) {
  return milestones.find(item => item?.id && !isMilestoneDone(item))?.id || ''
}

export function milestoneProgress(milestones = []) {
  const rows = list(milestones)
  return { done: rows.filter(isMilestoneDone).length, total: rows.length }
}

export function officePlan(building = {}, embedded = null) {
  const milestones = officeMilestones(building)
  if (!milestones.length) return embedded || null
  return {
    ...(embedded && typeof embedded === 'object' ? embedded : {}),
    goal: textOf(embedded?.goal) || textOf(building.goal),
    milestones: milestones.map(item => ({
      id: item.id, name: item.name, goal: item.goal, due: item.due, status: item.status,
      deliverables: item.deliverables, acceptance_criteria: item.acceptance, is_major: item.major, packages: [],
    })),
  }
}

export function reportSummaryLines(html) {
  if (typeof html !== 'string' || !html.trim()) return []
  const source = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '')
  const heading = /<(h[1-4]|b|strong)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let found = null
  for (const match of source.matchAll(heading)) {
    if (/一頁摘要|現在怎樣.*你要做什麼/.test(plain(match[2]))) { found = match; break }
  }
  if (!found) return []
  const rest = source.slice(found.index + found[0].length)
  const level = /^h([1-4])$/i.exec(found[1])
  const next = level ? new RegExp(`<h[1-${level[1]}]\\b`, 'i').exec(rest) : null
  const section = next ? rest.slice(0, next.index) : rest
  const items = [...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(match => plain(match[1])).filter(Boolean).slice(0, 6)
  if (items.length) return items
  const body = plain(section).slice(0, 1200)
  return body ? [body] : []
}

export function reportIsStale(stateUpdated, modifiedTime) {
  const stateAt = Date.parse(stateUpdated)
  const reportAt = Date.parse(modifiedTime)
  return Number.isFinite(stateAt) && Number.isFinite(reportAt) && stateAt > reportAt
}

export function reportVersions(meta) {
  if (!meta || meta.exists !== true) return []
  const versions = []
  if (meta.file_id) versions.push({ file_id: String(meta.file_id), name: textOf(meta.name), modified_time: textOf(meta.modified_time), version: null, current: true })
  for (const item of list(meta.history)) {
    if (!item?.file_id || versions.some(version => version.file_id === String(item.file_id))) continue
    versions.push({ file_id: String(item.file_id), name: textOf(item.name), modified_time: textOf(item.modified_time), version: item.version ?? null, current: false })
  }
  return versions
}

export function normalizeOfficeReport(data) {
  if (!data || typeof data !== 'object' || typeof data.exists !== 'boolean') return null
  return {
    exists: data.exists,
    reason: textOf(data.reason),
    file_id: textOf(data.file_id),
    name: textOf(data.name),
    modified_time: textOf(data.modified_time),
    size: data.size,
    drive_url: textOf(data.drive_url),
    history: list(data.history).filter(item => item && item.file_id).map(item => ({
      file_id: String(item.file_id), name: textOf(item.name), modified_time: textOf(item.modified_time), version: item.version ?? null,
    })),
  }
}

export function normalizeOfficeDocument(data) {
  if (!data || typeof data !== 'object' || typeof data.markdown !== 'string') return null
  return { cardId: textOf(data.card_id), name: textOf(data.name), markdown: data.markdown, truncated: data.truncated === true, modifiedTime: textOf(data.modified_time) }
}

export function normalizeOfficeFiles(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.files)) return null
  return {
    folderId: data.folder_id || null,
    reason: textOf(data.reason),
    files: data.files.filter(file => file && typeof file.id === 'string').map(file => ({
      id: file.id, name: textOf(file.name) || file.id, mime: textOf(file.mime_type), modified: textOf(file.modified_time), folder: textOf(file.folder), url: textOf(file.web_url),
    })),
  }
}

export function deleteErrorMessage(status, body = {}) {
  const error = textOf(body?.error)
  const reason = textOf(body?.reason)
  const step = textOf(body?.step)
  // committed 優先於狀態碼與 body.error：已提交或結果不明時不能再說「未刪除」。
  if (body?.committed === true) return '專案已刪除（備份已保留），但看板收尾未完成，請重新整理；若卡片還在，再按一次刪除即可清掉。'
  if (body?.committed === null) return '結果不明，備份已保留，請重新讀取確認專案是否已刪除。'
  if (error === 'drive_write_unavailable') return `沒有 Drive 寫入權，專案未刪除。${reason ? `（${reason}）` : ''}`
  if (error === 'archive_folder_not_configured') return '尚未設定「已刪除專案備份」資料夾，專案未刪除。'
  if (error === 'project_running') return '專案正在執行，現在不能刪除。專案未刪除。'
  if (error === 'project_review') return '專案在審查中，現在不能刪除。專案未刪除。'
  if (status === 400) return '輸入的專案名稱不一致，未刪除。'
  if (status === 409) return '專案資料已更新，請重新讀取後再刪除。專案未刪除。'
  if (status === 404) return '找不到這個專案，或刪除功能尚未部署。專案未刪除。'
  if (status === 401 || status === 403) return '刪除專案僅限 HY 本人。專案未刪除。'
  if (status === 503) return `刪除服務暫時無法使用，專案未刪除。${error ? `（${error}）` : ''}${reason ? ` ${reason}` : ''}`
  if (status === 502) return `備份或搬移失敗，專案未刪除。${step ? `停在：${step}。` : ''}${reason}`
  if (!status) return '無法連線，專案未刪除。'
  return `刪除失敗（${status}${error ? ` ${error}` : ''}），專案未刪除。`
}

export function officeDeleteOutcome(error) {
  const body = error?.body && typeof error.body === 'object' ? error.body : {}
  const status = Number.isInteger(error?.status) ? error.status : 0
  const message = typeof error?.message === 'string' && error.message ? error.message : deleteErrorMessage(status, body)
  return { message, removed: body.committed === true }
}

export function officeFailureMessage(status, body = {}, topic = 'office') {
  const error = textOf(body?.error)
  const reason = textOf(body?.reason)
  if (topic === 'delete') return deleteErrorMessage(status, body)
  if (status === 404 && error === 'no_document') return '這張卡片沒有可讀的 Drive 文件。'
  if (status === 422 && error === 'report_unsafe') return `報告未通過安全檢查。${reason}`
  if (status === 413) return '內容超過大小上限，沒有載入。'
  if (error === 'drive_write_unavailable') return `沒有 Drive 寫入權，沒有寫入。${reason ? `（${reason}）` : ''}`
  if (status === 404) return topic === 'report' ? '找不到專案或這份報告。' : '找不到對應資料，或這項功能尚未部署。'
  if (status === 401) return '登入已過期，請重新登入。'
  if (status === 409) return '資料剛更新過，請重新讀取後再試。沒有寫入。'
  if (status === 503) return `服務暫時無法使用。${error ? `（${error}）` : ''}${reason ? ` ${reason}` : ''}`.trim()
  if (status === 502) return `後端處理失敗，沒有變更資料。${textOf(body?.step) ? `停在：${body.step}。` : ''}${reason}`
  if (!status) return '無法連線，請稍後重試。'
  return `讀取失敗（${status}${error ? ` ${error}` : ''}）。`
}

export function openFollowUpCount(items = []) {
  return list(items).filter(item => item && !['done', 'resolved', 'cancelled', '已完成', '已取消'].includes(item.status)).length
}

export function reviewFieldLabel(value) {
  const labels = { pass: '通過', fail: '需修改', none: '尚無審查', conditional_pass: '有條件通過' }
  const key = textOf(value) || 'none'
  return labels[key] || key
}

export function reviewRounds(cards = []) {
  const rows = list(cards).filter(card => card && card.type === 'output' && (card.reviewCard || card.review_card))
  const ordered = [...rows].sort((a, b) => String(a.createdAt || a.created_at || '').localeCompare(String(b.createdAt || b.created_at || '')) || String(a.id).localeCompare(String(b.id)))
  return ordered.map((output, index) => {
    const reviewId = output.reviewCard || output.review_card
    const review = list(cards).find(card => card.id === reviewId) || null
    const verdict = textOf(review?.verdict)
    return {
      round: Number.isInteger(review?.round) ? review.round : index + 1,
      outputId: output.id,
      outputTitle: textOf(output.title) || output.id,
      reviewId,
      reviewTitle: textOf(review?.title),
      summary: textOf(review?.summary),
      driveCreatedAt: textOf(review?.driveCreatedAt || review?.drive_created_at),
      verdict,
      hasVerdict: verdict.length > 0,
      criteria: list(review?.criteria).map(item => typeof item === 'string' ? item : textOf(item?.label)).filter(Boolean),
    }
  })
}

const actorName = (actor, answeredBy) => {
  if (actor === 'hy') return 'HY'
  if (answeredBy === 'hy' || actor === 'owner-bot:grok') return 'HY Bot'
  return answeredBy || actor || 'Bot'
}
const humanActor = (actor, answeredBy) => ['hy', 'sam', 'family', '950157'].includes(actor) || ['hy', 'sam', 'family', '950157'].includes(answeredBy)
const pushEvent = (events, event) => {
  const at = officeTime(event.at)
  if (at) events.push({ ...event, at })
}

export function officeJournal(state = {}, index = {}, projectId) {
  const events = []
  const cards = list(index.cards).filter(card => card && card.project === projectId)
  const cardProject = new Map(cards.map(card => [card.id, card.project]))
  const belongs = decision => decision && (decision.project === projectId || decision.ref === projectId || cardProject.get(decision.card) === projectId || cardProject.get(decision.ref) === projectId)
  for (const decision of list(state.decisions).filter(belongs)) {
    pushEvent(events, { id: `ask:${decision.id}`, at: decision.asked_at, actor: '專案流程', kind: 'system', text: `提出待決定：${textOf(decision.title) || decision.id}`, action: decision.status === 'open' ? decision.id : null })
    const history = list(decision.history).filter(item => item && typeof item === 'object')
    history.forEach((item, index) => pushEvent(events, {
      id: `${decision.id}:${index}`, at: item.at, actor: actorName(item.actor, item.answered_by),
      kind: item.actor === 'system' ? 'system' : (humanActor(item.actor, item.answered_by) || item.actor || item.answered_by ? 'human' : 'system'),
      text: textOf(decision.title) || '決策紀錄',
      detail: typeof item.answer === 'string' ? item.answer : textOf(item.answer?.feedback || item.note || item.action),
      action: decision.status === 'open' ? decision.id : null,
    }))
    if (decision.answered_at && !history.some(item => item.at === decision.answered_at)) pushEvent(events, {
      id: `answer:${decision.id}`, at: decision.answered_at, actor: actorName(decision.answered_by === 'hy' ? 'hy' : decision.actor, decision.answered_by),
      kind: 'human', text: `回覆：${textOf(decision.title) || decision.id}`, detail: typeof decision.answer === 'string' ? decision.answer : '',
    })
  }
  for (const card of cards) {
    const kind = card.type === 'output' ? 'artifact' : card.type === 'meeting' ? 'human' : 'system'
    pushEvent(events, { id: `card:${card.id}`, at: card.created_at || card.drive_created_at || card.date, actor: kind === 'artifact' ? '成果' : kind === 'human' ? '會議室' : '系統', kind, text: textOf(card.title) || card.id, detail: textOf(card.summary), url: textOf(card.drive_url) })
  }
  for (const figure of list(state.figures).filter(figure => figure && figure.project === projectId)) {
    const actor = textOf(figure.name) || textOf(figure.look_as) || '執行者'
    pushEvent(events, { id: `fig-start:${figure.id}`, at: figure.started_at, actor, kind: 'system', text: `開始執行回合：${figure.id}`, detail: textOf(figure.status) })
    pushEvent(events, { id: `fig-end:${figure.id}`, at: figure.finished_at, actor, kind: 'system', text: `結束執行回合：${figure.id}`, detail: textOf(figure.status) })
  }
  const building = list(state.buildings).find(item => item?.id === projectId) || {}
  for (const item of list(building.follow_ups)) pushEvent(events, { id: `fu:${item.id || item.text}`, at: item.at || item.created_at, actor: '執行前待辦', kind: 'system', text: textOf(item.text), detail: textOf(item.status) })
  for (const item of list(building.events)) if (item?.id) pushEvent(events, { ...item, id: item.id, kind: item.kind || 'system', actor: item.actor || '系統', text: item.text || '' })
  for (const item of list(state.logs).filter(item => item && item.project === projectId)) pushEvent(events, {
    id: item.id || `log:${item.at}`, at: item.at, actor: actorName(item.actor, item.answered_by),
    kind: item.actor === 'system' ? 'system' : 'human', text: textOf(item.content),
  })
  for (const item of list(state.requests).filter(item => item && item.project === projectId)) pushEvent(events, {
    id: item.id || item.request_id, at: item.created_at, actor: item.created_by === 'hy' ? 'HY' : '專案流程', kind: 'human',
    text: textOf(item.payload?.content || item.payload?.title || item.type), detail: textOf(item.status) === 'open' ? '已送出' : textOf(item.status),
  })
  return events.sort((a, b) => b.at - a.at || String(a.id).localeCompare(String(b.id)))
}

export function executionRounds(state = {}, index = {}, projectId) {
  const cards = list(index.cards).filter(card => card && card.project === projectId && card.type === 'execution')
  return list(state.figures).filter(figure => figure && figure.project === projectId && figure.role === 'executor').map(figure => {
    const card = cards.find(item => figure.card === item.id || String(figure.id).endsWith(item.id))
    const status = textOf(figure.status)
    const finished = DONE_ROUND.has(status.toLowerCase())
    const active = !finished && (ACTIVE_ROUND.has(status.toLowerCase()) || !figure.finished_at)
    return { id: figure.id, status, active, task: textOf(card?.title) || textOf(figure.name) || figure.id, executor: textOf(figure.look_as) || textOf(figure.owner), startedAt: textOf(figure.started_at), cardId: card?.id || '' }
  })
}
export function officeView(project) {
 const p = project.source || {}
 const packages = list(p.packages).filter(x => x && typeof x === 'object').map(w => ({...w, dependencies:list(w.dependencies)}))
 const actions = project.allDecisions.map(d => ({action_id:d.id,project_id:project.id,title:d.title,status:d.status==='open'?'OPEN':'RESOLVED',assigned_to:'HY',created_at:officeTime(d.created_at),resolved_at:officeTime(d.answeredAt),answer:d.answer}))
 return {...p,_rawPackages:p.packages,id:project.id,title:project.title,goal:p.goal || '',owner_bot:project.ownerBot,status:project.stage==='done'?'completed':project.pending?'confirmation':project.active?'ai_running':'ai_pending',phase:p.phase || project.stageLabel,activity:{label:project.stageLabel},packages,actions,plan:p.plan || null,plan_revision:p.plan_revision,plan_state:p.plan_state,started_at:officeTime(p.started_at || p.opened_at),updated_at:officeTime(p.updated_at),notes:[],suggestions:[],files:list(p.files),team:project.team,quality:p.quality || {},report:p.report || {},system_blockers:list(p.system_blockers)}
}
export function officeEvents(project) {
 const p=project.source || {}, events=[]
 for(const l of project.logs) events.push({id:l.id,at:officeTime(l.at),actor:l.actor==='hy'?'HY':l.answered_by==='hy'?'HY Bot':l.answered_by || 'Bot',kind:'human',text:l.content})
 for(const r of project.requests) events.push({id:r.id,at:officeTime(r.created_at),actor:r.created_by==='hy'?'HY':'專案流程',kind:'human',text:r.payload?.content || r.payload?.title || '',detail:r.status==='open'?'已送出':r.status})
 for(const d of project.allDecisions) for(const [i,h] of (d.history || []).entries()) events.push({id:d.id+':'+i,at:officeTime(h.at),actor:h.actor==='hy'?'HY':h.answered_by==='hy'?'HY Bot':h.answered_by || 'Bot',kind:'human',text:d.title,detail:typeof h.answer==='string'?h.answer:h.action,action:d.status==='open'?d.id:null})
 for(const e of list(p.events)) if(e && e.id) events.push({...e,at:officeTime(e.at)})
 return events.filter(e=>e.at).sort((a,b)=>b.at-a.at || String(a.id).localeCompare(String(b.id)))
}
