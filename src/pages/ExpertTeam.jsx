import { useState, useEffect } from 'react'
import { authHeaders } from '../auth'
import './expert-team.css'

const base=import.meta.env.VITE_API_BASE || ''
async function api(path,body) {
  const res=await fetch(`${base}/api/ai-work-packages${path}`,{method:body?'POST':'GET',headers:{...authHeaders(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'})
  const data=await res.json()
  if(!res.ok)throw new Error(data.detail||data.error||`HTTP ${res.status}`)
  return data
}
function Avatar(){return <svg className="pi-avatar" viewBox="0 0 100 100" role="img" aria-label="PI 抽象導航者"><circle cx="50" cy="50" r="43" fill="var(--hy-ai-bg)" stroke="var(--hy-brand)"/><path d="M50 12 62 38 88 50 62 62 50 88 38 62 12 50 38 38Z" fill="var(--hy-surface)" stroke="var(--hy-brand)" strokeWidth="2"/><rect x="34" y="37" width="32" height="27" rx="12" fill="var(--hy-header)"/><circle cx="43" cy="49" r="3" fill="var(--hy-surface)"/><circle cx="57" cy="49" r="3" fill="var(--hy-surface)"/><path d="M43 57h14" stroke="var(--hy-surface)" strokeWidth="2"/></svg>}
const stateLabel={PUBLISHED:'已發布',CANDIDATE:'待你確認',DISABLED:'已停用'}
export default function ExpertTeam(){
 const [data,setData]=useState(null),[projects,setProjects]=useState([]),[project,setProject]=useState(''),[version,setVersion]=useState('1.0.0'),[tab,setTab]=useState('experts'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[detail,setDetail]=useState(null),[requests,setRequests]=useState([])
 async function load(){const [d,p]=await Promise.all([api('/experts/pi/readiness'),api('/projects')]);setData(d);setProjects(p)}
 useEffect(()=>{load().catch(e=>setError(e.message))},[])
 async function act(fn){setBusy(true);setError('');try{await fn();await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 const skills=(data?.skills||[]).filter(s=>s.version===version)
 const pins=skills.map(({id,version,content_hash})=>({id,version,content_hash}))
 const canExpert=skills.length===8&&skills.every(s=>s.state==='PUBLISHED')
 return <div className="hy expert-team hy-stack">
  <header className="hy-header"><span className="hy-badge">HY</span><span className="hy-header-sub">專家團</span></header>
  <div className="hy-pagehead"><div><h1 className="hy-title">PI · 專案整合專家</h1><p className="hy-lede">研究、規劃與整合建議 · GPT Chat</p></div><button className="hy-btn" disabled={busy} onClick={()=>act(load)}>重新整理</button></div>
  {error&&<div role="alert" className="hy-alert">讀取或操作失敗：{error}。請重新整理；登入失效時請重新登入。</div>}
  {!data&&!error&&<p className="hy-empty">讀取版本與發布狀態中…</p>}
  {data&&<section className={`hy-card is-focus ${data.actions.length?'needs-you':''}`}><div className="hy-card-head"><h2 className="hy-card-title">{data.ready?'PI 已可供正式 Lab 測試':'PI 正式發布尚未完成'}</h2><span className="hy-pill" data-s={data.ready?'done':'you'}>{data.ready?'已發布':'待你確認'}</span></div><p>先審閱並核准八個 Skill，再建立 PI Expert 發布申請。每一版本分別核准。</p>
   <div className="pi-controls"><label>核准紀錄所屬專案<select value={project} onChange={e=>setProject(e.target.value)}><option value="">請選既有專案</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>建立候選版本<input value={version} onChange={e=>setVersion(e.target.value)} aria-label="候選版本"/></label></div>
   <div className="pi-controls"><button className="hy-btn" disabled={busy||!project} onClick={()=>act(()=>api('/experts/pi/skill-publication-requests',{project_id:project,version}))}>登錄八個 Skill 並申請發布</button><button className="hy-btn" disabled={busy||!project||!canExpert} onClick={()=>act(()=>api('/experts/pi/expert-publication-request',{project_id:project,version,skills:pins}))}>建立 PI Expert 發布申請</button></div>
   {data.actions.map(a=><div key={a.id} className="pi-action"><b>{a.title}</b><details><summary>審閱發布內容與版本</summary><pre>{JSON.stringify(a.payload,null,2)}</pre></details><div className="pi-controls"><button className="hy-btn" onClick={()=>act(async()=>{if(a.payload.skill){const s=a.payload.skill;setDetail(await api(`/experts/pi/skills/${s.id}/${s.version}/${s.content_hash}`))}else{const e=data.experts.find(e=>e.version===a.payload.expert.version);setDetail(e)}})}>查看完整內容</button><button className="hy-btn is-primary" disabled={busy} onClick={()=>act(()=>api(`/inbox/${a.id}/resolve`,{answer:'APPROVED'}))}>核准此版本發布</button><button className="hy-btn" disabled={busy} onClick={()=>act(()=>api(`/inbox/${a.id}/resolve`,{answer:'REJECTED'}))}>拒絕發布</button></div></div>)}
  </section>}
  <nav className="hy-tabs">{[['experts','專家版本'],['skills','Skill 版本'],['requests','能力缺口']].map(([id,label])=><button key={id} className="hy-tab" aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  {tab==='experts'&&<><section className="hy-card"><div className="pi-profile"><Avatar/><div><h2 className="hy-card-title">PI｜Project Integrator</h2><p>抽象導航者 · 研究、需求、能力評估、規劃、拆解、審查、協作、修訂</p><p className="hy-note">僅提出建議；正式流程由 HY Life OS 控制。</p></div></div></section>{!data?.experts.length&&<p className="hy-empty">尚未登錄 PI Expert。核准八個 Skill 後可建立候選。</p>}{data?.experts.map(e=><section className="hy-card" key={e.version}><div className="hy-card-head"><h3 className="hy-card-title">PI @ {e.version}</h3><span className="hy-pill" data-s={e.usable?'done':'you'}>{stateLabel[e.state]}{e.state==='PUBLISHED'&&!e.usable?' · 綁定需檢查':''}</span></div><p>能力：{(e.capabilities||[]).join('、')}</p><p className="hy-note">{e.content_hash}</p><ul>{e.skills.map(s=><li key={s.id}>{s.id} @ {s.version}<span className="hy-note"> · {s.content_hash.slice(0,12)}</span></li>)}</ul></section>)}</>}
  {tab==='skills'&&<>{!data?.skills.length&&<p className="hy-empty">尚無 PI Skill 候選。請先登錄並申請發布。</p>}{data?.skills.map(s=><section className="hy-card" key={s.id+s.version}><div className="hy-card-head"><h3 className="hy-card-title">{s.name} @ {s.version}</h3><span className="hy-pill" data-s={s.state==='PUBLISHED'?'done':s.state==='DISABLED'?'bad':'you'}>{stateLabel[s.state]}</span></div><p>{s.description}</p><p className="hy-note">{s.id} · {s.content_hash}</p><button className="hy-btn" onClick={()=>act(async()=>setDetail(await api(`/experts/pi/skills/${s.id}/${s.version}/${s.content_hash}`)))}>查看 Skill 內容</button></section>)}</>}
  {tab==='requests'&&<section className="hy-card"><h2 className="hy-card-title">專案能力缺口</h2><button className="hy-btn" disabled={!project||busy} onClick={()=>act(async()=>setRequests((await api(`/experts/capabilities/requests/${encodeURIComponent(project)}`)).requests))}>讀取所選專案缺口</button>{requests.length?requests.map(r=><p key={r.request_id}>{r.need} · {r.state}</p>):<p className="hy-empty">選擇專案後讀取；沒有已登錄請求時顯示空清單。</p>}</section>}
  {detail&&<section className="hy-card"><div className="hy-card-head"><h2 className="hy-card-title">完整版本內容</h2><button className="hy-btn" onClick={()=>setDetail(null)}>關閉內容</button></div><pre className="pi-detail">{detail.markdown||JSON.stringify(detail,null,2)}</pre></section>}
 </div>
}
