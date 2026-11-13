import {useState} from 'react'
import {activityLabel, progress} from '../lib/aiOffice.mjs'
import {shownStage} from '../lib/officeFlow.mjs'
import {listedPendingTotal, openApprovalCount, pendingLabel, sortByPending} from '../lib/officeHomeList.mjs'
import {PROJECT_STAGES} from '../lib/projectStages.mjs'
import {matchesOwnerFilter, ownerBotChoices, ownerBotGroups} from '../life-island/worldData'

// 統計卡與篩選只用 5 種專案階段的名稱（規劃中／待你決定／執行中／待審／完成），不用同義詞。
// 「待你決定」是整份專案列表上「待你核示 N 則」的總和，不跟搜尋或篩選一起變，也不含沒掛專案的舊核示。
const FILTERS=[['all','全部'],...PROJECT_STAGES.map(s=>[s.key,s.label])]
const OWNER=Object.fromEntries(ownerBotChoices().map(bot=>[bot.value,bot.label]))
const date=value=>value?new Date(value*1000).toLocaleString('zh-TW',{hour12:false}):'尚未記錄'

export default function OfficeHome({projects,details,inbox=[],loaded,error,creating,onReload,onCreate,onSelect,onOpenMeeting,creation,registry,title = 'Bot Office', progressOf = null, progressEmpty = '工作包詳情未讀取', hidePackageGap = false, updated = ''}){
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[bot,setBot]=useState('all')
  const pending=id=>openApprovalCount(id,inbox)
  const missing=projects.length-Object.values(details).filter(Boolean).length
  const inStage=key=>projects.filter(p=>shownStage(p)===key).length
  const stageCount=key=>key==='hy_decision'?listedPendingTotal(projects,inbox):inStage(key)
  const ownerOf=p=>p.owner_bot||p.ownerBot||''
  const match=p=>(filter==='all'||shownStage(p)===filter)&&matchesOwnerFilter(ownerOf(p), bot)
  const countOf=p=>{const detail=details[p.id];return progressOf?progressOf(p,detail):(detail?progress(detail):null)}
  const visible=sortByPending(projects.filter(p=>(!query.trim() || `${p.title} ${p.goal || ''}`.toLowerCase().includes(query.trim().toLowerCase())) && match(p)), p=>pending(p.id))
  const ready=loaded&&!error
  const tiles=[...PROJECT_STAGES.map(s=>[s.key,s.label,stageCount(s.key),s.tone]),['all','專案總數',projects.length,'wait']]
  const openMeeting=id=>{ if(onOpenMeeting) onOpenMeeting(id); else onSelect(id) }
  return <section className="ao-home" aria-label={`${title} 專案總表`}>
    <header className="ao-home-head"><div><small>HY Life OS</small><h1>{title}</h1><p className="ao-lede">{updated?`同一個專案列表。資料時間 ${updated}。`:'同一個專案列表。'}</p></div><div className="ao-home-actions"><button className="ao-btn" aria-label="重新整理專案" onClick={onReload}>重新整理</button><button className="ao-btn ao-primary" aria-expanded={creating} onClick={onCreate}>新增專案</button></div></header>
    <div className="ao-tiles" role="group" aria-label="工作摘要">{tiles.map(([key,name,value,tone])=><button key={name} className={`ao-tile${key==='hy_decision'&&value?' needs-you':''}`} data-s={tone} aria-pressed={filter===key} onClick={()=>setFilter(key)}><small>{name}</small><strong>{ready&&value!=null?value:'—'}</strong></button>)}</div>
    {missing>0&&!error&&!hidePackageGap&&<p className="ao-muted">有 {missing} 個專案詳情未讀取；工作包數量尚不完整。</p>}
    {error&&<div role="alert"><p>{error}</p><button className="ao-btn" onClick={onReload}>重試讀取</button></div>}
    {creation&&<div className="ao-home-create">{creation}</div>}
    {registry}
    <div className="ao-home-controls">
      <input type="search" aria-label="搜尋專案" placeholder="搜尋專案名稱或目標" value={query} onChange={e=>setQuery(e.target.value)}/>
      <div className="ao-filter-row"><span>負責 Bot</span><div className="ao-chips ao-owner-filters" role="group" aria-label="負責 Bot"><button type="button" aria-pressed={bot==='all'} onClick={()=>setBot('all')}>全部</button>{ownerBotGroups().map(group=><span className="ao-owner-group" key={group.lead.value}><button type="button" aria-pressed={bot===group.lead.value} onClick={()=>setBot(group.lead.value)}>{group.lead.label}</button>{group.members.length>0&&<span className="ao-owner-members">{group.members.map(member=><button key={member.value} type="button" aria-pressed={bot===member.value} onClick={()=>setBot(member.value)}>{member.label}</button>)}</span>}</span>)}</div></div>
      <div className="ao-filter-row"><span>屬性</span><div className="ao-chips" role="group" aria-label="屬性">{FILTERS.map(([key,label])=><button key={key} type="button" aria-pressed={key===filter} onClick={()=>setFilter(key)}>{label}</button>)}</div></div>
    </div>
    {!loaded&&<p role="status">正在讀取正式專案…</p>}
    {ready&&!visible.length&&<div className="ao-card ao-home-empty"><h3>{projects.length?'沒有符合條件的專案':'開始你的第一個專案'}</h3><p>{projects.length?'調整搜尋、負責 Bot 或屬性。':'寫下目標，PI 會先研究並提出 AI 執行規劃書。'}</p></div>}
    <div className="ao-home-projects" aria-label="專案列表">{visible.map(p=>{const detail=details[p.id],count=countOf(p),open=pending(p.id),owner=OWNER[ownerOf(p)]||ownerOf(p);return <div className={`ao-project-line${open?' needs-you':''}`} key={p.id} onClick={()=>onSelect(p.id)}>
      <button type="button" className="ao-project-open" onClick={()=>onSelect(p.id)}>
        <span className="ao-project-title"><b>{p.title}</b><span className="ao-project-goal">{p.goal||'目標尚未記錄'}</span></span>
        <span className="ao-project-stage">{p.phase} {p.milestone_id||''}<small>負責 {owner||'尚未指定'}</small></span>
        <span className="ao-home-progress"><span>{count?(count.label||`工作包 ${count.done}／${count.total}`):progressEmpty}</span>{count?.total>0&&<span className="ao-progress-track" data-s={count.done===count.total?'done':'ai'} aria-label={count.label||`執行工作包完成 ${count.done}／${count.total}`}><span style={{width:`${count.done/count.total*100}%`}}/></span>}</span>
        {open?<span className="ao-line-status ao-line-slot"/>:<span className="hy-pill ao-line-status" data-s={p.stageTone||(p.status==='completed'?'done':'ai')}>{activityLabel(detail || p)}</span>}
        <small className="ao-project-time">{date(detail?.updated_at)}</small>
      </button>
      {open>0&&<button type="button" className="hy-pill ao-pending-pill ao-line-status" data-s="you" onClick={event=>{event.stopPropagation();openMeeting(p.id)}}>{pendingLabel(open)}</button>}
    </div>})}</div>
  </section>
}
