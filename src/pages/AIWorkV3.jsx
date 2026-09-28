import { useEffect, useRef, useState } from 'react'
import { authHeaders, ensureAccessToken, expireSession } from '../auth'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export default function AIWorkV3({ maintenance = false }) {
  const [section, setSection] = useState('projects')
  const [inboxFilter, setInboxFilter] = useState('OPEN')
  const [inbox, setInbox] = useState([])
  const [openCount, setOpenCount] = useState(0)
  const [history, setHistory] = useState([])
  const [projects, setProjects] = useState([])
  const [projectDetail, setProjectDetail] = useState(null)
  const [packageReady, setPackageReady] = useState(false)
  const [newProject, setNewProject] = useState({ title: '', goal: '', description: '', owner_bot: 'hy' })
  const [inboxError, setInboxError] = useState('')
  const [answer, setAnswer] = useState({})
  const [files, setFiles] = useState({})
  const [submitting, setSubmitting] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [ticket, setTicket] = useState('')
  const [error, setError] = useState('')
  const form = useRef(null)
  const submitted = useRef('')
  const [frameLoaded, setFrameLoaded] = useState(false)
  const retries = useRef(0)

  async function loadInbox(filter = inboxFilter) {
    try {
      const ok = await ensureAccessToken()
      if (!ok) { expireSession(); return }
      const response = await fetch(`${API_BASE}/api/ai-work-packages/inbox?status=${filter}`, {
        headers: authHeaders(), cache: 'no-store',
      })
      if (response.status === 401) { expireSession(); return }
      if (!response.ok) throw new Error('待確認服務尚未啟用，請稍後重試。')
      const items = await response.json()
      setInbox(items)
      if (filter === 'OPEN') setOpenCount(items.length)
      setInboxError('')
    } catch (reason) { setInboxError(reason.message) }
  }

  async function loadHistory() {
    try {
      const response = await fetch(`${API_BASE}/api/ai-work-packages/history`, {
        headers: authHeaders(), cache: 'no-store',
      })
      if (!response.ok) throw new Error('工作紀錄暫時無法讀取。')
      setHistory(await response.json())
      setInboxError('')
    } catch (reason) { setInboxError(reason.message) }
  }

  async function loadProjects() {
    try {
      const response = await fetch(`${API_BASE}/api/ai-work-packages/projects`, {
        headers: authHeaders(), cache: 'no-store',
      })
      if (!response.ok) { setPackageReady(false); return }
      setProjects(await response.json())
      setPackageReady(true)
    } catch { setPackageReady(false) }
  }

  async function openProject(id) {
    try {
      const response = await fetch(`${API_BASE}/api/ai-work-packages/projects/${encodeURIComponent(id)}`, {
        headers: authHeaders(), cache: 'no-store',
      })
      if (!response.ok) throw new Error('專案資料暫時無法讀取。')
      setProjectDetail(await response.json())
      setInboxError('')
    } catch (reason) { setInboxError(reason.message) }
  }

  async function submitProject(event) {
    event.preventDefault()
    try {
      const response = await fetch(`${API_BASE}/api/ai-work-packages/projects`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProject, project_id: `project-${crypto.randomUUID()}`, references: [] }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || '建立專案失敗。')
      setNewProject({ title: '', goal: '', description: '', owner_bot: 'hy' })
      await loadProjects()
    } catch (reason) { setInboxError(reason.message) }
  }

  useEffect(() => {
    loadInbox('OPEN')
    loadProjects()
    const timer = window.setInterval(() => {
      fetch(`${API_BASE}/api/ai-work-packages/inbox?status=OPEN`, {
        headers: authHeaders(), cache: 'no-store',
      }).then(response => response.ok ? response.json() : null)
        .then(items => { if (items) setOpenCount(items.length) }).catch(() => {})
    }, 30000)
    return () => window.clearInterval(timer)
  }, [])

  async function submitAction(item, value) {
    setSubmitting(item.action_id)
    try {
      const attachments = []
      for (const file of files[item.action_id] || []) {
        if (file.size > 8 * 1024 * 1024) throw new Error('單一附件上限為 8 MB。')
        const bytes = new Uint8Array(await file.arrayBuffer())
        let binary = ''
        for (let offset = 0; offset < bytes.length; offset += 32768) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768))
        }
        const upload = await fetch(`${API_BASE}/api/ai-work-packages/inbox/${encodeURIComponent(item.action_id)}/attachments`, {
          method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_key: crypto.randomUUID(), filename: file.name,
            mime_type: file.type || 'application/octet-stream', data_base64: btoa(binary) }),
        })
        if (!upload.ok) throw new Error((await upload.json().catch(() => ({}))).detail || '附件上傳失敗。')
        attachments.push((await upload.json()).file_id)
      }
      const response = await fetch(`${API_BASE}/api/ai-work-packages/inbox/${encodeURIComponent(item.action_id)}/resolve`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: value, attachments,
          ...(value === 'APPROVED' && item.plan ? { plan: item.plan } : {}) }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || '提交失敗，請重試。')
      setAnswer(previous => ({ ...previous, [item.action_id]: '' }))
      setFiles(previous => ({ ...previous, [item.action_id]: [] }))
      await loadInbox(inboxFilter)
      if (inboxFilter !== 'OPEN') {
        const response = await fetch(`${API_BASE}/api/ai-work-packages/inbox?status=OPEN`, {
          headers: authHeaders(), cache: 'no-store',
        })
        if (response.ok) setOpenCount((await response.json()).length)
      }
    } catch (reason) { setInboxError(reason.message) }
    finally { setSubmitting('') }
  }

  useEffect(() => {
    let active = true
    setTicket(''); setError(''); setFrameLoaded(false); submitted.current = ''
    ensureAccessToken().then(ok => {
      if (!ok) { if (active) expireSession(); return null }
      return fetch(`${API_BASE}/api/ai-work-v3/session`, {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: '{}', cache: 'no-store',
      })
    }).then(async response => {
      if (!response) return
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

  useEffect(() => {
    if (!ticket || frameLoaded) return
    const timer = window.setTimeout(() => {
      if (retries.current < 1) {
        retries.current += 1
        setAttempt(value => value + 1)
      } else {
        setError('AI Work 畫面未載入，請按重新連線；本次沒有執行或核准工作。')
      }
    }, 12000)
    return () => window.clearTimeout(timer)
  }, [ticket, frameLoaded])

  function frameLoad(event) {
    if (!submitted.current) return
    try {
      if (event.currentTarget.contentWindow?.location.href === 'about:blank') return
    } catch {
      // The V3 page is on the separate, expected API origin.
    }
    setFrameLoaded(true)
    retries.current = 0
  }

  return <section className="flex h-full min-h-0 flex-col bg-white" aria-labelledby="ai-work-v3-title">
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2 pl-14 md:pl-6">
      <h1 id="ai-work-v3-title" className="font-semibold">AI Work</h1>
      <nav className="flex gap-2" aria-label="AI Work">
        <button type="button" aria-current={section === 'projects' ? 'page' : undefined}
          className={`min-h-11 rounded-md px-3 ${section === 'projects' ? 'bg-slate-900 text-white' : 'border'}`}
          onClick={() => { setSection('projects'); loadProjects() }}>專案</button>
        <button type="button" aria-current={section === 'inbox' ? 'page' : undefined}
          className={`min-h-11 rounded-md px-3 ${section === 'inbox' ? 'bg-slate-900 text-white' : 'border'}`}
          onClick={() => { setSection('inbox'); loadInbox(inboxFilter) }}>待確認 {openCount ? ` ${openCount}` : ''}</button>
        <button type="button" aria-current={section === 'history' ? 'page' : undefined}
          className={`min-h-11 rounded-md px-3 ${section === 'history' ? 'bg-slate-900 text-white' : 'border'}`}
          onClick={() => { setSection('history'); loadHistory() }}>工作紀錄</button>
      </nav>
      {maintenance && ticket && <a className="min-h-11 rounded-md border px-3 py-2" href={`${API_BASE}/ai-work-v3/ui/legacy-reset`} target="ai-work-v3-frame">檢查舊案清除清單</a>}
      <button type="button" className="min-h-11 rounded-md border px-3" onClick={() => { retries.current = 0; setAttempt(value => value + 1) }}>重新連線</button>
    </header>
    {section === 'projects' && packageReady && <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {inboxError && <p role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-900">{inboxError}</p>}
        {projectDetail ? <>
          <button type="button" className="min-h-11 rounded-md border bg-white px-4" onClick={() => setProjectDetail(null)}>← 所有專案</button>
          <section className="rounded-xl border bg-white p-5">
            <h2 className="text-xl font-semibold">{projectDetail.title}</h2>
            <p className="mt-2 whitespace-pre-wrap">{projectDetail.goal}</p>
            <p className="mt-3 text-sm text-slate-600">{projectDetail.phase} · {projectDetail.milestone_id || '規劃中'} · {projectDetail.status} · 負責 Bot：{projectDetail.owner_bot}</p>
          </section>
          {projectDetail.packages.map(item => <article key={item.id} className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-600">{item.milestone_id || '規劃期'} · {item.executor} · {item.status}</p>
            <h3 className="mt-2 font-semibold">{item.task}</h3>
            {item.result?.summary && <p className="mt-2">{item.result.summary}</p>}
            {item.result?.reason && <p className="mt-2">{item.result.reason}</p>}
          </article>)}
        </> : <>
          <details className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">＋ 新增專案</summary>
            <form className="mt-4 flex flex-col gap-3" onSubmit={submitProject}>
              <label>名稱<input required maxLength={200} className="mt-1 block w-full rounded-md border p-3" value={newProject.title} onChange={event => setNewProject(p => ({ ...p, title: event.target.value }))} /></label>
              <label>目標<textarea required className="mt-1 block min-h-28 w-full rounded-md border p-3" value={newProject.goal} onChange={event => setNewProject(p => ({ ...p, goal: event.target.value }))} /></label>
              <label>說明<textarea className="mt-1 block min-h-20 w-full rounded-md border p-3" value={newProject.description} onChange={event => setNewProject(p => ({ ...p, description: event.target.value }))} /></label>
              <label>負責 Bot<select className="mt-1 block w-full rounded-md border p-3" value={newProject.owner_bot} onChange={event => setNewProject(p => ({ ...p, owner_bot: event.target.value }))}>
                <option value="hy">HY</option><option value="950157">950157</option><option value="sam">Sam</option><option value="family">小櫻</option>
              </select></label>
              <button type="submit" className="min-h-11 self-start rounded-md bg-slate-900 px-4 text-white">建立專案並排入規劃工作包</button>
            </form>
          </details>
          {projects.map(item => <button key={item.id} type="button" onClick={() => openProject(item.id)}
            className="block w-full rounded-xl border bg-white p-5 text-left shadow-sm">
            <span className="font-semibold">{item.title}</span>
            <span className="ml-3 text-sm text-slate-600">{item.phase} · {item.milestone_id || '規劃中'} · {item.status} · {item.owner_bot}</span>
          </button>)}
          {projects.length === 0 && <p className="rounded-xl border bg-white p-5">目前沒有新架構專案。</p>}
        </>}
      </div>
    </div>}
    {section === 'projects' && !packageReady && error && <p role="alert" className="m-4 rounded-lg bg-amber-50 p-4 text-amber-900">{error}</p>}
    {section === 'projects' && !packageReady && !ticket && !error && <p role="status" className="p-4">確認 HY Life OS 登入…</p>}
    {section === 'projects' && !packageReady && ticket && !frameLoaded && !error && <p role="status" className="p-4">正在載入 AI Work 專案清單…</p>}
    {section === 'history' && <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-3">
        {inboxError && <p role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-900">{inboxError}</p>}
        {!inboxError && history.length === 0 && <p className="rounded-lg border bg-white p-5">目前沒有工作包紀錄。</p>}
        {history.map(item => <article key={item.work_package_id} className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-600">{item.project_title} · {item.milestone_id || '規劃期'} · {item.executor}</p>
          <h2 className="mt-2 font-semibold">{item.task}</h2>
          <p className="mt-2 text-sm">{item.status} · 第 {item.attempt} 次執行</p>
          {item.result?.summary && <p className="mt-2">{item.result.summary}</p>}
          {item.result?.reason && <p className="mt-2">{item.result.reason}</p>}
        </article>)}
      </div>
    </div>}
    {section === 'inbox' && <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {['OPEN', 'RESOLVED', 'ALL'].map(filter => <button key={filter} type="button"
            className={`min-h-11 rounded-md px-4 ${inboxFilter === filter ? 'bg-slate-900 text-white' : 'border bg-white'}`}
            onClick={() => { setInboxFilter(filter); loadInbox(filter) }}>
            {{ OPEN: '待處理', RESOLVED: '已處理', ALL: '全部' }[filter]}
          </button>)}
        </div>
        {inboxError && <p role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-900">{inboxError}</p>}
        {!inboxError && inbox.length === 0 && <p className="rounded-lg border bg-white p-5">目前沒有符合條件的待確認事項。</p>}
        {inbox.map(item => <article key={item.action_id} className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <strong className="text-slate-900">{item.project_title}</strong>
            <span>{item.milestone_id || '規劃期'}</span><span>｜{item.action_type}</span>
            <span className="ml-auto">{new Date(item.created_at * 1000).toLocaleString('zh-TW')}</span>
          </div>
          <h2 className="mt-3 font-semibold">{item.title}</h2>
          <p className="mt-2">{item.question}</p>
          <p className="mt-2 text-sm text-slate-600">原因：{item.reason}</p>
          <p className="mt-1 text-sm text-slate-600">指派：{item.assigned_to} · {item.authority_mode === 'OWNER_ONLY' ? '僅本人' : '可代理'} · {item.status === 'OPEN' ? '待處理' : '已處理'}</p>
          {item.plan && <details className="mt-3 rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer">查看規劃書 DRAFT</summary><pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(item.plan, null, 2)}</pre></details>}
          {item.status === 'OPEN' && (item.action_type === 'PLAN_APPROVAL' ?
            <div className="mt-4 flex gap-2"><button type="button" disabled={!!submitting || !item.plan}
              className="min-h-11 rounded-md bg-slate-900 px-4 text-white disabled:opacity-50"
              onClick={() => submitAction(item, 'APPROVED')}>核准規劃</button>
              <button type="button" disabled={!!submitting} className="min-h-11 rounded-md border px-4"
                onClick={() => submitAction(item, 'REVISE')}>要求修改</button></div> :
            <form className="mt-4 flex flex-col gap-2" onSubmit={event => { event.preventDefault(); submitAction(item, answer[item.action_id]) }}>
              <label htmlFor={`answer-${item.action_id}`}>回答</label>
              <textarea id={`answer-${item.action_id}`} required className="min-h-24 rounded-md border p-3"
                value={answer[item.action_id] || ''} onChange={event => setAnswer(previous => ({ ...previous, [item.action_id]: event.target.value }))} />
              <label>附件<input type="file" multiple className="mt-1 block" onChange={event =>
                setFiles(previous => ({ ...previous, [item.action_id]: Array.from(event.target.files || []) }))} /></label>
              <button type="submit" disabled={!!submitting} className="min-h-11 self-start rounded-md bg-slate-900 px-4 text-white disabled:opacity-50">提交</button>
            </form>)}
        </article>)}
      </div>
    </div>}
    <form ref={form} method="post" action={`${API_BASE}/ai-work-v3/ui/hy-login`} target="ai-work-v3-frame" hidden>
      <input name="ticket" type="hidden" value={ticket} readOnly />
    </form>
    <iframe key={attempt} name="ai-work-v3-frame" title="AI Work 操作區"
      className={`min-h-0 w-full flex-1 border-0 bg-white ${section !== 'projects' || packageReady ? 'hidden' : ''}`} src="about:blank"
      sandbox="allow-forms allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" onLoad={frameLoad} />
  </section>
}
