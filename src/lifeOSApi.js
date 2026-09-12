import { authHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function fetchAutonomousPlans({ owner = '950157', status = 'waiting_approval' } = {}) {
  const params = new URLSearchParams()
  if (owner) params.set('owner', owner)
  if (status) params.set('status', status)
  const res = await fetch(`${API_BASE}/api/life-os/v1/autonomous-plans?${params}`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok || !result.ok) throw new Error(result.error || `fetchAutonomousPlans failed: ${res.status}`)
  return result.plans || []
}

export async function decideAutonomousPlan(planId, decision, note = '') {
  const res = await fetch(`${API_BASE}/api/life-os/v1/autonomous-plans/${encodeURIComponent(planId)}/decision`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, note }),
  })
  const text = await res.text()
  let result = {}
  try { result = text ? JSON.parse(text) : {} } catch { result = { error: text } }
  if (!res.ok || !result.ok) throw new Error(result.error || `decideAutonomousPlan failed: ${res.status}`)
  return result
}
