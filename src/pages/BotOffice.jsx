// AI Office interaction structure; only the new Office APIs are used.
import { useCallback, useEffect, useRef, useState } from 'react'
import { authHeaders, expireSession } from '../auth'
import { demoOffice, loadBotOffice, OFFICE_TABS, REFRESH_MS } from '../botOfficeData'
import './bot-office.css'
import Decisions from '../components/OfficeDecisions'
import { OfficeRequest, OfficeLog, OfficeReview } from '../components/OfficeActions'

const REQUEST_LABELS = {spec_change: '規格變更', message: '會議室留言', new_project: '新增專案', reassign: '改派'}
const BOT_LABELS = {sam: 'Sam', family: '小因', hy: 'HY Bot', '950157': '950157'}
const Pill = ({ project }) => <span className="hy-pill" data-s={project.tone}>{project.stageLabel}</span>

function Cards({ items }) {
  return items.length ? <div className="bo-cards">{items.map(c => <article className="ao-card" key={c.id}>
    <div className="ao-card-head"><h2>{c.title}</h2><small>{c.date}</small></div>
    <p className="bo-summary">{c.summary}</p>
    {c.driveUrl ? <a href={c.driveUrl} target="_blank" rel="noopener noreferrer">開啟 Drive 原件 ↗</a> : <small>Drive 連結尚未提供</small>}
  </article>)}</div> : <div className="ao-card hy-empty">這個分頁尚無卡片，等待 Atlas 更新。</div>
}

export default function BotOffice() {
  const [mode, setMode] = useState('real'), [data, setData] = useState(null), [error, setError] = useState(null), [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState(null), [tab, setTab] = useState('overview'), [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [decisionFilter, setDecisionFilter] = useState('open')
  const generation = useRef(0), controller = useRef(null), initialLoad = useRef(true)
  const reload = useCallback(async () => {
    const version = ++generation.current
    controller.current?.abort()
    if (mode === 'demo') { initialLoad.current = false; setData(demoOffice()); setError(null); setLoading(false); return }
    controller.current = new AbortController()
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
  }, [mode])
  useEffect(() => {
    const previous = document.documentElement.getAttribute('data-bot')
    document.documentElement.setAttribute('data-bot', 'personal')
    return () => { if (previous == null) document.documentElement.removeAttribute('data-bot'); else document.documentElement.setAttribute('data-bot', previous) }
  }, [])
  useEffect(() => {
    reload()
    const interval = mode === 'real' ? setInterval(reload, REFRESH_MS) : null
    return () => { generation.current++; controller.current?.abort(); if (interval) clearInterval(interval) }
  }, [mode, reload])
  const project = data?.projects.find(p => p.id === projectId)
  const changeMode = next => { if (next === mode) return; initialLoad.current = true; setMode(next); setProjectId(null); setTab('overview'); setData(null); setError(null) }
  const projects = (data?.projects || []).filter(p => p.title.toLowerCase().includes(query.toLowerCase()) &&
    (filter === 'all' || filter === 'open' && p.pending || filter === 'active' && !p.finished || filter === 'finished' && p.finished))
  const tiles = [['open', '待你決定', 'pending', 'you'], ['active', 'AI 執行中', 'running', 'ai'], ['finished', '完成或退回', 'finished', 'done'], ['all', '專案總數', 'all', 'wait']]
  return <section className="ao bo-page ao-home" aria-label="Bot Office">
    <header className="ao-home-head"><div><small>HY Life OS</small><h1>Bot Office</h1></div>
      <div className="ao-home-actions"><div className="ao-chips" aria-label="資料來源">
        <button aria-pressed={mode === 'real'} onClick={() => changeMode('real')}>真實</button>
        <button aria-pressed={mode === 'demo'} onClick={() => changeMode('demo')}>示範</button>
      </div><button onClick={reload} disabled={loading}>重新整理</button><OfficeRequest type="new_project" projects={data?.projects || []} readOnly={mode === 'demo' || !data} reload={reload} /></div>
    </header>
    {mode === 'demo' && <p className="bo-notice" role="status">示範資料・全部為虛構，不會讀寫正式專案。</p>}
    {mode === 'real' && <p className="ao-muted">每 30 秒自動刷新・回答後等待 Atlas 處理</p>}
    {data && <div className="bo-updated"><span>最後更新：{data.updated}</span><span>卡片索引：{data.indexUpdated}</span></div>}
    {data?.stale && <p className="bo-notice" role="status">資料過期：目前顯示後端保留的舊資料。</p>}
    {loading && <p role="status">正在讀取 Office 資料…</p>}
    {error && <section className="ao-card" role={error.kind === 'empty' ? 'status' : 'alert'}>
      <h2>{error.kind === 'empty' ? '尚無資料' : error.kind === 'auth' ? '請重新登入' : '暫時無法更新'}</h2>
      <p>{error.kind === 'empty' ? '等待 Atlas 產生第一份工作狀態；你也可以切換到示範檢視。' : error.message}</p>
      {error.kind === 'auth' ? <button onClick={expireSession}>重新登入</button> : <button onClick={reload}>重試讀取</button>}
    </section>}
    {data && !project && <>
      <div className="ao-chips" aria-label="首頁決策篩選">{[['open', '待確認'], ['answered', '已回覆'], ['all', '全部歷史']].map(([key, label]) => <button key={key} aria-pressed={decisionFilter === key} onClick={() => setDecisionFilter(key)}>{label}</button>)}</div><Decisions items={data.allDecisions.filter(d => decisionFilter === 'all' || d.status === decisionFilter)} title={decisionFilter === 'open' ? '待 HY 決定' : '決策與歷史'} readOnly={mode === 'demo'} reload={reload} />
      {data.requests.some(r => !r.project && r.status === 'open') && <section className="ao-card"><h2>等待 Atlas 開案</h2>{data.requests.filter(r => !r.project && r.status === 'open').map(r => <p key={r.id}>{r.payload?.title}・負責 Bot：{r.payload?.owner_bot}</p>)}</section>}
      <div className="ao-tiles" aria-label="工作摘要">{tiles.map(([key, label, field, tone]) => <button key={key} className="ao-tile" data-s={tone} aria-pressed={filter === key} onClick={() => setFilter(key)}><small>{label}</small><strong>{data.totals[field]}</strong></button>)}</div>
      <div className="ao-home-controls"><input aria-label="搜尋專案" type="search" placeholder="搜尋專案名稱" value={query} onChange={e => setQuery(e.target.value)} />
        <div className="ao-chips">{[['all', '全部'], ['open', '待你決定'], ['active', '進行中'], ['finished', '完成或退回']].map(([key, label]) => <button key={key} aria-pressed={key === filter} onClick={() => setFilter(key)}>{label}</button>)}</div>
      </div>
      {!projects.length && <div className="ao-card hy-empty">{data.projects.length ? '沒有符合條件的專案。' : '尚無資料，等待 Atlas 更新工作狀態。'}</div>}
      <div className="ao-home-projects" aria-label="專案列表">{projects.map(p => <button className={`ao-project-line${p.pending ? ' needs-you' : ''}`} key={p.id} onClick={() => { setProjectId(p.id); setTab('overview') }}>
        <span className="ao-project-title"><b>{p.title}</b><span className="ao-project-goal">{p.island}</span></span>
        <span className="ao-project-stage">{p.stageLabel}<small>執行者 {p.executor}</small></span><Pill project={p} />
      </button>)}</div>
    </>}
    {data && project && <section className="ao-project">
      <button className="ao-back" onClick={() => setProjectId(null)}>‹ Bot Office 專案列表</button>
      <header className="ao-header"><div className="ao-header-top"><h1>{project.title}</h1><Pill project={project} /><div className="ao-header-actions"><OfficeRequest key={`spec-${project.id}`} type="spec_change" projects={data.projects} projectId={project.id} readOnly={mode === 'demo'} reload={reload} /><OfficeRequest key={`reassign-${project.id}`} type="reassign" projects={data.projects} projectId={project.id} readOnly={mode === 'demo'} reload={reload} /></div></div>
        <div className="ao-header-meta"><span>分區 <b>{project.island}</b></span><span>執行者 <b>{project.executor}</b></span><span>負責 Bot <b>{BOT_LABELS[project.ownerBot] || project.ownerBot || '待補'}</b></span></div>
      </header>
      <nav className="ao-tabs" aria-label="Bot Office 專案分頁">{OFFICE_TABS.map(([key, label]) => <button key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>{label}{key === 'inbox' && project.decisions.length > 0 && <span aria-label={`${project.decisions.length} 項待確認`}>{project.decisions.length}</span>}</button>)}</nav>
      {tab === 'overview' && <>
        <Decisions items={project.decisions} readOnly={mode === 'demo'} reload={reload} />
        <div className="ao-overview"><div className="ao-overview-main"><Cards items={project.cards.overview} /></div><section className="ao-card"><h2>專案狀態</h2><p><Pill project={project} /></p><p>執行者：{project.executor}</p><button onClick={() => setTab('inbox')}>到待確認處理（{project.decisions.length}）</button></section></div>
        <section className="ao-card"><h2>PI 與專案成員</h2>{project.figures.length ? project.figures.map((f, i) => <dl className="hy-kv" key={f.id || i}><dt>負責 Bot</dt><dd>{BOT_LABELS[f.owner] || f.owner || '待補'}</dd><dt>專案／島</dt><dd>{f.project}／{f.island || '待補'}</dd><dt>呈現角色</dt><dd>{f.lookAs || '待補'}</dd><dt>狀態</dt><dd>{({waiting: '等待中', running: '執行中', review: '待審', done: '完成'})[f.status] || f.status || '待補'}</dd></dl>) : <p className="ao-muted">尚無 PI 人偶資料。</p>}</section>
        <section className="ao-card"><h2>等待 Atlas 處理</h2>{project.requests.filter(r => r.status === 'open').map(r => <p key={r.id}>{REQUEST_LABELS[r.type] || r.type}：{r.payload?.content}</p>)}{!project.requests.some(r => r.status === 'open') && <p className="ao-muted">沒有待處理請求。</p>}<OfficeRequest type="message" projects={data.projects} projectId={project.id} readOnly={mode === 'demo'} reload={reload} /></section>
      </>}
      {tab === 'inbox' && <><div className="ao-chips" aria-label="決策篩選">{[['open', '待確認'], ['answered', '已回覆'], ['all', '全部歷史']].map(([key, label]) => <button key={key} aria-pressed={decisionFilter === key} onClick={() => setDecisionFilter(key)}>{label}</button>)}</div><Decisions items={project.allDecisions.filter(d => decisionFilter === 'all' || d.status === decisionFilter)} title={decisionFilter === 'open' ? '待 HY 決定' : '決策與歷史'} readOnly={mode === 'demo'} reload={reload} />{!project.allDecisions.some(d => decisionFilter === 'all' || d.status === decisionFilter) && <div className="ao-card hy-empty">這個篩選沒有決策。</div>}</>}
      {tab === 'plan' && <>{project.planUrl && <section className="ao-card"><a href={project.planUrl} target="_blank" rel="noopener noreferrer">開啟正式規劃書 ↗</a></section>}<Cards items={project.cards.plan} /></>}
      {tab === 'outputs' && <Cards items={project.cards.outputs} />}
      {tab === 'log' && <><OfficeLog key={project.id} project={project} readOnly={mode === 'demo'} reload={reload} /><Cards items={project.cards.log} /></>}
      {tab === 'quality' && <><OfficeReview project={project} /><Cards items={project.cards.quality} /></>}
    </section>}
  </section>
}
