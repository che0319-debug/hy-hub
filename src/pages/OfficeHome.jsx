import {useState} from 'react'
import {FolderKanban, Plus, Search, RefreshCw, Workflow, Users, FileCheck2, ArrowUpRight, MessageSquare, Layers} from 'lucide-react'
import {progress, PROJECT_STATUS} from '../lib/aiOffice.mjs'

const filters=[['all','全部專案'],['active','進行中'],['open','待我處理'],['completed','已完成']]
const date=value=>value?new Date(value*1000).toLocaleString('zh-TW',{hour12:false}):'尚未記錄更新時間'
export default function OfficeHome({projects,details,inbox,loaded,error,creating,onReload,onCreate,onSelect,creation,registry}){
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all')
  const actions=inbox.filter(a=>a.project_id && ['owner','HY'].includes(a.assigned_to))
  const pending=id=>actions.filter(a=>a.project_id===id).length
  const packages=Object.values(details).flatMap(d=>d?.packages || [])
  const running=packages.filter(p=>p.status==='RUNNING' && p.type!=='PROJECT_REPORT').length
  const completed=projects.filter(p=>p.status==='completed').length
  const visible=projects.filter(p=>(!query.trim() || `${p.title} ${p.goal || ''}`.toLowerCase().includes(query.trim().toLowerCase())) && (filter==='all'||filter==='completed'&&p.status==='completed'||filter==='active'&&p.status!=='completed'||filter==='open'&&pending(p.id)>0))
  const missing=projects.length-Object.values(details).filter(Boolean).length
  const stats=[{name:'專案總數',value:projects.length,Icon:FolderKanban,tone:'blue'},{name:'執行中工作包',value:running,Icon:Workflow,tone:'mint'},{name:'待我處理',value:actions.length,Icon:MessageSquare,tone:'amber'},{name:'已完成專案',value:completed,Icon:FileCheck2,tone:'violet'}]
  return <section className="ao-home cc5" aria-label="AI Office 專案總表">
    <div className="ao-home-top">
      <header className="ao-home-hero">
        <svg className="ao-landscape" viewBox="0 0 900 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="office-sky" x2="1" y2="1"><stop stopColor="#547c9a"/><stop offset="1" stopColor="#c9c6d9"/></linearGradient></defs><rect width="900" height="360" fill="url(#office-sky)"/><path d="M220 330L430 140 515 204 638 68 775 228 900 158V360H220Z" fill="#7192aa"/><path d="M290 360L480 234 564 258 679 170 817 292 900 248V360Z" fill="#426f83"/><path d="M0 360L208 279 375 327 535 282 732 329 900 288V360Z" fill="#28586b"/></svg>
        <div className="ao-hero-content"><span className="ao-hero-kicker">HY LIFE OS · AI × HUMAN</span><h1>AI Office</h1><p className="ao-hero-lead">你的 AI 團隊辦公室</p><p>從想法到成果，與 PI 和專家團隊一起推進每個目標。</p><div className="ao-hero-steps"><span><Layers/>規劃</span><span><Users/>協作</span><span><Workflow/>執行</span><span><FileCheck2/>審查</span></div></div>
      </header>
      <section className="ao-card ao-home-summary"><div className="ao-home-section-head"><h2>工作摘要</h2><button aria-label="重新整理專案" onClick={onReload}><RefreshCw size={16}/></button></div><small>來自正式專案與工作包紀錄</small><div className="ao-home-stats">{stats.map(({name,value,Icon,tone})=><div key={name} className={`ao-stat ao-tone-${tone}`}><span className="ao-icon-tile"><Icon size={20}/></span><div><small>{name}</small><strong>{loaded&&!error&&!(name==='執行中工作包'&&missing)?value:'—'}</strong></div></div>)}</div>{missing>0&&!error&&<small>有 {missing} 個專案詳情未讀取；工作包數量尚不完整。</small>}</section>
    </div>
    {error&&<div role="alert"><p>{error}</p><button onClick={onReload}>重試讀取</button></div>}
    <div className="ao-home-section-head ao-project-heading"><div><h2>我的專案</h2><p className="ao-muted">進入專案，查看規劃、協作、成果與工作歷程。</p></div><button className="ao-primary" aria-expanded={creating} onClick={onCreate}><Plus size={18}/>新增專案</button></div>
    {creation&&<div className="ao-home-create">{creation}</div>}
    {registry}
    <div className="ao-home-controls"><label className="ao-home-search"><Search size={18}/><input type="search" aria-label="搜尋專案" placeholder="搜尋專案名稱或目標" value={query} onChange={e=>setQuery(e.target.value)}/></label><div role="group" aria-label="篩選專案">{filters.map(([key,label])=><button key={key} aria-pressed={key===filter} onClick={()=>setFilter(key)}>{label}</button>)}</div></div>
    {!loaded&&<p role="status">正在讀取正式專案…</p>}
    {loaded&&!error&&!visible.length&&<div className="ao-card ao-home-empty"><FolderKanban/><h3>{projects.length?'沒有符合條件的專案':'開始你的第一個專案'}</h3><p>{projects.length?'調整搜尋或篩選，找到需要的專案。':'提供目標，交由既有 PI 與工作包流程進行規劃。'}</p></div>}
    <div className="ao-home-projects">{visible.map((p,i)=>{const detail=details[p.id],count=detail?progress(detail):null,open=pending(p.id);return <button className={`cc5-project ao-project-card ao-tone-${['blue','mint','violet','amber'][i%4]}`} key={p.id} onClick={()=>onSelect(p.id)}><div className="ao-project-card-top"><span className="ao-icon-tile"><FolderKanban size={24}/></span><span className="ao-pill">{PROJECT_STATUS[p.status]||p.status}</span></div><h3>{p.title}</h3><p className="ao-project-goal">{p.goal||'目標尚未記錄'}</p><div className="ao-project-stage"><span>{p.phase} {p.milestone_id||''}</span><span>負責 {({hy:'HY',sam:'Sam',family:'小因','950157':'950157'})[p.owner_bot]||p.owner_bot}</span></div><div className="ao-home-progress"><span>{count?`工作包完成 ${count.done}／${count.total}`:'工作包詳情未讀取'}</span>{count?.total>0&&<div className="ao-progress-track" aria-label={`工作包完成 ${count.done}／${count.total}`}><span style={{width:`${count.done/count.total*100}%`}}/></div>}<small>工作包計數，不代表正式驗收</small></div><div className="ao-project-card-bottom"><small>{open?`${open} 項待我處理`:date(detail?.updated_at)}</small><span>進入專案 <ArrowUpRight size={16}/></span></div></button>})}</div>
  </section>
}
