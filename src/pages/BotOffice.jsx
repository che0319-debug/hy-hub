// Copied from AIOfficeV1's project-list / five-tab layout; only Office data is used.
import { useCallback, useEffect, useRef, useState } from 'react'
import { authHeaders, expireSession } from '../auth'
import { demoOffice, loadBotOffice, OFFICE_TABS, REFRESH_MS } from '../botOfficeData'
import './bot-office.css'
import Decisions from '../components/OfficeDecisions'

const PendingWrite = ({ action }) => <button type="button" disabled title="此項操作暫未開放">{action}・待接寫入</button>
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
  const [projectId, setProjectId] = useState(null), [tab, setTab] = useState('overview'), [query, setQuery] = useState(''), [filter, setFilter] = useState('all')
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
      </div><button onClick={reload} disabled={loading}>重新整理</button><PendingWrite action="新增專案" /></div>
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
      <Decisions items={data.decisions} readOnly={mode === 'demo'} reload={reload} />
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
      <header className="ao-header"><div className="ao-header-top"><h1>{project.title}</h1><Pill project={project} /><div className="ao-header-actions"><PendingWrite action="規格變更" /><PendingWrite action="改派" /></div></div>
        <div className="ao-header-meta"><span>分區 <b>{project.island}</b></span><span>執行者 <b>{project.executor}</b></span></div>
      </header>
      <nav className="ao-tabs" aria-label="Bot Office 專案分頁">{OFFICE_TABS.map(([key, label]) => <button key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>{label}</button>)}</nav>
      {tab === 'overview' && <><Decisions items={project.decisions} readOnly={mode === 'demo'} reload={reload} /><div className="ao-overview"><div className="ao-overview-main"><Cards items={project.cards.overview} /></div><section className="ao-card"><h2>專案狀態</h2><p><Pill project={project} /></p><p>執行者：{project.executor}</p><PendingWrite action="收件匣處理" /></section></div></>}
      {tab === 'meeting' && <><div className="ao-toolbar"><PendingWrite action="會議室留言" /></div><Cards items={project.cards.meeting} /></>}
      {tab === 'execution' && <Cards items={project.cards.execution} />}
      {tab === 'outputs' && <Cards items={project.cards.outputs} />}
      {tab === 'log' && <Cards items={project.cards.log} />}
    </section>}
  </section>
}
