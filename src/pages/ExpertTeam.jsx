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
function SkillContent({body}){
 const fields=[['適用情境','applies'],['執行步驟','steps'],['交付成果','deliverables'],['驗收標準','acceptance'],['使用工具','tools'],['能力','capabilities'],['限制與禁止事項','excludes'],['常見錯誤','common_errors'],['品質依據','quality_references'],['資料來源','sources']]
 return <div className="hy-stack"><p>{body.description}</p>{fields.map(([title,key])=>body[key]?.length?<section key={key}><h4>{title}</h4><ol>{body[key].map((text,i)=><li key={i}>{text}</li>)}</ol></section>:null)}{body.good_example&&<p><b>合格範例：</b>{body.good_example}</p>}{body.reject_example&&<p><b>不合格範例：</b>{body.reject_example}</p>}<details><summary>完整工作說明</summary><div style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{body.markdown?.replace(/^---[\s\S]*?---\n/,'').replace(/^#{1,6} /gm,'')}</div></details><details><summary>技術資訊</summary><p>識別：{body.id} · 版本：{body.version}</p><p className="hy-note">{body.content_hash}</p><p>維護者：{body.maintainer}</p><p>發布依據：{body.publication_basis}</p></details></div>
}
export default function ExpertTeam(){
 const [data,setData]=useState(null),[tab,setTab]=useState('experts'),[version,setVersion]=useState('2.1.0'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[contents,setContents]=useState({}),[projects,setProjects]=useState([]),[project,setProject]=useState(''),[requests,setRequests]=useState([])
 async function load(){setData(await api('/experts/pi/readiness'))}
 useEffect(()=>{load().catch(e=>setError(e.message))},[])
 useEffect(()=>{if(tab==='requests')api('/projects').then(setProjects).catch(e=>setError(e.message))},[tab])
 async function act(fn){setBusy(true);setError('');try{await fn();await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 function key(s){return `${s.id}:${s.version}:${s.content_hash}`}
 async function read(s){const body=await api(`/experts/pi/skills/${s.id}/${s.version}/${s.content_hash}`);setContents(prev=>({...prev,[key(s)]:body}))}
 const skills=(data?.skills||[]).filter(s=>s.id==='pi-integrator'&&s.version===version)
 const pins=skills.map(({id,version,content_hash})=>({id,version,content_hash}))
 const canExpert=skills.length===1&&skills[0].state==='PUBLISHED'
 const expertActions=(data?.actions||[]).filter(a=>a.payload.expert)
 function decisions(a,readable){return <div className="pi-controls"><button className="hy-btn is-primary" disabled={busy||!readable} onClick={()=>act(()=>api(`/inbox/${a.id}/resolve`,{answer:'APPROVED'}))}>核准此版本發布</button><button className="hy-btn" disabled={busy} onClick={()=>act(()=>api(`/inbox/${a.id}/resolve`,{answer:'REJECTED'}))}>拒絕發布</button></div>}
 return <div className="hy expert-team hy-stack"><header className="hy-header"><span className="hy-badge">HY</span><span className="hy-header-sub">專家團</span></header><div className="hy-pagehead"><div><h1 className="hy-title">PI · 專案整合專家</h1><p className="hy-lede">一個 PI Skill，包含八項工作能力 · GPT Chat</p></div><button className="hy-btn" disabled={busy} onClick={()=>act(load)}>重新整理</button></div>
 {error&&<p role="alert" className="hy-alert">{error}。請重新整理；登入失效時請重新登入。</p>}{!data&&!error&&<p className="hy-empty">讀取中…</p>}
 <nav className="hy-tabs">{[['experts','專家版本'],['skills','Skill 版本'],['requests','能力缺口']].map(([id,label])=><button className="hy-tab" key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>{label}</button>)}</nav>
 {tab==='experts'&&<><section className="hy-card is-focus"><div className="pi-profile"><Avatar/><div><h2 className="hy-card-title">PI｜Project Integrator</h2><p>研究、需求、能力評估、規劃、拆解、審查、協作、修訂</p><p>{data?.ready?'已有正式版本可供 PI Lab 使用':'正式版本待核准'}</p></div></div><p>先至 Skill 分頁審閱並發布「PI 專案整合」，再核准此專家的版本配置。</p><div className="pi-controls"><label>Expert 版本<input aria-label="Expert 版本" value={version} onChange={e=>setVersion(e.target.value)}/></label><button className="hy-btn" disabled={busy||!canExpert} onClick={()=>act(()=>api('/experts/pi/expert-publication-request',{version,skills:pins}))}>建立 PI Expert 發布申請</button></div></section>{!data?.experts.length&&<p className="hy-empty">尚無 PI Expert 候選，請先完成 PI Skill 發布。</p>}{data?.experts.map(e=><section className="hy-card" key={e.version}><h3>PI @ {e.version} · {stateLabel[e.state]}</h3><p>能力：{e.capabilities?.join('、')}</p><h4>綁定 Skills</h4><ul>{e.skills.map(s=><li key={s.id}>{s.id==='pi-integrator'?'PI 專案整合':s.id} @ {s.version}</li>)}</ul>{expertActions.filter(a=>a.payload.expert.version===e.version).map(a=><div key={a.id}>{decisions(a,true)}</div>)}</section>)}</>}
 {tab==='skills'&&<><section className="hy-card is-focus"><h2 className="hy-card-title">PI 專案整合 Skill</h2><p>八項能力整合成一份工作方法，一個版本、一次 Skill 核准；所有專案共用。</p><div className="pi-controls"><label>Skill 版本<input aria-label="候選版本" value={version} onChange={e=>setVersion(e.target.value)}/></label><button className="hy-btn" disabled={busy} onClick={()=>act(()=>api('/experts/pi/skill-publication-requests',{version}))}>建立 PI Skill 候選與發布申請</button></div></section>{!data?.skills.length&&<p className="hy-empty">請先建立 PI Skill 候選。</p>}{data?.skills.filter(s=>s.id==='pi-integrator').map(s=>{const a=data.actions.find(a=>a.payload.skill&&key(a.payload.skill)===key(s));return <section className="hy-card" key={key(s)}><h3>{s.name} @ {s.version} · {stateLabel[s.state]}</h3><p>{s.description}</p><button className="hy-btn" disabled={busy} onClick={()=>act(()=>read(s))}>查看 Skill 內容</button>{contents[key(s)]&&<SkillContent body={contents[key(s)]}/>} {a&&decisions(a,!!contents[key(s)])}</section>})}</>}
 {tab==='requests'&&<section className="hy-card"><h2>專案能力缺口</h2><select value={project} onChange={e=>setProject(e.target.value)}><option value="">請選專案</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select><button className="hy-btn" disabled={!project||busy} onClick={()=>act(async()=>setRequests((await api(`/experts/capabilities/requests/${project}`)).requests))}>讀取所選專案缺口</button>{requests.map(r=><p key={r.request_id}>{r.need} · {r.state}</p>)}</section>}
 </div>
}
