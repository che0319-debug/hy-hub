// 專案建築：類型、階段零件、樓層、提醒與即時卡片。純函式，不碰網路與畫面。
// 里程碑的 depends_on／ready 尚未進主線時，缺欄位就不顯示「可開工／等待」。
// Bot Office 頁目前不讀 ?project=（那支檔不能一起改）。連結先帶上專案 id。

export const FLOOR_CAP = 5

// 商店現在有造型。其餘先登記，造型之後再補。
export const TYPE_REGISTRY = {
  shop: { id: 'shop', label: '商店', built: true },
  office: { id: 'office', label: '辦公室', built: false },
  factory: { id: 'factory', label: '工廠', built: false },
  lab: { id: 'lab', label: '實驗室', built: false },
  home: { id: 'home', label: '住家', built: false },
  gym: { id: 'gym', label: '健身房', built: false },
}

// 沒寫 building_type 時的歸屬。目前只有 Sam 的事業落成商店。
const OWNER_TYPE = { sam: 'shop' }

export const STAGE_LABELS = {
  unassigned: '待派',
  assigned: '已派',
  running: '執行中',
  review: '待審',
  hy_decision: '待 HY 決定',
  done: '完成',
  returned: '退回',
}

const STAGE_TONE = {
  unassigned: 'wait',
  assigned: 'wait',
  running: 'ai',
  review: 'ai',
  hy_decision: 'you',
  done: 'done',
  returned: 'bad',
}

const DONE = new Set(['done', 'completed', 'complete', 'closed', 'passed', '完成', '已完成'])

const text = value => (typeof value === 'string' ? value.trim() : '')
const clip = (value, n) => {
  const t = String(value || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

export function isMilestoneDone(milestone) {
  const status = text(milestone?.status)
  if (!status) return false
  return DONE.has(status) || DONE.has(status.toLowerCase())
}

export function normDue(due) {
  const match = String(due || '').trim().replace(/\//g, '-').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : ''
}

function rawMilestones(project) {
  if (Array.isArray(project?.source?.milestones)) return project.source.milestones
  if (Array.isArray(project?.milestones)) return project.milestones
  if (Array.isArray(project?._officeMilestones)) return project._officeMilestones
  return []
}

function milestoneId(milestone, index) {
  if (milestone?.id == null || milestone.id === '') return ''
  return String(milestone.id)
}

export function normalizeMilestones(project) {
  return rawMilestones(project).filter(item => item && typeof item === 'object').map((item, index) => ({
    id: milestoneId(item, index),
    title: text(item.title) || text(item.name),
    status: text(item.status),
    due: normDue(item.due),
    dependsOn: Object.prototype.hasOwnProperty.call(item, 'depends_on') ? item.depends_on : undefined,
    ready: Object.prototype.hasOwnProperty.call(item, 'ready') ? item.ready : undefined,
  }))
}

function ownerOf(project) {
  return text(project?.owner_bot) || text(project?.ownerBot) || text(project?.source?.owner_bot)
}

function explicitType(project) {
  return text(project?.building_type) || text(project?.source?.building_type)
}

export function resolveBuildingType(project, fallback = 'shop') {
  const explicit = explicitType(project)
  if (explicit && TYPE_REGISTRY[explicit]) return explicit
  const owner = ownerOf(project)
  if (OWNER_TYPE[owner]) return OWNER_TYPE[owner]
  return fallback
}

// 未完工的類型沒有自己的造型，呼叫端先沿用商店外殼。
export function meshKind(type) {
  return TYPE_REGISTRY[type]?.built ? type : 'shop'
}

export function floorPlan(stage, doneCount) {
  const done = Math.max(0, Number(doneCount) || 0)
  if (stage === 'unassigned' || stage === 'assigned' || !stage) return { floors: 0, half: false, complete: false }
  if (stage === 'review' || stage === 'done' || stage === 'hy_decision') {
    return { floors: Math.min(FLOOR_CAP, done), half: false, complete: true }
  }
  if (done <= 0) return { floors: 0, half: true, complete: false }
  return { floors: Math.min(FLOOR_CAP, done), half: false, complete: false }
}

export function milestoneProgress(milestones) {
  const rows = Array.isArray(milestones) ? milestones : []
  const done = rows.filter(isMilestoneDone).length
  return { done, total: rows.length }
}

// 任何未完成、且到期日早於今天的里程碑。沒有日期、或日期就是今天，不算逾期。
export function hasOverdue(milestones, today) {
  const day = normDue(today)
  if (!day) return false
  return (Array.isArray(milestones) ? milestones : []).some(item => {
    const due = normDue(item?.due)
    return !isMilestoneDone(item) && due && due < day
  })
}

export function openDecisions(project) {
  const id = text(project?.id)
  const list = Array.isArray(project?.decisions) ? project.decisions : Array.isArray(project?.allDecisions) ? project.allDecisions : []
  return list.filter(item => {
    if (!item || typeof item !== 'object') return false
    if (item.status && item.status !== 'open') return false
    if (item.projectId && id && item.projectId !== id) return false
    if (!item.projectId && item.project && id && item.project !== id) return false
    return true
  })
}

// 紅優先於琥珀：退回或逾期蓋過待決定。
export function projectAlert({ stage, milestones, decisions, today, open }) {
  const pending = typeof open === 'number' ? open : (Array.isArray(decisions) ? decisions.length : 0)
  if (stage === 'returned' || hasOverdue(milestones, today)) {
    return { level: 'red', reason: stage === 'returned' ? 'returned' : 'overdue', count: pending }
  }
  if (stage === 'hy_decision' || pending > 0) return { level: 'amber', reason: 'decision', count: pending }
  return null
}

export function alertChip(alert) {
  if (!alert) return null
  if (alert.level === 'red') return { tone: 'bad', text: alert.reason === 'returned' ? '被退回' : '逾期' }
  const n = alert.count || 0
  return { tone: 'you', text: n ? `待你決定 ${n}` : '待你決定' }
}

export function stageParts(stage, floors = { floors: 0, half: false }, alert = null) {
  const level = alert === 'red' || alert === 'amber' ? alert : null
  const base = {
    foundation: true,
    scaffold: false,
    desaturate: false,
    body: false,
    half: false,
    floors: 0,
    crane: false,
    fence: false,
    roof: false,
    sign: false,
    flag: null,
    lit: false,
    alert: level,
  }
  if (stage === 'unassigned' || stage === 'assigned') return { ...base, scaffold: true, desaturate: true }
  if (stage === 'running' || stage === 'returned') {
    return {
      ...base,
      body: true,
      half: !!floors.half,
      floors: floors.floors || 0,
      crane: true,
      fence: true,
      alert: stage === 'returned' ? (level || 'red') : level,
    }
  }
  if (stage === 'review' || stage === 'done' || stage === 'hy_decision') {
    return {
      ...base,
      body: true,
      floors: floors.floors || 0,
      roof: true,
      sign: true,
      flag: stage === 'review' ? 'blue' : stage === 'done' ? 'green' : null,
      lit: stage === 'done',
      alert: stage === 'hy_decision' ? (level || 'amber') : level,
    }
  }
  return { ...base, scaffold: true, desaturate: true }
}

export function buildingSignature(type, parts) {
  const p = parts || {}
  return [
    type || '',
    p.scaffold ? 's' : '',
    p.desaturate ? 'd' : '',
    p.body ? 'b' : '',
    p.half ? 'h' : '',
    p.floors || 0,
    p.crane ? 'c' : '',
    p.fence ? 'f' : '',
    p.roof ? 'r' : '',
    p.sign ? 'g' : '',
    p.flag || '',
    p.lit ? 'l' : '',
    p.alert || '',
  ].join(':')
}

export function placeholderParts() {
  return stageParts('running', floorPlan('running', 0), null)
}

function isRunningStatus(status) {
  const s = text(status).toLowerCase()
  return s === 'running' || s === 'in_progress' || status === '執行中'
}

// 跟 Bot Office 一樣先看未完成的。其中若有 running／執行中，優先用那一列，否則用第一列。
export function currentMilestone(milestones) {
  const rows = (Array.isArray(milestones) ? milestones : []).filter(item => item?.id && !isMilestoneDone(item))
  return rows.find(item => isRunningStatus(item.status)) || rows[0] || null
}

function depId(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && value.id != null) return String(value.id)
  return ''
}

// 沒有 depends_on 也沒有 ready：不推測，回 null。
export function milestoneGate(milestone, milestones) {
  const hasDepends = milestone && milestone.dependsOn !== undefined
  const hasReady = milestone && milestone.ready !== undefined
  if (!hasDepends && !hasReady) return null
  const deps = hasDepends && Array.isArray(milestone.dependsOn) ? milestone.dependsOn.map(depId).filter(Boolean) : []
  const byId = new Map((milestones || []).filter(item => item?.id).map(item => [item.id, item]))
  const waiting = deps.filter(id => {
    const dep = byId.get(id)
    return !dep || !isMilestoneDone(dep)
  })
  const ready = hasReady && milestone.ready === true
  const blocked = hasReady && milestone.ready === false
  if (blocked || (!hasReady && waiting.length)) {
    return { kind: 'wait', text: waiting.length ? `等待〔${waiting.join('、')}〕` : '等待' }
  }
  if (ready || hasDepends) return { kind: 'ready', text: '可開工' }
  return null
}

function stageLabelOf(project, stage) {
  return text(project?.stageLabel) || STAGE_LABELS[stage] || '狀態待確認'
}

function stageToneOf(stage, label) {
  if (label && label !== STAGE_LABELS[stage] && /待|決定|回答/.test(label)) return 'you'
  return STAGE_TONE[stage] || 'wait'
}

function outputCards(project) {
  const found = []
  const seen = new Set()
  const take = card => {
    if (!card || typeof card !== 'object') return
    if (card.type !== 'output') return
    const id = card.id != null ? String(card.id) : ''
    if (id && seen.has(id)) return
    if (id) seen.add(id)
    found.push(card)
  }
  const groups = project?.cards
  if (groups && typeof groups === 'object') {
    for (const list of Object.values(groups)) if (Array.isArray(list)) list.forEach(take)
  }
  if (Array.isArray(project?.outputCards)) project.outputCards.forEach(take)
  return found
}

function cardTime(card) {
  const raw = card.createdAt || card.created_at || card.date || card.driveCreatedAt || ''
  const time = Date.parse(raw)
  return Number.isFinite(time) ? time : 0
}

export function latestOutputLine(project) {
  const cards = outputCards(project).slice().sort((a, b) => cardTime(a) - cardTime(b))
  const card = cards[cards.length - 1]
  if (!card) return ''
  const title = text(card.title) || '成果'
  const summary = text(card.summary)
  const extra = summary && summary !== '尚無摘要' ? summary : ''
  return clip(extra ? `${title}：${extra}` : title, 72)
}

export function officeProjectPath(projectId) {
  const id = text(projectId)
  if (!id) return '/bot-office'
  return `/bot-office?project=${encodeURIComponent(id)}`
}

function milestoneLine(milestone, milestones) {
  const gate = milestoneGate(milestone, milestones)
  const parts = [milestone.id, milestone.title, milestone.due, gate?.text].filter(Boolean)
  return { id: milestone.id || parts.join('-'), line: parts.join(' · '), gate: gate?.text || null }
}

export function findProjectForBuilding(building, projects = []) {
  if (!building) return null
  const list = Array.isArray(projects) ? projects : []
  if (building.project) return list.find(item => item && item.id === building.project) || null
  const title = text(building.title)
  if (!title) return null
  return list.find(item => {
    const name = text(item?.title)
    if (!name) return false
    if (name === title) return true
    return title.includes('川泱') && name.includes('川泱')
  }) || null
}

export function composeBuilding(project, { today, title } = {}) {
  const stage = text(project?.stage) || 'unassigned'
  const milestones = normalizeMilestones(project).map(item => ({ ...item, due: item.due }))
  // normalize 已把 due 收成日期；逾期直接看這份。
  const progress = milestoneProgress(milestones)
  const floors = floorPlan(stage, progress.done)
  const pending = openDecisions(project)
  const alert = projectAlert({ stage, milestones, open: pending.length, today })
  const parts = stageParts(stage, floors, alert ? alert.level : null)
  const type = resolveBuildingType(project)
  const labelText = stageLabelOf(project, stage)
  const tone = stageToneOf(stage, labelText)
  const running = currentMilestone(milestones)
  const name = text(project?.title) || text(title) || '專案'
  const chip = alertChip(alert)
  const unfinished = milestones.filter(item => !isMilestoneDone(item)).map(item => milestoneLine(item, milestones))
  const showRunning = !!(running && (stage === 'running' || isRunningStatus(running.status)))
  const badges = [
    { key: 'stage', text: labelText, tone },
    { key: 'ms', text: `里程碑 ${progress.done}／${progress.total}`, tone: 'wait' },
  ]
  if (showRunning) badges.push({ key: 'cur', text: `執行中 ${running.id}`, tone: 'ai' })
  if (pending.length) badges.push({ key: 'ask', text: `待你決定 ${pending.length}`, tone: 'you' })
  const ratio = progress.total ? progress.done / progress.total : 0
  const label = {
    title: `${name}｜${labelText}`,
    text: `${progress.done}／${progress.total}`,
    ratio,
    tag: showRunning ? running.id : '',
    tone,
    chip,
    signature: [name, labelText, progress.done, progress.total, showRunning ? running.id : '', chip?.text || ''].join('|'),
  }
  const card = {
    live: true,
    title: name,
    stage,
    stageLabel: labelText,
    tone,
    href: officeProjectPath(project?.id),
    badges,
    milestones: unfinished,
    milestoneNote: progress.total === 0 ? '尚未提供里程碑' : '里程碑都完成了',
    decisions: pending.map(item => ({ id: text(item.id) || text(item.title), line: text(item.title) || '待決定' })),
    output: latestOutputLine(project),
  }
  return {
    type,
    mesh: meshKind(type),
    stage,
    stageLabel: labelText,
    tone,
    parts,
    floors,
    progress,
    alert,
    signature: buildingSignature(meshKind(type), parts),
    label,
    card,
  }
}
