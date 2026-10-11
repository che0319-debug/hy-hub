import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ControlCenterV5, { Inbox, DeleteZone, SpecChangeBox } from './ControlCenterV5'
import { request } from '../aiWorkV5Data'
import { authHeaders, ensureAccessToken, expireSession } from '../auth'
import { OFFICE_TABS, PROJECT_STATUS, PACKAGE_STATUS, progress, milestones, journal, safeUrl, driveFile } from '../lib/aiOffice.mjs'
import OfficeHome from './OfficeHome'
import './ai-office-v1.css'

const base = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const when = value => value ? new Date(value * 1000).toLocaleString('zh-TW', { hour12: false }) : '尚未記錄'
const text = value => typeof value === 'string' ? value : value ? JSON.stringify(value) : '尚未提供'
const ppath = id => `/projects/${encodeURIComponent(id)}`
async function office(path, options = {}) {
  if (!await ensureAccessToken()) { expireSession(); throw new Error('登入已過期，請重新登入。') }
  const response = await fetch(`${base}/api/ai-office${path}`, { cache: 'no-store', ...options,
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
  return <div className="ao"><ControlCenterV5 title="AI Office" loadData={loadOffice} renderHome={props=><OfficeHome {...props}/>} renderProject={({project,onBack,onDeleted}) => <OfficeProject key={project.id} id={project.id} onBack={onBack} onDeleted={onDeleted} />} /></div>
}

async function loadOffice() {
  const [projects,inbox]=await Promise.all([office('/projects'),office('/actions')])
  const results=await Promise.allSettled(projects.map(p=>office(ppath(p.id))))
  const details=Object.fromEntries(results.map((r,i)=>[projects[i].id,r.status==='fulfilled'?r.value:null]))
  return {projects,inbox,details}
}

function OfficeProject({ id, onBack, onDeleted }) {
  const [project, setProject] = useState(null), [error, setError] = useState(''), [tab, setTab] = useState('overview')
  const [selectedAction,setSelectedAction] = useState(null), [selectedWork,setSelectedWork] = useState(null)
  const generation=useRef(0)
  const reload = useCallback(async () => {const version=++generation.current;try { const value=await office(ppath(id));if(version===generation.current){setProject(value);setError('')} }catch(e){if(version===generation.current){setProject(null);setError(e.message)}}},[id])
  useEffect(()=>{reload();return()=>{generation.current++}},[reload])
  function openMeeting(action) {setSelectedAction(action);setTab('meeting')}
  function openExecution(work) {setSelectedWork(work);setTab('execution')}
  if (!project) return <section className="ao"><button onClick={onBack}>‹ 全部專案</button>{error ? <div role="alert"><p>{error}</p><button onClick={reload}>重試讀取</button></div> : <p role="status">正在讀取正式專案資料…</p>}</section>
  const count=progress(project)
  const plan=project.plan || project.packages?.find(p=>p.type==='PROJECT_PLANNING')?.result?.plan || null
  const pending=project.actions.filter(a=>a.status==='OPEN' && ['HY','owner'].includes(a.assigned_to))
  return <section className="ao ao-project">
    <button className="ao-back" onClick={onBack}>‹ 全部專案</button>
    <header className="ao-header"><div><p className="ao-eyebrow">AI Office · {plan?.project_type || '類型尚未記錄'}</p><h1>{project.title}</h1><p className="ao-goal">{project.goal}</p></div>
      <div className="ao-header-meta"><span className="ao-pill">{PROJECT_STATUS[project.status] || project.status}</span><span>{project.phase} {project.milestone_id || ''}</span><small>最近紀錄 {when(project.updated_at)}</small><span>工作包完成 {count.done}／{count.total}（進度參考）</span></div>
    </header>
    <nav className="ao-tabs" aria-label="AI Office 專案分頁">{OFFICE_TABS.map(([key,label])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}>{label}{key==='meeting' && pending.length>0 && <span>{pending.length}</span>}</button>)}</nav>
    {error && <p role="alert">{error}</p>}
    <div hidden={tab!=='overview'}><Overview project={project} plan={plan} pending={pending} onMeeting={openMeeting} onExecution={openExecution} onOutputs={()=>setTab('outputs')} reload={reload} onDeleted={onDeleted} setError={setError}/></div>
    <div hidden={tab!=='meeting'}><Meeting project={project} pending={pending} selected={selectedAction} select={setSelectedAction} reload={reload} setError={setError}/></div>
    <div hidden={tab!=='execution'}><Execution project={project} plan={plan} selected={selectedWork} select={setSelectedWork}/></div>
    <div hidden={tab!=='outputs'}><Results project={project} active={tab==='outputs'}/></div>
    <div hidden={tab!=='log'}><Log project={project} onMeeting={openMeeting} onExecution={openExecution}/></div>
  </section>
}

function Overview({project,plan,pending,onMeeting,onExecution,onOutputs,reload,onDeleted,setError}) {
  const [editing,setEditing]=useState(false)
  const ms=milestones(project), current=project.packages.filter(p=>['RUNNING','READY','WAITING','BLOCKED','FAILED'].includes(p.status) && p.type!=='PROJECT_REPORT' && !String(p.milestone_id || '').startsWith('PARKED:'))
  const files=[...project.files].sort((a,b)=>b.created_at-a.created_at).slice(0,4)
  return <>
    <div className="ao-overview-actions"><button onClick={()=>setEditing(v=>!v)}>編輯</button>{project.permissions.delete ? <div className="cc5"><DeleteZone project={project} onDeleted={onDeleted}/></div> : <span className="ao-muted">刪除專案僅限 HY 本人</span>}</div>
    {editing && <Card title="編輯專案（正式規格變更）"><p>目標與範圍沿用正式規格變更及人工核准流程，不直接改動狀態。</p>{project.plan_state==='APPROVED' && project.phase==='執行期' && project.milestone_id ? <div className="cc5"><SpecChangeBox project={project} onChanged={reload} setError={setError} goInbox={()=>onMeeting(null)}/></div> : <Empty>目前階段未開放規格變更；請在 PI 會議室提供修訂意見，由既有工作流程接手。</Empty>}</Card>}
    <div className="ao-dashboard">
      <Card title="專案概況"><dl><dt>名稱</dt><dd>{project.title}</dd><dt>類型</dt><dd>{plan?.project_type || '尚未記錄'}</dd><dt>Goal</dt><dd>{project.goal}</dd><dt>目前階段</dt><dd>{project.phase} {project.milestone_id}</dd><dt>開始日期</dt><dd>{when(project.started_at)}</dd><dt>預估完成</dt><dd>{plan?.estimated_completion_date || '尚未正式記錄'}</dd></dl><p>{project.description || '尚無簡要說明'}</p></Card>
      <Card title="里程碑進度"><ol className="ao-timeline">{ms.map(m=><li key={m.id}><button onClick={()=>onExecution(m.id)}><b>{m.id} {m.name}</b><small>{m.packages.filter(p=>p.status==='COMPLETED').length}／{m.packages.length} 工作包</small></button></li>)}</ol>{!ms.length && <Empty>正式規劃尚未提供里程碑。</Empty>}</Card>
      <Card title="目前工作">{current.slice(0,4).map(p=><button className="ao-row" key={p.id} onClick={()=>onExecution(p.id)}><b>{p.task}</b><small>{PACKAGE_STATUS[p.status]} · {p.milestone_id || '規劃期'}</small></button>)}{!current.length && <Empty>沒有進行中或待開始的正式工作包。</Empty>}</Card>
      <Card title="待我處理" className="ao-needs">{pending.slice(0,4).map(a=><button className="ao-row" key={a.action_id} onClick={()=>onMeeting(a.action_id)}><b>{a.title}</b><small>{a.reason || '來源未記錄 PI 分析，請在會議室核對正式事項。'}</small></button>)}{!pending.length && <Empty>沒有需要 HY 處理的正式事項。</Empty>}</Card>
      <Card title="近期成果">{files.map(f=><button className="ao-row" key={f.file_id} onClick={onOutputs}><b>{f.filename}</b><small>已登錄 · v{f.revision} · {when(f.created_at)}</small></button>)}{!files.length && <Empty>尚無已登錄成果。</Empty>}</Card>
      <Card title="附加資訊">{project.references.map((r,i)=><p key={i}><Link href={r.data?.url || driveFile(r.data?.file_id)}>{r.data?.title || r.type}</Link></p>)}<p>標籤：{Array.isArray(plan?.tags)?plan.tags.join('、'):'尚未記錄'}</p><p>{plan?.notes || '尚無備註'}</p></Card>
    </div>
    <Card title="給 PI 的意見或補充資料"><Contribution project={project} reload={reload} onSent={()=>onMeeting(null)}/></Card>
  </>
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
  return <form onSubmit={send}><label>意見或補充資料<textarea value={content} maxLength={8000} onChange={e=>setContent(e.target.value)}/></label><FileInputs project={project} selected={selected} setSelected={setSelected} reload={reload} onBusy={setUploading}/><button className="ao-primary" disabled={busy || uploading || (!content.trim()&&!selected.length)}>送交專案工作流程</button>{message && <p role="status">{message}</p>}</form>
}

function Meeting({project,pending,selected,select,reload,setError}) {
  const [filter,setFilter]=useState('all'),[attachmentIds,setAttachmentIds]=useState({}),[uploading,setUploading]=useState(false)
  const events=journal(project).filter(e=>e.kind==='human' || (e.action && e.kind==='system'))
  const shown=events.filter(e=>filter==='all' || e.kind===filter).sort((a,b)=>a.at-b.at)
  const action=project.actions.find(a=>a.action_id===selected)
  const executors=[...new Set(project.packages.map(p=>p.executor))]
  return <div className="ao-meeting">
    <Card title="對話與協作"><p className="ao-muted">PI 即時對話服務未就緒。以下為正式補充及 humanAction 紀錄，不模擬 PI、GPT 或 Claude 的訊息。</p><select aria-label="篩選協作訊息" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部訊息</option><option value="human">HY 與代理補充</option><option value="system">正式協作事項</option></select>
      {shown.map(e=><article className="ao-message" key={e.id}><div><b>{e.actor}</b> <time>{when(e.at)}</time></div><p>{e.text}</p>{e.detail && <small>{e.detail}</small>}{e.action && <button onClick={()=>select(e.action)}>查看對應事項</button>}</article>)}{!shown.length && <Empty>尚無正式對話或補充紀錄。</Empty>}
      <Contribution project={project} reload={reload}/>
    </Card>
    <div className="ao-meeting-support"><Card title="待我處理"><p className="ao-muted">僅呈現既有流程建立、指派給 HY 的正式 humanAction；PI 建議以來源記錄為準。</p>{pending.map(a=><button className="ao-row" key={a.action_id} aria-expanded={a.action_id===selected} onClick={()=>select(a.action_id===selected?null:a.action_id)}><b>{a.title}</b><small>{when(a.created_at)}</small></button>)}{!pending.length && <Empty>目前沒有正式待處理事項。</Empty>}</Card>
      <Card title="團隊成員"><p>PI 預設大腦：GPT Chat</p>{project.team.map(e=><p key={e.id+e.version}><span className="ao-avatar" aria-hidden="true">◇</span> {e.name} · {e.version} · {e.state==='PUBLISHED'?'已發布':'版本待確認'}</p>)}{!project.team.length && <p className="ao-muted">尚未記錄專案專家版本配置。</p>}{executors.map(e=><p key={e}>執行／審查工具：{e}</p>)}<p>HY 代理：{({hy:'HY','950157':'950157',sam:'Sam',family:'小因'})[project.owner_bot] || project.owner_bot}</p><small>Grok Bot 代表 HY 操作，不由 PI 指派。資源可用性尚未驗證。</small></Card></div>
    {action && <Card title="對應正式事項" className="ao-action-detail"><p>請求來源：{action.requested_by || '尚未記錄'}</p><p>需要 HY 的原因：{action.reason || '來源未提供分析；不能宣稱 PI 已完成必要評估。'}</p>{action.status==='RESOLVED' ? <><p>已處理：{when(action.resolved_at)} · {action.resolved_by}</p><p>{text(action.answer)}</p>{(action.attachments || []).map(id=><p key={id}><Link href={driveFile(id)}>正式附件 {id}</Link></p>)}</> : <>{['PLAN_APPROVAL','CODE_REVIEW'].includes(action.action_type) ? <p>此正式核准沿用既有契約；補充附件請先透過專案概況送交工作流程。</p> : <FileInputs project={project} selected={attachmentIds[action.action_id] || []} setSelected={update=>setAttachmentIds(v=>({...v,[action.action_id]:typeof update==='function'?update(v[action.action_id] || []):update}))} reload={reload} onBusy={setUploading}/>}<div className="cc5">{uploading ? <p role="status">檔案傳送完成後才能提交正式回覆。</p> : <Inbox items={[action]} project={project} onChanged={async()=>{await reload();select(null)}} setError={setError} attachmentIds={attachmentIds}/>}</div></>}</Card>}
  </div>
}

function Execution({project,plan,selected,select}) {
  const [mode,setMode]=useState('split'),[ratio,setRatio]=useState(60),[document,setDocument]=useState('project'),[heading,setHeading]=useState('')
  const container=useRef(null),reader=useRef(null),dragging=useRef(false),[drag,setDrag]=useState(false)
  const rows=milestones(project), markdown=(document==='project'?plan?.project_plan_markdown:plan?.ai_execution_plan_markdown) || ''
  const headings=markdown.split('\n').filter(line=>/^#{1,6}\s/.test(line)).map(line=>line.replace(/^#+\s*/,''))
  function locate(value){const nodes=[...(reader.current?.querySelectorAll('h1,h2,h3,h4,h5,h6') || [])];const target=nodes.find(n=>n.textContent.includes(value));if(target){reader.current.scrollTop=Math.max(0,target.offsetTop-reader.current.offsetTop);setHeading(target.textContent)}else setHeading(`正式文件未提供 ${value} 的對應標題。`)}
  useEffect(()=>{if(selected){const pkg=project.packages.find(p=>p.id===selected);locate(pkg?.milestone_id || selected)}},[selected,document,markdown])
  useEffect(()=>{if(!drag)return;const move=e=>{const rect=container.current.getBoundingClientRect();setRatio(Math.max(30,Math.min(75,(e.clientX-rect.left)/rect.width*100)))};const up=()=>{dragging.current=false;setDrag(false)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)}},[drag])
  return <><div className="ao-toolbar" role="group" aria-label="執行計畫顯示模式">{[['split','雙欄模式'],['work','時程與執行全寬'],['document','正式文件全寬']].map(([key,label])=><button key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}</div>
    <div className={`ao-execution ao-mode-${mode}`} ref={container} style={{'--work-ratio':`${ratio}%`}}>
      <section className="ao-card ao-work-pane" hidden={mode==='document'} aria-label="時程與執行"><h2>時程與執行</h2>{rows.map(m=><details key={m.id} open={selected===m.id || m.packages.some(p=>p.id===selected) || !selected}><summary onClick={()=>{select(m.id);locate(m.id)}}><b>{m.id} {m.name}</b></summary><p>目標：{text(m.goal || m.objective)}</p><p>交付：{text(m.deliverables)}</p><p>驗收條件：{text(m.acceptance_criteria)}</p>{m.packages.map(p=><article key={p.id} className="ao-package"><button className="ao-row" aria-pressed={selected===p.id} onClick={()=>{select(p.id);locate(m.id)}}><b>{p.task}</b><span>{PACKAGE_STATUS[p.status]} · {p.executor}</span></button><p>前置相依：{p.dependencies.length?p.dependencies.map(id=>project.packages.find(w=>w.id===id)?.task || id).join('、'):'無'}</p><p>交付成果：{text(p.expected_outputs)}</p><p>驗收條件：{text(p.acceptance_criteria)}</p>{p.status==='BLOCKED' && <p className="ao-muted">阻塞依據：{text(p.requires)}</p>}</article>)}</details>)}{!rows.length && <Empty>尚無正式 Milestone。小型專案不強制固定里程碑數量。</Empty>}</section>
      <div className="ao-splitter" hidden={mode!=='split'} role="separator" aria-label="調整雙欄比例" aria-orientation="vertical" aria-valuemin={30} aria-valuemax={75} aria-valuenow={Math.round(ratio)} tabIndex={0} onPointerDown={()=>{dragging.current=true;setDrag(true)}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();setRatio(e.key==='Home'?60:Math.max(30,Math.min(75,ratio+(e.key==='ArrowLeft'?-5:5))))}}}/>
      <section className="ao-card ao-document-pane" hidden={mode==='work'} aria-label="正式規劃文件"><div className="ao-toolbar">{[['project','Project Plan'],['ai','AI Execution Plan']].map(([key,label])=><button key={key} aria-pressed={document===key} onClick={()=>setDocument(key)}>{label}</button>)}</div><p className="ao-muted">正式規劃 v{project.plan_revision} · {project.plan_state==='APPROVED'?'已核准':'草稿，尚未正式核准'}</p><label>標題導覽<select aria-label="規劃文件標題導覽" value={headings.includes(heading)?heading:''} onChange={e=>locate(e.target.value)}><option value="">選取標題…</option>{headings.map((h,i)=><option key={i}>{h}</option>)}</select></label>{heading && <small role="status">{heading}</small>}<div className="ao-document" ref={reader}><Markdown value={markdown}/></div></section>
    </div></>
}

function Results({project,active}) {
  const [chosen,setChosen]=useState(''),[html,setHtml]=useState(null),[error,setError]=useState(''),[full,setFull]=useState(false)
  const history=project.report?.history || [], fileId=chosen || project.report?.latest?.file_id
  useEffect(()=>{if(!active || !fileId)return;let alive=true;setHtml(null);setError('');office(`${ppath(project.id)}/reports/${encodeURIComponent(fileId)}`).then(data=>{if(alive)setHtml(data.html)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[active,fileId,project.id])
  useEffect(()=>{if(!full)return;const listener=e=>{if(e.key==='Escape')setFull(false)};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[full])
  const report=history.find(r=>r.file_id===fileId), checkpoints=project.quality?.checkpoints || []
  return <div className="ao-results"><Card title="正式成果報告" className={full?'ao-reader-full':''}><div className="ao-toolbar"><label>報告版本<select aria-label="成果報告版本" value={fileId || ''} onChange={e=>setChosen(e.target.value)}>{!history.length && <option value="">尚無正式報告</option>}{history.map(r=><option key={r.file_id} value={r.file_id}>第 {r.revision} 版 · {when(r.created_at)}</option>)}</select></label><button disabled={!html} onClick={()=>setFull(v=>!v)}>{full?'離開完整閱讀':'完整閱讀'}</button></div><p className="ao-muted">最後更新：{when(report?.created_at)}{project.report?.stale?' · 最新報告落後於正式專案資料':''}</p>{error && <p role="alert">{error}</p>}{html ? <iframe title="正式 HTML 成果報告" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={html}/> : <Empty>{fileId?'報告讀取中或讀取失敗；不顯示預設內容。':`正式 HTML 報告未就緒（${project.report?.state || '未記錄'}）。`}</Empty>}</Card>
    <Card title="成果資料與 Google Drive">{project.drive.project_folder_id && <Link href={`https://drive.google.com/drive/folders/${project.drive.project_folder_id}`}>專案資料夾</Link>} {project.drive.references_folder_id && <Link href={`https://drive.google.com/drive/folders/${project.drive.references_folder_id}`}>references 資料夾</Link>}{project.files.map(f=><div className="ao-row" key={f.file_id}><Link href={driveFile(f.file_id)}>{f.filename}</Link><small>{f.type} · v{f.revision} · {when(f.created_at)} · 已登錄，驗收以正式審查為準</small></div>)}{!project.files.length && <Empty>沒有已登錄成果檔案。</Empty>}</Card>
    <Card title="重要審查">{checkpoints.map(c=>{const p=project.packages.find(p=>p.id===c.review_package_id);return <details key={c.checkpoint_id}><summary>{c.kind} {c.milestone_id} · 第 {c.round} 輪 · {c.verdict}</summary><p>審查工作包：{p?.task || c.review_package_id}</p><p>審查提交時間：尚未單獨記錄；工作包建立於 {when(p?.created_at)}</p><p>對應正式證據快照（不得推定為最新報告）：</p><pre>{JSON.stringify(c.target,null,2)}</pre><p>問題與補強：{text(p?.result?.summary || p?.result?.findings || '審查尚未交付')}</p><p>原始審查：</p>{(p?.result?.artifacts || []).map((a,i)=><p key={i}><Link href={driveFile(a.file_id)}>{a.title || a.file_id || '審查附件'}</Link></p>)}<p>補強／重審狀態：{PACKAGE_STATUS[p?.status] || '尚未記錄'} · {c.approved_action || '未有正式核准'}</p></details>})}{!checkpoints.length && <Empty>尚無 Quality Engine 正式審查紀錄。CI 或模擬測試不能代替正式驗收。</Empty>}</Card>
  </div>
}

function Log({project,onMeeting,onExecution}) {const [filter,setFilter]=useState('all');const events=journal(project).filter(e=>filter==='all'||e.kind===filter);return <Card title="工作日誌"><select aria-label="工作日誌篩選" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部事件</option><option value="human">人工補充與核准</option><option value="system">系統與工作包</option><option value="artifact">成果登錄</option></select><ol className="ao-journal">{events.map(e=><li key={e.id}><time>{when(e.at)}</time><b>{e.actor}</b><p>{e.text}</p>{e.detail && <details><summary>詳情</summary><p>{e.detail}</p></details>}{e.action && <button onClick={()=>onMeeting(e.action)}>原始 humanAction</button>}{e.work && <button onClick={()=>onExecution(e.work)}>關聯工作包 {e.milestone}</button>}{e.file && <Link href={driveFile(e.file)}>成果</Link>}</li>)}</ol>{!events.length && <Empty>尚無正式事件。</Empty>}</Card>}
