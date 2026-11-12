// 看板 ↔ Office 專案的可選關聯。沒寫就不猜，舊資料不會自動補上。
import { HELPERS } from '../botRoster.js'

const ID_LIMIT = 80
const text = value => (typeof value === 'string' ? value.trim() : '')
const BOT_OF_SOURCE = Object.fromEntries(HELPERS.map(h => [h.source, h.agent]))

export function officeProjectIdOf(obj) {
  const id = text(obj?.office_project_id)
  return id && id.length <= ID_LIMIT ? id : ''
}

export function kanbanSourceOf(project) {
  const raw = project?.kanbanSource || project?.source?.kanban_source || project?.kanban_source
  if (!raw || typeof raw !== 'object') return null
  const bot = text(raw.bot)
  if (!HELPERS.some(h => h.agent === bot)) return null
  const out = { bot }
  const projectId = text(raw.project_id)
  const projectName = text(raw.project_name)
  if (projectId && projectId.length <= ID_LIMIT) out.project_id = projectId
  if (projectName && projectName.length <= ID_LIMIT) out.project_name = projectName
  if (!out.project_id && !out.project_name) return null
  return out
}

export function linkedOfficeProjectId(todo, projects = []) {
  const list = Array.isArray(projects) ? projects : []
  const known = new Set(list.map(p => p?.id).filter(Boolean))
  const fromTodo = officeProjectIdOf(todo)
  if (fromTodo && (!known.size || known.has(fromTodo))) return fromTodo
  const bot = BOT_OF_SOURCE[todo?._source] || ''
  const name = typeof todo?._project === 'string' ? todo._project : ''
  const boardId = typeof todo?._projectId === 'string' ? todo._projectId : ''
  for (const project of list) {
    const source = kanbanSourceOf(project)
    if (!source) continue
    if (bot && source.bot !== bot) continue
    if (source.project_id && source.project_id === boardId) return project.id
    if (source.project_name && source.project_name === name) return project.id
  }
  return ''
}

const normDue = due => (due ? String(due).replace(/\//g, '-') : '')

export function kanbanTodosForOffice(todos, projects, today) {
  if (!Array.isArray(todos) || !today) return []
  const out = []
  for (const m of todos) {
    const due = normDue(m.due)
    if (!due) continue
    const kind = due < today ? 'overdue' : due === today ? 'today' : ''
    if (!kind) continue
    const projectId = linkedOfficeProjectId(m, projects)
    if (!projectId) continue
    out.push({
      id: `td:${m._source || ''}:${m.title}:${due}`,
      projectId, kind, title: m.title, due,
      source: m._source || '',
      projectName: m._project || '',
    })
  }
  return out
}

export function kanbanTodosForProject(todos, projectId) {
  return (todos || []).filter(t => t.projectId === projectId)
}

export function isOfficeHealthItem(item) {
  return item?.kind === 'problem'
}

export function officePendingItems(items = []) {
  // Office 首頁只掛「有專案的核示」。健康問題、沒關聯的看板待辦、行程、舊小案卡都不進專案列表。
  return items.filter(it => it.kind === 'decide' && it.projectId && !it.isItem && !it.light)
}

export function extractKanbanMilestones(payload, getProjects, source) {
  const out = []
  for (const p of getProjects(payload) || []) {
    const projectLink = officeProjectIdOf(p)
    const projectId = typeof p.id === 'string' ? p.id : ''
    const projectName = typeof p.name === 'string' ? p.name : ''
    for (const m of p.milestones || []) {
      const isCompleted = Boolean(m.completed)
        || ['done', 'cancelled'].includes(String(m.execute_status || '').toLowerCase())
      if (isCompleted) continue
      out.push({
        title: m.title,
        due: m.due || '',
        _source: source,
        _project: projectName,
        _projectId: projectId,
        office_project_id: officeProjectIdOf(m) || projectLink,
      })
    }
  }
  return out
}
