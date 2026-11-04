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

export const MARQUEE_INTERVAL_MS = 4000

// 一次只顯示一則。暫停或只有一則時停在原位，否則前進一格並繞回開頭。
export function advanceMarquee(index, count, paused = false) {
  const total = Number(count) || 0
  if (total <= 0) return 0
  const current = ((Number(index) || 0) % total + total) % total
  if (paused || total < 2) return current
  return (current + 1) % total
}

export function marqueeCaption(item) {
  if (!item || typeof item !== 'object') return ''
  const title = text(item.title) || '未命名專案'
  const stageText = text(item.stageText) || '狀態待確認'
  const progress = text(item.progress) || '0/0'
  // FE0E 讓 ▶ 用文字字形，避免系統把它畫成彩色表情符號。
  return `▶\uFE0E ${title} ${stageText} ${progress}`
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
