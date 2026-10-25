import {useEffect,useRef,useState} from 'react'
import {PlanSummary,PlanDocument} from '../pages/PlanViews'
import {milestones,PACKAGE_STATUS,safeUrl} from '../lib/aiOffice.mjs'
import {officeView,officeEvents,officeTime} from '../lib/botOfficeView.mjs'
import {OfficeRequest,OfficeLog,OfficeFollowUps} from './OfficeActions'
import {OFFICE_NAMES} from '../botOfficeData'
const when = value => value ? new Date(value * 1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}) : '尚未記錄'
const text = value => typeof value==='string'?value:value?JSON.stringify(value):'尚未提供'
function Empty({children}) {return <p className="ao-empty">{children}</p>}
function Link({href,children}) {const url=safeUrl(href);return url?<a href={url} target="_blank" rel="noopener noreferrer">{children} ↗</a>:<span>{children}（連結未就緒）</span>}
function Card({title,children,className=''}) {return <section className={`ao-card ${className}`}><h2>{title}</h2>{children}</section>}
function Pill({s,children}) {return <span className="hy-pill" data-s={s}>{children}</span>}
export function OfficeSnapshot({report}) {
 const [lines,setLines]=useState([])
 useEffect(()=>{
  if(Array.isArray(report.summary)){setLines(report.summary.filter(x=>typeof x==='string'));return}
  if(typeof report.summary==='string'&&report.summary.trim()){setLines([report.summary]);return}
  if(typeof report.latest?.html!=='string'){setLines([]);return}
  const doc=new DOMParser().parseFromString(report.latest.html,'text/html')
  const heading=[...doc.querySelectorAll('h1,h2,h3,h4,b,strong')].find(e=>/一頁摘要|現在怎樣.*你要做什麼/.test(e.textContent||''))
  const section=heading?.closest('section,article')||heading?.parentElement?.parentElement
  const bullets=section?[...section.querySelectorAll('li')].slice(0,6).map(e=>e.textContent.trim()).filter(Boolean):[]
  setLines(bullets.length?bullets:section?[section.textContent.trim().slice(0,1200)]:[])
 },[report.summary,report.latest?.html])
 return <section className="ao-card ao-report-snapshot"><div className="ao-card-head"><h2>一頁摘要：現在怎樣、你要做什麼</h2><small>正式成果報告</small></div>{lines.length?lines.map((line,i)=><p key={i}>{line}</p>):<p className="ao-muted">尚無正式成果報告摘要。</p>}{report.stale&&<p className="ao-muted">最新報告落後於正式專案資料</p>}</section>
}
export function OfficeCards({items}) {return items.map(c=><article className="ao-card" key={c.id}><h2>{c.title}</h2><p>{c.summary}</p><Link href={c.driveUrl}>開啟 Drive 原件</Link></article>)}
export function OfficeTeam({project}) {
 const lanes=[...new Set([project.executor,project.reviewer].filter(x=>x&&x!=='尚未指定'))]
 return <Card title="這個專案的團隊" className="ao-team">{project.team.map(e=><p key={e.role+e.id}><b>{e.name}</b> <small>{e.role}</small></p>)}{!project.team.length&&<p className="ao-muted">由 PI 依 AI 執行規劃書配置專家。</p>}<h3>使用的通道</h3>{lanes.map(e=><p key={e}>{OFFICE_NAMES[e]||e}</p>)}</Card>
}
export function OfficeMeeting({project,projects,reload,onOverview}) {
 const events=officeEvents(project).filter(e=>e.kind==='human'||e.kind==='notification'||e.action).sort((a,b)=>a.at-b.at)
 return <div className="ao-meeting"><section className="ao-card ao-thread-card"><h2>與 PI 的對話</h2><p className="ao-muted">正式的建議、補充與決策紀錄；PI 即時對話尚未接上。</p><div className="ao-thread">{events.map(e=><article className={`ao-message${e.actor==='HY'?' is-me':''}`} key={e.id}><div><b>{e.actor}</b> <time>{when(e.at)}</time>{e.detail==='已送出'&&<Pill s="wait">已送出</Pill>}</div><p>{e.text}</p>{e.action&&<button onClick={onOverview}>到概況處理</button>}</article>)}{project.cards.meeting.map(c=><article className="ao-message" key={c.id}><div><b>{c.title}</b> <time>{c.date}</time></div><p>{c.summary}</p>{c.driveUrl&&<Link href={c.driveUrl}>開啟 Drive 原件</Link>}</article>)}{!events.length&&!project.cards.meeting.length&&<Empty>還沒有對話。從下方送出第一則意見。</Empty>}</div><div className="ao-composer"><OfficeRequest key={project.id} type="message" projects={projects} projectId={project.id} inline reload={reload}><fieldset className="ao-files" disabled><legend>附件與 Google Drive</legend><label>上傳檔案至專案 Drive<input type="file" aria-label="上傳專案附件"/></label><label>選取已登錄的專案 Drive 檔案<select aria-label="選取專案 Drive 檔案"><option>選取檔案…</option>{officeView(project).files.map(f=><option key={f.file_id}>{f.filename}</option>)}</select></label><label>匯入其他 Google Drive 檔案 ID<input placeholder="Google Drive 檔案 ID"/></label><button type="button">複製到專案 references 並驗證</button><small>附件寫入尚未接上，現有 Drive 原件不受影響。</small></fieldset></OfficeRequest></div></section><OfficeTeam project={project}/></div>
}
export function OfficeExecution({project,plan,selected,select}) {
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


// HTML is supplied as content, never fetched from an arbitrary URL or inserted into the host DOM.
export function OfficeResults({project,onOverview}) {
 const [chosen,setChosen]=useState(''),[full,setFull]=useState(false)
 const report=project.source.report||{}, history=Array.isArray(report.history)?report.history:[]
 const selected=history.find(r=>r.file_id===(chosen||report.latest?.file_id))||report.latest
 const html=typeof selected?.html==='string'?selected.html:null
 useEffect(()=>{if(!full)return;const key=e=>{if(e.key==='Escape')setFull(false)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[full])
 const checkpoints=Array.isArray(project.source.quality?.checkpoints)?project.source.quality.checkpoints:[]
 const reviews=project.cards.outputs.filter(c=>c.isReview)
 return <div className="ao-results"><Card title="成果報告" className={full?'ao-reader-full':''}><div className="ao-toolbar">{project.folderUrl&&<Link href={project.folderUrl}>開專案 Drive 資料夾</Link>}<label>報告版本<select aria-label="成果報告版本" value={chosen||report.latest?.file_id||''} onChange={e=>setChosen(e.target.value)}>{!history.length&&<option value="">尚無正式報告</option>}{history.map(r=><option key={r.file_id} value={r.file_id}>第 {r.revision} 版 · {when(officeTime(r.drive_created_at||r.created_at))}</option>)}</select></label><button disabled={!html} onClick={()=>setFull(v=>!v)}>{full?'離開完整閱讀':'完整閱讀'}</button></div><p className="ao-muted">最後更新：{when(officeTime(selected?.drive_created_at||selected?.created_at))}{report.stale?' · 最新報告落後於正式專案資料':''}</p>{html?<iframe title="正式 HTML 成果報告" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={html}/>:<Empty>正式 HTML 報告內文尚未提供。</Empty>}{!html&&project.cards.outputs.filter(c=>!c.isReview).map(c=><p key={c.id}><Link href={c.driveUrl}>{c.title}</Link></p>)}</Card><Card title="獨立審查"><p className="ao-muted">只審三個節點：規劃、重大里程碑、結案。PASS 只代表內容通過，是否核准仍在<button className="ao-inline" onClick={onOverview}>概況</button>決定。</p>{checkpoints.map(c=><details className="ao-review" key={c.checkpoint_id}><summary><span className="ao-review-kind">{c.kind}</span><b>{c.milestone_id||''} 第 {c.round} 輪</b><Pill s={c.verdict==='PASS'?'done':'you'}>{c.verdict||'審查中'}</Pill></summary><p>問題與補強：{text(c.findings||c.summary)}</p>{c.report_url&&<Link href={c.report_url}>審查報告</Link>}<details><summary>審查對象的版本證據</summary><pre>{JSON.stringify(c.target,null,2)}</pre></details></details>)}{!checkpoints.length&&<Empty>尚無獨立審查節點紀錄。</Empty>}<p>最近審查：{({pass:'通過',fail:'需修改',none:'尚無審查'})[project.review.verdict]||project.review.verdict} · 退回次數：{project.review.returnedCount}</p>{project.review.url&&<Link href={project.review.url}>開啟審查報告</Link>}{project.review.requiredChanges.length>0&&<><h3>必改清單</h3><ul>{project.review.requiredChanges.map((x,i)=><li key={i}>{x}</li>)}</ul></>}{reviews.map(c=><details className="ao-review" key={c.id}><summary>{c.title}</summary><p>{c.date}</p><p>{c.summary}</p><Link href={c.driveUrl}>審查報告</Link></details>)}</Card><details><summary>執行前待辦（{project.followUps.length}）</summary><OfficeFollowUps project={project}/></details></div>
}
export function OfficeJournal({project,reload,onOverview,onExecution}) {
 const [filter,setFilter]=useState('all'), events=[...officeEvents(project),...project.cards.log.map(c=>({id:'card:'+c.id,kind:'system',actor:c.title,text:c.summary,dateLabel:c.date,url:c.driveUrl}))].filter(e=>filter==='all'||e.kind===filter)
 return <><Card title="工作日誌"><div className="ao-toolbar" role="group" aria-label="工作日誌篩選">{[['all','全部'],['human','HY 與代理'],['system','系統與工作包'],['artifact','成果登錄']].map(([k,l])=><button key={k} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{l}</button>)}</div><ol className="ao-journal">{events.map(e=><li key={e.id}><time>{e.dateLabel||when(e.at)}</time><b>{e.actor}</b><p>{e.text}</p>{e.detail&&<details><summary>詳情</summary><p>{e.detail}</p></details>}{e.action&&<button onClick={onOverview}>到概況</button>}{e.work&&<button onClick={()=>onExecution(e.work)}>關聯工作包 {e.milestone}</button>}{e.url&&<Link href={e.url}>成果</Link>}</li>)}</ol>{!events.length&&<Empty>這個篩選沒有事件。</Empty>}</Card><details><summary>新增 HY 留言</summary><OfficeLog project={{...project,logs:[]}} reload={reload}/></details></>
}
