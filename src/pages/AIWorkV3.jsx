import { useEffect, useState } from 'react'
import { authHeaders, ensureAccessToken, expireSession } from '../auth'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export default function AIWorkV3({ maintenance = false }) {
  const [section, setSection] = useState('projects')
  const [projectTab, setProjectTab] = useState('goal')
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
  const [referenceDraft, setReferenceDraft] = useState({ title: '', url: '' })
  const [projectUpload, setProjectUpload] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [goalDraft, setGoalDraft] = useState(null)
  const [revisionFeedback, setRevisionFeedback] = useState({})

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
      setProjectTab('goal')
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

  async function submitReference(event) {
    event.preventDefault()
    if (!projectDetail) return
    setSubmitting('reference')
    try {
      const response = await fetch(`${API_BASE}/api/ai-work-packages/projects/${encodeURIComponent(projectDetail.id)}/references`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(referenceDraft),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || '參考連結登錄失敗。')
      setReferenceDraft({ title: '', url: '' })
      await openProject(projectDetail.id)
      setProjectTab('folders')
    } catch (reason) { setInboxError(reason.message) }
    finally { setSubmitting('') }
  }

  async function uploadProjectFile(event) {
    event.preventDefault()
    if (!projectDetail || !projectUpload) return
    setSubmitting('project-file')
    try {
      if (projectUpload.size > 8 * 1024 * 1024) throw new Error('單一附件上限為 8 MB。')
      const bytes = new Uint8Array(await projectUpload.arrayBuffer())
      let binary = ''
      for (let offset = 0; offset < bytes.length; offset += 32768) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768))
      }
      const response = await fetch(`${API_BASE}/api/ai-work-packages/projects/${encodeURIComponent(projectDetail.id)}/files`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_key:crypto.randomUUID(), filename:projectUpload.name,
          mime_type:projectUpload.type || 'application/octet-stream', data_base64:btoa(binary) }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || '檔案上傳失敗。')
      setProjectUpload(null)
      await openProject(projectDetail.id)
      setProjectTab('folders')
    } catch (reason) { setInboxError(reason.message) }
    finally { setSubmitting('') }
  }

  async function submitNote(event) {
    event.preventDefault()
    if (!projectDetail) return
    setSubmitting('note')
    try {
      const response = await fetch(`${API_BASE}/api/ai-work-packages/projects/${encodeURIComponent(projectDetail.id)}/notes`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content:noteDraft }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || '工作日誌寫入失敗。')
      setNoteDraft('')
      await openProject(projectDetail.id)
      setProjectTab('log')
    } catch (reason) { setInboxError(reason.message) }
    finally { setSubmitting('') }
  }

  async function submitGoal(event) {
    event.preventDefault()
    if (!projectDetail || !goalDraft) return
    setSubmitting('goal')
    try {
      const response = await fetch(`${API_BASE}/api/ai-work-packages/projects/${encodeURIComponent(projectDetail.id)}/goal`, {
        method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(goalDraft),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || '專案目標修訂失敗。')
      setGoalDraft(null)
      await openProject(projectDetail.id)
      await loadInbox('OPEN')
      await loadProjects()
    } catch (reason) { setInboxError(reason.message) }
    finally { setSubmitting('') }
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
        body: JSON.stringify({ answer: value === 'REVISE' ? { decision:'REVISE', feedback:revisionFeedback[item.action_id]?.trim() || '' } : value, attachments,
          ...(value === 'APPROVED' && item.plan ? { plan: item.plan } : {}) }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || '提交失敗，請重試。')
      setAnswer(previous => ({ ...previous, [item.action_id]: '' }))
      setFiles(previous => ({ ...previous, [item.action_id]: [] }))
      await loadInbox(inboxFilter)
      await loadProjects()
      if (projectDetail?.id === item.project_id) await openProject(item.project_id)
      if (inboxFilter !== 'OPEN') {
        const response = await fetch(`${API_BASE}/api/ai-work-packages/inbox?status=OPEN`, {
          headers: authHeaders(), cache: 'no-store',
        })
        if (response.ok) setOpenCount((await response.json()).length)
      }
    } catch (reason) { setInboxError(reason.message) }
    finally { setSubmitting('') }
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
      {maintenance && <span className="text-xs text-slate-500">維護模式</span>}
    </header>
    {section === 'projects' && <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {inboxError && <p role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-900">{inboxError}</p>}
        {!packageReady && <p role="status" className="rounded-lg border bg-white p-5">專案資料暫時無法讀取，請重新整理。</p>}
        {packageReady && (projectDetail ? <>
          <button type="button" className="text-blue-700 underline" onClick={() => setProjectDetail(null)}>← AI Work</button>
          <div className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{projectDetail.title}</h2>
              <p className="text-sm">負責 {projectDetail.owner_bot}　{projectDetail.phase} {projectDetail.milestone_id || ''}　
                <span className="rounded bg-amber-100 px-2 py-1">{statusText(projectDetail.status)}</span></p>
            </div>
            <p className="mt-3 text-sm text-slate-600">目前：{currentSituation(projectDetail)}　｜　下一步：{nextStep(projectDetail)}</p>
            {projectDetail.actions?.some(a => a.status === 'OPEN') && <button type="button" className="mt-4 w-full rounded-lg bg-amber-50 p-4 text-left text-amber-900" onClick={() => { setSection('inbox'); loadInbox('OPEN') }}>
              待你確認：{projectDetail.actions.filter(a => a.status === 'OPEN').length} 項　查看待確認 →
            </button>}
            <nav className="mt-5 flex flex-wrap border-b" aria-label="專案分頁">
              {[['goal','專案目標'],['spec','開發規格'],['log','開發日誌'],['folders','資料夾']].map(([key,label]) =>
                <button key={key} type="button" className={`min-h-11 px-5 ${projectTab === key ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-slate-600'}`} onClick={() => setProjectTab(key)}>{label}</button>)}
            </nav>
            {projectTab === 'goal' && <section className="space-y-3 py-5"><h3 className="text-lg font-semibold">專案目標</h3><p className="whitespace-pre-wrap">{projectDetail.goal}</p>{projectDetail.description && <p className="text-sm text-slate-600">{projectDetail.description}</p>}
              {projectDetail.plan_state === 'DRAFT' ? (goalDraft ? <form onSubmit={submitGoal} className="space-y-3 rounded-lg border p-4">
                <label className="block">目標<textarea required maxLength={30000} className="mt-1 block min-h-36 w-full rounded border p-3" value={goalDraft.goal} onChange={e => setGoalDraft(v => ({...v,goal:e.target.value}))} /></label>
                <label className="block">說明<textarea maxLength={10000} className="mt-1 block min-h-20 w-full rounded border p-3" value={goalDraft.description} onChange={e => setGoalDraft(v => ({...v,description:e.target.value}))} /></label>
                <p className="text-sm text-slate-600">儲存後 HY 會保留既有成果，並讓同一規劃工作包依新目標重出草案。</p>
                <button disabled={!!submitting} className="min-h-11 rounded bg-slate-900 px-4 text-white">儲存目標</button>
                <button type="button" className="ml-2 min-h-11 rounded border px-4" onClick={() => setGoalDraft(null)}>取消</button>
              </form> : <button type="button" className="min-h-11 rounded border px-4" onClick={() => setGoalDraft({goal:projectDetail.goal,description:projectDetail.description || ''})}>編輯專案目標</button>) : <p className="text-sm text-slate-600">已核准計畫的規格變更需重新規劃與確認。</p>}
            </section>}
            {projectTab === 'spec' && <section className="space-y-5 py-5">
              <h3 className="text-lg font-semibold">執行規劃書 · {projectDetail.plan_state === 'APPROVED' ? 'APPROVED' : 'DRAFT'}</h3>
              {projectDetail.packages.some(p => p.type === 'PROJECT_PLANNING' && p.status !== 'COMPLETED' && p.result?.plan) && <p className="rounded bg-amber-50 p-3 text-amber-900">以下為保留的前版草案；規劃工作包正在依修訂意見重新處理，尚不可核准此版本。</p>}
              {planFor(projectDetail) ? <PlanView plan={planFor(projectDetail)} /> : <p>規劃工作包尚未交件。</p>}
              <h3 className="text-lg font-semibold">工作包</h3>
              <div className="space-y-3">{projectDetail.packages.map(item => <article key={item.id} className="rounded-lg border p-4">
                <p className="text-xs text-slate-500">{item.milestone_id || '規劃期'} · {item.executor} · {item.status}</p>
                <h4 className="mt-1 font-semibold">{item.task}</h4>
                {item.result?.summary && <p className="mt-2 whitespace-pre-wrap">{item.result.summary}</p>}
                {item.result?.reason && <p className="mt-2">{item.result.reason}</p>}
              </article>)}</div>
            </section>}
            {projectTab === 'log' && <section className="space-y-3 py-5"><h3 className="text-lg font-semibold">工作紀錄</h3>
              <form onSubmit={submitNote} className="rounded-lg border p-4"><label className="block font-semibold">新增工作日誌<textarea required maxLength={10000} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} className="mt-2 block min-h-24 w-full rounded border p-3" /></label><button disabled={!!submitting} className="mt-3 min-h-11 rounded bg-slate-900 px-4 text-white disabled:opacity-50">寫入日誌</button></form>
              {projectDetail.notes?.map(note => <article key={note.id} className="rounded-lg border p-4"><p className="text-xs text-slate-500">{note.author} · {new Date(note.created_at * 1000).toLocaleString('zh-TW')}</p><p className="mt-2 whitespace-pre-wrap">{note.content}</p></article>)}
              {projectDetail.packages.map(item => <article key={item.id} className="border-b py-3"><b>{item.task}</b><p className="text-sm text-slate-600">{item.milestone_id || '規劃期'} · {item.status} · 第 {item.attempt} 次執行</p>{item.result?.summary && <p>{item.result.summary}</p>}</article>)}
            </section>}
            {projectTab === 'folders' && <FolderView project={projectDetail} draft={referenceDraft} setDraft={setReferenceDraft} onSubmit={submitReference} file={projectUpload} setFile={setProjectUpload} onUpload={uploadProjectFile} submitting={!!submitting} />}
          </div>
        </> : <>
          <div className="rounded-xl border bg-white p-5">
            <details><summary className="cursor-pointer font-semibold">＋ 新增專案</summary>
              <form className="mt-4 flex flex-col gap-3" onSubmit={submitProject}>
                <label>名稱<input required maxLength={200} className="mt-1 block w-full rounded-md border p-3" value={newProject.title} onChange={event => setNewProject(p => ({ ...p, title: event.target.value }))} /></label>
                <label>目標<textarea required className="mt-1 block min-h-28 w-full rounded-md border p-3" value={newProject.goal} onChange={event => setNewProject(p => ({ ...p, goal: event.target.value }))} /></label>
                <label>說明<textarea className="mt-1 block min-h-20 w-full rounded-md border p-3" value={newProject.description} onChange={event => setNewProject(p => ({ ...p, description: event.target.value }))} /></label>
                <label>負責 Bot<select className="mt-1 block w-full rounded-md border p-3" value={newProject.owner_bot} onChange={event => setNewProject(p => ({ ...p, owner_bot: event.target.value }))}>
                  <option value="hy">HY</option><option value="950157">950157</option><option value="sam">Sam</option><option value="family">小櫻</option>
                </select></label>
                <button type="submit" className="min-h-11 self-start rounded-md bg-slate-900 px-4 text-white">建立專案</button>
              </form>
            </details>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">{[['ai_pending','待 AI 處理'],['ai_running','進行中'],['confirmation','等待確認'],['completed','完成'],['all','全部專案']].map(([key,label]) =>
            <div key={key} className="rounded-lg border bg-white p-3"><strong>{key === 'all' ? projects.length : projects.filter(p => p.status === key).length}</strong><p className="text-sm">{label}</p></div>)}</div>
          <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50"><tr>{['專案／Phase','負責 Bot','狀態','目前狀況','下一步'].map(x => <th key={x} className="p-4">{x}</th>)}</tr></thead>
            <tbody>{projects.map(item => <tr key={item.id} className="border-t align-top"><td className="p-4"><button type="button" className="font-semibold text-blue-700 underline" onClick={() => openProject(item.id)}>{item.title}</button><p className="mt-1 text-slate-500">{item.phase} {item.milestone_id || ''}</p></td><td className="p-4">{item.owner_bot}</td><td className="p-4">{statusText(item.status)}</td><td className="p-4">{currentSituation(item)}</td><td className="p-4">{nextStep(item)}</td></tr>)}</tbody>
          </table>{projects.length === 0 && <p className="p-5">目前沒有專案。</p>}</div>
        </>)}
      </div>
    </div>}
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
            <div className="mt-4 space-y-2"><label className="block">修改意見<textarea className="mt-1 block min-h-20 w-full rounded border p-3" value={revisionFeedback[item.action_id] || ''} onChange={e => setRevisionFeedback(v => ({...v,[item.action_id]:e.target.value}))} /></label><div className="flex gap-2"><button type="button" disabled={!!submitting || !item.plan}
              className="min-h-11 rounded-md bg-slate-900 px-4 text-white disabled:opacity-50"
              onClick={() => submitAction(item, 'APPROVED')}>核准規劃</button>
              <button type="button" disabled={!!submitting || !revisionFeedback[item.action_id]?.trim()} className="min-h-11 rounded-md border px-4 disabled:opacity-50"
                onClick={() => submitAction(item, 'REVISE')}>要求修改</button></div></div> :
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
  </section>
}

const statusText = status => ({ ai_pending: '待 AI 處理', ai_running: '進行中', confirmation: '等待確認', completed: '完成' }[status] || status)
const currentSituation = project => project.status === 'confirmation' ? '有成果或資料待確認' :
  project.status === 'ai_running' ? '工作包執行中' : project.status === 'completed' ? '所有里程碑已完成' : '工作包等待 AI 領取'
const nextStep = project => project.status === 'confirmation' ? '到待確認處理事項' :
  project.status === 'completed' ? '查看成果' : '依工作包佇列執行'
const planFor = project => project.plan || project.packages?.find(p => p.type === 'PROJECT_PLANNING')?.result?.plan

function PlanView({ plan }) {
  return <div className="space-y-4 text-sm">
    <p>{plan.goal}</p>
    {plan.scope?.length > 0 && <div><h4 className="font-semibold">執行範圍</h4><ul className="list-disc pl-6">{plan.scope.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
    {plan.milestones?.map(m => <article key={m.id} className="rounded-lg border p-4"><h4 className="font-semibold">{m.id}｜{m.name}</h4>
      <p className="mt-2">成果</p><ul className="list-disc pl-6">{m.deliverables?.map((x, i) => <li key={i}>{x}</li>)}</ul>
      <p className="mt-2">驗收</p><ul className="list-disc pl-6">{m.acceptance_criteria?.map((x, i) => <li key={i}>{x}</li>)}</ul>
      <p className="mt-2 text-slate-600">依賴：{m.dependencies?.join('、') || '無'}</p></article>)}
    {plan.missing_inputs?.length > 0 && <div><h4 className="font-semibold">待補資料</h4><ul className="list-disc pl-6">{plan.missing_inputs.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
    {plan.risks?.length > 0 && <div><h4 className="font-semibold">風險</h4><ul className="list-disc pl-6">{plan.risks.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
  </div>
}

function FolderView({ project, draft, setDraft, onSubmit, file, setFile, onUpload, submitting }) {
  const reported = project.references?.find(r => r.type === 'v3_input')?.data?.drive_upload_location_report
  const folderId = project.folder?.folder_id || reported?.folder_id
  const links = project.references?.filter(r => r.data?.url) || []
  return <section className="space-y-6 py-5">
    <h3 className="text-lg font-semibold">資料夾</h3>
    <div className="rounded-lg border p-4"><h4 className="font-semibold">一、專案位置</h4>
      {folderId ? <a className="mt-3 inline-block text-blue-700 underline" href={`https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`} target="_blank" rel="noreferrer">本案 Google Drive 資料夾</a> : <p className="mt-3">尚無已登錄的專案資料夾。</p>}
      {folderId && !project.folder?.verified && <p className="mt-2 text-sm text-amber-800">操作者回報位置，尚未經 HY 後端讀回驗證。</p>}
    </div>
    <div className="rounded-lg border p-4"><h4 className="font-semibold">二、參考資料</h4>
      {links.length ? links.map((r,i) => <p key={i} className="mt-2"><a href={r.data.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{r.data.title || r.data.url}</a></p>) : <p className="mt-2 text-slate-600">尚未登錄參考連結。</p>}
      <form className="mt-4 flex flex-wrap gap-2" onSubmit={onSubmit}>
        <input aria-label="參考資料名稱" placeholder="名稱" value={draft.title} onChange={e => setDraft(v => ({ ...v, title:e.target.value }))} className="min-h-11 rounded border p-2" />
        <input aria-label="參考資料網址" required type="url" pattern="https://.*" placeholder="https://…" value={draft.url} onChange={e => setDraft(v => ({ ...v, url:e.target.value }))} className="min-h-11 min-w-64 flex-1 rounded border p-2" />
        <button disabled={submitting} type="submit" className="min-h-11 rounded border px-3 disabled:opacity-50">＋ 新增參考連結</button>
      </form>
    </div>
    <div className="rounded-lg border p-4"><h4 className="font-semibold">三、交付成果</h4>
      {project.files?.length ? project.files.map(file => <p key={file.file_id} className="mt-2"><a href={`https://drive.google.com/file/d/${encodeURIComponent(file.file_id)}/view`} target="_blank" rel="noreferrer" className="text-blue-700 underline">{file.filename}</a> · v{file.revision} · {file.source}</p>) : <p className="mt-2 text-slate-600">新工作包尚無登錄成果檔案。</p>}
      <form className="mt-4 flex flex-wrap items-center gap-2" onSubmit={onUpload}>
        <label>上傳專案檔案<input type="file" className="mt-1 block" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
        <button disabled={!file || submitting} className="min-h-11 rounded border px-3 disabled:opacity-50">上傳至本案 Drive</button>
      </form>
    </div>
  </section>
}
