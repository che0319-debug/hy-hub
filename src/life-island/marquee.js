// Life 島頂部跑馬燈：把 Bot Office 已經載入的專案整理成一列文字。不打網路。
import { isMilestoneDone, milestoneProgress, officeMilestones } from '../lib/botOfficeView.mjs'
import { compareId, isPlanMilestone } from '../lib/officeFlow.mjs'
import { STAGE_LABEL, normalizeStage } from '../lib/projectStages.mjs'
import { officeProjectPath } from './projectBuilding.mjs'

const RUNNING = new Set(['running', 'in_progress', 'in-progress', 'active', 'doing', 'started', '執行中', '進行中'])
const CANCELLED = new Set(['cancelled', 'canceled', '已取消', '取消'])

const text = value => (typeof value === 'string' ? value.trim() : '')

function milestoneRows(project) {
  const raw = Array.isArray(project?.source?.milestones)
    ? project.source.milestones
    : Array.isArray(project?.milestones) ? project.milestones : []
  return officeMilestones({ milestones: raw }).filter(row => row && !isPlanMilestone(row))
}

function isRunningMilestone(row) {
  const status = text(row?.status)
  const step = text(row?.step)
  return RUNNING.has(status) || RUNNING.has(status.toLowerCase()) || step === 'running'
}

function isCancelled(row) {
  const status = text(row?.status)
  const step = text(row?.step)
  return CANCELLED.has(status) || CANCELLED.has(status.toLowerCase()) || step === 'cancelled' || step === 'canceled'
}

// 執行中：有標成執行中的里程碑時，取編號最前面的那一個（M4 與 M6 都在跑 → M6）。
// 都還沒標執行中時，取第一個未完成的，畫面上仍寫「M4 執行中」。
export function runningStageText(rows) {
  const list = Array.isArray(rows) ? rows : []
  const open = list.filter(row => row?.id && !isMilestoneDone(row) && !isCancelled(row))
  const running = open.filter(isRunningMilestone)
  if (running.length) {
    const best = running.slice().sort((a, b) => compareId(a.id, b.id)).at(-1)
    return `${best.id} 執行中`
  }
  if (open.length) {
    const first = open.slice().sort((a, b) => compareId(a.id, b.id))[0]
    return `${first.id} 執行中`
  }
  return '執行中'
}

export function marqueeStageText(stage, rows) {
  if (stage === 'running') return runningStageText(rows)
  return STAGE_LABEL[stage] || '狀態待確認'
}

export function buildMarqueeItems(projects) {
  const list = Array.isArray(projects) ? projects : []
  const ranked = []
  list.forEach((project, index) => {
    if (!project || typeof project !== 'object') return
    const stage = normalizeStage(text(project.stage), text(project.ownerBot) || text(project.owner_bot))
    const rows = milestoneRows(project)
    const progress = milestoneProgress(rows)
    const id = project.id == null ? '' : String(project.id).trim()
    const title = text(project.title) || '未命名專案'
    const stageText = marqueeStageText(stage, rows)
    const progressText = `${progress.done}/${progress.total}`
    ranked.push({
      index,
      finished: stage === 'done',
      item: {
        id,
        title,
        stage,
        stageText,
        progress: progressText,
        line: `${title} · ${stageText} · ${progressText}`,
        href: id ? officeProjectPath(id) : '/bot-office',
      },
    })
  })
  ranked.sort((a, b) => Number(a.finished) - Number(b.finished) || a.index - b.index)
  return ranked.map(row => row.item)
}
