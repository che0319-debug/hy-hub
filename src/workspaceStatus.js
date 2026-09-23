export const WORKSPACE_STATUS_ORDER = [
  'planning',
  'ai_pending',
  'ai_running',
  'confirmation',
  'review',
  'completed',
]

const META = {
  planning: ['規劃中', 'bg-amber-50 text-amber-700'],
  ai_pending: ['待 AI 處理', 'bg-violet-50 text-violet-700'],
  ai_running: ['AI 處理中', 'bg-blue-50 text-blue-700'],
  confirmation: ['等待確認', 'bg-red-50 text-red-700'],
  review: ['等待驗收', 'bg-emerald-50 text-emerald-700'],
  completed: ['完成', 'bg-slate-100 text-slate-700'],
}

export function workspaceStatus(project) {
  if (project.workspaceStatus === 'completed')
    return { key: 'completed', meta: META.completed }
  if (project.workspaceStatus === 'review')
    return { key: 'review', meta: META.review }
  const approved = project.projectPlan?.approvalStatus === 'approved'
  const analysis = approved ? null : project.planAnalysis?.status
  const work = project.latestWork?.status
  if (
    (!approved && project.planAnalysis?.candidate?.needsClarification) ||
    ['needs_clarification', 'waiting_approval'].includes(work)
  )
    return { key: 'confirmation', meta: META.confirmation }
  if (approved && work === 'succeeded' && project.currentMilestoneId)
    return { key: 'confirmation', meta: META.confirmation }
  if (
    ['running', 'in_progress'].includes(analysis) ||
    ['running', 'in_progress'].includes(work)
  )
    return { key: 'ai_running', meta: META.ai_running }
  if (
    ['queued', 'claimed'].includes(analysis) ||
    ['queued', 'claimed'].includes(work)
  )
    return { key: 'ai_pending', meta: META.ai_pending }
  if (
    !approved && project.planAnalysis?.candidate &&
    project.projectPlan?.approvalStatus !== 'approved'
  )
    return { key: 'confirmation', meta: META.confirmation }
  if (project.projectPlan?.approvalStatus !== 'approved')
    return { key: 'planning', meta: META.planning }
  return { key: 'ai_pending', meta: META.ai_pending }
}

export function workspaceStatusLabel(key) {
  return META[key]?.[0] || key
}
