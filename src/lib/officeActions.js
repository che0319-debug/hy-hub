// AI Office 待 HY 確認的事項（/api/ai-office/actions）。「待我決定」頁與底部導覽的數字共用。
import { authHeaders, ensureAccessToken, expireSession } from '../auth'

const base = () => (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function get(path) {
  if (!await ensureAccessToken()) { expireSession(); throw new Error('登入已過期') }
  const r = await fetch(`${base()}/api/ai-office${path}`, { cache: 'no-cache', headers: authHeaders() })
  if (r.status === 401) { expireSession(); throw new Error('登入已過期') }
  if (!r.ok) throw new Error(`伺服器回應 ${r.status}`)
  return r.json()
}

// 口徑與 OfficeHome 一致：有專案、指派給 HY／owner、狀態 OPEN
export const isMine = a => a && a.project_id && a.status === 'OPEN' && ['owner', 'HY'].includes(a.assigned_to)

export async function loadOfficeActions() {
  const [actions, projects] = await Promise.all([get('/actions'), get('/projects').catch(() => [])])
  const title = Object.fromEntries((Array.isArray(projects) ? projects : []).map(p => [p.id, p.title]))
  return (Array.isArray(actions) ? actions : []).filter(isMine).map(a => ({ id: a.action_id, title: a.title || '待確認', question: a.question || '', projectTitle: title[a.project_id] || '', type: a.action_type, at: a.created_at }))
}
