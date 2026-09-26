export const WORKSPACE_STATUS_ORDER = ['ai_pending', 'ai_running', 'confirmation', 'completed']

const META = {
  ai_pending: ['待 AI 處理', 'bg-violet-50 text-violet-700'],
  ai_running: ['AI 處理中', 'bg-blue-50 text-blue-700'],
  confirmation: ['等待確認', 'bg-red-50 text-red-700'],
  completed: ['完成', 'bg-slate-100 text-slate-700'],
}

export function workspaceStatus(project) {
  const raw = project?.workspaceStatus
  const key = raw === 'review' ? 'confirmation' : ['planning', 'in_progress'].includes(raw) ? 'ai_pending' : META[raw] ? raw : 'ai_pending'
  return { key, meta: META[key] }
}

export function workspaceStatusLabel(key) {
  return META[key === 'review' ? 'confirmation' : key]?.[0] || META.ai_pending[0]
}
