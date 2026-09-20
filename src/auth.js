const API_BASE = import.meta.env.VITE_API_BASE || ''
const TOKEN_KEY = 'hy_world_access_token'
export const AUTH_EXPIRED_EVENT = 'hy-auth-expired'

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

export function setAccessToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

export function expireSession() {
  clearAccessToken()
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}

export function authHeaders() {
  const token = getAccessToken()
  if (token) return { Authorization: `Bearer ${token}` }

  return {}
}

export function isAuthFailure(status) {
  return status === 401 || status === 403
}

export async function loginWithPassword(password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.accessToken) {
    const error = new Error(data.error || '登入失敗')
    error.status = res.status
    throw error
  }
  setAccessToken(data.accessToken)
  return data
}

export async function validateSession() {
  const token = getAccessToken()
  if (!token) return false
  const res = await fetch(`${API_BASE}/api/auth/session`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    clearAccessToken()
    return false
  }
  return true
}
