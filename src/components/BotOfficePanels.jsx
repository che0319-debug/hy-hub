import {useCallback,useEffect,useRef,useState} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {PlanSummary,PlanDocument} from '../pages/PlanViews'
import {milestones,PACKAGE_STATUS,safeUrl} from '../lib/aiOffice.mjs'
import {officeEvents,officeTime,officeJournal,reportSummaryLines,reportIsStale,reportVersions,normalizeOfficeReport,normalizeOfficeDocument,normalizeOfficeFiles,reviewRounds,reviewFieldLabel,openFollowUpCount,REPORT_FRAME} from '../lib/botOfficeView.mjs'
import {OfficeRequest,OfficeLog,OfficeFollowUps} from './OfficeActions'
import {OFFICE_NAMES,OFFICE_TABS,loadOfficeReport,loadOfficeReportHtml,loadOfficeDocument,loadOfficeFiles,deleteOfficeProject,uploadOfficeFile,importOfficeReference} from '../botOfficeData'
import {authHeaders} from '../auth'
import './project-report.css'
import '../pages/control-center-v5.css'

const when = value => { const seconds = typeof value === 'number' ? value : officeTime(value); return seconds ? new Date(seconds * 1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}) : '尚未記錄' }
const text = value => typeof value==='string'?value:value?JSON.stringify(value):'尚未提供'
function Empty({children}) {return <p className="ao-empty">{children}</p>}
function Link({href,children}) {const url=safeUrl(href);return url?<a href={url} target="_blank" rel="noopener noreferrer">{children} ↗</a>:<span>{children}（連結未就緒）</span>}
function Card({title,children,className=''}) {return <section className={`ao-card ${className}`}><h2>{title}</h2>{children}</section>}
function Pill({s,children}) {return <span className="hy-pill" data-s={s}>{children}</span>}
const projectCards = project => OFFICE_TABS.flatMap(([key]) => project.cards?.[key] || [])

export function useOfficeReport(projectId, updatedRaw) {
  const [metaState,setMetaState]=useState({status:'idle',meta:null,error:''})
  const [fileId,setFileId]=useState('')
  const [htmlState,setHtmlState]=useState({html:'',error:''})
  useEffect(()=>{
    if(!projectId){setMetaState({status:'idle',meta:null,error:''});setFileId('');setHtmlState({html:'',error:''});return undefined}
    const ctrl=new AbortController(); let alive=true
    setMetaState({status:'loading',meta:null,error:''}); setFileId(''); setHtmlState({html:'',error:''})
    loadOfficeReport(projectId,{headers:authHeaders(),signal:ctrl.signal}).then(data=>{
      if(!alive)return
      const meta=normalizeOfficeReport(data)
      if(!meta){setMetaState({status:'error',meta:null,error:'報告資料格式無法辨識，沒有改顯示其他內容。'});return}
      if(!meta.exists){setMetaState({status:'empty',meta,error:meta.reason||''});return}
      setMetaState({status:'ready',meta,error:''})
      setFileId(meta.file_id||meta.history[0]?.file_id||'')
    }).catch(error=>{if(alive&&error.name!=='AbortError')setMetaState({status:'error',meta:null,error:error.message||'報告讀取失敗。'})})
    return()=>{alive=false;ctrl.abort()}
  },[projectId])
  useEffect(()=>{
    if(!projectId||!fileId||metaState.status!=='ready')return undefined
    const ctrl=new AbortController(); let alive=true
    setHtmlState({html:'',error:''})
    loadOfficeReportHtml(projectId,fileId,{headers:authHeaders(),signal:ctrl.signal}).then(html=>{if(alive)setHtmlState({html,error:''})}).catch(error=>{if(alive&&error.name!=='AbortError')setHtmlState({html:'',error:error.message||'報告內文讀取失敗。'})})
    return()=>{alive=false;ctrl.abort()}
  },[projectId,fileId,metaState.status])
  const meta=metaState.meta
  const modified=fileId&&meta?(meta.history.find(item=>item.file_id===fileId)?.modified_time||(fileId===meta.file_id?meta.modified_time:'')):''
  return {...metaState,fileId,setFileId,html:htmlState.html,htmlError:htmlState.error,lines:reportSummaryLines(htmlState.html),stale:reportIsStale(updatedRaw,modified),modified,versions:reportVersions(meta)}
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

export function OfficeReportStrip({report,onOpen}) {
  const ready=report?.status==='ready'
  const label=report?.status==='loading'?'讀取中':report?.status==='error'?'讀取失敗':ready?(report.stale?'狀態較新':'已有報告'):'還沒有'
  return <button type="button" className="hy-card pr-strip" onClick={onOpen}>
    <span><b>專案報告</b>{ready&&report.modified&&<small> {when(report.modified)}</small>}</span>
    <span className="hy-pill" data-s={report?.status==='error'?'bad':report?.stale?'you':ready?'done':'wait'}>{label}</span>
  </button>
}

export function OfficeSnapshot({lines=[],status='empty',message='',stale=false}) {
  return <section className="ao-card ao-report-snapshot"><div className="ao-card-head"><h2>一頁摘要：現在怎樣、你要做什麼</h2><small>正式成果報告</small></div>
    {status==='loading'&&<p className="ao-muted">正在讀取專案報告…</p>}
    {status==='ready'&&(lines.length?lines.map((line,i)=><p key={i}>{line}</p>):<p className="ao-muted">報告裡沒有「一頁摘要」。</p>)}
    {status==='empty'&&<p>這個專案還沒有專案報告</p>}
    {status==='error'&&<p role="alert">{message||'報告讀取失敗。'}</p>}
    {status==='empty'&&message&&<p className="ao-muted">{message}</p>}
    {stale&&<p role="status">報告比目前狀態舊，請以狀態列為準</p>}
  </section>
}
export function OfficeCards({items}) {return items.map(c=><article className="ao-card" key={c.id}><h2>{c.title}</h2><p>{c.summary}</p><Link href={c.driveUrl}>開啟 Drive 原件</Link></article>)}
export function OfficeTeam({project}) {
 const lanes=[...new Set([project.executor,project.reviewer].filter(x=>x&&x!=='尚未指定'))]
 return <Card title="這個專案的團隊" className="ao-team">{project.team.map(e=><p key={e.role+e.id}><b>{e.name}</b> <small>{e.role}</small></p>)}{!project.team.length&&<p className="ao-muted">由 PI 依 AI 執行規劃書配置專家。</p>}<h3>使用的通道</h3>{lanes.map(e=><p key={e}>{OFFICE_NAMES[e]||e}</p>)}</Card>
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

export function OfficeMeeting({project,projects,reload,onOverview,state,index}) {
 const journal=(state&&index?officeJournal(state,index,project.id):officeEvents(project)).filter(e=>e.kind==='human'||e.kind==='notification'||e.action)
 const seen=new Set(journal.map(e=>e.id))
 const cards=(project.cards?.meeting||[]).filter(c=>!seen.has(`card:${c.id}`)).map(c=>({id:`card:${c.id}`,at:officeTime(c.createdAt||c.date),actor:c.title,kind:'human',text:c.summary,url:c.driveUrl}))
 const events=[...journal,...cards.filter(c=>c.at)].sort((a,b)=>a.at-b.at).concat(cards.filter(c=>!c.at))
 const [selected,setSelected]=useState(null)
 const appendix=selected?`已登錄檔案：${selected.name}（${selected.id}）`:''
 return <div className="ao-meeting"><section className="ao-card ao-thread-card"><h2>與 PI 的對話</h2><p className="ao-muted">正式的建議、補充與決策紀錄；PI 即時對話尚未接上。</p><div className="ao-thread">{events.map(e=><article className={`ao-message${e.actor==='HY'?' is-me':''}`} key={e.id}><div><b>{e.actor}</b> <time>{when(e.at)}</time>{e.detail==='已送出'&&<Pill s="wait">已送出</Pill>}</div><p>{e.text}</p>{e.detail&&e.detail!=='已送出'&&<p className="ao-muted">{e.detail}</p>}{e.url&&<Link href={e.url}>開啟 Drive 原件</Link>}{e.action&&<button onClick={onOverview}>到概況處理</button>}</article>)}{!events.length&&<Empty>還沒有對話。從下方送出第一則意見。</Empty>}</div><div className="ao-composer"><OfficeRequest key={project.id} type="message" projects={projects} projectId={project.id} inline reload={reload} appendix={appendix}><OfficeAttachments projectId={project.id} onSelect={setSelected}/></OfficeRequest></div></section><OfficeTeam project={project}/></div>
}
export function OfficeExecution({project,plan,selected,select,planDocument}) {
  const [mode,setMode]=useState('summary'),[ratio,setRatio]=useState(60),[focus,setFocus]=useState('')
  const container=useRef(null),dragging=useRef(false),[drag,setDrag]=useState(false)
  const rows=project._officeMilestones?.length?project._officeMilestones:milestones(project)
  const embedded=plan?.project_plan_markdown||plan?.ai_execution_plan_markdown
  const ready=planDocument?.status==='ready'
  const fromApi=ready?planDocument.markdown:''
  const merged=ready?{...(plan||{}),project_plan_markdown:fromApi}:plan
  const showGap=planDocument?.status==='unavailable'||((!planDocument||planDocument.status==='none')&&!embedded)
  const showList=value=>Array.isArray(value)?(value.filter(Boolean).join('、')||'尚未提供'):text(value)
  // 從概況點里程碑／工作包進來：切到「規劃文件」並跳到對應章節。
  useEffect(()=>{if(selected){const pkg=(project.packages||[]).find(p=>p.id===selected);setFocus(pkg?.milestone_id||selected);setMode(m=>m==='summary'?'split':m)}},[selected])
  useEffect(()=>{if(!drag)return;const move=e=>{const rect=container.current.getBoundingClientRect();setRatio(Math.max(30,Math.min(75,(e.clientX-rect.left)/rect.width*100)))};const up=()=>{dragging.current=false;setDrag(false)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)}},[drag])
  return <><div className="ao-toolbar" role="group" aria-label="執行計畫顯示模式">{[['summary','規劃摘要'],['split','時程＋文件'],['work','時程與執行'],['document','完整文件']].map(([key,label])=><button key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}</div>
    {mode==='summary' && <PlanSummary plan={plan} project={project} onOpenDocument={()=>setMode('document')}/>}
    <div className={`ao-execution ao-mode-${mode}`} ref={container} style={{'--work-ratio':`${ratio}%`}} hidden={mode==='summary'}>
      <section className="ao-card ao-work-pane" hidden={mode==='document'} aria-label="時程與執行"><h2>時程與執行</h2>{rows.map(m=><details key={m.id} open={selected===m.id || (m.packages||[]).some(p=>p.id===selected) || !selected}><summary onClick={()=>{select(m.id);setFocus(m.id)}}><b>{m.id} {m.name}</b></summary><p>目標：{text(m.goal || m.objective)}</p><p>交付：{showList(m.deliverables)}</p><p>驗收條件：{showList(m.acceptance_criteria||m.acceptance)}</p>{(m.packages||[]).map(p=><article key={p.id} className="ao-package"><button className="ao-row" aria-pressed={selected===p.id} onClick={()=>{select(p.id);setFocus(m.id)}}><b>{p.task}</b><span>{PACKAGE_STATUS[p.status]} · {p.executor}</span></button><p>前置相依：{(p.dependencies||[]).length?(p.dependencies||[]).map(id=>(project.packages||[]).find(w=>w.id===id)?.task || id).join('、'):'無'}</p><p>交付成果：{text(p.expected_outputs)}</p><p>驗收條件：{text(p.acceptance_criteria)}</p>{p.status==='BLOCKED' && <p className="ao-muted">阻塞依據：{text(p.requires)}</p>}</article>)}</details>)}{!rows.length && <Empty>尚無正式 Milestone。小型專案不強制固定里程碑數量。</Empty>}{(project._rounds||[]).length>0&&<div><h3>執行回合</h3>{project._rounds.map(round=><article key={round.id} className="ao-package"><b>{round.task}</b><p>{OFFICE_NAMES[round.executor]||round.executor||'執行者'} · {round.status||'狀態未記'}{round.startedAt?` · ${when(round.startedAt)}`:''}</p></article>)}</div>}</section>
      <div className="ao-splitter" hidden={mode!=='split'} role="separator" aria-label="調整雙欄比例" aria-orientation="vertical" aria-valuemin={30} aria-valuemax={75} aria-valuenow={Math.round(ratio)} tabIndex={0} onPointerDown={()=>{dragging.current=true;setDrag(true)}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();setRatio(e.key==='Home'?60:Math.max(30,Math.min(75,ratio+(e.key==='ArrowLeft'?-5:5))))}}}/>
      <div className="ao-doc-slot" hidden={mode==='work'}>
        {planDocument?.status==='loading'&&<p className="ao-muted" role="status">正在讀取規劃書…</p>}
        {planDocument?.status!=='loading'&&showGap&&<section className="ao-card" aria-label="規劃書全文"><h2>規劃書</h2><p>規劃書全文讀取未接上</p>{(planDocument?.url)&&<p><Link href={planDocument.url}>開啟規劃書原件</Link></p>}{planDocument?.error&&<p className="ao-muted">{planDocument.error}</p>}</section>}
        {fromApi&&planDocument.truncated&&<p className="ao-muted">文件超過上限，以下為截斷內容。</p>}
        {(ready||embedded)&&<PlanDocument project={project} plan={merged} focus={focus}/>}
      </div>
    </div></>
}

function downloadHtml(name,html){const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}

function ReportStatus({project}) {
  const pending=project.decisions?.length||project.allDecisions?.filter(item=>item.status==='open').length||0
  return <p className="ao-muted" aria-label="報告動態狀態">階段 {project.stageLabel} · 負責 {project.ownerBot||'尚未指定'} · 執行者 {project.executor||'尚未指定'} · 最近審查 {reviewFieldLabel(project.review?.verdict)} · 退回 {project.review?.returnedCount||0} 次 · 執行前待辦未完成 {openFollowUpCount(project.followUps)} · 待 HY 決定 {pending}</p>
}

function ReviewDocument({cardId}) {
  const [doc,setDoc]=useState(null),[error,setError]=useState(''),[open,setOpen]=useState(false)
  useEffect(()=>{
    if(!open||!cardId)return undefined
    const ctrl=new AbortController(); let alive=true
    loadOfficeDocument(cardId,{headers:authHeaders(),signal:ctrl.signal}).then(data=>{
      if(!alive)return
      const next=normalizeOfficeDocument(data)
      if(!next)setError('審查報告格式無法辨識。')
      else setDoc(next)
    }).catch(reason=>{if(alive&&reason.name!=='AbortError')setError(reason.message||'審查報告讀取失敗。')})
    return()=>{alive=false;ctrl.abort()}
  },[open,cardId])
  return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>審查報告全文</summary>{error&&<p role="alert">{error}</p>}{doc&&<div className="ao-document"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{doc.markdown}</ReactMarkdown>{doc.truncated&&<p className="ao-muted">文件超過上限，以上為截斷內容。</p>}</div>}{open&&!doc&&!error&&<p className="ao-muted">正在讀取審查報告…</p>}</details>
}

// HTML is supplied as content, never fetched from an arbitrary URL or inserted into the host DOM.
export function OfficeResults({project,report,onOverview}) {
 const [full,setFull]=useState(false)
 const versions=report?.versions||[]
 const html=report?.html||''
 useEffect(()=>{if(!full)return;const key=e=>{if(e.key==='Escape')setFull(false)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[full])
 const rounds=reviewRounds(projectCards(project))
 const checkpoints=Array.isArray(project.source?.quality?.checkpoints)?project.source.quality.checkpoints:[]
 const linked=new Set(rounds.map(round=>round.reviewId))
 const extraReviews=project.cards.outputs.filter(card=>card.isReview&&!linked.has(card.id))
 return <div className="ao-results"><Card title="成果報告" className={full?'ao-reader-full':''}><div className="ao-toolbar">{project.folderUrl&&<Link href={project.folderUrl}>開專案 Drive 資料夾</Link>}{report?.meta?.drive_url&&<Link href={report.meta.drive_url}>在 Drive 開啟</Link>}<label>報告版本<select aria-label="成果報告版本" value={report?.fileId||''} onChange={e=>report.setFileId(e.target.value)}>{!versions.length&&<option value="">尚無正式報告</option>}{versions.map(item=><option key={item.file_id} value={item.file_id}>{item.current?'目前版本':`第 ${item.version??''} 版`} · {when(item.modified_time)}</option>)}</select></label><button disabled={!html} onClick={()=>setFull(v=>!v)}>{full?'離開完整閱讀':'完整閱讀'}</button><button type="button" disabled={!html} onClick={()=>downloadHtml(`${project.title||'專案'}_專案報告.html`,html)}>下載</button></div>
    <ReportStatus project={project}/>
    {report?.stale&&<p role="status">報告比目前狀態舊，請以狀態列為準</p>}
    <p className="ao-muted">最後更新：{report?.modified?when(report.modified):'尚未記錄'}</p>
    {report?.status==='empty'&&<Empty>這個專案還沒有專案報告</Empty>}
    {report?.status==='empty'&&report.error&&<p className="ao-muted">{report.error}</p>}
    {report?.status==='error'&&<p role="alert">{report.error}</p>}
    {report?.htmlError&&<p role="alert">{report.htmlError}</p>}
    {report?.status==='loading'&&<Empty>正在讀取專案報告…</Empty>}
    {html?<iframe title="正式 HTML 成果報告" sandbox={REPORT_FRAME.sandbox} referrerPolicy={REPORT_FRAME.referrerPolicy} srcDoc={html}/>:report?.status==='ready'&&!report.htmlError&&<Empty>正在讀取報告內文…</Empty>}
  </Card><Card title="獨立審查"><p className="ao-muted">只審三個節點：規劃、重大里程碑、結案。審查結論只在卡片有 verdict 欄時顯示；是否核准仍在<button className="ao-inline" onClick={onOverview}>概況</button>決定。</p>
    {checkpoints.map(item=><details className="ao-review" key={item.checkpoint_id}><summary><span className="ao-review-kind">{item.kind}</span><b>{item.milestone_id||''} 第 {item.round} 輪</b>{item.verdict&&<Pill s={item.verdict==='PASS'||item.verdict==='pass'?'done':'you'}>{item.verdict}</Pill>}</summary><p>{text(item.findings||item.summary)}</p></details>)}
    {rounds.map(round=><details className="ao-review" key={`${round.outputId}:${round.round}`}><summary><b>第 {round.round} 輪</b> {round.outputTitle}{round.hasVerdict&&<Pill s={round.verdict==='pass'||round.verdict==='PASS'?'done':'you'}>{round.verdict}</Pill>}</summary>
      <p>成果版本：{round.outputTitle}</p>
      <p>{round.driveCreatedAt?`Drive 建立：${when(round.driveCreatedAt)}`:'Drive 建立時間待補'}</p>
      {round.reviewTitle&&<p>審查卡：{round.reviewTitle}</p>}
      {round.hasVerdict?<p>結論：{round.verdict}</p>:<p>最近審查：{reviewFieldLabel(project.review?.verdict)}{round.summary?`。${round.summary}`:''}</p>}
      {round.criteria?.length>0&&<ul>{round.criteria.map(item=><li key={item}>{item}</li>)}</ul>}
      <ReviewDocument cardId={round.reviewId}/>
    </details>)}
    {!rounds.length&&<Empty>尚無由成果對到審查卡的輪次。</Empty>}
    <p>最近審查：{reviewFieldLabel(project.review?.verdict)} · 退回次數：{project.review?.returnedCount||0}</p>
    {project.review?.url&&<Link href={project.review.url}>開啟審查報告</Link>}
    {project.review?.requiredChanges?.length>0&&<><h3>必改清單</h3><ul>{project.review.requiredChanges.map((item,i)=><li key={i}>{item}</li>)}</ul></>}
    {extraReviews.map(card=><details className="ao-review" key={card.id}><summary>{card.title}</summary><p>{card.date}</p><p>{card.summary}</p><Link href={card.driveUrl}>審查報告</Link>{card.verdict?<p>結論：{card.verdict}</p>:<p>最近審查：{reviewFieldLabel(project.review?.verdict)}</p>}</details>)}
  </Card><details><summary>執行前待辦（{project.followUps.length}）</summary><OfficeFollowUps project={project}/></details></div>
}
export function OfficeJournal({project,reload,onOverview,onExecution,state,index}) {
 const [filter,setFilter]=useState('all'), events=(state&&index?officeJournal(state,index,project.id):officeEvents(project)).filter(e=>filter==='all'||e.kind===filter)
 return <><Card title="工作日誌"><div className="ao-toolbar" role="group" aria-label="工作日誌篩選">{[['all','全部'],['human','HY 與代理'],['system','系統與工作包'],['artifact','成果登錄']].map(([k,l])=><button key={k} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{l}</button>)}</div><ol className="ao-journal">{events.map(e=><li key={e.id}><time>{e.dateLabel||when(e.at)}</time><b>{e.actor}</b><p>{e.text}</p>{e.detail&&<details><summary>詳情</summary><p>{e.detail}</p></details>}{e.action&&<button onClick={onOverview}>到概況</button>}{e.work&&<button onClick={()=>onExecution(e.work)}>關聯工作包 {e.milestone}</button>}{e.url&&<Link href={e.url}>成果</Link>}</li>)}</ol>{!events.length&&<Empty>這個篩選沒有事件。</Empty>}</Card><details><summary>新增 HY 留言</summary><OfficeLog project={{...project,logs:[]}} reload={reload}/></details></>
}

export function OfficeDelete({project,updatedRaw,onDeleted}) {
  const [open,setOpen]=useState(false),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const running=project.stage==='running'
  async function remove(){setBusy(true);setMessage('');try{await deleteOfficeProject(project.id,{confirm_title:confirm.trim(),expected_state_updated:updatedRaw},{headers:authHeaders()});await onDeleted()}catch(error){setMessage(error.message||'刪除失敗，專案未刪除。')}finally{setBusy(false)}}
  if(!open)return <div className="cc5-danger-row"><button type="button" className="cc5-btn cc5-danger" onClick={()=>setOpen(true)}>刪除專案</button></div>
  return <section className="cc5-panel cc5-danger-panel" role="alertdialog" aria-labelledby="bo-del-title" aria-describedby="bo-del-desc">
    <h2 className="cc5-h" id="bo-del-title">永久刪除「{project.title}」？</h2>
    <div id="bo-del-desc" className="cc5-stack-tight">
      <p>刪除後，這個專案的規劃、決策、執行回合與工作紀錄都會從 HY Life OS 移除，<b>無法復原</b>。</p>
      <p>刪除前會自動備份：專案所有資料匯出成 JSON 放進專案的 Drive 資料夾，整個資料夾（含所有產出檔案）移到 HY Life OS／<b>_已刪除專案備份</b>，Drive 上不刪任何檔案。備份失敗就不會刪除。</p>
      {running&&<p className="cc5-warn">目前專案執行中，需等結束後才能刪除。</p>}
    </div>
    <label className="cc5-field">輸入專案名稱「{project.title}」確認<input className="cc5-input" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="off"/></label>
    {message&&<p role="alert" className="cc5-warn">{message}</p>}
    <div className="cc5-two">
      <button type="button" className="cc5-btn" disabled={busy} onClick={()=>{setOpen(false);setConfirm('');setMessage('')}}>取消</button>
      <button type="button" className="cc5-btn cc5-danger-solid" disabled={busy||running||confirm.trim()!==project.title.trim()} onClick={remove}>{busy?'備份並刪除中…':'永久刪除'}</button>
    </div>
  </section>
}

