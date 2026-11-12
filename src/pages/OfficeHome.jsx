import {useState} from 'react'
import {progress, activityLabel} from '../lib/aiOffice.mjs'
import {shownStage} from '../lib/officeFlow.mjs'
import {PROJECT_STAGES} from '../lib/projectStages.mjs'
import {INBOX_CATEGORIES,INBOX_OWNERS} from '../inbox/inboxData.js'
import {Link} from 'react-router-dom'
import '../components/office-inbox.css'

// 統計卡與篩選只用 5 種專案階段的名稱（規劃中／待你決定／執行中／待審／完成），不用同義詞。
const FILTERS=[['all','全部'],...PROJECT_STAGES.map(s=>[s.key,s.label])]
const OWNER={hy:'HY',sam:'Sam',family:'小因','950157':'950157',atlas:'Atlas'}
const CATEGORY_LABEL=Object.fromEntries(INBOX_CATEGORIES)
const fmtDue=d=>d?d.slice(5).replace('-','/'):''
// 最急：有到期日的先（越早越急），其次問題、過期，最後是今日提醒。
const KIND_RANK={problem:1,overdue:2,decide:3,today:4}
const urgency=a=>[a.due||'9999-99-99',KIND_RANK[a.kind]||9]
const byUrgency=(a,b)=>{const x=urgency(a),y=urgency(b);return x[0]<y[0]?-1:x[0]>y[0]?1:x[1]-y[1]}
const mostUrgent=list=>[...list].sort(byUrgency)[0]||null
const date=value=>value?new Date(value*1000).toLocaleString('zh-TW',{hour12:false}):'尚未記錄'
// Bot Office 首頁只有一個列表、以專案為主（HY 2026-11-12）：
// 專案列上顯示待你處理件數與最急一項；小案卡用同格式列在同一個列表；問題回報與過期／今日待辦歸到各負責 Bot 的一列「問題與待辦」。
export default function OfficeHome({projects,details,inbox,loaded,error,creating,onReload,onCreate,onSettings,onSelect,creation,registry,title = 'Bot Office', progressOf = null, progressEmpty = '工作包詳情未讀取', hidePackageGap = false, needsYou = null, pendingItems = null, onOpenItem = null, onOpenMeeting = null}){
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[owner,setOwner]=useState('all'),[category,setCategory]=useState('all'),[expanded,setExpanded]=useState(null)
  const unified=Array.isArray(pendingItems)
  const actions=inbox.filter(a=>a.project_id && ['owner','HY'].includes(a.assigned_to))
  const all=unified?pendingItems:[]
  const ownerOk=o=>owner==='all'||o===owner
  const catOk=it=>category==='all'||it.category===category
  const decisionsOf=id=>all.filter(it=>it.kind==='decide'&&!it.isItem&&it.projectId===id)
  const pending=id=>unified?decisionsOf(id).filter(catOk).length:actions.filter(a=>a.project_id===id).length
  const missing=projects.length-Object.values(details).filter(Boolean).length
  const inStage=key=>projects.filter(p=>shownStage(p)===key).length
  const stageCount=key=>key==='hy_decision'&&Number.isInteger(needsYou)?needsYou:inStage(key)
  const match=p=>filter==='all'||shownStage(p)===filter
  const q=query.trim().toLowerCase()
  const hit=text=>!q||String(text||'').toLowerCase().includes(q)
  const visible=projects.filter(p=>hit(`${p.title} ${p.goal || ''}`) && match(p) && (!unified||(ownerOk(p.owner_bot)&&(category==='all'||pending(p.id)>0))))
  // 小案卡與「問題與待辦」只在不篩專案階段時出現。
  const extras=!unified||filter!=='all'?[]:[
    ...all.filter(it=>it.kind==='decide'&&it.isItem&&ownerOk(it.owner)&&catOk(it)&&hit(it.title)).map(it=>({type:'item',key:'item:'+it.decisionId,it,count:1,urgent:it})),
    ...Object.entries(all.filter(it=>it.kind!=='decide'&&ownerOk(it.owner)&&catOk(it)&&hit(it.title)).reduce((m,it)=>{(m[it.owner||'other']=m[it.owner||'other']||[]).push(it);return m},{}))
      .map(([o,list])=>({type:'group',key:'group:'+o,owner:o,list:[...list].sort(byUrgency),count:list.filter(it=>it.kind!=='today').length,urgent:mostUrgent(list)})),
  ]
  const rows=[...visible.map(p=>({type:'project',key:'project:'+p.id,p,count:pending(p.id),urgent:unified?mostUrgent(decisionsOf(p.id).filter(catOk)):null})),...extras]
    .map((r,i)=>({r,i})).sort((a,b)=>(b.r.count>0)-(a.r.count>0)||(a.r.count>0&&b.r.count>0&&a.r.urgent&&b.r.urgent?byUrgency(a.r.urgent,b.r.urgent):0)||b.r.count-a.r.count||a.i-b.i).map(x=>x.r)
  const countWith=(key,value)=>{const o=key==='owner'?value:owner,c=key==='category'?value:category;return all.filter(it=>it.kind!=='today'&&(o==='all'||it.owner===o)&&(c==='all'||it.category===c)).length}
  const chips=(key,list,value,set)=><div className="oi-chips" role="group" aria-label={key==='owner'?'依負責 Bot 篩選':'依屬性篩選'}>{[['all','全部'],...list].map(([k,label])=>{const n=countWith(key,k);return <button key={k} type="button" aria-pressed={value===k} onClick={()=>set(k)}>{label}{n?` ${n}`:''}</button>})}</div>
  const ready=loaded&&!error
  const tiles=[...PROJECT_STAGES.map(s=>[s.key,s.label,stageCount(s.key),s.tone]),['all','專案總數',projects.length,'wait']]
  return <section className="ao-home" aria-label={`${title} 專案總表`}>
    <header className="ao-home-head"><div><small>HY Life OS</small><h1>{title}</h1></div><div className="ao-home-actions"><button className="ao-btn" aria-label="重新整理專案" onClick={onReload}>重新整理</button><button className="ao-btn ao-primary" aria-expanded={creating} onClick={onCreate}>新增專案</button></div></header>
    <div className="ao-tiles" role="group" aria-label="工作摘要">{tiles.map(([key,name,value,tone])=><button key={name} className={`ao-tile${key==='hy_decision'&&value?' needs-you':''}`} data-s={tone} aria-pressed={filter===key} onClick={()=>setFilter(key)}><small>{name}</small><strong>{ready&&value!=null?value:'—'}</strong></button>)}</div>
    {missing>0&&!error&&!hidePackageGap&&<p className="ao-muted">有 {missing} 個專案詳情未讀取；工作包數量尚不完整。</p>}
    {error&&<div role="alert"><p>{error}</p><button className="ao-btn" onClick={onReload}>重試讀取</button></div>}
    {creation&&<div className="ao-home-create">{creation}</div>}
    {registry}
    <div className="ao-home-controls"><input type="search" aria-label="搜尋專案" placeholder="搜尋專案名稱或目標" value={query} onChange={e=>setQuery(e.target.value)}/><div className="ao-chips" role="group" aria-label="篩選專案">{FILTERS.map(([key,label])=><button key={key} aria-pressed={key===filter} onClick={()=>setFilter(key)}>{label}</button>)}</div></div>
    {unified&&<div className="oi-unified-filters" aria-label="列表篩選"><div className="oi-filters"><span className="oi-label">負責</span>{chips('owner',INBOX_OWNERS,owner,setOwner)}</div><div className="oi-filters"><span className="oi-label">屬性</span>{chips('category',INBOX_CATEGORIES,category,setCategory)}</div></div>}
    {!loaded&&<p role="status">正在讀取正式專案…</p>}
    {ready&&!rows.length&&<div className="ao-card ao-home-empty"><h3>{projects.length||all.length?'沒有符合條件的項目':'開始你的第一個專案'}</h3><p>{projects.length||all.length?'調整搜尋或篩選，找到需要的專案。':'寫下目標，PI 會先研究並提出 AI 執行規劃書。'}</p></div>}
    <div className="ao-home-projects" aria-label="專案列表">{rows.map(row=>{
      if(row.type==='item'){const it=row.it;return <button className="ao-project-line oi-line needs-you" data-row="item" key={row.key} onClick={()=>onOpenItem?.(it.decisionId)}>
        <span className="ao-project-title"><b>{it.title}</b><span className="ao-project-goal">{it.detail||(it.source?`來源：${it.source}`:'小案')}</span></span>
        <span className="ao-project-stage">小案<small>負責 {OWNER[it.owner]||it.owner||'尚未指定'}</small></span>
        <span className="ao-home-progress"><span>{CATEGORY_LABEL[it.category]||'核示'}{it.due?`・到期 ${fmtDue(it.due)}`:''}</span></span>
        <span className="hy-pill" data-s="you">1 項待你處理</span>
        <small className="ao-project-time">{it.source||''}</small>
      </button>}
      if(row.type==='group'){const open=expanded===row.key,u=row.urgent;return <div className={`oi-group${row.count?' needs-you':''}`} data-row="group" key={row.key}>
        <button className={`ao-project-line oi-line${row.count?' needs-you':''}`} aria-expanded={open} onClick={()=>setExpanded(open?null:row.key)}>
          <span className="ao-project-title"><b>{OWNER[row.owner]||row.owner}：問題與待辦</b><span className="ao-project-goal">{u?`最急：${u.title}${u.due?`（${u.kind==='overdue'?'逾期 ':''}${fmtDue(u.due)}）`:''}`:''}</span></span>
          <span className="ao-project-stage">不屬於專案<small>負責 {OWNER[row.owner]||row.owner}</small></span>
          <span className="ao-home-progress"><span>{row.list.length} 項{row.list.some(x=>x.kind==='problem')?'・含問題回報':''}</span></span>
          <span className="hy-pill" data-s={row.count?(row.list.some(x=>x.kind==='problem'||x.kind==='overdue')?'bad':'you'):'wait'}>{row.count?`${row.count} 項要處理`:'今日提醒'}</span>
          <small className="ao-project-time">{open?'收合':'展開'}</small>
        </button>
        {open&&<ul className="oi-group-list">{row.list.map(x=><li key={x.id}><span className="hy-pill" data-s={x.kind==='problem'||x.kind==='overdue'?'bad':'wait'}>{x.kind==='problem'?'問題':x.kind==='overdue'?'過期':'今日'}</span><span>{x.title}{x.due?`・${fmtDue(x.due)}`:''}{x.time?`・${x.time}`:''}</span>{x.to&&x.action&&<Link className="ao-btn" to={x.to}>{x.action}</Link>}{x.assignOwner&&<small className="ao-muted">在上方「指定負責 Bot」處理</small>}</li>)}</ul>}
      </div>}
      const p=row.p;const detail=details[p.id],count=progressOf?progressOf(p,detail):(detail?progress(detail):null),open=row.count,u=row.urgent;return <button className={`ao-project-line${open?' needs-you':''}`} data-row="project" key={p.id} onClick={()=>(unified&&open&&onOpenMeeting?onOpenMeeting(p.id):onSelect(p.id))}>
      <span className="ao-project-title"><b>{p.title}</b><span className="ao-project-goal">{u?`最急：${u.title}${u.due?`（到期 ${fmtDue(u.due)}）`:''}`:(p.goal||'目標尚未記錄')}</span></span>
      <span className="ao-project-stage">{p.phase} {p.milestone_id||''}<small>負責 {OWNER[p.owner_bot]||p.owner_bot}</small></span>
      <span className="ao-home-progress"><span>{count?(count.label||`工作包 ${count.done}／${count.total}`):progressEmpty}</span>{count?.total>0&&<span className="ao-progress-track" data-s={count.done===count.total?'done':'ai'} aria-label={count.label||`執行工作包完成 ${count.done}／${count.total}`}><span style={{width:`${count.done/count.total*100}%`}}/></span>}</span>
      <span className="hy-pill" data-s={open?'you':p.stageTone||(p.status==='completed'?'done':'ai')}>{open?`${open} 項待你處理`:activityLabel(detail || p)}</span>
      <small className="ao-project-time">{date(detail?.updated_at)}</small>
    </button>})}</div>
  </section>
}
