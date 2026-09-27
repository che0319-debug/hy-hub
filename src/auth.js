const API_BASE = import.meta.env.VITE_API_BASE || ''
const TOKEN_KEY = 'hy_life_os_access_token'
const LEGACY_TOKEN_KEY = 'hy_world_access_token'
export const AUTH_EXPIRED_EVENT = 'hy-auth-expired'

export function getAccessToken() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) return token

  const legacyToken = sessionStorage.getItem(LEGACY_TOKEN_KEY)
  if (legacyToken) {
    sessionStorage.setItem(TOKEN_KEY, legacyToken)
    sessionStorage.removeItem(LEGACY_TOKEN_KEY)
  }
  return legacyToken || ''
}

export function setAccessToken(token) {
  sessionStorage.removeItem(LEGACY_TOKEN_KEY)
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(LEGACY_TOKEN_KEY)
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

export function tokenSecondsRemaining(token = getAccessToken()) {
  if (!token) return 0
  try {
    const payload = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')
    const expiry = JSON.parse(atob(payload)).exp
    return Number.isFinite(expiry) ? expiry - Math.floor(Date.now() / 1000) : 0
  } catch { return 0 }
}

let refreshInFlight = null
export function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST', credentials: 'include', cache: 'no-store',
    }).then(async response => {
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.accessToken) return false
      setAccessToken(data.accessToken)
      return true
    }).catch(() => false).finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

export async function ensureAccessToken(minSeconds = 120) {
  if (tokenSecondsRemaining() > minSeconds) return true
  return refreshAccessToken()
}

export async function loginWithPassword(password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
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
  if (token && tokenSecondsRemaining(token) > 120) {
    const res = await fetch(`${API_BASE}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    })
    if (res.ok) return true
  }
  const restored = await refreshAccessToken()
  if (!restored) clearAccessToken()
  return restored
}
