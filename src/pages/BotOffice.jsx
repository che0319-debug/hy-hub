// Match the actual AIOfficeV1 five-tab structure; data stays on the new Office APIs.
import { useCallback, useEffect, useRef, useState } from 'react'
import { authHeaders, expireSession } from '../auth'
import { loadBotOffice, OFFICE_TABS, REFRESH_MS, OFFICE_NAMES } from '../botOfficeData'
import './bot-office.css'
import Decisions from '../components/OfficeDecisions'
import { OfficeRequest, OfficeLog, OfficeFollowUps } from '../components/OfficeActions'
import { OfficeCards, OfficeMeeting, OfficeExecution, OfficeResults } from '../components/BotOfficePanels'
import { TAB_NOTES } from '../lib/aiOffice.mjs'

const NOTES = {...TAB_NOTES, meeting: '和 PI 溝通的入口。意見與補充資料從這裡送出。', execution: '正式規劃書與已登錄工作卡。規劃變更請到會議室提出。'}
const Pill = ({ project }) => <span className="hy-pill" data-s={project.tone}>{project.stageLabel}</span>
function DecisionList({items, filter, setFilter, reload}) {
  const visible = items.filter(d => filter === 'all' || d.status === filter)
  return <>
    <div className="ao-chips" role="group" aria-label="決策篩選">{[['open', '待你決定'], ['answered', '已回覆'], ['all', '全部歷史']].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
    <Decisions items={visible} title={filter === 'open' ? '待你決定' : '決策與歷史'} reload={reload} />
    {!visible.length && <section className="ao-card"><h2>{filter === 'open' ? '待你決定' : '決策與歷史'}</h2><p className="ao-muted">{filter === 'open' ? '目前沒有需要你決定的事。' : '這個篩選沒有決策。'}</p></section>}
  </>
}

export default function BotOffice() {
  const [data, setData] = useState(null), [error, setError] = useState(null), [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState(null), [tab, setTab] = useState('overview'), [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [decisionFilter, setDecisionFilter] = useState('open'), [editing, setEditing] = useState(false)
  const generation = useRef(0), controller = useRef(null), initialLoad = useRef(true)
  const reload = useCallback(async () => {
    const version = ++generation.current
    controller.current?.abort(); controller.current = new AbortController()
    setLoading(initialLoad.current)
    try {
      const next = await loadBotOffice({ headers: authHeaders(), signal: controller.current.signal })
      if (version === generation.current) { setData(next); setError(null) }
    } catch (e) {
      if (version === generation.current && e.name !== 'AbortError') {
        setError({ kind: e.kind || 'error', message: e.message })
        if (e.kind === 'auth' || e.kind === 'empty') setData(null)
      }
    } finally { if (version === generation.current) { initialLoad.current = false; setLoading(false) } }
  }, [])
  useEffect(() => {
    const previous = document.documentElement.getAttribute('data-bot')
    document.documentElement.setAttribute('data-bot', 'personal')
    return () => { if (previous == null) document.documentElement.removeAttribute('data-bot'); else document.documentElement.setAttribute('data-bot', previous) }
  }, [])
  useEffect(() => {
    reload(); const interval = setInterval(reload, REFRESH_MS)
    return () => { generation.current++; controller.current?.abort(); clearInterval(interval) }
  }, [reload])
  const project = data?.projects.find(p => p.id === projectId)
  const projects = (data?.projects || []).filter(p => p.title.toLowerCase().includes(query.toLowerCase()) &&
    (filter === 'all' || filter === 'open' && p.pending || filter === 'active' && !p.finished || filter === 'finished' && p.finished))
  const tiles = [['open', '待你決定', 'pending', 'you'], ['active', 'AI 執行中', 'running', 'ai'], ['finished', '完成或退回', 'finished', 'done'], ['all', '專案總數', 'all', 'wait']]
  return <section className="ao bo-page ao-home" aria-label="Bot Office">
    {!project && <header className="ao-home-head"><h1>Bot Office</h1><div className="ao-home-actions"><button onClick={reload} disabled={loading}>重新整理</button><OfficeRequest type="new_project" projects={data?.projects || []} readOnly={!data} reload={reload} /></div></header>}
    {data?.stale && <p className="bo-notice" role="status">資料過期：目前顯示後端保留的舊資料。</p>}
    {loading && <p role="status">正在讀取 Office 資料…</p>}
    {error && <section className="ao-card" role={error.kind === 'empty' ? 'status' : 'alert'}>
      <h2>{error.kind === 'empty' ? '尚無資料' : error.kind === 'auth' ? '請重新登入' : '暫時無法更新'}</h2>
      <p>{error.kind === 'empty' ? '尚未建立 Office 工作資料。' : error.message}</p>
      {error.kind === 'auth' ? <button onClick={expireSession}>重新登入</button> : <button onClick={reload}>重試讀取</button>}
    </section>}
    {data && !project && <>
      <Decisions items={data.decisions} title="待你決定" reload={reload} />
      {data.requests.some(r => !r.project && r.status === 'open') && <details className="ao-card"><summary>已送出的開案請求</summary>{data.requests.filter(r => !r.project && r.status === 'open').map(r => <p key={r.id}>{r.payload?.title}・負責 Bot：{OFFICE_NAMES[r.payload?.owner_bot] || '尚未指定'}</p>)}</details>}
      <div className="ao-tiles" aria-label="工作摘要">{tiles.map(([key, label, field, tone]) => <button key={key} className="ao-tile" data-s={tone} aria-pressed={filter === key} onClick={() => setFilter(key)}><small>{label}</small><strong>{data.totals[field]}</strong></button>)}</div>
      <div className="ao-home-controls"><input aria-label="搜尋專案" type="search" placeholder="搜尋專案名稱" value={query} onChange={e => setQuery(e.target.value)} /><div className="ao-chips">{[['all', '全部'], ['open', '待你決定'], ['active', '進行中'], ['finished', '完成或退回']].map(([key, label]) => <button key={key} aria-pressed={key === filter} onClick={() => setFilter(key)}>{label}</button>)}</div></div>
      {!projects.length && <div className="ao-card hy-empty">{data.projects.length ? '沒有符合條件的專案。' : '尚未建立專案。'}</div>}
      <div className="ao-home-projects" aria-label="專案列表">{projects.map(p => <button className={`ao-project-line${p.pending ? ' needs-you' : ''}`} key={p.id} onClick={() => { setProjectId(p.id); setTab('overview'); setDecisionFilter('open'); setEditing(false) }}>
        <span className="ao-project-title"><b>{p.title}</b><span className="ao-project-goal">負責 Bot：{OFFICE_NAMES[p.ownerBot] || '尚未指定'}</span></span><span className="ao-project-stage">{p.stageLabel}<small>執行者 {OFFICE_NAMES[p.executor] || p.executor}</small></span><Pill project={p} />
      </button>)}</div>
      <p className="ao-muted bo-last-updated">最後更新：{data.updated}</p>
    </>}
    {data && project && <section className="ao-project">
      <button className="ao-back" onClick={() => { setProjectId(null); setEditing(false) }}>‹ Bot Office 專案列表</button>
      <header className="ao-header"><div className="ao-header-top"><h1>{project.title}</h1><Pill project={project} />{project.pendingAdvances.length > 0 && <span className="hy-pill" data-s="wait">待推進</span>}<div className="ao-header-actions"><button onClick={reload} disabled={loading}>重新整理</button><button aria-expanded={editing} onClick={() => setEditing(v => !v)}>編輯專案</button></div></div>
        <div className="ao-header-meta"><span>負責 <b>{OFFICE_NAMES[project.ownerBot] || '尚未指定'}</b></span><span>執行 <b>{OFFICE_NAMES[project.executor] || project.executor}</b></span><span>審查 <b>{OFFICE_NAMES[project.reviewer] || project.reviewer || '尚未指定'}</b></span></div>
      </header>
      {editing && <section className="ao-card bo-edit-actions"><OfficeRequest key={`spec-${project.id}`} type="spec_change" projects={data.projects} projectId={project.id} reload={reload} /><OfficeRequest key={`reassign-${project.id}`} type="reassign" projects={data.projects} projectId={project.id} reload={reload} /></section>}
      <nav className="ao-tabs" aria-label="Bot Office 專案分頁">{OFFICE_TABS.map(([key, label]) => <button key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>{label}{key === 'overview' && project.decisions.length > 0 && <span aria-label={`${project.decisions.length} 項待你決定`}>{project.decisions.length}</span>}</button>)}</nav>
      <p className="ao-tabnote">{NOTES[tab]}</p>
      {tab === 'overview' && <>{project.pendingAdvances.length > 0 && <section className="bo-notice" role="status">{project.pendingAdvances.map(d => <p key={d.id}>{d.advance?.stage === 'returned' ? '已退回，待推進修訂。' : d.advance?.stage === 'done' ? '已核准，待推進完成。' : '決策已作答，待推進。'}</p>)}</section>}<DecisionList items={project.allDecisions} filter={decisionFilter} setFilter={setDecisionFilter} reload={reload} /><section className="ao-card"><h2>一頁摘要：現在怎樣、你要做什麼</h2><p className="ao-muted">正式規劃書卡片摘要</p><p className="bo-summary">{project.planCard?.summary || '尚無正式規劃摘要。'}</p>{project.planUrl && <a href={project.planUrl} target="_blank" rel="noopener noreferrer">開啟正式規劃書 ↗</a>}</section><OfficeFollowUps project={project} /><section className="ao-card"><h2>AI 正在做什麼</h2><p>{project.stageLabel}・執行者 {OFFICE_NAMES[project.executor] || project.executor}</p><button onClick={() => setTab('execution')}>查看執行計畫</button></section></>}
      {tab === 'meeting' && <OfficeMeeting project={project} projects={data.projects} reload={reload} />}
      {tab === 'execution' && <OfficeExecution project={project} />}
      {tab === 'outputs' && <OfficeResults project={project} />}
      {tab === 'log' && <><OfficeLog key={project.id} project={project} reload={reload} /><OfficeCards items={project.cards.log} /></>}
    </section>}
  </section>
}
