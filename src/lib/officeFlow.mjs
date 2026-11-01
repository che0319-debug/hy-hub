// 專案流程 v1 的純換算。新後端若已給 flow_phase／plan_step／step_board／lead_step 就照用；
// 缺欄位時用與後端同一套規則補上，讓舊後端也能畫流程圖。不打網路。
import { isMilestoneDone } from './reportSummary.mjs'
import { STAGE_LABEL, STAGE_TONE, normalizeStage } from './projectStages.mjs'

export const STEP_LABEL = {
  waiting: '等前置',
  running: '執行中',
  review: '審查中',
  hy_decision: '核定中',
  done: '已完成',
  cancelled: '已取消',
}
const STEPS = Object.keys(STEP_LABEL)
const OPEN_RANK = { hy_decision: 4, review: 3, running: 2, waiting: 1 }
const CANCELLED = new Set(['cancelled', 'canceled', '已取消', '取消'])
// 現有 isMilestoneDone 不含「通過」。只在這份流程換算多認，不改報告摘要的完成判斷。
const PASSED = new Set(['通過', '已通過'])
const BOARD_KEYS = ['waiting', 'running', 'review', 'hy_decision', 'done', 'cancelled']

const text = value => (typeof value === 'string' ? value.trim() : '')

export function compareId(a, b) {
  const pa = parseId(a)
  const pb = parseId(b)
  if (pa && pb) {
    if (pa.n !== pb.n) return pa.n - pb.n
    return pa.kind - pb.kind
  }
  if (pa) return -1
  if (pb) return 1
  return String(a ?? '').localeCompare(String(b ?? ''), 'zh-Hant')
}

function parseId(id) {
  const match = String(id ?? '').trim().match(/^([MG])(\d+)$/i)
  if (!match) return null
  return { kind: match[1].toUpperCase() === 'M' ? 0 : 1, n: Number(match[2]) }
}

export function isPlanMilestone(milestone) {
  const id = text(milestone?.id ?? (typeof milestone === 'string' ? milestone : ''))
  const kind = text(milestone?.kind)
  return kind === 'plan' || /^m0$/i.test(id)
}

function asStep(value) {
  const step = text(value)
  if (step === 'canceled') return 'cancelled'
  return STEPS.includes(step) ? step : ''
}

function depsOf(milestone) {
  const raw = Object.prototype.hasOwnProperty.call(milestone || {}, 'depends_on')
    ? milestone.depends_on
    : milestone?.dependsOn
  if (!Array.isArray(raw)) return []
  return raw.map(item => {
    if (typeof item === 'string' || typeof item === 'number') return String(item).trim()
    if (item && item.id != null) return String(item.id).trim()
    return ''
  }).filter(Boolean)
}

function kindOf(id, kind) {
  if (/^m0$/i.test(id)) return 'plan'
  if (kind === 'plan' || kind === 'gate' || kind === 'milestone') return kind
  if (/^g\d/i.test(id)) return 'gate'
  return 'milestone'
}

function statusStep(row) {
  const status = row.status
  const low = status.toLowerCase()
  if (CANCELLED.has(low) || CANCELLED.has(status)) return 'cancelled'
  if (isMilestoneDone(row) || PASSED.has(status) || PASSED.has(low)) return 'done'
  return ''
}

// 沒有 step：完成類 → done、取消類 → cancelled；否則前置都完成（或缺前置）→ running，不然 waiting。
// 前置指到決策卡時，只有已回答才算完成。depends 成環則視為等前置，避免遞迴。
export function annotateMilestones(milestones = [], decisions = []) {
  const rows = (Array.isArray(milestones) ? milestones : []).filter(item => item && typeof item === 'object').map(item => {
    const id = item.id == null ? '' : String(item.id).trim()
    return {
      ...item,
      id,
      status: text(item.status),
      kind: kindOf(id, text(item.kind)),
      explicit: asStep(item.step),
      deps: depsOf(item),
    }
  })
  const cache = new Map()
  const visiting = new Set()
  function stepOf(row) {
    if (row.explicit) return row.explicit
    if (row.id && cache.has(row.id)) return cache.get(row.id)
    if (row.id && visiting.has(row.id)) return 'waiting'
    if (row.id) visiting.add(row.id)
    let step = statusStep(row)
    if (!step) {
      if (!row.deps.length) step = 'running'
      else {
        const ready = row.deps.every(dep => {
          const target = rows.find(item => item.id === dep)
          if (target) {
            const next = stepOf(target)
            return next === 'done' || next === 'cancelled'
          }
          const decision = (Array.isArray(decisions) ? decisions : []).find(item => String(item?.id || '') === dep)
          return decision?.status === 'answered'
        })
        step = ready ? 'running' : 'waiting'
      }
    }
    if (row.id) {
      visiting.delete(row.id)
      cache.set(row.id, step)
    }
    return step
  }
  return rows.map(row => ({
    ...row,
    step: stepOf(row),
    dependsOn: row.deps,
  }))
}

function sortIds(ids) {
  return [...ids].sort(compareId)
}

function idsFrom(list) {
  return (Array.isArray(list) ? list : []).map(item => {
    if (typeof item === 'string' || typeof item === 'number') return String(item).trim()
    if (item && item.id != null) return String(item.id).trim()
    return ''
  }).filter(id => id && !/^m0$/i.test(id))
}

function boardFrom(milestones) {
  const board = Object.fromEntries(BOARD_KEYS.map(key => [key, []]))
  for (const item of milestones) {
    if (item.kind === 'plan' || /^m0$/i.test(item.id) || !item.id) continue
    if (!board[item.step]) continue
    board[item.step].push(item.id)
  }
  for (const key of BOARD_KEYS) board[key] = sortIds(board[key])
  return board
}

function readBoard(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (!BOARD_KEYS.some(key => Array.isArray(value[key]))) return null
  return Object.fromEntries(BOARD_KEYS.map(key => [key, sortIds(idsFrom(value[key]))]))
}

function readLead(value) {
  if (!value || typeof value !== 'object' || typeof value.label !== 'string' || !value.label.trim()) return null
  return {
    milestone_id: value.milestone_id == null ? '' : String(value.milestone_id),
    step: asStep(value.step) || text(value.step),
    label: value.label.trim(),
  }
}

function stageLabel(stage) {
  return STAGE_LABEL[stage] || '狀態待確認'
}

function executionLead(board, milestones, stage) {
  const ranked = []
  for (const step of Object.keys(OPEN_RANK)) {
    for (const id of board[step]) ranked.push({ id, step, rank: OPEN_RANK[step] })
  }
  if (ranked.length) {
    ranked.sort((a, b) => b.rank - a.rank || compareId(a.id, b.id))
    const top = ranked[0]
    return { milestone_id: top.id, step: top.step, label: `${top.id} ${STEP_LABEL[top.step]}` }
  }
  const tracked = milestones.filter(item => item.kind !== 'plan' && item.id && !/^m0$/i.test(item.id))
  if (tracked.length) return { milestone_id: '', step: 'done', label: '里程碑已全部完成' }
  return { milestone_id: '', step: 'running', label: stageLabel(stage) }
}

export function closureReason(milestones = [], decisions = []) {
  const rows = Array.isArray(milestones) && milestones.every(item => asStep(item?.step))
    ? milestones
    : annotateMilestones(milestones, decisions)
  const open = rows.filter(item => {
    const id = text(item?.id)
    return id && !/^m0$/i.test(id) && /^[MG]\d/i.test(id) && item.step !== 'done' && item.step !== 'cancelled' && item.kind !== 'plan'
  }).sort((a, b) => compareId(a.id, b.id))
  if (!open.length) return ''
  return `還有 ${open.length} 個里程碑未完成：${open.map(item => item.id).join('、')}`
}

export function projectFlow(building = {}, { decisions = [], stage } = {}) {
  const source = building && typeof building === 'object' ? building : {}
  const normalized = typeof stage === 'string'
    ? stage
    : normalizeStage(source.stage, source.owner_bot || source.ownerBot)
  const milestones = annotateMilestones(source.milestones, decisions)
  const nonPlan = milestones.filter(item => item.kind !== 'plan' && !/^m0$/i.test(item.id))
  const phaseGiven = text(source.flow_phase)
  const flowPhase = ['planning', 'execution', 'done'].includes(phaseGiven)
    ? phaseGiven
    : normalized === 'done'
      ? 'done'
      : normalized === 'running' && nonPlan.length
        ? 'execution'
        : 'planning'
  const m0 = milestones.find(item => item.kind === 'plan' || /^m0$/i.test(item.id))
  const planGiven = asStep(source.plan_step)
  const planStep = planGiven || (m0
    ? m0.step
    : normalized === 'assigned'
      ? 'running'
      : normalized === 'review'
        ? 'review'
        : normalized === 'hy_decision'
          ? 'hy_decision'
          : 'done')
  const board = readBoard(source.step_board) || boardFrom(milestones)
  const lead = readLead(source.lead_step) || (
    normalized === 'done' || flowPhase === 'done'
      ? { milestone_id: '', step: 'done', label: '完成' }
      : flowPhase === 'planning'
        ? { milestone_id: 'M0', step: planStep, label: stageLabel(normalized) }
        : executionLead(board, milestones, normalized)
  )
  const version = Number(source.plan?.version)
  const planVersion = Number.isFinite(version) ? version : null
  const planRedo = flowPhase === 'execution' && !!m0 && ['running', 'review', 'hy_decision'].includes(m0.step)
  return {
    milestones,
    flow_phase: flowPhase,
    plan_step: planStep,
    step_board: board,
    lead_step: lead,
    plan_version: planVersion,
    plan_redo: planRedo,
    closure_reason: closureReason(milestones),
  }
}

// 核定中→you，審查中／執行中→ai，等前置→wait，完成（含里程碑已全部完成）→done。
// 規劃期的標籤沒有步驟字時，沿用專案階段的 tone。
export function leadTone(lead, stage = '') {
  const label = text(lead?.label)
  const step = text(lead?.step)
  if (label === '完成' || label === '里程碑已全部完成' || step === 'done') return 'done'
  if (step === 'hy_decision' || label.includes('核定中')) return 'you'
  if (step === 'review' || step === 'running' || label.includes('審查中') || label.includes('執行中')) return 'ai'
  if (step === 'waiting' || label.includes('等前置') || step === 'cancelled') return 'wait'
  return STAGE_TONE[stage] || 'wait'
}

export function isMilestoneOrGateFlow(decision) {
  const flow = decision?.flow
  if (!flow || typeof flow !== 'object') return false
  const kind = text(flow.kind)
  const target = text(flow.target)
  if (kind === 'plan' || /^plan/i.test(target) || /^m0$/i.test(target)) return false
  if (kind === 'milestone' || kind === 'gate') return true
  return /^M\d+$/i.test(target) || /^G\d+$/i.test(target)
}

// 待你決定的數字＝階段已是待你決定的專案，加上還沒算進那些專案的開放卡。
// 里程碑／閘門卡即使專案已經是待你決定也要再計；規劃書卡不要重複計。
export function needsYouCount(projects = [], openDecisions = null) {
  const list = Array.isArray(projects) ? projects : []
  const hyIds = new Set(list.filter(item => item?.stage === 'hy_decision').map(item => item.id))
  const seen = new Set()
  let extra = 0
  const take = (decision, projectId) => {
    if (!decision || (decision.status && decision.status !== 'open')) return
    const id = decision.id == null ? '' : String(decision.id)
    if (id && seen.has(id)) return
    if (id) seen.add(id)
    if (isMilestoneOrGateFlow(decision) || !hyIds.has(projectId)) extra += 1
  }
  for (const project of list) for (const decision of project?.decisions || []) take(decision, project.id)
  if (Array.isArray(openDecisions)) for (const decision of openDecisions) take(decision, decision?.projectId ?? null)
  return hyIds.size + extra
}

const VERDICT_LABEL = { PASS: '通過', CONDITIONAL_PASS: '有條件 PASS', FAIL: '不通過' }
export function verdictLabel(verdict) {
  const key = text(verdict)
  return VERDICT_LABEL[key] || key
}

export function safeHttps(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

export function decisionReviewView(review) {
  if (!review || typeof review !== 'object' || Array.isArray(review)) return null
  const fileId = text(review.report_file_id)
  const direct = safeHttps(review.report_url)
  const built = !direct && /^[A-Za-z0-9_-]+$/.test(fileId)
    ? safeHttps(`https://drive.google.com/file/d/${fileId}/view`)
    : null
  return {
    verdict: text(review.verdict),
    verdictText: text(review.verdict_text),
    mustFix: (Array.isArray(review.must_fix) ? review.must_fix : []).filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()),
    reportFileId: fileId,
    reportUrl: direct || built,
  }
}

// open_project 必填：request_id、answered_by、title、goal、approved_in、project_file。
// 表單沒有專案檔路徑，用固定的 gui-open；說明進 approved_in，不另送 content／owner_bot。
const PLAN_TRACK = [
  { key: 'running', name: '規劃中', tone: 'wait' },
  { key: 'review', name: '審查中', tone: 'ai' },
  { key: 'hy_decision', name: '核定中', tone: 'you' },
]
const EXEC_TRACK = [
  { key: 'running', name: '執行中', tone: 'ai' },
  { key: 'review', name: '審查中', tone: 'ai' },
  { key: 'hy_decision', name: '核定中', tone: 'you' },
]

function cell(name, state, tone, { track = '', ids = [], caption = '' } = {}) {
  const stateText = state === 'on' ? '進行中' : state === 'passed' ? '已經過' : '尚未到'
  const idText = ids.length ? ids.join('、') : ''
  return { name, track, state, stateText, tone: state === 'on' ? tone : state === 'passed' ? 'done' : 'wait', ids, idText, caption }
}

// 開案永遠已經過。完成只在 stage=done 時亮。規劃三格跟 plan_step；執行期重寫規劃書時該格也亮。
// 執行三格：有里程碑的每一格同時亮，並標代號。
export function diagramModel(flow = {}, stage = '') {
  const phase = flow.flow_phase || 'planning'
  const done = stage === 'done'
  const planStep = flow.plan_step || ''
  const board = flow.step_board || {}
  const version = Number.isFinite(flow.plan_version) ? flow.plan_version : null
  const redo = flow.plan_redo === true
  const planIndex = PLAN_TRACK.findIndex(item => item.key === planStep)
  const planning = PLAN_TRACK.map((item, index) => {
    let state = 'idle'
    if (done || phase === 'done') state = 'passed'
    else if (phase === 'planning') {
      if (planStep === 'done') state = 'passed'
      else if (planIndex < 0) state = 'idle'
      else state = index < planIndex ? 'passed' : index === planIndex ? 'on' : 'idle'
    } else if (redo && item.key === planStep) state = 'on'
    else state = 'passed'
    return cell(item.name, state, item.tone, { track: '規劃' })
  })
  const planCaption = version != null && (phase === 'planning' || redo) ? `規劃書 v${version}` : ''
  const execution = EXEC_TRACK.map(item => {
    const ids = Array.isArray(board[item.key]) ? board[item.key] : []
    let state = 'idle'
    if (done || phase === 'done') state = 'passed'
    else if (phase === 'execution' && ids.length) state = 'on'
    return cell(item.name, state, item.tone, { track: '執行', ids })
  })
  const nodes = [
    cell('開案', 'passed', 'done', { track: '開案' }),
    ...planning,
    ...execution,
    cell('完成', done ? 'on' : 'idle', 'done', { track: '完成' }),
  ]
  const lit = nodes.filter(item => item.state === 'on').map(item => {
    const who = item.track && item.track !== '完成' ? `${item.track}${item.name}` : item.name
    return item.idText ? `${who}（${item.idText}）` : who
  })
  const waiting = Array.isArray(board.waiting) ? board.waiting : []
  const doneIds = Array.isArray(board.done) ? board.done : []
  const cancelled = Array.isArray(board.cancelled) ? board.cancelled : []
  const aria = `專案流程。開案已經過。${lit.length ? `亮著：${lit.join('、')}。` : '目前沒有進行中的格子。'}${done ? '' : '完成尚未到。'}`
  return {
    nodes,
    planning,
    execution,
    version,
    planCaption,
    aria,
    waitingText: `等前置：${waiting.length ? waiting.join('、') : '無'}`,
    doneText: `已完成 ${doneIds.length}`,
    cancelledText: cancelled.length ? `已取消 ${cancelled.length}` : '',
    cancelledIds: cancelled,
  }
}

export function openProjectBody({ request_id = '', owner_bot = '', title = '', goal = '', content = '' } = {}) {
  const note = text(content)
  return {
    request_id: String(request_id || ''),
    answered_by: text(owner_bot),
    title: text(title).slice(0, 80),
    goal: text(goal).slice(0, 300),
    approved_in: (note || 'HY 在 Bot Office 直接開案').slice(0, 200),
    project_file: 'gui-open',
  }
}
