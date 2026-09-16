import { authHeaders } from './auth'
const BASE = `${import.meta.env.VITE_API_BASE || ''}/api/life-os/v1/command-center`

// Fetch streaming supports the existing bearer header; credentials never enter URLs.
export async function followExecution({ signal, onSnapshot, onState }) {
  const response = await fetch(`${BASE}/stream`, { headers: authHeaders(), cache: 'no-store', signal })
  if (!response.ok) throw new Error(response.status === 401 ? '登入已過期，請重新登入' : `連線失敗 (${response.status})`)
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('伺服器尚未提供事件串流')
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let buffer = ''
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) throw new Error('連線中斷，正在重新連線')
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      let end
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2)
        const type = frame.split('\n').find(x => x.startsWith('event:'))?.slice(6).trim()
        const raw = frame.split('\n').filter(x => x.startsWith('data:')).map(x => x.slice(5).trimStart()).join('\n')
        if (type === 'snapshot') { onSnapshot(JSON.parse(raw)); onState('live') }
        if (type === 'unavailable') onState('stale')
        if (type === 'auth_expired') throw new Error('登入已過期，請重新登入')
      }
    }
  } finally { await reader.cancel().catch(() => {}) }
}
