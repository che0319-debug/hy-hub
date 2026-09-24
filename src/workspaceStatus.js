export const WORKSPACE_STATUS_ORDER = ['planning', 'ai_pending', 'ai_running', 'confirmation', 'review', 'completed']

const META = {
  planning: ['規劃中', 'bg-amber-50 text-amber-700'],
  ai_pending: ['待 AI 處理', 'bg-violet-50 text-violet-700'],
  ai_running: ['AI 處理中', 'bg-blue-50 text-blue-700'],
  confirmation: ['等待確認', 'bg-red-50 text-red-700'],
  review: ['等待驗收', 'bg-emerald-50 text-emerald-700'],
  completed: ['完成', 'bg-slate-100 text-slate-700'],
}

export function workspaceStatus(project) {
  const key = project.workspaceStatus === 'in_progress' ? 'ai_pending' : project.workspaceStatus
  return { key, meta: META[key] || [key || '規劃中', 'bg-slate-100 text-slate-700'] }
}

export function workspaceStatusLabel(key) {
  return META[key]?.[0] || key
}
