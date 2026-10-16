import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ControlCenterV5, { Inbox, DeleteZone, SpecChangeBox } from './ControlCenterV5'
import { request, readProjectSummary } from '../aiWorkV5Data'
import { authHeaders, ensureAccessToken, expireSession } from '../auth'
import { OFFICE_TABS, TAB_NOTES, isPending, requester, activityLabel, PACKAGE_STATUS, progress, milestones, journal, safeUrl, driveFile } from '../lib/aiOffice.mjs'
import { laneLabel } from '../lib/lanes'
import OfficeHome from './OfficeHome'
import { PlanSummary, PlanDocument, CapacityBanner } from './PlanViews'
import './ai-office-v1.css'
import {ProjectRouter,ProjectRouterLog} from '../components/RouterControls'

const base = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const when = value => value ? new Date(value * 1000).toLocaleString('zh-TW', { hour12: false }) : '尚未記錄'
const text = value => typeof value === 'string' ? value : value ? JSON.stringify(value) : '尚未提供'
const ppath = id => `/projects/${encodeURIComponent(id)}`
async function office(path, options = {}) {
  if (!await ensureAccessToken()) { expireSession(); throw new Error('登入已過期，請重新登入。') }
  const response = await fetch(`${base}/api/ai-office${path}`, { cache: 'no-cache', ...options,
    headers: { ...authHeaders(), ...(options.body ? { 'Content-Type': 'application/json' } : {}) } })
  if (response.status === 401) { expireSession(); throw new Error('登入已過期，請重新登入。') }
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(response.status === 404 ? 'AI Office API 尚未部署或資料不存在，請確認後重試。' : text(data.detail || `伺服器回應 ${response.status}`)) }
  return response.json()
}
function Link({ href, children }) { const url = safeUrl(href); return url ? <a href={url} target="_blank" rel="noopener noreferrer">{children} ↗</a> : <span>{children}（連結未就緒）</span> }
function Card({ title, children, className = '' }) { return <section className={`ao-card ${className}`}><h2>{title}</h2>{children}</section> }
function Empty({ children }) { return <p className="ao-empty">{children}</p> }
function Markdown({ value }) { return value ? <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{a: ({href,children}) => <Link href={href}>{children}</Link>}}>{value}</ReactMarkdown> : <Empty>正式文件尚未提供。</Empty> }

export default function AIOfficeV1() {
  return <div className="ao"><ControlCenterV5 title="AI Office" loadData={loadOffice} renderCreation={props=><OfficeCreate {...props}/>} renderHome={props=><><CapacityBanner/><OfficeHome {...props}/></>} renderProject={({project,onBack,onDeleted}) => <OfficeProject key={project.id} id={project.id} onBack={onBack} onDeleted={onDeleted} />} /></div>
}

function OfficeCreate({onCancel,onCreated}) {
  const [form,setForm]=useState({title:'',goal:'',description:'',owner_bot:'hy'}),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const projectId=useRef(`project-${crypto.randomUUID()}`)
  const set=key=>e=>setForm(f=>({...f,[key]:e.target.value}))
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{const id=projectId.current;await office('/projects',{method:'POST',body:JSON.stringify({...form,title:form.title.trim(),goal:form.goal.trim(),project_id:id})});await onCreated(id)}catch(e){setError(e.message==='PI_NOT_READY'?'PI 尚未就緒，請稍後重試。':e.message)}finally{setBusy(false)}}
  return <form className="cc5-panel cc5-form" onSubmit={submit} aria-label="新增專案">
    <h2>新增專案</h2>
    <label className="cc5-field">名稱<input required maxLength={200} value={form.title} onChange={set('title')}/></label>
    <label className="cc5-field">目標<textarea required maxLength={30000} value={form.goal} onChange={set('goal')}/></label>
    <label className="cc5-field">說明（選填）<textarea maxLength={10000} value={form.description} onChange={set('description')}/></label>
    <label className="cc5-field">負責 Bot<select value={form.owner_bot} onChange={set('owner_bot')}>{[['hy','HY'],['950157','950157'],['sam','Sam'],['family','小因']].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    <p className="ao-muted">PI 會先研究你的目標並展開規劃，完成後再交給你審閱。</p>
    {error&&<p role="alert">{error}</p>}
    <div className="cc5-two"><button type="button" disabled={busy} onClick={onCancel}>取消</button><button className="ao-primary" disabled={busy||!form.title.trim()||!form.goal.trim()}>{busy?'建立中…':'建立專案'}</button></div>
  </form>
}

async function loadOffice() {
  const [projects,inbox]=await Promise.all([office('/projects'),office('/actions')])
  const results=await Promise.allSettled(projects.map(p=>readProjectSummary(office, ppath(p.id))))
  const details=Object.fromEntries(results.map((r,i)=>[projects[i].id,r.status==='fulfilled'?r.value:null]))
  return {projects,inbox,details}
}

const STATE_TONE = { RUNNING:'ai', READY:'ai', WAITING:'wait', BLOCKED:'you', FAILED:'bad', COMPLETED:'done' }
function Pill({ s, children }) { return <span className="hy-pill" data-s={s}>{children}</span> }

function OfficeProject({ id, onBack, onDeleted }) {
  const [project, setProject] = useState(null), [error, setError] = useState(''), [tab, setTab] = useState('overview')
  const [selectedWork,setSelectedWork] = useState(null), [editing,setEditing] = useState(false)
  const generation=useRef(0)
  const reload = useCallback(async () => {const version=++generation.current;try { const value=await office(`${ppath(id)}?detail=full`);if(version===generation.current){setProject(value);setError('')} }catch(e){if(version===generation.current){setProject(null);setError(e.message)}}},[id])
  useEffect(()=>{reload();return()=>{generation.current++}},[reload])
  function openExecution(work) {setSelectedWork(work);setTab('execution')}
  if (!project) return <section className="ao"><button className="ao-back" onClick={onBack}>‹ AI Office</button>{error ? <div role="alert"><p>{error}</p><button onClick={reload}>重試讀取</button></div> : <p role="status">正在讀取正式專案資料…</p>}</section>
  const count=progress(project)
  const plan=project.plan || project.packages?.find(p=>p.type==='PROJECT_PLANNING')?.result?.plan || null
  const pending=project.actions.filter(isPending)
  const folder=project.drive?.project_folder_id
  return <section className="ao ao-project">
    <button className="ao-back" onClick={onBack}>‹ AI Office</button>
    <header className="ao-header">
      <div className="ao-header-top"><h1>{project.title}</h1>{plan?.project_type && <span className="ao-type">{plan.project_type}</span>}<Pill s={pending.length?'you':project.status==='completed'?'done':'ai'}>{pending.length?'待你決定':activityLabel(project)}</Pill>
        <div className="ao-header-actions"><button aria-expanded={editing} onClick={()=>setEditing(v=>!v)}>編輯專案</button>{project.permissions.delete ? <div className="cc5"><DeleteZone project={project} onDeleted={onDeleted}/></div> : <span className="ao-muted">刪除專案僅限 HY 本人</span>}</div></div>
      <p className="ao-goal" title={project.goal}>{project.goal}</p>
      <div className="ao-header-meta"><span>階段 <b>{project.phase} {project.milestone_id || ''}</b></span><span>工作包 <b>{count.done}／{count.total}</b></span><span>開始 <b>{when(project.started_at)}</b></span><span>最近紀錄 <b>{when(project.updated_at)}</b></span>{folder && <span>Drive <Link href={`https://drive.google.com/drive/folders/${folder}`}>專案資料夾</Link></span>}</div>
    </header>
    {editing && <Card title="編輯專案（正式規格變更）"><p className="ao-muted">目標與範圍走正式規格變更，由你核准後才生效。</p>{project.plan_state==='APPROVED' && project.phase==='執行期' && project.milestone_id ? <div className="cc5"><SpecChangeBox project={project} onChanged={reload} setError={setError} goInbox={()=>setTab('overview')}/></div> : <Empty>目前階段未開放規格變更；請到會議室提出意見。</Empty>}</Card>}
    <nav className="ao-tabs" aria-label="AI Office 專案分頁">{OFFICE_TABS.map(([key,label])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}>{label}{key==='overview' && pending.length>0 && <span>{pending.length}</span>}</button>)}</nav>
    <p className="ao-tabnote">{TAB_NOTES[tab]}</p>
    {error && <p role="alert">{error}</p>}
    <CapacityBanner/>
    <div hidden={tab!=='overview'}><Overview project={project} pending={pending} onExecution={openExecution} reload={reload} setError={setError}/></div>
    <div hidden={tab!=='meeting'}><Meeting project={project} reload={reload} onOverview={()=>setTab('overview')}/></div>
    <div hidden={tab!=='execution'}><ProjectRouter projectId={project.id} active={tab==='execution'}/><Execution project={project} plan={plan} selected={selectedWork} select={setSelectedWork}/></div>
    <div hidden={tab!=='outputs'}><Results project={project} active={tab==='outputs'} onOverview={()=>setTab('overview')}/></div>
    <div hidden={tab!=='log'}><ProjectRouterLog projectId={project.id} active={tab==='log'}/><Log project={project} onOverview={()=>setTab('overview')} onExecution={openExecution}/></div>
  </section>
}

function DecisionBody({ d }) {
  return <div className="ao-decision-body">
    <p><b>為什麼要你決定：</b>{d.why}</p>
    <ol className="ao-options">{(d.options||[]).map((o,i)=><li key={i} className={o.label===d.recommendation?'is-recommended':undefined}><b>{o.label}</b>{o.impact && <small>{o.impact}</small>}{o.label===d.recommendation && <Pill s="ai">PI 推薦</Pill>}</li>)}</ol>
    {!(d.options||[]).some(o=>o.label===d.recommendation) && <p><b>PI 推薦：</b>{d.recommendation}</p>}
    {d.evidence?.length>0 && <p className="ao-muted">證據：{d.evidence.join('、')}</p>}
    {d.deadline && <p className="ao-muted">最晚：{d.deadline}</p>}
  </div>
}

function Overview({project,pending,onExecution,reload,setError}) {
  const ms=milestones(project)
  const active=project.packages.filter(p=>['RUNNING','READY','BLOCKED','FAILED'].includes(p.status) && p.type!=='PROJECT_REPORT' && !String(p.milestone_id || '').startsWith('PARKED:'))
  const decisions=project.decisions || {}
  return <div className="ao-overview">
    <div className="ao-overview-main">
      <section className={`ao-card ao-decide${pending.length?' is-focus':''}`} aria-labelledby="ao-decide-title">
        <div className="ao-card-head"><h2 id="ao-decide-title">待你決定</h2>{pending.length>0 && <Pill s="you">{pending.length} 項</Pill>}</div>
        {pending.length>0 && <div className="cc5"><Inbox items={pending.map(a=>decisions[a.action_id] ? {...a, question:'', reason:''} : a)} project={project} onChanged={reload} setError={setError} renderExtra={a=>decisions[a.action_id] && <DecisionBody d={decisions[a.action_id]}/>}/></div>}
        {!pending.length && <Empty>目前沒有需要你決定的事。PI 需要你時會出現在這裡。</Empty>}
      </section>
      <Card title="AI 正在做什麼">{active.map(p=><button className="ao-row ao-work" key={p.id} onClick={()=>onExecution(p.id)}><span className="ao-lane">{laneLabel(p.executor)}</span><span className="ao-work-main"><b>{p.task}</b><small>{p.milestone_id || '規劃期'}</small></span><Pill s={STATE_TONE[p.status] || 'wait'}>{PACKAGE_STATUS[p.status] || p.status}</Pill></button>)}{!active.length && <Empty>沒有執行中或待開始的工作包。</Empty>}</Card>
    </div>
    <Card title="里程碑" className="ao-overview-side"><ol className="ao-timeline">{ms.map(m=>{const done=m.packages.filter(p=>p.status==='COMPLETED').length;const current=m.id===project.milestone_id;return <li key={m.id} className={current?'is-current':done===m.packages.length&&m.packages.length?'is-done':undefined}><button onClick={()=>onExecution(m.id)}><b>{m.id} {m.name}</b><small>{done}／{m.packages.length} 工作包{current?' · 目前':''}</small></button></li>})}</ol>{!ms.length && <Empty>正式規劃尚未提供里程碑。</Empty>}</Card>
  </div>
}

function FileInputs({project,selected,setSelected,reload,onBusy}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[fileId,setFileId]=useState('')
  useEffect(()=>{onBusy?.(busy)},[busy,onBusy])
  const add=id=>setSelected(previous=>[...new Set([...previous,id])])
  async function upload(file) {if(!file)return;if(file.size>8*1024*1024 || !file.size){setError('檔案須為 1 byte 至 8 MiB。');return}setBusy(true);setError('');try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file)});const saved=await request(`${ppath(project.id)}/files`,{method:'POST',body:JSON.stringify({request_key:crypto.randomUUID(),filename:file.name,mime_type:file.type||'application/octet-stream',data_base64:data})});add(saved.file_id);await reload()}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function importFile(){setBusy(true);setError('');try{const saved=await office(`${ppath(project.id)}/drive-reference`,{method:'POST',body:JSON.stringify({file_id:fileId.trim()})});if(!saved.readback_verified)throw new Error('Drive 尚未完成讀回驗證');add(saved.file_id);setFileId('');await reload()}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <fieldset className="ao-files" disabled={busy}><legend>附件與 Google Drive</legend><label>上傳檔案至專案 Drive<input aria-label="上傳專案附件" type="file" onChange={e=>upload(e.target.files?.[0])}/></label>
    <label>選取已登錄的專案 Drive 檔案<select aria-label="選取專案 Drive 檔案" value="" onChange={e=>e.target.value && add(e.target.value)}><option value="">選取檔案…</option>{project.files.map(f=><option key={f.file_id} value={f.file_id}>{f.filename}</option>)}</select></label>
    <label>匯入其他 Google Drive 檔案 ID<input value={fileId} onChange={e=>setFileId(e.target.value)} placeholder="Google Drive 檔案 ID"/></label><button type="button" disabled={!/^[A-Za-z0-9_-]{10,200}$/.test(fileId.trim())} onClick={importFile}>複製到專案 references 並驗證</button>
    <small>全域 Drive 選檔器未就緒。匯入會保留來源 ID；上傳成功後才顯示已保存。</small>
    {selected.map(id=><div key={id}><Link href={driveFile(id)}>{project.files.find(f=>f.file_id===id)?.filename || id}</Link> <button type="button" onClick={()=>setSelected(v=>v.filter(x=>x!==id))}>移除選取</button></div>)}
    {busy && <p role="status">正在傳送並驗證 Drive，尚未完成保存…</p>}{error && <p role="alert">{error}</p>}
  </fieldset>
}
function Contribution({project,reload,onSent}) {
  const [content,setContent]=useState(''),[selected,setSelected]=useState([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[uploading,setUploading]=useState(false)
  async function send(e){e.preventDefault();setBusy(true);setMessage('');try{const attachments=selected.map(id=>({file_id:id,filename:project.files.find(f=>f.file_id===id)?.filename,url:driveFile(id)}));await request(`${ppath(project.id)}/suggestions`,{method:'POST',body:JSON.stringify({content:[content.trim(),attachments.length?'附件（已登錄於本專案）：'+JSON.stringify(attachments):''].filter(Boolean).join('\n')})});setContent('');setSelected([]);setMessage('已提交至既有專案工作流程，等待工作包接手；不代表 PI 已回覆。');await reload();onSent?.()}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  return <form onSubmit={send}><label>意見或補充資料<textarea value={content} maxLength={8000} onChange={e=>setContent(e.target.value)}/></label><FileInputs project={project} selected={selected} setSelected={setSelected} reload={reload} onBusy={setUploading}/><button className="ao-primary" disabled={busy || uploading || (!content.trim()&&!selected.length)}>送給 PI</button>{message && <p role="status">{message}</p>}</form>
}

const SUGGESTION_STATE = { PENDING:'已送出', DELIVERED:'AI 已讀取', CONSUMED:'處理中', REVIEW:'待你驗收', DONE:'結案' }
function Meeting({project,reload,onOverview}) {
  const events=journal(project).filter(e=>e.kind==='human' || e.action).sort((a,b)=>a.at-b.at)
  const lanes=[...new Set(project.packages.map(p=>p.executor))]
  return <div className="ao-meeting">
    <section className="ao-card ao-thread-card"><h2>與 PI 的對話</h2><p className="ao-muted">正式的建議、補充與決策紀錄；PI 即時對話尚未接上。</p>
      <div className="ao-thread">{events.map(e=><article className={`ao-message${e.kind==='human'?' is-me':''}`} key={e.id}><div><b>{e.actor}</b> <time>{when(e.at)}</time>{e.detail && SUGGESTION_STATE[e.detail] && <Pill s={e.detail==='REVIEW'?'you':'wait'}>{SUGGESTION_STATE[e.detail]}</Pill>}</div><p>{e.text}</p>{e.action && <button onClick={onOverview}>到概況處理</button>}</article>)}{!events.length && <Empty>還沒有對話。從下方送出第一則意見。</Empty>}</div>
      <div className="ao-composer"><Contribution project={project} reload={reload}/></div>
    </section>
    <Card title="這個專案的團隊" className="ao-team">{project.team.map(e=><p key={e.id+e.version}><b>{e.name}</b> <small>v{e.version} · {e.state==='PUBLISHED'?'已發布':'版本待確認'}</small></p>)}{!project.team.length && <p className="ao-muted">由 PI 依 AI 執行規劃書配置專家。</p>}<h3>使用的通道</h3>{lanes.map(e=><p key={e}>{laneLabel(e)}</p>)}<p className="ao-muted">HY 代理：{({hy:'HY','950157':'950157',sam:'Sam',family:'小因'})[project.owner_bot] || project.owner_bot}（Grok Bot 代表 HY 操作，不由 PI 指派）</p></Card>
  </div>
}

function Execution({project,plan,selected,select}) {
  const [mode,setMode]=useState('summary'),[ratio,setRatio]=useState(60),[focus,setFocus]=useState('')
  const container=useRef(null),dragging=useRef(false),[drag,setDrag]=useState(false)
  const rows=milestones(project)
  // 從概況點里程碑／工作包進來：切到「規劃文件」並跳到對應章節。
  useEffect(()=>{if(selected){const pkg=project.packages.find(p=>p.id===selected);setFocus(pkg?.milestone_id || selected);setMode(m=>m==='summary'?'split':m)}},[selected])
  useEffect(()=>{if(!drag)return;const move=e=>{const rect=container.current.getBoundingClientRect();setRatio(Math.max(30,Math.min(75,(e.clientX-rect.left)/rect.width*100)))};const up=()=>{dragging.current=false;setDrag(false)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)}},[drag])
  return <><div className="ao-toolbar" role="group" aria-label="執行計畫顯示模式">{[['summary','規劃摘要'],['split','時程＋文件'],['work','時程與執行'],['document','完整文件']].map(([key,label])=><button key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}</div>
    {mode==='summary' && <PlanSummary plan={plan} project={project} onOpenDocument={()=>setMode('document')}/>}
    <div className={`ao-execution ao-mode-${mode}`} ref={container} style={{'--work-ratio':`${ratio}%`}} hidden={mode==='summary'}>
      <section className="ao-card ao-work-pane" hidden={mode==='document'} aria-label="時程與執行"><h2>時程與執行</h2>{rows.map(m=><details key={m.id} open={selected===m.id || m.packages.some(p=>p.id===selected) || !selected}><summary onClick={()=>{select(m.id);setFocus(m.id)}}><b>{m.id} {m.name}</b></summary><p>目標：{text(m.goal || m.objective)}</p><p>交付：{text(m.deliverables)}</p><p>驗收條件：{text(m.acceptance_criteria)}</p>{m.packages.map(p=><article key={p.id} className="ao-package"><button className="ao-row" aria-pressed={selected===p.id} onClick={()=>{select(p.id);setFocus(m.id)}}><b>{p.task}</b><span>{PACKAGE_STATUS[p.status]} · {p.executor}</span></button><p>前置相依：{p.dependencies.length?p.dependencies.map(id=>project.packages.find(w=>w.id===id)?.task || id).join('、'):'無'}</p><p>交付成果：{text(p.expected_outputs)}</p><p>驗收條件：{text(p.acceptance_criteria)}</p>{p.status==='BLOCKED' && <p className="ao-muted">阻塞依據：{text(p.requires)}</p>}</article>)}</details>)}{!rows.length && <Empty>尚無正式 Milestone。小型專案不強制固定里程碑數量。</Empty>}</section>
      <div className="ao-splitter" hidden={mode!=='split'} role="separator" aria-label="調整雙欄比例" aria-orientation="vertical" aria-valuemin={30} aria-valuemax={75} aria-valuenow={Math.round(ratio)} tabIndex={0} onPointerDown={()=>{dragging.current=true;setDrag(true)}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();setRatio(e.key==='Home'?60:Math.max(30,Math.min(75,ratio+(e.key==='ArrowLeft'?-5:5))))}}}/>
      <div className="ao-doc-slot" hidden={mode==='work'}><PlanDocument project={project} plan={plan} focus={focus}/></div>
    </div></>
}

function Results({project,active,onOverview}) {
  const [chosen,setChosen]=useState(''),[html,setHtml]=useState(null),[error,setError]=useState(''),[full,setFull]=useState(false)
  const history=project.report?.history || [], fileId=chosen || project.report?.latest?.file_id
  useEffect(()=>{if(!active || !fileId)return;let alive=true;setHtml(null);setError('');office(`${ppath(project.id)}/reports/${encodeURIComponent(fileId)}`).then(data=>{if(alive)setHtml(data.html)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[active,fileId,project.id])
  useEffect(()=>{if(!full)return;const listener=e=>{if(e.key==='Escape')setFull(false)};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[full])
  const report=history.find(r=>r.file_id===fileId), checkpoints=project.quality?.checkpoints || [], folder=project.drive?.project_folder_id
  const tone=v=>v==='PASS'?'done':v==='CHANGES_REQUIRED'||v==='INSUFFICIENT_EVIDENCE'?'you':'wait'
  return <div className="ao-results">
    <Card title="成果報告" className={full?'ao-reader-full':''}><div className="ao-toolbar">{folder && <Link href={`https://drive.google.com/drive/folders/${folder}`}>開專案 Drive 資料夾</Link>}<label>報告版本<select aria-label="成果報告版本" value={fileId || ''} onChange={e=>setChosen(e.target.value)}>{!history.length && <option value="">尚無正式報告</option>}{history.map(r=><option key={r.file_id} value={r.file_id}>第 {r.revision} 版 · {when(r.created_at)}</option>)}</select></label><button disabled={!html} onClick={()=>setFull(v=>!v)}>{full?'離開完整閱讀':'完整閱讀'}</button></div><p className="ao-muted">最後更新：{when(report?.created_at)}{project.report?.stale?' · 最新報告落後於正式專案資料':''}</p>{error && <p role="alert">{error}</p>}{html ? <iframe title="正式 HTML 成果報告" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={html}/> : <Empty>{fileId?'報告讀取中或讀取失敗；不顯示預設內容。':`正式 HTML 報告未就緒（${project.report?.state || '未記錄'}）。`}</Empty>}</Card>
    <Card title="獨立審查"><p className="ao-muted">只審三個節點：規劃、重大里程碑、結案。PASS 只代表內容通過，是否核准仍在<button className="ao-inline" onClick={onOverview}>概況</button>決定。</p>{checkpoints.map(c=>{const p=project.packages.find(p=>p.id===c.review_package_id);return <details className="ao-review" key={c.checkpoint_id}><summary><span className="ao-review-kind">{c.kind}</span><b>{c.milestone_id || ''} 第 {c.round} 輪</b><Pill s={tone(c.verdict)}>{c.verdict || '審查中'}</Pill></summary><p>審查工作包：{p?.task || c.review_package_id} · {PACKAGE_STATUS[p?.status] || '尚未記錄'}</p><p>問題與補強：{text(p?.result?.summary || p?.result?.findings || '審查尚未交付')}</p>{(p?.result?.artifacts || []).map((a,i)=><p key={i}><Link href={driveFile(a.file_id)}>{a.title || '審查報告'}</Link></p>)}<details><summary>審查對象的版本證據</summary><pre>{JSON.stringify(c.target,null,2)}</pre></details></details>})}{!checkpoints.length && <Empty>尚無獨立審查紀錄。</Empty>}</Card>
  </div>
}

const LOG_FILTERS = [['all','全部'],['human','HY 與代理'],['system','系統與工作包'],['artifact','成果登錄']]
function Log({project,onOverview,onExecution}) {const [filter,setFilter]=useState('all');const events=journal(project).filter(e=>filter==='all'||e.kind===filter);return <Card title="工作日誌"><div className="ao-toolbar" role="group" aria-label="工作日誌篩選">{LOG_FILTERS.map(([k,l])=><button key={k} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{l}</button>)}</div><ol className="ao-journal">{events.map(e=><li key={e.id}><time>{when(e.at)}</time><b>{e.actor}</b><p>{e.text}</p>{e.detail && <details><summary>詳情</summary><p>{e.detail}</p></details>}{e.action && <button onClick={onOverview}>到概況</button>}{e.work && <button onClick={()=>onExecution(e.work)}>關聯工作包 {e.milestone}</button>}{e.file && <Link href={driveFile(e.file)}>成果</Link>}</li>)}</ol>{!events.length && <Empty>這個篩選沒有事件。</Empty>}</Card>}
