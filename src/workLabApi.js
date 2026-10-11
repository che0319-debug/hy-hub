import { authHeaders, expireSession, isAuthFailure } from './auth'

const BASE = (import.meta.env.VITE_API_BASE || '') + '/api/work-lab'

// 示意資料只在開發或以 VITE_WORK_LAB_MOCK=1 建置時啟用，正式站永遠打後端。
export const MOCK = import.meta.env.DEV && new URLSearchParams(location.hash.split('?')[1] || '').get('mock') === '1'
  || import.meta.env.VITE_WORK_LAB_MOCK === '1'

async function call(path, { method = 'GET', body, params } = {}) {
  if (MOCK) {
    const { mockCall } = await import('./mock/workLabMock.js')
    return mockCall(path, { method, body, params })
  }
  const qs = params ? '?' + new URLSearchParams(params) : ''
  const res = await fetch(`${BASE}${path}${qs}`, {
    method,
    headers: { ...authHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (isAuthFailure(res.status)) expireSession()
  if (!res.ok) {
    const d = data.detail
    throw new Error((d && (d.message || d)) || `連線失敗（${res.status}）`)
  }
  return data
}

export const wl = {
  overview: () => call('/overview'),
  project: pid => call(`/projects/${pid}`),
  createProject: body => call('/projects', { method: 'POST', body }),
  updateProject: (pid, body) => call(`/projects/${pid}`, { method: 'PATCH', body }),
  decide: (pid, did, answer, comment = '') => call(`/projects/${pid}/decisions/${did}`, { method: 'POST', body: { answer, comment } }),
  feedback: (pid, target, text) => call(`/projects/${pid}/feedback`, { method: 'POST', body: { target, text } }),
  resolveFeedback: (pid, fid, action, text = '') => call(`/projects/${pid}/feedback/${fid}`, { method: 'POST', body: { action, text } }),
  rate: (pid, tid, body) => call(`/projects/${pid}/tasks/${tid}/rating`, { method: 'POST', body }),
  file: path => call('/file', { params: { path } }),
  skills: () => call('/skills'),
  decideSkill: (id, approve) => call(`/skills/proposals/${id}`, { method: 'POST', body: { approve } }),
}
