import {useState} from 'react'
import {progress, activityLabel} from '../lib/aiOffice.mjs'

const FILTERS=[['all','全部'],['open','待你決定'],['active','進行中'],['completed','已完成']]
const OWNER={hy:'HY',sam:'Sam',family:'小因','950157':'950157'}
const date=value=>value?new Date(value*1000).toLocaleString('zh-TW',{hour12:false}):'尚未記錄'
export default function OfficeHome({projects,details,inbox,loaded,error,creating,onReload,onCreate,onSelect,creation,registry,title = 'Bot Office', activeTileLabel = 'AI 執行中工作包', activeCount = undefined, progressOf = null, progressEmpty = '工作包詳情未讀取', hidePackageGap = false}){
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all')
  const actions=inbox.filter(a=>a.project_id && ['owner','HY'].includes(a.assigned_to))
  const pending=id=>actions.filter(a=>a.project_id===id).length
  const packages=Object.values(details).flatMap(d=>d?.packages || [])
  const running=packages.filter(p=>p.status==='RUNNING' && p.type!=='PROJECT_REPORT').length
  const completed=projects.filter(p=>p.status==='completed').length
  const missing=projects.length-Object.values(details).filter(Boolean).length
  const match=p=>filter==='all'||filter==='completed'&&p.status==='completed'||filter==='active'&&p.status!=='completed'||filter==='open'&&pending(p.id)>0
  const visible=projects.filter(p=>(!query.trim() || `${p.title} ${p.goal || ''}`.toLowerCase().includes(query.trim().toLowerCase())) && match(p))
    .sort((a,b)=>pending(b.id)-pending(a.id))
  const ready=loaded&&!error
  const tiles=[['open','待你決定',actions.length,'you'],['active',activeTileLabel,activeCount === undefined ? (missing?null:running) : activeCount,'ai'],['completed','已完成專案',completed,'done'],['all','專案總數',projects.length,'wait']]
  return <section className="ao-home" aria-label={`${title} 專案總表`}>
    <header className="ao-home-head"><div><small>HY Life OS</small><h1>{title}</h1></div><div className="ao-home-actions"><button className="ao-btn" aria-label="重新整理專案" onClick={onReload}>重新整理</button><button className="ao-btn ao-primary" aria-expanded={creating} onClick={onCreate}>新增專案</button></div></header>
    <div className="ao-tiles" role="group" aria-label="工作摘要">{tiles.map(([key,name,value,tone])=><button key={name} className={`ao-tile${key==='open'&&value?' needs-you':''}`} data-s={tone} aria-pressed={filter===key} onClick={()=>setFilter(key)}><small>{name}</small><strong>{ready&&value!=null?value:'—'}</strong></button>)}</div>
    {missing>0&&!error&&!hidePackageGap&&<p className="ao-muted">有 {missing} 個專案詳情未讀取；工作包數量尚不完整。</p>}
    {error&&<div role="alert"><p>{error}</p><button className="ao-btn" onClick={onReload}>重試讀取</button></div>}
    {creation&&<div className="ao-home-create">{creation}</div>}
    {registry}
    <div className="ao-home-controls"><input type="search" aria-label="搜尋專案" placeholder="搜尋專案名稱或目標" value={query} onChange={e=>setQuery(e.target.value)}/><div className="ao-chips" role="group" aria-label="篩選專案">{FILTERS.map(([key,label])=><button key={key} aria-pressed={key===filter} onClick={()=>setFilter(key)}>{label}</button>)}</div></div>
    {!loaded&&<p role="status">正在讀取正式專案…</p>}
    {ready&&!visible.length&&<div className="ao-card ao-home-empty"><h3>{projects.length?'沒有符合條件的專案':'開始你的第一個專案'}</h3><p>{projects.length?'調整搜尋或篩選，找到需要的專案。':'寫下目標，PI 會先研究並提出 AI 執行規劃書。'}</p></div>}
    <div className="ao-home-projects" aria-label="專案列表">{visible.map(p=>{const detail=details[p.id],count=progressOf?progressOf(p,detail):(detail?progress(detail):null),open=pending(p.id);return <button className={`ao-project-line${open?' needs-you':''}`} key={p.id} onClick={()=>onSelect(p.id)}>
      <span className="ao-project-title"><b>{p.title}</b><span className="ao-project-goal">{p.goal||'目標尚未記錄'}</span></span>
      <span className="ao-project-stage">{p.phase} {p.milestone_id||''}<small>負責 {OWNER[p.owner_bot]||p.owner_bot}</small></span>
      <span className="ao-home-progress"><span>{count?(count.label||`工作包 ${count.done}／${count.total}`):progressEmpty}</span>{count?.total>0&&<span className="ao-progress-track" data-s={count.done===count.total?'done':'ai'} aria-label={count.label||`執行工作包完成 ${count.done}／${count.total}`}><span style={{width:`${count.done/count.total*100}%`}}/></span>}</span>
      <span className="hy-pill" data-s={open?'you':p.status==='completed'?'done':'ai'}>{open?`${open} 項待你決定`:activityLabel(detail || p)}</span>
      <small className="ao-project-time">{date(detail?.updated_at)}</small>
    </button>})}</div>
  </section>
}
