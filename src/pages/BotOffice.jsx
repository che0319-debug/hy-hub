// Match the actual AIOfficeV1 five-tab structure; data stays on the new Office APIs.
import { useCallback, useEffect, useRef, useState } from 'react'
import { authHeaders, expireSession, getAccessToken } from '../auth'
import { loadBotOffice, OFFICE_TABS, REFRESH_MS, OFFICE_NAMES } from '../botOfficeData'
import './bot-office.css'
import { OfficeRequest } from '../components/OfficeActions'
import { OfficeSnapshot, OfficeJournal, OfficeMeeting, OfficeExecution, OfficeResults, OfficeReportStrip, OfficeDelete, useOfficeReport, usePlanDocument } from '../components/BotOfficePanels'
import { TAB_NOTES, milestones } from '../lib/aiOffice.mjs'
import OfficeHome from './OfficeHome'
import {officeView, officeMilestones, officePlan, currentMilestoneId, milestoneProgress, executionRounds, isHyOwnerSession} from '../lib/botOfficeView.mjs'
import {reportSummaryStatus} from '../lib/reportSummary.mjs'
import { useInbox } from '../inbox/InboxContext'
import OwnerBotPicker from '../components/OwnerBotPicker'
import OfficeStageControl from '../components/OfficeStageControl'
import OfficeFlowDiagram from '../components/OfficeFlowDiagram'
import { STEP_LABEL, projectFlow } from '../lib/officeFlow.mjs'
import { createLatestRead, readOfficeLatest } from '../lib/latestRead.js'
import { OWNER_SHARED_ROSTER_STALE, refreshAfterOwnerSave } from '../lib/ownerBotUi.js'

const NOTES = TAB_NOTES
const when = value => value ? new Date(value*1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}) : '尚未記錄'
const Pill = ({ project }) => <span className="hy-pill" data-s={project.tone}>{project.stageLabel}</span>
const STEP_TONE = { waiting: 'wait', running: 'ai', review: 'ai', hy_decision: 'you', done: 'done', cancelled: 'wait' }
const stepTone = step => STEP_TONE[step] || 'wait'
function timelineRows(rows, flow) {
  const byId = new Map((flow?.milestones || []).map(item => [String(item.id), item]))
  return (rows || []).filter(row => {
    const id = String(row?.id ?? '')
    const kind = byId.get(id)?.kind || row?.kind || ''
    return kind !== 'plan' && !/^m0$/i.test(id)
  }).map(row => {
    const ann = byId.get(String(row.id ?? '')) || {}
    const dependsOn = Array.isArray(ann.dependsOn) ? ann.dependsOn : (Array.isArray(row.dependsOn) ? row.dependsOn : [])
    return { ...row, step: ann.step || row.step || '', kind: ann.kind || row.kind || '', dependsOn }
  })
}
const progressLabel = rows => { const count = milestoneProgress(rows); return count.total ? { ...count, label: `里程碑 ${count.done}／${count.total}` } : null }
const STEP_CODES = new Set(Object.keys(STEP_LABEL))
// 步驟代碼已有藥丸；只留真正不同的狀態文字與到期日。
function timelineExtra(milestone, current) {
  const bits = []
  if (milestone.status && milestone.status !== milestone.step && !STEP_CODES.has(milestone.status)) bits.push(milestone.status)
  if (milestone.due) bits.push(milestone.due)
  if (current) bits.push('目前')
  return bits.length ? ` · ${bits.join(' · ')}` : ''
}

export default function BotOffice() {
  const hub = useInbox()
  const [data, setData] = useState(null), [error, setError] = useState(null), [loading, setLoading] = useState(true), [deleteNote, setDeleteNote] = useState(''), [sharedNote, setSharedNote] = useState('')
  const [projectId, setProjectId] = useState(null), [tab, setTab] = useState('overview'), [editing, setEditing] = useState(false), [creating,setCreating] = useState(false), [selectedWork,setSelectedWork] = useState(null)
  const reads = useRef(null)
  if (!reads.current) reads.current = createLatestRead()
  const controller = useRef(null), initialLoad = useRef(true)
  // 輪詢、表單與刪除仍用 reload()：失敗只留原本的錯誤卡，promise 不外丟。
  // 選擇器要分辨重新讀取失敗，所以用會 reject 的 reloadApplied()。
  const runRead = useCallback(() => readOfficeLatest(reads.current, {
    load: () => {
      controller.current?.abort(); controller.current = new AbortController()
      setLoading(initialLoad.current)
      return loadBotOffice({ headers: authHeaders(), signal: controller.current.signal })
    },
    onApply(next) { setData(next); setError(null) },
    onEmpty(error) { setError({ kind: error.kind || 'error', message: error.message }); setData(null) },
    onFail(error) {
      setError({ kind: error.kind || 'error', message: error.message })
      if (error.kind === 'auth') setData(null)
    },
    onSettled() { initialLoad.current = false; setLoading(false) },
  }), [])
  const reload = useCallback(() => runRead().catch(() => {}), [runRead])
  const reloadApplied = useCallback(() => runRead(), [runRead])
  useEffect(() => {
    reload(); const interval = setInterval(reload, REFRESH_MS)
    return () => { reads.current.bump(); controller.current?.abort(); clearInterval(interval) }
  }, [reload])
  const project = data?.projects.find(p => p.id === projectId)
  const report = useOfficeReport(project?.id, data?.updatedRaw)
  const planDocument = usePlanDocument(project?.planCard?.id)
  const views = (data?.projects || []).map(item => {
    const view = officeView(item)
    const fromBuilding = officeMilestones(item.source)
    const rows = fromBuilding.length ? fromBuilding : milestones(view)
    const current = fromBuilding.length ? currentMilestoneId(fromBuilding) : (view.milestone_id || '')
    const flowSource = Array.isArray(item.source?.milestones) && item.source.milestones.length ? item.source : { ...(item.source || {}), milestones: rows }
    const flow = projectFlow(flowSource, { decisions: item.allDecisions || [], stage: item.stage })
    return { ...view, milestone_id: fromBuilding.length ? current : (view.milestone_id || ''), _officeMilestones: fromBuilding, _milestoneRows: rows, _flow: flow, _rounds: executionRounds(data.state, data.index, item.id), _plan: fromBuilding.length ? officePlan(item.source, view.plan) : view.plan }
  })
  const view = views.find(item => item.id === projectId) || null
  const details = Object.fromEntries(views.map(item => [item.id, item]))
  const inbox = views.flatMap(item => item.actions.filter(action => action.status === 'OPEN'))
  const openExecution = work => {setSelectedWork(work);setTab('execution')}
  const rounds = (view?._rounds || []).filter(round => round.active)
  const milestoneRows = view?._milestoneRows || []
  const shownMilestones = timelineRows(milestoneRows, view?._flow)
  const headerMilestoneId = currentMilestoneId(shownMilestones)
  const headerCount = milestoneProgress(shownMilestones)
  const hy = isHyOwnerSession(getAccessToken())
  return <section className="ao bo-page" aria-label="Bot Office">
    {data?.stale && <p className="bo-notice" role="status">資料過期：目前顯示後端保留的舊資料。</p>}
    {deleteNote && <p className="bo-notice" role="status">{deleteNote}</p>}
    {error && <section className="ao-card" role={error.kind==='empty'?'status':'alert'}><h2>{error.kind==='empty'?'尚無資料':error.kind==='auth'?'請重新登入':'暫時無法更新'}</h2><p>{error.message}</p><button onClick={error.kind==='auth'?expireSession:reload}>{error.kind==='auth'?'重新登入':'重試讀取'}</button></section>}
    {!project && <>
      {sharedNote && <p className="bo-notice" role="status">{sharedNote}</p>}
      <OwnerBotPicker projects={data?.projects || []} onSaved={async () => {
        // 這一頁的清單先落地。共用名單失敗只留在選擇器外面，不掛到已經離開的那一列。
        try {
          const outcome = await refreshAfterOwnerSave(reloadApplied, hub?.reloadOffice)
          setSharedNote(outcome === 'shared-stale' ? OWNER_SHARED_ROSTER_STALE : '')
        } catch (failure) {
          setSharedNote('')
          throw failure
        }
      }} />
      <OfficeHome title="Bot Office" projects={views} details={details} inbox={inbox} loaded={!loading} error={null} creating={creating} onReload={reload} onCreate={()=>setCreating(v=>!v)} onSelect={id=>{setDeleteNote('');setProjectId(id);setTab('overview');setEditing(false);setSelectedWork(null)}} creation={creating&&<OfficeRequest type="new_project" projects={data?.projects || []} inline reload={reload}/>} showModelsLink={false} progressOf={item => progressLabel(timelineRows(item._milestoneRows, item._flow))} progressEmpty="里程碑尚未提供" hidePackageGap needsYou={data?.totals?.needsYou}/>
    </>} 
    {project && view && <section className="ao ao-project">
      <button className="ao-back" onClick={()=>{setProjectId(null);setEditing(false)}}>‹ Bot Office</button>
      <header className="ao-header"><div className="ao-header-top"><h1>{project.title}</h1><span className="ao-type">{project.island}</span><Pill project={project}/>{project.pending&&<button type="button" className="hy-pill ao-pending-pill" data-s="you" onClick={()=>{setTab('meeting');setTimeout(()=>{const el=document.getElementById(`mr-pending-${project.id}`);el?.scrollIntoView({behavior:'smooth',block:'start'});el?.focus({preventScroll:true})},0)}} title="到會議室的「待你處理」">{project.decisions.length} 項待你處理</button>}<div className="ao-header-actions"><button aria-expanded={editing} onClick={()=>setEditing(v=>!v)}>編輯專案</button>{hy && <OfficeStageControl project={project} milestones={(view._flow?.milestones || milestoneRows).filter(m => m?.kind !== 'plan' && !/^m0$/i.test(String(m?.id || '')))} onChanged={reload} />}{hy ? <div className="cc5"><OfficeDelete project={project} updatedRaw={data.updatedRaw} onDeleted={async note => { setDeleteNote(typeof note === 'string' ? note : ''); setProjectId(null); await reload() }} /></div> : <span className="ao-muted">刪除專案僅限 HY 本人</span>}</div></div><p className="ao-goal" title={view.goal}>{view.goal||'目標尚未記錄'}</p><div className="ao-header-meta"><span>階段 <b>{view.phase} {headerMilestoneId}</b></span><span>里程碑 <b>{shownMilestones.length ? `${headerCount.done}／${shownMilestones.length}` : '尚未提供'}</b></span><span>開始 <b>{when(view.started_at)}</b></span><span>最近紀錄 <b>{when(view.updated_at)}</b></span>{project.folderUrl&&<span>Drive <a href={project.folderUrl} target="_blank" rel="noopener noreferrer">專案資料夾 ↗</a></span>}</div></header>
      {editing&&<section className="ao-card"><h2>編輯專案（正式規格變更）</h2><p className="ao-muted">目標與範圍走正式規格變更，由你核准後才生效。</p><OfficeRequest type="spec_change" projects={data.projects} projectId={project.id} reload={reload}/></section>}
      <nav className="ao-tabs" aria-label="Bot Office 專案分頁">{OFFICE_TABS.map(([key,label])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}>{label}{key==='meeting'&&project.decisions.length>0&&<span>{project.decisions.length}</span>}</button>)}</nav>
      <p className="ao-tabnote">{NOTES[tab]}</p>
      <div hidden={tab!=='overview'}><div className="ao-overview ao-overview-v2"><OfficeFlowDiagram flow={view._flow} stage={project.stage}/><OfficeReportStrip report={report} onOpen={()=>setTab('outputs')}/><OfficeSnapshot html={report.html} lines={report.lines} project={project} milestones={milestoneRows} status={reportSummaryStatus(report)} message={report.htmlError||report.error} stale={report.stale} modified={report.modified}/>
      <section className="ao-card ao-milestone-strip"><h2>里程碑</h2><ol className="ao-timeline">{shownMilestones.map(m=>{const current=m.id===headerMilestoneId;const cancelled=m.step==='cancelled';return <li key={m.id} className={[current?'is-current':'',m.step==='done'?'is-done':'',cancelled?'is-cancelled':''].filter(Boolean).join(' ')||undefined}><button onClick={()=>openExecution(m.id)}><b>{m.id} {m.name}</b><small><span className="hy-pill" data-s={stepTone(m.step)}>{STEP_LABEL[m.step]||'步驟待確認'}</span> 前置：{m.dependsOn.length?m.dependsOn.join('、'):'無'}{timelineExtra(m, current)}</small></button></li>})}</ol>{!shownMilestones.length&&<p className="ao-empty">正式規劃尚未提供里程碑。</p>}</section>
      <div className="ao-overview-main"><section className="ao-card"><h2>AI 正在做什麼</h2>{rounds.map(round=><button className="ao-row ao-work" key={round.id} onClick={()=>openExecution(round.cardId||round.id)}><span className="ao-lane">{OFFICE_NAMES[round.executor]||round.executor||'執行者'}</span><span className="ao-work-main"><b>{round.task}</b><small>{round.status||'執行回合'}</small></span><span className="hy-pill" data-s={round.status==='failed'?'bad':round.status==='blocked'?'you':'ai'}>{round.status||'執行中'}</span></button>)}{!rounds.length&&<p className="ao-empty">目前沒有執行中的回合。</p>}</section></div>
      </div><details className="hy rt-root hy-card"><summary>AI 執行配置</summary><p>執行者：{OFFICE_NAMES[project.executor]||project.executor}</p><p>審查者：{OFFICE_NAMES[project.reviewer]||project.reviewer||'尚未指定'}</p><OfficeRequest type="reassign" projects={data.projects} projectId={project.id} reload={reload}/></details></div>
      <div hidden={tab!=='meeting'}><OfficeMeeting project={project} projects={data.projects} reload={reload} state={data.state} index={data.index}/></div>
      <div hidden={tab!=='execution'}><OfficeExecution project={view} plan={view._plan} selected={selectedWork} select={setSelectedWork} planDocument={{...planDocument,url:project.planUrl}}/></div>
      <div hidden={tab!=='outputs'}><OfficeResults project={project} milestones={milestoneRows} report={report} onOverview={()=>setTab('meeting')}/></div>
      <div hidden={tab!=='log'}><OfficeJournal project={project} reload={reload} onOverview={()=>setTab('meeting')} onExecution={openExecution} state={data.state} index={data.index}/></div>
    </section>}
  </section>
}
