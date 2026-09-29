import { authHeaders, ensureAccessToken, expireSession } from './auth'

// AI Work v5 控制中心的共用資料層：控制中心頁與首頁統計卡共用同一套讀取與計算，
// 確保兩邊數字一致。資料全部來自既有 /api/ai-work-packages。

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const API = `${API_BASE}/api/ai-work-packages`

export async function request(path, options = {}) {
  const ok = await ensureAccessToken()
  if (!ok) { expireSession(); throw new Error('登入已過期，請重新登入。') }
  const response = await fetch(`${API}${path}`, {
    cache: 'no-store', ...options,
    headers: { ...authHeaders(), ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
  })
  if (response.status === 401) { expireSession(); throw new Error('登入已過期，請重新登入。') }
  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))).detail
    throw new Error(typeof detail === 'string' ? detail : `伺服器回應 ${response.status}`)
  }
  return response.json()
}

// 專案列表＋待確認＋各專案明細（明細失敗的專案記為 null，不讓整體失敗）
export async function loadControlCenter() {
  const [projects, inbox] = await Promise.all([request('/projects'), request('/inbox?status=OPEN')])
  const results = await Promise.allSettled(projects.map(p => request(`/projects/${encodeURIComponent(p.id)}`)))
  const details = Object.fromEntries(results.map((r, i) => [projects[i].id, r.status === 'fulfilled' ? r.value : null]))
  return { projects, inbox, details }
}

export const openCountByProject = inbox =>
  inbox.reduce((acc, item) => ({ ...acc, [item.project_id]: (acc[item.project_id] || 0) + 1 }), {})

// 控制中心總表的統計口徑
export function summarizeControlCenter({ projects = [], inbox = [], details = {} }) {
  const openByProject = openCountByProject(inbox)
  const queue = Object.values(details).flatMap(d => d?.packages || [])
  return {
    openTotal: inbox.length,
    openProjects: Object.keys(openByProject).length,
    running: queue.filter(p => p.status === 'RUNNING').length,
    waiting: queue.filter(p => p.status === 'READY').length,
    completed: projects.filter(p => p.status === 'completed').length,
    all: projects.length,
  }
}

// 專案篩選：URL ?filter= 與控制中心頁內篩選共用同一組 key
export const FILTER_KEYS = ['all', 'open', 'active', 'completed']
export const normalizeFilter = value => FILTER_KEYS.includes(value) ? value : 'all'
