import { authHeaders, expireSession, isAuthFailure } from './auth'
const BASE = `${import.meta.env.VITE_API_BASE || ''}/api/life-os/v1/command-center`

export class AuthenticationExpiredError extends Error {
  constructor() {
    super('登入已過期，請重新登入')
    this.name = 'AuthenticationExpiredError'
  }
}

function rejectExpiredSession(status) {
  if (!isAuthFailure(status)) return
  expireSession()
  throw new AuthenticationExpiredError()
}

// Fetch streaming supports the existing bearer header; credentials never enter URLs.
export async function followExecution({ signal, onSnapshot, onState }) {
  const response = await fetch(`${BASE}/stream`, { headers: authHeaders(), cache: 'no-store', signal })
  rejectExpiredSession(response.status)
  if (!response.ok) throw new Error(`連線失敗 (${response.status})`)
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('伺服器尚未提供事件串流')
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let buffer = ''
  try {
    while (!signal.aborted) {
      let watchdog
      let packet
      try {
        packet = await Promise.race([
          reader.read(),
          new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error('超過 45 秒未收到串流訊號，正在重新連線')), 45000) }),
        ])
      } finally { clearTimeout(watchdog) }
      const { done, value } = packet
      if (done) throw new Error('連線中斷，正在重新連線')
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      let end
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2)
        const type = frame.split('\n').find(x => x.startsWith('event:'))?.slice(6).trim()
        const raw = frame.split('\n').filter(x => x.startsWith('data:')).map(x => x.slice(5).trimStart()).join('\n')
        if (type === 'snapshot') { onSnapshot(JSON.parse(raw)); onState('live') }
        if (type === 'unavailable') onState('stale')
        if (type === 'auth_expired') {
          expireSession()
          throw new AuthenticationExpiredError()
        }
      }
    }
  } finally { await reader.cancel().catch(() => {}) }
}

export async function readExecutionFallback(signal) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/life-os/v1/context`, {
    headers: authHeaders(), cache: 'no-store', signal,
  })
  rejectExpiredSession(response.status)
  if (!response.ok) throw new Error(`狀態快照讀取失敗 (${response.status})`)
  return response.json()
}
