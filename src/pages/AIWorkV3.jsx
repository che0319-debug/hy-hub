import { useEffect, useRef, useState } from 'react'
import { authHeaders, expireSession } from '../auth'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export default function AIWorkV3({ maintenance = false }) {
  const [attempt, setAttempt] = useState(0)
  const [ticket, setTicket] = useState('')
  const [error, setError] = useState('')
  const form = useRef(null)
  const submitted = useRef('')

  useEffect(() => {
    let active = true
    setTicket(''); setError(''); submitted.current = ''
    fetch(`${API_BASE}/api/ai-work-v3/session`, {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: '{}', cache: 'no-store',
    }).then(async response => {
      if (response.status === 401) { if (active) expireSession(); return }
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ticket) throw new Error('AI Work 連線未完成，請重新連線；尚未執行或核准工作。')
      if (active) setTicket(result.ticket)
    }).catch(reason => { if (active) setError(reason.message) })
    return () => { active = false }
  }, [attempt])

  useEffect(() => {
    if (ticket && submitted.current !== ticket && form.current) {
      submitted.current = ticket
      form.current.submit()
    }
  }, [ticket])

  return <section className="flex h-full min-h-0 flex-col bg-white" aria-labelledby="ai-work-v3-title">
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2 pl-14 md:pl-6">
      <h1 id="ai-work-v3-title" className="font-semibold">AI Work</h1>
      {maintenance && ticket && <a className="min-h-11 rounded-md border px-3 py-2" href={`${API_BASE}/ai-work-v3/ui/legacy-reset`} target="ai-work-v3-frame">檢查舊案清除清單</a>}
      <button type="button" className="min-h-11 rounded-md border px-3" onClick={() => setAttempt(value => value + 1)}>重新連線</button>
    </header>
    {error && <p role="alert" className="m-4 rounded-lg bg-amber-50 p-4 text-amber-900">{error}</p>}
    {!ticket && !error && <p role="status" className="p-4">確認 HY Life OS 登入…</p>}
    <form ref={form} method="post" action={`${API_BASE}/ai-work-v3/ui/hy-login`} target="ai-work-v3-frame" hidden>
      <input name="ticket" type="hidden" value={ticket} readOnly />
    </form>
    <iframe key={attempt} name="ai-work-v3-frame" title="AI Work 操作區"
      className="min-h-0 w-full flex-1 border-0 bg-white" src="about:blank"
      sandbox="allow-forms allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" />
  </section>
}
