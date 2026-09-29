import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSearchParams } from 'react-router-dom'
import { request, loadControlCenter, openCountByProject, summarizeControlCenter, normalizeFilter } from '../aiWorkV5Data'
import './control-center-v5.css'

// AI Work 控制中心（v5 介面，第一版）
// 兩層式：專案總表 → 單一專案（概況／待確認／規劃書／產出／工作紀錄）。
// 資料全部來自既有 /api/ai-work-packages（讀取與統計共用 aiWorkV5Data，首頁卡片同源）；
// v5 新增的後端能力（Codex 額度、事件紀錄、事實庫）接通前不顯示，也不以假資料代替。

const PROJECT_STATUS = {
  ai_pending: { label: '待 AI 處理', tone: 'gray' },
  ai_running: { label: '進行中', tone: 'blue' },
  confirmation: { label: '等待確認', tone: 'amber' },
  completed: { label: '完成', tone: 'green' },
}
const PACKAGE_STATUS = {
  WAITING: { label: '等待前置', tone: 'gray' },
  READY: { label: '排隊中', tone: 'gray' },
  RUNNING: { label: '執行中', tone: 'blue' },
  BLOCKED: { label: '卡住', tone: 'amber' },
  COMPLETED: { label: '完成', tone: 'green' },
  FAILED: { label: '失敗', tone: 'red' },
}
const ACTION_TYPE = {
  PLAN_APPROVAL: '核准規劃書',
  MILESTONE_REVIEW: 'Milestone 驗收',
  SUPPLEMENT: '補資料',
  CAPABILITY_GAP: '能力不足',
  CHOICE: '選方案',
  EXTERNAL_ACTION: '對外行動',
}
const EXECUTORS = { GPT_CHAT: 'GPT', CHATGPT_WORK: 'ChatGPT Work', CODEX: 'Codex' }
const TABS = [['overview', '概況'], ['inbox', '待確認'], ['plan', '規劃書'], ['outputs', '產出'], ['log', '工作紀錄']]
const FILTERS = [['all', '全部'], ['open', '待確認'], ['active', '進行中'], ['completed', '完成']]

const isWorkPackage = p => p.type !== 'PROJECT_PLANNING' && p.type !== 'REVISION'
const planOf = project => project?.plan || project?.packages?.find(p => p.type === 'PROJECT_PLANNING')?.result?.plan || null
const time = seconds => seconds ? new Date(seconds * 1000).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ''
const dayKey = seconds => seconds ? new Date(seconds * 1000).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' }) : '時間不明'
const firstLine = text => String(text || '').split('\n')[0]

function progressOf(project) {
  const work = (project?.packages || []).filter(isWorkPackage)
  return { done: work.filter(p => p.status === 'COMPLETED').length, total: work.length }
}

function situation(project, openCount) {
  const packages = project?.packages || []
  const running = packages.find(p => p.status === 'RUNNING')
  const ready = packages.find(p => p.status === 'READY')
  if (project?.status === 'completed') return { now: '所有 Milestone 已完成', next: '查看產出' }
  if (running) return { now: `執行中：${firstLine(running.task)}`, next: openCount ? `處理 ${openCount} 項待確認` : '等待執行結果' }
  if (openCount) return { now: `有 ${openCount} 項待你確認`, next: '到「待確認」處理' }
  if (ready) return { now: `排隊中：${firstLine(ready.task)}`, next: '等待 AI 領取' }
  if (!project?.packages) return { now: '讀取中…', next: '' }
  return { now: '沒有可執行的工作包', next: '檢查規劃書或依賴' }
}

function Pill({ tone = 'gray', children }) {
  return <span className="cc5-pill" data-tone={tone}>{children}</span>
}

function Bar({ done, total }) {
  const pct = total ? Math.round(done / total * 100) : 0
  return <div className="cc5-bar-row">
    <div className="cc5-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="工作包進度"><div style={{ width: `${pct}%` }} /></div>
    <span>WP {done}/{total}</span>
  </div>
}

export default function ControlCenterV5() {
  const [projects, setProjects] = useState([])
  const [details, setDetails] = useState({})
  const [inbox, setInbox] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = normalizeFilter(searchParams.get('filter'))
  const setFilter = key => setSearchParams(key === 'all' ? {} : { filter: key }, { replace: true })
  const [openId, setOpenId] = useState(null)
  const [tab, setTab] = useState('overview')

  const loadAll = useCallback(async () => {
    try {
      const data = await loadControlCenter()
      setProjects(data.projects)
      setInbox(data.inbox)
      setDetails(data.details)
      setError('')
    } catch (reason) { setError(reason.message) }
    finally { setLoaded(true) }
  }, [])

  const reloadProject = useCallback(async id => {
    try {
      const [detail, open] = await Promise.all([request(`/projects/${encodeURIComponent(id)}`), request('/inbox?status=OPEN')])
      setDetails(prev => ({ ...prev, [id]: detail }))
      setInbox(open)
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: detail.status, phase: detail.phase, milestone_id: detail.milestone_id } : p))
    } catch (reason) { setError(reason.message) }
  }, [])

  useEffect(() => {
    loadAll()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') loadAll() }, 60000)
    return () => window.clearInterval(timer)
  }, [loadAll])

  const openByProject = useMemo(() => openCountByProject(inbox), [inbox])
  const project = openId ? { ...projects.find(p => p.id === openId), ...(details[openId] || {}) } : null

  if (project?.id) {
    return <section className="cc5" aria-labelledby="cc5-project-title">
      <ProjectView project={project} tab={tab} setTab={setTab} openItems={inbox.filter(i => i.project_id === project.id)}
        onBack={() => { setOpenId(null); setTab('overview') }} onChanged={() => reloadProject(project.id)} error={error} setError={setError}
        onDeleted={() => { setOpenId(null); setTab('overview'); loadAll() }} />
    </section>
  }

  const { openTotal, openProjects, running, waiting } = summarizeControlCenter({ projects, inbox, details })
  const rank = p => (openByProject[p.id] ? 0 : p.status === 'completed' ? 2 : 1)
  const visible = projects
    .filter(p => filter === 'all' || (filter === 'open' ? openByProject[p.id] : filter === 'completed' ? p.status === 'completed' : p.status !== 'completed'))
    .sort((a, b) => rank(a) - rank(b))

  return <section className="cc5" aria-labelledby="cc5-title">
    <header className="cc5-head">
      <div><span className="cc5-kicker">HY Life OS</span><h1 id="cc5-title">AI Work 控制中心</h1></div>
      <button type="button" className="cc5-btn" onClick={loadAll}>重新整理</button>
    </header>

    {error && <p role="alert" className="cc5-alert">{error}</p>}

    <div className="cc5-summary">
      <button type="button" className="cc5-card cc5-card-amber" onClick={() => setFilter('open')}>
        <span className="cc5-label">待確認</span>
        <strong>{openTotal}</strong>
        <span className="cc5-muted">分布在 {openProjects} 個專案</span>
      </button>
      <div className="cc5-card">
        <span className="cc5-label">執行佇列</span>
        <strong>{running}<small> 執行中</small></strong>
        <span className="cc5-muted">{waiting} 個排隊中</span>
      </div>
    </div>

    <div role="group" aria-label="篩選專案" className="cc5-chips">
      {FILTERS.map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
    </div>

    <h2 className="cc5-section">專案 <span>{visible.length}</span></h2>
    {!loaded && <p className="cc5-empty" role="status">讀取中…</p>}
    {loaded && !visible.length && !error && <p className="cc5-empty">沒有符合條件的專案。</p>}
    <div className="cc5-list">
      {visible.map(p => {
        const d = details[p.id]
        const open = openByProject[p.id] || 0
        const s = situation(d || p, open)
        const status = PROJECT_STATUS[p.status] || { label: p.status, tone: 'gray' }
        return <button type="button" key={p.id} className="cc5-project" data-open={open > 0} onClick={() => { setOpenId(p.id); setTab(open ? 'inbox' : 'overview') }}>
          <span className="cc5-row"><b>{p.title}</b><Pill tone={status.tone}>{status.label}</Pill></span>
          <span className="cc5-muted">{p.phase}{p.milestone_id ? ` ${p.milestone_id}` : ''}・負責 {p.owner_bot}</span>
          <span className="cc5-line"><em>目前</em>{s.now}</span>
          {s.next && <span className="cc5-line"><em>下一步</em>{s.next}</span>}
          {d && <Bar {...progressOf(d)} />}
          {open > 0 && <span className="cc5-open">待確認 {open} 項</span>}
        </button>
      })}
    </div>
  </section>
}

function ProjectView({ project, tab, setTab, openItems, onBack, onChanged, error, setError, onDeleted }) {
  const status = PROJECT_STATUS[project.status] || { label: project.status, tone: 'gray' }
  const plan = planOf(project)
  return <>
    <button type="button" className="cc5-back" onClick={onBack}>‹ 全部專案</button>
    <div className="cc5-row cc5-title-row"><h1 id="cc5-project-title">{project.title}</h1><Pill tone={status.tone}>{status.label}</Pill></div>
    <p className="cc5-muted">{project.phase}{project.milestone_id ? ` ${project.milestone_id}` : ''}・規劃書 {project.plan_state === 'APPROVED' ? '已核准' : '草稿'}{project.plan_revision ? ` v${project.plan_revision}` : ''}・負責 {project.owner_bot}</p>

    <nav className="cc5-tabs" aria-label="專案分頁">
      {TABS.map(([key, label]) => <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>
        {label}{key === 'inbox' && openItems.length > 0 && <span className="cc5-count">{openItems.length}</span>}
      </button>)}
    </nav>

    {error && <p role="alert" className="cc5-alert">{error}</p>}
    {!project.packages && <p className="cc5-empty" role="status">讀取中…</p>}
    {project.packages && <>
      {tab === 'overview' && <>
        <SuggestionBox project={project} onChanged={onChanged} setError={setError} />
        <Overview project={project} plan={plan} openCount={openItems.length} goInbox={() => setTab('inbox')} />
        <DeleteZone project={project} onDeleted={onDeleted} />
      </>}
      {tab === 'inbox' && <>
        <SuggestionBox project={project} onChanged={onChanged} setError={setError} />
        <Inbox items={openItems} onChanged={onChanged} setError={setError} />
      </>}
      {tab === 'plan' && <PlanTab project={project} plan={plan} />}
      {tab === 'outputs' && <Outputs project={project} />}
      {tab === 'log' && <WorkLog project={project} />}
    </>}
  </>
}

function milestoneRows(project, plan) {
  const packages = (project.packages || []).filter(isWorkPackage)
  const ids = plan?.milestones?.map(m => m.id) || [...new Set(packages.map(p => p.milestone_id).filter(Boolean))]
  return ids.map(id => {
    const meta = plan?.milestones?.find(m => m.id === id) || {}
    const list = packages.filter(p => p.milestone_id === id)
    const done = list.filter(p => p.status === 'COMPLETED').length
    const state = list.length && done === list.length ? 'done' : list.some(p => ['READY', 'RUNNING', 'BLOCKED', 'COMPLETED', 'FAILED'].includes(p.status)) ? 'active' : 'waiting'
    return { id, name: meta.name || '', meta, list, done, state }
  })
}

function Overview({ project, plan, openCount, goInbox }) {
  const s = situation(project, openCount)
  const rows = milestoneRows(project, plan)
  // Missing inputs live in the inbox as project-level 補資料 items; they never block AI work.
  const missing = (project.actions || []).filter(a => !a.work_package_id && a.action_type === 'SUPPLEMENT')
  return <div className="cc5-stack">
    <section className="cc5-panel">
      <h2 className="cc5-label">Goal</h2>
      <details className="cc5-goal"><summary>{plan?.goal || firstLine(project.goal).replace(/^#+\s*/, '')}</summary>
        <div className="cc5-md"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{project.goal || ''}</ReactMarkdown></div>
      </details>
    </section>
    <section className="cc5-panel">
      <div><h2 className="cc5-label">目前狀況</h2><p>{s.now}</p></div>
      <hr />
      <div><h2 className="cc5-label">下一步</h2><p>{s.next}</p></div>
      {openCount > 0 && <button type="button" className="cc5-link" onClick={goInbox}>去待確認處理 ›</button>}
    </section>
    <section className="cc5-panel">
      <h2 className="cc5-h">Milestones</h2>
      {!rows.length && <p className="cc5-muted">規劃書核准後才會產生 Milestone。</p>}
      {rows.map(m => <div key={m.id} className="cc5-ms">
        <div className="cc5-row"><span><b>{m.id}</b> {m.name}</span>
          <span className="cc5-small" data-tone={m.state === 'done' ? 'green' : m.state === 'active' ? 'blue' : 'gray'}>{m.state === 'done' ? '完成' : m.state === 'active' ? '進行中' : '未展開'}・{m.done}/{m.list.length}</span></div>
        {m.list.length > 0 && <div className="cc5-bar"><div style={{ width: `${Math.round(m.done / m.list.length * 100)}%` }} /></div>}
      </div>)}
    </section>
    {missing.length > 0 && <section className="cc5-panel">
      <div className="cc5-row"><h2 className="cc5-h">待補資料</h2>
        <span className="cc5-small">{missing.filter(a => a.status === 'OPEN').length} 項待補・不影響 AI 推進</span></div>
      {missing.map(a => <div key={a.action_id} className="cc5-row">
        <span className="cc5-line">{a.title}</span>
        <Pill tone={a.status === 'OPEN' ? 'amber' : 'green'}>{a.status === 'OPEN' ? '待補' : '已補'}</Pill>
      </div>)}
      {missing.some(a => a.status === 'OPEN') && <button type="button" className="cc5-link" onClick={goInbox}>到待確認補資料 ›</button>}
    </section>}
  </div>
}

function Inbox({ items, onChanged, setError }) {
  const [answer, setAnswer] = useState({})
  const [feedback, setFeedback] = useState({})
  const [busy, setBusy] = useState('')

  async function resolve(item, value) {
    setBusy(item.action_id)
    try {
      const body = value === 'REVISE'
        ? { answer: { decision: 'REVISE', feedback: (feedback[item.action_id] || '').trim() }, attachments: [] }
        : { answer: value, attachments: [], ...(value === 'APPROVED' && item.plan ? { plan: item.plan } : {}) }
      await request(`/inbox/${encodeURIComponent(item.action_id)}/resolve`, { method: 'POST', body: JSON.stringify(body) })
      setAnswer(v => ({ ...v, [item.action_id]: '' }))
      setFeedback(v => ({ ...v, [item.action_id]: '' }))
      await onChanged()
    } catch (reason) { setError(reason.message) }
    finally { setBusy('') }
  }

  if (!items.length) return <p className="cc5-empty">這個專案目前沒有待確認事項，其他工作包照常執行中。</p>
  return <div className="cc5-stack">
    <p className="cc5-muted">待確認不會擋住沒有依賴的工作包。</p>
    {items.map(item => {
      const approval = item.action_type === 'PLAN_APPROVAL' || item.action_type === 'MILESTONE_REVIEW'
      return <article key={item.action_id} className="cc5-panel">
        <div className="cc5-tags">
          <span className="cc5-tag">{ACTION_TYPE[item.action_type] || item.action_type}</span>
          {item.milestone_id && <span className="cc5-tag">{item.milestone_id}</span>}
          <span className="cc5-small">{time(item.created_at)}</span>
        </div>
        <h2 className="cc5-q">{item.title}</h2>
        {item.question && item.question !== item.title && <p className="cc5-pre">{item.question}</p>}
        {item.reason && <p className="cc5-muted cc5-pre">{item.reason}</p>}
        {item.plan && <details className="cc5-sub"><summary>查看規劃書草稿</summary><PlanBody plan={item.plan} /></details>}
        {approval ? <>
          <label className="cc5-field">修改意見（要求修改時必填）
            <textarea value={feedback[item.action_id] || ''} onChange={e => setFeedback(v => ({ ...v, [item.action_id]: e.target.value }))} /></label>
          <div className="cc5-two">
            <button type="button" className="cc5-primary" disabled={!!busy || (item.action_type === 'PLAN_APPROVAL' && !item.plan)} onClick={() => resolve(item, 'APPROVED')}>核准</button>
            <button type="button" className="cc5-btn" disabled={!!busy || !(feedback[item.action_id] || '').trim()} onClick={() => resolve(item, 'REVISE')}>要求修改</button>
          </div>
        </> : <form className="cc5-form" onSubmit={e => { e.preventDefault(); resolve(item, answer[item.action_id]) }}>
          <label className="cc5-field" htmlFor={`cc5-answer-${item.action_id}`}>你的回答</label>
          <textarea id={`cc5-answer-${item.action_id}`} required value={answer[item.action_id] || ''} onChange={e => setAnswer(v => ({ ...v, [item.action_id]: e.target.value }))} />
          <button type="submit" className="cc5-primary" disabled={!!busy}>送出</button>
        </form>}
      </article>
    })}
  </div>
}

function PlanBody({ plan }) {
  return <div className="cc5-stack cc5-plan">
    {plan.goal && <p>{plan.goal}</p>}
    {plan.scope?.length > 0 && <div><h3 className="cc5-label">範圍</h3><ul className="cc5-ul">{plan.scope.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
    {plan.risks?.length > 0 && <div><h3 className="cc5-label">風險</h3><ul className="cc5-ul">{plan.risks.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
  </div>
}

function PlanTab({ project, plan }) {
  const rows = milestoneRows(project, plan)
  if (!plan) return <p className="cc5-empty">規劃工作包尚未交件。</p>
  return <div className="cc5-stack">
    <div className="cc5-panel cc5-row">
      <div><b>規劃書{project.plan_revision ? ` v${project.plan_revision}` : ''}</b> <Pill tone={project.plan_state === 'APPROVED' ? 'green' : 'amber'}>{project.plan_state === 'APPROVED' ? '已核准' : '草稿'}</Pill></div>
      {project.plan_history?.length > 0 && <span className="cc5-small">先前版本 {project.plan_history.length}</span>}
    </div>
    <section className="cc5-panel"><PlanBody plan={{ goal: plan.goal, scope: plan.scope }} /></section>
    {rows.map((m, index) => <details key={m.id} className="cc5-panel cc5-ms-detail" open={m.state === 'active' || (index === 0 && !rows.some(r => r.state === 'active'))}>
      <summary><span><b>{m.id}</b> {m.name}</span><span className="cc5-small">{m.state === 'done' ? '完成' : m.state === 'active' ? '進行中' : '未展開'}・WP {m.done}/{m.list.length}</span></summary>
      {m.meta.deliverables?.length > 0 && <><h3 className="cc5-label">成果</h3><ul className="cc5-ul">{m.meta.deliverables.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
      {m.meta.acceptance_criteria?.length > 0 && <><h3 className="cc5-label">驗收標準</h3><ul className="cc5-ul">{m.meta.acceptance_criteria.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
      {m.list.length > 0 && <><h3 className="cc5-label">工作包</h3>
        <ul className="cc5-wp">{m.list.map(p => { const st = PACKAGE_STATUS[p.status] || { label: p.status, tone: 'gray' }; return <li key={p.id}><span>{firstLine(p.task)}</span><Pill tone={st.tone}>{st.label}</Pill></li> })}</ul></>}
    </details>)}
    {plan.risks?.length > 0 && <section className="cc5-panel"><h2 className="cc5-h">風險</h2><ul className="cc5-ul">{plan.risks.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
  </div>
}

function Outputs({ project }) {
  const done = (project.packages || []).filter(p => isWorkPackage(p) && p.result?.status === 'COMPLETED')
  // Same fallback as V3: the operator-reported folder until HY has verified one.
  const reported = project.references?.find(r => r.type === 'v3_input')?.data?.drive_upload_location_report
  const folderId = project.folder?.folder_id || reported?.folder_id
  return <div className="cc5-stack">
    {!project.folder && project.folder_error && <p className="cc5-small">HY 尚未驗證此資料夾（{project.folder_error}）</p>}
    {folderId && <a className="cc5-btn cc5-block" href={`https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`} target="_blank" rel="noreferrer">開啟專案的 Drive 資料夾</a>}
    {project.files?.length > 0 && <section className="cc5-panel">
      <h2 className="cc5-h">檔案</h2>
      {project.files.map(file => <a key={file.file_id} className="cc5-file" href={`https://drive.google.com/file/d/${encodeURIComponent(file.file_id)}/view`} target="_blank" rel="noreferrer">
        <span><b>{file.filename}</b><small>v{file.revision}・{file.source}</small></span><span aria-hidden="true">›</span></a>)}
    </section>}
    {done.map(p => <details key={p.id} className="cc5-panel">
      <summary className="cc5-row"><span><b>{firstLine(p.task)}</b><small className="cc5-muted"> {p.milestone_id}</small></span><Pill tone="green">完成</Pill></summary>
      {p.result.summary && <p className="cc5-pre">{p.result.summary}</p>}
      {p.result.outputs?.map((o, i) => <div key={i} className="cc5-md cc5-output"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{typeof o === 'string' ? o : '```json\n' + JSON.stringify(o, null, 2) + '\n```'}</ReactMarkdown></div>)}
    </details>)}
    {!done.length && !project.files?.length && <p className="cc5-empty">尚無交付成果。</p>}
  </div>
}

function WorkLog({ project }) {
  const [who, setWho] = useState('all')
  const entries = useMemo(() => {
    const list = []
    for (const p of project.packages || []) {
      if (!p.created_at) continue
      const st = PACKAGE_STATUS[p.status] || { label: p.status }
      list.push({ at: p.created_at, actor: EXECUTORS[p.executor] || p.executor, kind: 'ai', text: firstLine(p.task), detail: `工作包・${st.label}${p.attempt ? `・第 ${p.attempt} 次執行` : ''}` })
    }
    for (const a of project.actions || []) {
      if (a.created_at) list.push({ at: a.created_at, actor: '系統', kind: 'system', text: `建立待確認：${a.title}`, detail: ACTION_TYPE[a.action_type] || a.action_type })
      if (a.resolved_at) list.push({ at: a.resolved_at, actor: '人工', kind: 'human', text: `處理待確認：${a.title}`, detail: typeof a.answer === 'string' ? firstLine(a.answer) : a.answer?.decision || '' })
    }
    for (const n of project.notes || []) list.push({ at: n.created_at, actor: '人工', kind: 'human', text: n.content, detail: '工作日誌' })
    for (const g of project.suggestions || []) {
      list.push({ at: g.created_at, actor: '人工', kind: 'human', text: g.content, detail: '我的建議' })
      if (g.read_at) list.push({ at: g.read_at, actor: 'AI', kind: 'ai', text: `已讀取建議：${firstLine(g.content)}`, detail: '隨工作包交件' })
    }
    return list.sort((a, b) => b.at - a.at)
  }, [project])
  const shown = entries.filter(e => who === 'all' || e.kind === who)
  const groups = shown.reduce((acc, e) => { const k = dayKey(e.at); (acc[k] ||= []).push(e); return acc }, {})
  return <div className="cc5-stack">
    <div role="group" aria-label="篩選紀錄" className="cc5-chips">
      {[['all', '全部'], ['ai', 'AI'], ['human', '人工'], ['system', '系統']].map(([k, l]) => <button key={k} type="button" aria-pressed={who === k} onClick={() => setWho(k)}>{l}</button>)}
    </div>
    {!shown.length && <p className="cc5-empty">沒有紀錄。</p>}
    {Object.entries(groups).map(([day, list]) => <section key={day}>
      <h2 className="cc5-label cc5-day">{day}</h2>
      <ol className="cc5-log">{list.map((e, i) => <li key={i}>
        <time>{new Date(e.at * 1000).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</time>
        <div><span className="cc5-actor" data-actor={e.actor}>{e.actor}</span><p className="cc5-pre cc5-clamp">{e.text}</p>{e.detail && <small className="cc5-muted">{e.detail}</small>}</div>
      </li>)}</ol>
    </section>)}
  </div>
}

// 我的建議：隨時可填；下一個領件的工作包會一起讀取，交件後自動從這裡消失（紀錄留在工作紀錄）。
function SuggestionBox({ project, onChanged, setError }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const unread = (project.suggestions || []).filter(s => s.state !== 'READ')
  const pid = encodeURIComponent(project.id)

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      await request(`/projects/${pid}/suggestions`, { method: 'POST', body: JSON.stringify({ content: text.trim() }) })
      setText('')
      await onChanged()
    } catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }

  async function withdraw(id) {
    setBusy(true)
    try {
      await request(`/projects/${pid}/suggestions/${encodeURIComponent(id)}`, { method: 'DELETE' })
      await onChanged()
    } catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }

  return <section className="cc5-panel cc5-suggest" aria-labelledby={`cc5-suggest-${project.id}`}>
    <div className="cc5-row"><h2 className="cc5-h" id={`cc5-suggest-${project.id}`}>我的建議</h2>
      <span className="cc5-small">AI 下次領件時一起讀取，讀完自動清空</span></div>
    {unread.map(s => <div key={s.id} className="cc5-suggest-item">
      <p className="cc5-pre">{s.content}</p>
      <div className="cc5-row">
        <Pill tone={s.state === 'READING' ? 'blue' : 'amber'}>{s.state === 'READING' ? 'AI 讀取中' : '等待 AI 讀取'}</Pill>
        {s.state === 'PENDING' && <button type="button" className="cc5-link" disabled={busy} onClick={() => withdraw(s.id)}>撤回</button>}
      </div>
    </div>)}
    <form className="cc5-form" onSubmit={submit}>
      <label className="cc5-field" htmlFor={`cc5-suggest-text-${project.id}`}>寫下方向、修正或規劃書要調整的地方</label>
      <textarea id={`cc5-suggest-text-${project.id}`} maxLength={10000} value={text} onChange={e => setText(e.target.value)} />
      <button type="submit" className="cc5-primary" disabled={busy || !text.trim()}>送出建議</button>
    </form>
  </section>
}

// 永久刪除：僅 HY。先把專案資料與 Drive 資料夾備份到「_已刪除專案備份」，成功後才刪除。
function DeleteZone({ project, onDeleted }) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const running = (project.packages || []).some(p => p.status === 'RUNNING')

  async function remove() {
    setBusy(true); setMessage('')
    try {
      await request(`/projects/${encodeURIComponent(project.id)}`, { method: 'DELETE', body: JSON.stringify({ confirm_title: confirm }) })
      onDeleted()
    } catch (reason) {
      const code = reason.message || ''
      setMessage(code.includes('RUNNING') ? '有工作包正在執行，請等它交件後再刪除。'
        : code.includes('CONFIRMATION') ? '專案名稱不一致。'
        : code.startsWith('DRIVE') || code.includes('BACKUP') ? `Drive 備份失敗（${code}），專案未刪除。`
        : `刪除失敗（${code}），專案未刪除。`)
    } finally { setBusy(false) }
  }

  if (!open) return <div className="cc5-danger-row">
    <button type="button" className="cc5-btn cc5-danger" onClick={() => setOpen(true)}>刪除專案</button>
  </div>
  return <section className="cc5-panel cc5-danger-panel" role="alertdialog" aria-labelledby="cc5-del-title" aria-describedby="cc5-del-desc">
    <h2 className="cc5-h" id="cc5-del-title">永久刪除「{project.title}」？</h2>
    <div id="cc5-del-desc" className="cc5-stack-tight">
      <p>刪除後，這個專案的規劃書、工作包、待確認、建議與工作紀錄都會從 HY Life OS 移除，<b>無法復原</b>。</p>
      <p>刪除前會自動備份：專案所有資料匯出成 JSON 放進專案的 Drive 資料夾，整個資料夾（含所有產出檔案）移到 AI Work／<b>_已刪除專案備份</b>，Drive 上不刪任何檔案。備份失敗就不會刪除。</p>
      {running && <p className="cc5-warn">目前有工作包執行中，需等交件後才能刪除。</p>}
    </div>
    <label className="cc5-field">輸入專案名稱「{project.title}」確認
      <input className="cc5-input" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="off" /></label>
    {message && <p role="alert" className="cc5-warn">{message}</p>}
    <div className="cc5-two">
      <button type="button" className="cc5-btn" disabled={busy} onClick={() => { setOpen(false); setConfirm(''); setMessage('') }}>取消</button>
      <button type="button" className="cc5-btn cc5-danger-solid" disabled={busy || running || confirm.trim() !== project.title.trim()} onClick={remove}>{busy ? '備份並刪除中…' : '永久刪除'}</button>
    </div>
  </section>
}
