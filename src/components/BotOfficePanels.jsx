import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {safeUrl} from '../lib/aiOffice.mjs'
import {officeEvents,officeTime,officeJournal,reportSummaryLines,reportIsStale,reportVersions,normalizeOfficeReport,normalizeOfficeDocument,normalizeOfficeFiles,openFollowUpCount,REPORT_FRAME,officeDeleteOutcome,meetingZones} from '../lib/botOfficeView.mjs'
import {composeReportSummary,reportSummaryStatus} from '../lib/reportSummary.mjs'
import ReportSummaryCard,{ReportStaleNote} from './ReportSummaryCard'
import {OfficeRequest,OfficeLog,OfficeFollowUps,OfficeReassignQueue} from './OfficeActions'
import {Decision} from './OfficeDecisions'
import {OFFICE_NAMES,loadOfficeReport,loadOfficeReportHtml,loadOfficeDocument,loadOfficeDriveDocument,loadOfficeFiles,deleteOfficeProject,uploadOfficeFile,importOfficeReference,officeDeleteHold,advanceFollowUpLabel} from '../botOfficeData'
import {canonicalOfficeDocuments,presentOfficeDocuments,latestPlanDocument,documentProblem,safeMarkdown} from '../lib/officeDocuments.mjs'
import {planDocumentHtml,executionReportReviews} from '../lib/planHtml.mjs'
import {meetingConversationOrder} from '../lib/meetingThread.mjs'
import {authHeaders} from '../auth'
import { STEP_LABEL } from '../lib/officeFlow.mjs'
import {reportFrameHtml} from '../lib/reportFrame.mjs'
import './project-report.css'
import '../pages/control-center-v5.css'

const when = value => { const seconds = typeof value === 'number' ? value : officeTime(value); return seconds ? new Date(seconds * 1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}) : '尚未記錄' }
const text = value => typeof value==='string'?value:value?JSON.stringify(value):'尚未提供'
function Empty({children}) {return <p className="ao-empty">{children}</p>}
function Link({href,children}) {const url=safeUrl(href);return url?<a href={url} target="_blank" rel="noopener noreferrer">{children} ↗</a>:<span>{children}（連結未就緒）</span>}
function Card({title,children,className=''}) {return <section className={`ao-card ${className}`}><h2>{title}</h2>{children}</section>}
function Pill({s,children}) {return <span className="hy-pill" data-s={s}>{children}</span>}
export function useOfficeReport(projectId, updatedRaw) {
  const [metaState,setMetaState]=useState({status:'idle',meta:null,error:''})
  const [fileId,setFileId]=useState('')
  const [htmlState,setHtmlState]=useState({status:'idle',html:'',error:''})
  useEffect(()=>{
    if(!projectId){setMetaState({status:'idle',meta:null,error:''});setFileId('');setHtmlState({status:'idle',html:'',error:''});return undefined}
    const ctrl=new AbortController(); let alive=true
    setMetaState({status:'loading',meta:null,error:''}); setFileId(''); setHtmlState({status:'idle',html:'',error:''})
    loadOfficeReport(projectId,{headers:authHeaders(),signal:ctrl.signal}).then(data=>{
      if(!alive)return
      const meta=normalizeOfficeReport(data)
      if(!meta){setMetaState({status:'error',meta:null,error:'報告資料格式無法辨識，沒有改顯示其他內容。'});return}
      if(!meta.exists){setMetaState({status:'empty',meta,error:meta.reason||''});return}
      const nextId=meta.file_id||meta.history[0]?.file_id||''
      setMetaState({status:'ready',meta,error:''})
      setFileId(nextId)
      if(nextId)setHtmlState({status:'loading',html:'',error:''})
    }).catch(error=>{if(alive&&error.name!=='AbortError')setMetaState({status:'error',meta:null,error:error.message||'報告讀取失敗。'})})
    return()=>{alive=false;ctrl.abort()}
  },[projectId,updatedRaw])
  useEffect(()=>{
    if(!projectId||!fileId||metaState.status!=='ready')return undefined
    const ctrl=new AbortController(); let alive=true
    setHtmlState({status:'loading',html:'',error:''})
    loadOfficeReportHtml(projectId,fileId,{headers:authHeaders(),signal:ctrl.signal}).then(html=>{if(alive)setHtmlState({status:'ready',html,error:''})}).catch(error=>{if(alive&&error.name!=='AbortError')setHtmlState({status:'error',html:'',error:error.message||'報告內文讀取失敗。'})})
    return()=>{alive=false;ctrl.abort()}
  },[projectId,fileId,metaState.status])
  const meta=metaState.meta
  const modified=fileId&&meta?(meta.history.find(item=>item.file_id===fileId)?.modified_time||(fileId===meta.file_id?meta.modified_time:'')):''
  return {...metaState,fileId,setFileId,html:htmlState.html,htmlStatus:htmlState.status,htmlError:htmlState.error,lines:reportSummaryLines(htmlState.html),stale:reportIsStale(updatedRaw,modified),modified,versions:reportVersions(meta)}
}

export function usePlanDocument(cardId) {
  const [state,setState]=useState({status:cardId?'loading':'none',markdown:'',error:'',truncated:false})
  useEffect(()=>{
    if(!cardId){setState({status:'none',markdown:'',error:'',truncated:false});return undefined}
    const ctrl=new AbortController(); let alive=true
    setState({status:'loading',markdown:'',error:'',truncated:false})
    loadOfficeDocument(cardId,{headers:authHeaders(),signal:ctrl.signal}).then(data=>{
      if(!alive)return
      const doc=normalizeOfficeDocument(data)
      if(!doc)setState({status:'unavailable',markdown:'',error:'規劃書資料格式無法辨識。',truncated:false})
      else setState({status:'ready',markdown:doc.markdown,error:'',truncated:doc.truncated})
    }).catch(error=>{if(alive&&error.name!=='AbortError')setState({status:'unavailable',markdown:'',error:error.message||'規劃書讀取失敗。',truncated:false})})
    return()=>{alive=false;ctrl.abort()}
  },[cardId])
  return state
}

async function loadCanonicalBody(projectId, spec, signal) {
  const opts = { headers: authHeaders(), signal }
  const fail = error => ({ status: 'error', markdown: '', error: documentProblem(spec.title, error?.message || '讀取失敗。'), truncated: false })
  const ready = data => {
    const doc = normalizeOfficeDocument(data)
    if (!doc || typeof doc.markdown !== 'string') return fail(new Error('文件格式無法辨識。'))
    return { status: 'ready', markdown: safeMarkdown(doc.markdown), error: '', truncated: doc.truncated }
  }
  try {
    if (spec.cardId && !Number.isInteger(spec.version)) {
      try {
        return ready(await loadOfficeDocument(spec.cardId, opts))
      } catch (error) {
        if (error?.name === 'AbortError') throw error
        if (!spec.fileId) return fail(error)
      }
    }
    if (spec.fileId) return ready(await loadOfficeDriveDocument(projectId, spec.fileId, { ...opts, version: spec.version }))
    return fail(new Error('沒有可讀參照。'))
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    return fail(error)
  }
}

export function useOfficeCanonical(project, state, index) {
  const building = project?.source || null
  const bundle = useMemo(() => canonicalOfficeDocuments(building, index, state?.decisions), [building, index, state])
  const projectId = project?.id || ''
  const plan = useMemo(() => latestPlanDocument(bundle), [bundle])
  const currentView = useMemo(() => presentOfficeDocuments(bundle, plan?.key || bundle.currentKey), [bundle, plan])
  const reads = useMemo(() => {
    const planRead = plan?.fetch && plan.readKey ? [{ key: plan.readKey, cardId: plan.cardId || '', fileId: plan.fileId || '', title: plan.title, role: 'plan', version: null }] : []
    const reviewReads = (bundle.reviews||[]).filter(item => item.fetch && item.readKey).map(item => ({ key: item.readKey, cardId: item.cardId || '', fileId: item.fileId || '', title: item.title, role: 'review', version: null }))
    const seen = new Set()
    return [...planRead, ...reviewReads].filter(item => seen.has(item.key) ? false : seen.add(item.key))
  }, [bundle, plan])
  const [bodies, setBodies] = useState({})
  useEffect(() => {
    if (!projectId) { setBodies({}); return undefined }
    const specs = reads
    const ctrl = new AbortController()
    let alive = true
    setBodies(prev => {
      const next = {}
      for (const spec of specs) next[spec.key] = prev[spec.key]?.status === 'ready' ? prev[spec.key] : { status: 'loading', markdown: '', error: '', truncated: false }
      return next
    })
    for (const spec of specs) {
      loadCanonicalBody(projectId, spec, ctrl.signal).then(result => {
        if (alive) setBodies(prev => ({ ...prev, [spec.key]: result }))
      }).catch(error => { if (error?.name !== 'AbortError') return })
    }
    return () => { alive = false; ctrl.abort() }
  }, [projectId, reads])
  return { bundle, plan, currentView, bodies }
}

export function OfficeReportStrip({report,onOpen,planning=false,attention=false}) {
  const ready=report?.status==='ready'
  const label=report?.status==='loading'?'讀取中':report?.status==='error'?'讀取失敗':ready?(report.stale?'狀態較新':'已有報告'):planning?(attention?'待你看規劃':'有規劃書'):'還沒有'
  return <button type="button" className="hy-card pr-strip" onClick={onOpen}>
    <span><b>專案報告</b>{ready&&report.modified&&<small> {when(report.modified)}</small>}</span>
    <span className="hy-pill" data-s={report?.status==='error'?'bad':report?.stale?'you':ready?'done':planning&&attention?'you':planning?'done':'wait'}>{label}</span>
  </button>
}

function excerptLabel(modified) {
  const stamp = when(modified)
  return stamp === '尚未記錄' ? '摘自正式成果報告' : `摘自正式成果報告（${stamp}）`
}

export function OfficeSnapshot({html='',lines=[],project=null,milestones=[],status='empty',message='',stale=false,modified='',notice=''}) {
  const ready=status==='ready'
  const planning=status==='planning'
  const model=composeReportSummary({html:ready?html:'',lines:ready?lines:[],project,milestones})
  const hasReport=model.metrics.length>0||Boolean(model.conclusion)||model.items.length>0
  const planningItems=planning?lines.map(text=>({text})):[]
  return <ReportSummaryCard title={model.title} source={ready&&hasReport?excerptLabel(modified):''} badges={model.badges} metrics={ready?model.metrics:[]} conclusion={ready?model.conclusion:''} items={planning?planningItems:(ready?model.items:[])} status={status} message={planning?notice:message} stale={stale}/>
}
export function OfficeCards({items}) {return items.map(c=><article className="ao-card" key={c.id}><h2>{c.title}</h2><p>{c.summary}</p><Link href={c.driveUrl}>開啟 Drive 原件</Link></article>)}
export function OfficeTeam({project}) {
 return <Card title="協作方式" className="ao-team"><p>負責 Bot：{OFFICE_NAMES[project.ownerBot]||project.ownerBot||'尚未指定'}</p><p>主要執行：GPT，按任務使用 Chat 或 Work。</p><p>規劃書與結案由 GPT 正式審查；必要核准由 HY 決定。</p></Card>
}

function OfficeAttachments({projectId,onSelect}) {
  const [pack,setPack]=useState(null),[error,setError]=useState(''),[blocked,setBlocked]=useState(''),[selected,setSelected]=useState(''),[fileId,setFileId]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
  const reload=useCallback(()=>{
    if(!projectId)return undefined
    const ctrl=new AbortController(); let alive=true
    loadOfficeFiles(projectId,{headers:authHeaders(),signal:ctrl.signal}).then(data=>{
      if(!alive)return
      const next=normalizeOfficeFiles(data)
      if(!next){setPack(null);setError('檔案清單格式無法辨識，沒有改用其他來源。');return}
      setPack(next);setError(next.reason||'');setBlocked('')
    }).catch(reason=>{if(!alive||reason.name==='AbortError')return;setPack(null);setError(reason.message||'檔案清單讀取失敗。');if(reason.code==='drive_write_unavailable'||/暫時無法使用|沒有 Drive 寫入權/.test(reason.message||''))setBlocked(reason.message)})
    return()=>{alive=false;ctrl.abort()}
  },[projectId])
  useEffect(()=>reload(),[reload])
  const writesOff=Boolean(blocked)||Boolean(pack&&!pack.folderId)
  async function upload(file){if(!file||writesOff)return;setBusy(true);setNotice('');try{await uploadOfficeFile(projectId,file,{headers:authHeaders()});setNotice('已上傳到參考資料。');reload()}catch(reason){setError(reason.message||'上傳失敗。');if(reason.code==='drive_write_unavailable'||reason.message?.includes('暫時無法使用')||reason.message?.includes('沒有 Drive 寫入權'))setBlocked(reason.message)}finally{setBusy(false)}}
  async function importFile(){if(writesOff)return;setBusy(true);setNotice('');try{await importOfficeReference(projectId,fileId.trim(),{headers:authHeaders()});setFileId('');setNotice('已登錄 Drive 參考。');reload()}catch(reason){setError(reason.message||'匯入失敗。');if(reason.code==='drive_write_unavailable'||reason.message?.includes('暫時無法使用')||reason.message?.includes('沒有 Drive 寫入權'))setBlocked(reason.message)}finally{setBusy(false)}}
  return <fieldset className="ao-files"><legend>附件與 Google Drive</legend>
    <label>上傳檔案至專案 Drive<input aria-label="上傳專案附件" type="file" disabled={busy||writesOff} onChange={e=>upload(e.target.files?.[0])}/></label>
    <label>選取已登錄的專案 Drive 檔案<select aria-label="選取專案 Drive 檔案" value={selected} onChange={e=>{const id=e.target.value;setSelected(id);onSelect(pack?.files.find(file=>file.id===id)||null)}}><option value="">選取檔案…</option>{(pack?.files||[]).map(file=><option key={file.id} value={file.id}>{file.folder?`${file.folder}／`:''}{file.name}</option>)}</select></label>
    <label>匯入其他 Google Drive 檔案 ID<input value={fileId} onChange={e=>setFileId(e.target.value)} placeholder="Google Drive 檔案 ID" disabled={busy||writesOff}/></label>
    <button type="button" disabled={busy||writesOff||!/^[A-Za-z0-9_-]{10,200}$/.test(fileId.trim())} onClick={importFile}>登錄為專案參考</button>
    {writesOff&&<small>{blocked||pack?.reason||'附件寫入已停用。'}</small>}
    {!writesOff&&<small>選取的檔案會附在這則意見。上傳與匯入由新的 Office 附件流程處理。</small>}
    {busy&&<p role="status">正在處理附件…</p>}{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
  </fieldset>
}

// 會議室三區（HY 2026-10-31 定案）：
// 第一區「待你處理」：決策卡與補資料卡同一層，件數＝頁首「N 項待你處理」。執行前待辦只能看，由負責 Bot 在工作日誌回覆後關閉。
// 第二區「參考資料與建議」：原本的對話紀錄、上傳參考資料與送出建議，功能不變，只搬位置。
// 第三區「已結案」：預設收合成一行，點開才載入內容。
function MeetingPending({project,items,now,reload}) {
 const open=openFollowUpCount(project.followUps),advances=(project.pendingAdvances||[]).filter(d=>!d.flow)
 return <section className={`ao-card mr-zone mr-pending${items.length?' is-focus needs-you':''}`} id={`mr-pending-${project.id}`} aria-label="待你處理" tabIndex={-1}>
  <div className="ao-card-head"><h2>待你處理</h2><Pill s={items.length?'you':'done'}>{items.length} 件</Pill></div>
  <p className="ao-muted">要你拍板的決策和要你提供的資料放在同一層，等最久的排最前面。</p>
  {items.length?<div className="cc5 mr-items">{items.map(item=><Decision key={item.id} item={item} project={project} now={now} reload={reload}/>)}</div>:<Empty>目前沒有要你處理的事。Bot 需要你拍板或補資料時，會出現在這裡。</Empty>}
  {(project.followUps?.length>0||advances.length>0)&&<details className="mr-readonly"><summary>負責 Bot 處理中・只能看（執行前待辦未完成 {open}{advances.length?`・決策後續 ${advances.length}`:''}）</summary>
   <p className="ao-muted">執行前待辦由負責 Bot 在工作日誌回覆後才會關閉，這裡不能刪除或修改。</p>
   {project.followUps?.length>0&&<OfficeFollowUps project={project}/>}
   {advances.length>0&&<ul className="ao-bullets">{advances.map(d=><li key={d.id}>{d.title}：{advanceFollowUpLabel(d.advance?.stage) && '已作答'}</li>)}</ul>}
  </details>}
 </section>
}
function MeetingClosed({project,items,reload}) {
 const [open,setOpen]=useState(false)
 return <section className="ao-card mr-zone mr-closed" aria-label="已結案"><details id={`mr-closed-${project.id}`} open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary><span>已結案 {items.length} 件</span><small>{open?'收合':'點開看已回覆的決策與資料'}</small></summary>
  {open&&(items.length?<div className="cc5 mr-items">{items.map(item=><Decision key={item.id} item={item} project={project} readOnly reload={reload}/>)}</div>:<Empty>還沒有已結案的項目。</Empty>)}
 </details></section>
}
export function OfficeMeeting({project,projects,reload,state,index,now=Date.now()}) {
 const journal=(state&&index?officeJournal(state,index,project.id):officeEvents(project)).filter(e=>e.kind==='human'||e.kind==='notification'||e.action)
 const seen=new Set(journal.map(e=>e.id))
 const cards=(project.cards?.meeting||[]).filter(c=>!seen.has(`card:${c.id}`)).map(c=>({id:`card:${c.id}`,at:officeTime(c.createdAt||c.date),actor:c.title,kind:'human',text:c.summary,url:c.driveUrl}))
 const events=meetingConversationOrder([...journal,...cards])
 const [selected,setSelected]=useState(null)
 const appendix=selected?`已登錄檔案：${selected.name}（${selected.id}）`:''
 const zones=meetingZones(project)
 const openIds=new Set(zones.pending.map(d=>d.id))
 const toPending=()=>{const el=document.getElementById(`mr-pending-${project.id}`);el?.scrollIntoView({behavior:'smooth',block:'start'});el?.focus({preventScroll:true})}
 const toClosed=()=>{const el=document.getElementById(`mr-closed-${project.id}`);if(!el)return;el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'})}
 return <div className="mr-zones">
  <MeetingPending project={project} items={zones.pending} now={now} reload={reload}/>
  <div className="ao-meeting mr-reference"><section className="ao-card ao-thread-card mr-zone" aria-label="參考資料與建議"><h2>參考資料與建議</h2><p className="ao-muted">你或 Bot 的建議、要求與參考資料，以及 GPT 需要你決定或補充的問題都在這裡。一般留言不代表核准。日常仍可直接和 Bot 聊天。</p><div className="ao-thread">{events.map(e=><article className={`ao-message${e.actor==='HY'?' is-me':''}`} key={e.id}><div><b>{e.actor}</b> <time>{when(e.at)}</time>{e.detail==='已送出'&&<Pill s="wait">已送出</Pill>}{e.detail==='待套用'&&<Pill s="you">待套用</Pill>}{e.detail==='已套用'&&<Pill s="done">已套用</Pill>}</div><p>{e.text}</p>{e.detail&&e.detail!=='已送出'&&e.detail!=='待套用'&&e.detail!=='已套用'&&<p className="ao-muted">{e.detail}</p>}{e.url&&<Link href={e.url}>開啟 Drive 原件</Link>}{e.action&&(openIds.has(e.action)?<button onClick={toPending}>到待你處理</button>:<button onClick={toClosed}>到已結案</button>)}</article>)}{!events.length&&<Empty>還沒有對話。從下方送出第一則意見。</Empty>}</div><div className="ao-composer"><OfficeRequest key={project.id} type="message" projects={projects} projectId={project.id} inline reload={reload} appendix={appendix}><OfficeAttachments projectId={project.id} onSelect={setSelected}/></OfficeRequest></div></section><OfficeTeam project={project}/></div>
  <MeetingClosed project={project} items={zones.closed} reload={reload}/>
 </div>
}
export function OfficeExecution({documents}) {
  const plan = documents?.plan
  const body = plan?.readKey ? documents.bodies?.[plan.readKey] : null
  if (!plan) return <section className="ao-card ao-plan-shell" aria-label="專案規劃書"><h2>專案規劃書</h2><p className="ao-empty">正式規劃書尚未提供。</p></section>
  return <section className="ao-card ao-plan-shell" aria-label="專案規劃書">
    <div className="ao-card-head"><h2>{plan.title || '專案規劃書'}</h2></div>
    {plan.missingReason && <p role="status">{plan.missingReason}</p>}
    {(!body || body.status === 'loading') && plan.fetch && <p className="ao-muted" role="status">正在讀取規劃書…</p>}
    {body?.status === 'error' && <p role="alert">{body.error}</p>}
    {body?.status === 'ready' && body.truncated && <p className="ao-muted">文件超過上限，以下為截斷內容。</p>}
    {body?.status === 'ready' && <iframe className="ao-plan-frame ao-plan-slate" title="專案規劃書" sandbox={REPORT_FRAME.sandbox} referrerPolicy={REPORT_FRAME.referrerPolicy} srcDoc={planDocumentHtml(body.markdown, { layout: 'slate' })} />}
  </section>
}

function downloadHtml(name,html){const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}

function ReportStatus({project}) {
  const pending=project.decisions?.length||project.allDecisions?.filter(item=>item.status==='open').length||0
  return <p className="ao-muted" aria-label="報告動態狀態">階段 {project.stageLabel} · 負責 {project.ownerBot||'尚未指定'} · 主要執行 GPT · 執行前待辦未完成 {openFollowUpCount(project.followUps)} · 待你處理 {pending}</p>
}

// HTML is supplied as content, never fetched from an arbitrary URL or inserted into the host DOM.
export function OfficeResults({project,report,documents}) {
 const [full,setFull]=useState(false)
 const html=report?.html||''
 useEffect(()=>{if(!full)return;const key=e=>{if(e.key==='Escape')setFull(false)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[full])
 const summaryStatus=reportSummaryStatus(report)
 const legacyReady=summaryStatus==='ready'&&Boolean(html)
 const execReviews=documents?.bundle?.reviews||[]
 return <div className="ao-results">
  <Card title="專案報告" className={full?'bo-document-reader ao-reader-full':'bo-document-reader'}>
    {legacyReady&&<div className="ao-toolbar">{project.folderUrl&&<Link href={project.folderUrl}>開專案 Drive 資料夾</Link>}{report?.meta?.drive_url&&<Link href={report.meta.drive_url}>在 Drive 開啟</Link>}<button disabled={!html} onClick={()=>setFull(v=>!v)}>{full?'離開完整閱讀':'完整閱讀'}</button><button type="button" disabled={!html} onClick={()=>downloadHtml(`${project.title||'專案'}_執行成果.html`,html)}>下載</button></div>}
    {!full&&<ReportStatus project={project}/>}
    {legacyReady&&report?.stale&&<div className="rs-card"><ReportStaleNote/></div>}
    {legacyReady&&<p className="ao-muted">最後更新：{report?.modified?when(report.modified):'尚未記錄'}</p>}
    {legacyReady&&<iframe title="正式 HTML 成果報告" sandbox={REPORT_FRAME.sandbox} referrerPolicy={REPORT_FRAME.referrerPolicy} srcDoc={reportFrameHtml(html)}/>}
    {!legacyReady&&<p>HTML 專案報告尚未登錄；目前既有文件與成果連結保留在下方。</p>}
    {!legacyReady&&report?.status==='error'&&<p role="alert">{report.htmlError||report.error}</p>}
  </Card>
  {execReviews.length>0&&<details className="ao-card"><summary>GPT 審查紀錄（{execReviews.length}）</summary>{execReviews.map(review=>{
    const body=review.readKey?documents?.bodies?.[review.readKey]:null
    return <section className="ao-card" key={review.key||review.target} aria-label={review.title||review.target}>
      <div className="ao-card-head"><h2>{review.title||`審查 ${review.target}`}</h2>{(review.verdictText||review.verdict)&&<span className="hy-pill" data-s={/fail/i.test(review.verdict||'')?'bad':'done'}>{review.verdictText||review.verdict}</span>}</div>
      {review.mustFix?.length>0&&<ul className="ao-bullets">{review.mustFix.map(item=><li key={item}>{item}</li>)}</ul>}
      {(!body||body.status==='loading')&&review.fetch&&<p className="ao-muted" role="status">正在讀取審查…</p>}
      {body?.status==='error'&&<p role="alert">{body.error}</p>}
      {body?.status==='ready'&&<iframe className="ao-plan-frame" title={review.title||'執行審查'} sandbox={REPORT_FRAME.sandbox} referrerPolicy={REPORT_FRAME.referrerPolicy} srcDoc={planDocumentHtml(body.markdown)}/>}
    </section>
  })}</details>}
 </div>
}
export function OfficeJournal({project,reload,onOverview,onExecution,state,index,kanbanTodos=[]}) {
 const [filter,setFilter]=useState('all'), events=(state&&index?officeJournal(state,index,project.id):officeEvents(project)).filter(e=>filter==='all'||e.kind===filter)
 return <><OfficeKanbanTodos todos={kanbanTodos} placement="log"/><Card title="工作日誌"><div className="ao-toolbar" role="group" aria-label="工作日誌篩選">{[['all','全部'],['human','HY 與代理'],['system','系統與工作包'],['artifact','成果登錄']].map(([k,l])=><button key={k} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{l}</button>)}</div><ol className="ao-journal">{events.map(e=><li key={e.id}><time>{e.dateLabel||when(e.at)}</time><b>{e.actor}</b><p>{e.text}</p>{e.detail&&<details><summary>詳情</summary><p>{e.detail}</p></details>}{e.action&&<button onClick={onOverview}>到會議室</button>}{e.work&&<button onClick={()=>onExecution(e.work)}>關聯工作包 {e.milestone}</button>}{e.url&&<Link href={e.url}>成果</Link>}</li>)}</ol>{!events.length&&<Empty>這個篩選沒有事件。</Empty>}</Card><details><summary>新增 HY 留言</summary><OfficeLog project={{...project,logs:[]}} reload={reload}/></details></>
}

export function OfficeDelete({project,updatedRaw,onDeleted}) {
  const [open,setOpen]=useState(false),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const hold=officeDeleteHold(project)
  async function remove(){setBusy(true);setMessage('');try{await deleteOfficeProject(project.id,{confirm_title:confirm.trim(),expected_state_updated:updatedRaw},{headers:authHeaders()});await onDeleted()}catch(error){const outcome=officeDeleteOutcome(error);setMessage(outcome.message||'刪除失敗，專案未刪除。');if(outcome.removed)await onDeleted(outcome.message)}finally{setBusy(false)}}
  if(!open)return <div className="cc5-danger-row"><button type="button" className="cc5-btn cc5-danger" onClick={()=>setOpen(true)}>刪除專案</button></div>
  return <section className="cc5-panel cc5-danger-panel" role="alertdialog" aria-labelledby="bo-del-title" aria-describedby="bo-del-desc">
    <h2 className="cc5-h" id="bo-del-title">永久刪除「{project.title}」？</h2>
    <div id="bo-del-desc" className="cc5-stack-tight">
      <p>刪除後，這個專案的規劃、決策、執行回合與工作紀錄都會從 HY Life OS 移除，<b>無法復原</b>。</p>
      <p>刪除前會自動備份：專案所有資料匯出成 JSON 放進專案的 Drive 資料夾，整個資料夾（含所有產出檔案）移到 HY Life OS／<b>_已刪除專案備份</b>，Drive 上不刪任何檔案。備份失敗就不會刪除。</p>
      {hold&&<p className="cc5-warn">{hold}</p>}
    </div>
    <label className="cc5-field">輸入專案名稱「{project.title}」確認<input className="cc5-input" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="off"/></label>
    {message&&<p role="alert" className="cc5-warn">{message}</p>}
    <div className="cc5-two">
      <button type="button" className="cc5-btn" disabled={busy} onClick={()=>{setOpen(false);setConfirm('');setMessage('')}}>取消</button>
      <button type="button" className="cc5-btn cc5-danger-solid" disabled={busy||!!hold||confirm.trim()!==project.title.trim()} onClick={remove}>{busy?'備份並刪除中…':'永久刪除'}</button>
    </div>
  </section>
}



export function OfficeKanbanTodos({todos=[], placement='milestones'}) {
 if (!todos.length) return null
 const title = placement === 'log' ? '看板待辦（日誌）' : '看板待辦'
 return <section className="ao-card" aria-label={title}>
  <h2>{title}</h2>
  <p className="ao-muted">已關聯到這個專案的看板逾期或今日待辦。沒有關聯的仍在 Dashboard。</p>
  <ol className="ao-timeline">{todos.map(t=><li key={t.id}><b>{t.title}</b><p><span className="hy-pill" data-s={t.kind==='overdue'?'bad':'you'}>{t.kind==='overdue'?'逾期':'今日'}</span>{t.source?` · ${t.source}`:''}{t.projectName?` · ${t.projectName}`:''}{t.due?` · ${t.due}`:''}</p></li>)}</ol>
 </section>
}

export function OfficeUnifiedReport({project, report, documents, milestones=[], kanbanTodos=[]}) {
 const done=milestones.filter(m=>m.step==='done').length
 const waiting=milestones.filter(m=>m.step==='waiting')
 const next=milestones.find(m=>m.step==='running')
 const decisions=project.decisions||[]
 return <div className="bo-unified-report">
  <OfficeResults project={project} report={report} documents={documents}/>
  <details className="ao-card bo-live-state" open={!report?.html}><summary>專案即時狀態與進度</summary>
  <section className="ao-card" aria-label="專案即時摘要"><h2>目標與現況</h2><dl className="hy-kv">
   <dt>目標</dt><dd>{project.goal||project.source?.goal||'尚未提供'}</dd>
   <dt>現況</dt><dd>{project.displayLabel||project.stageLabel} · GPT 執行 · {project.ownerBot||'待指定 Bot'} 推進</dd>
   <dt>進度</dt><dd>{done}／{milestones.length} 個里程碑完成</dd>
   <dt>卡點</dt><dd>{waiting.length?waiting.map(m=>`${m.id} 等待 ${(m.dependsOn||[]).join('、')||'前置條件'}`).join('；'):'沒有已登錄的相依阻擋；其他問題請見會議室'}</dd>
   <dt>待你決定</dt><dd>{decisions.length?decisions.map(d=>d.title).join('；'):'沒有未決事項'}</dd>
   <dt>下一步</dt><dd>{next?`${next.id} ${next.name}`:decisions.length?'到會議室處理未決事項':'請負責 Bot 更新下一步'}</dd>
  </dl></section>
  {!report?.html && <OfficeExecution documents={documents}/>}
  <section className="ao-card"><h2>進度與成果</h2><ol className="ao-timeline">{milestones.map(m=><li key={m.id}><b>{m.id} {m.name}</b><p>{m.step==='review'?'待 Bot 檢查既有交件':STEP_LABEL[m.step]||m.step} · 前置：{(m.dependsOn||[]).join('、')||'無'}</p></li>)}</ol>
   <ul>{(project.cards?.outputs||[]).map(c=><li key={c.id}><Link href={c.driveUrl}>{c.title}</Link></li>)}</ul>
   {project.folderUrl&&<Link href={project.folderUrl}>所有文件、附件與歷史原件</Link>}
  </section>
  <OfficeKanbanTodos todos={kanbanTodos}/>
 </details><OfficeFormalHistory project={project}/></div>
}


function OfficeFormalHistory({project}) {
 const [body,setBody]=useState(null),[error,setError]=useState('')
 useEffect(()=>{setBody(null);setError('')},[project.id])
 const source=project.source||{}
 const plan=source.plan||{}
 const rows=[...[plan,...(plan.history||[])].map(p=>({file:p.drive_file_id,label:`規劃書 v${p.version||1}`,snapshot:p.content_snapshot})),...[source.closure_review,...(source.closure_history||[])].filter(Boolean).map(c=>({file:c.report_file_id,label:'結案送審內容',snapshot:c.content_snapshot})),...(source.review_requests||[]).map(r=>({file:r.report_file_id,label:'GPT 正式審查紀錄',snapshot:r.content_snapshot}))].filter(r=>r.file)
 async function read(row){setBody(null);setError('');try {const d=await loadOfficeDriveDocument(project.id,row.file,{headers:authHeaders(),snapshot:row.snapshot?.snapshot_key});setBody(d.markdown)}catch(e){setError(e.message)}}
 return <details className="ao-card"><summary>正式送審及核定紀錄</summary><p>送審內容固定保存；沒有舊快照時會明確標示，不以現況冒充。</p>{rows.map((r,i)=><p key={i}>{r.label} {r.snapshot?.snapshot_key?<button onClick={()=>read(r)}>閱讀送審原文</button>:<span>這次未保存快照，請核對 Drive 原件及日誌</span>}</p>)}{error&&<p role="alert">{error}</p>}{body&&<iframe title="固定送審原文" className="ao-plan-frame" sandbox={REPORT_FRAME.sandbox} srcDoc={planDocumentHtml(body)}/>}</details>
}
