// Office presents one continuous report, project conversations and the existing journal.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { authHeaders, expireSession, getAccessToken } from '../auth'
import { loadBotOffice, OFFICE_TABS, REFRESH_MS, OFFICE_NAMES } from '../botOfficeData'
import './bot-office.css'
import { OfficeRequest } from '../components/OfficeActions'

import { OfficeJournal, OfficeMeeting, OfficeUnifiedReport, OfficeDelete, useOfficeReport, useOfficeCanonical } from '../components/BotOfficePanels'
import { snapshotLines } from '../lib/officeDocuments.mjs'
import { TAB_NOTES, milestones } from '../lib/aiOffice.mjs'
import OfficeHome from './OfficeHome'
import {officeView, officeMilestones, officePlan, currentMilestoneId, milestoneProgress, executionRounds, isHyOwnerSession} from '../lib/botOfficeView.mjs'
import {reportSummaryStatus} from '../lib/reportSummary.mjs'
import { useInbox } from '../inbox/InboxContext'
import { buildInbox } from '../inbox/inboxData.js'
import OfficeItem from '../components/OfficeItem'
import OwnerBotPicker from '../components/OwnerBotPicker'
import OfficeStageControl from '../components/OfficeStageControl'
import { STEP_LABEL, projectFlow } from '../lib/officeFlow.mjs'
import { createLatestRead, readOfficeLatest } from '../lib/latestRead.js'
import { OWNER_SHARED_ROSTER_STALE, refreshAfterOwnerSave } from '../lib/ownerBotUi.js'

const NOTES = { overview: '同一份 HTML 報告，從規劃持續更新到結案。', meeting: '你、Bot 與 GPT 的建議、要求、待決定與補資料事項。一般留言不等於核准。', log: '專案推進與決策歷程。' }
const when = value => value ? new Date(value*1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}) : '尚未記錄'
const Pill = ({ project }) => <span className="hy-pill" data-s={project.displayTone || project.tone}>{project.displayLabel || project.stageLabel}</span>
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
  const [searchParams] = useSearchParams()
  const [projectId, setProjectId] = useState(() => searchParams.get('project') || null), [tab, setTab] = useState(() => OFFICE_TABS.some(([key]) => key === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'), [itemId, setItemId] = useState(() => searchParams.get('item') || null), [editing, setEditing] = useState(false), [creating,setCreating] = useState(false), [selectedWork,setSelectedWork] = useState(null), [settingsOpen, setSettingsOpen] = useState(false)
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
  const documents = useOfficeCanonical(project, data?.state, data?.index)
  const planningLines = snapshotLines(documents.currentView)
  const reportStatus = reportSummaryStatus(report)
  const snapStatus = reportStatus === 'empty' && documents.currentView?.hasPlanning ? 'planning' : reportStatus
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
  const openExecution = work => {setSelectedWork(work);setTab('overview')}
  const rounds = (view?._rounds || []).filter(round => round.active)
  const milestoneRows = view?._milestoneRows || []
  const shownMilestones = timelineRows(milestoneRows, view?._flow)
  const headerMilestoneId = currentMilestoneId(shownMilestones)
  const headerCount = milestoneProgress(shownMilestones)
  const hy = isHyOwnerSession(getAccessToken())
  // 「待你處理」：Office 卡片用這頁剛讀的資料（答完立刻更新），問題與待辦沿用共用 Inbox 的來源。
  const pendingItems = buildInbox({ decisions: data?.decisions || [], projects: data?.projects || [], bots: hub?.roster?.bots || {},
    todos: hub?.info?.list ?? null, sched: hub?.info?.sched ?? null, today: hub?.info?.today || '' })
  const item = itemId ? (data?.items || []).find(entry => entry.id === itemId) || null : null
  const reloadAll = async () => { await reload(); await hub?.reloadOffice?.() }
  const openProject = (id, nextTab = 'overview') => { setDeleteNote(''); setItemId(null); setProjectId(id); setTab(nextTab); setEditing(false); setSelectedWork(null) }
  return <section className="ao bo-page" aria-label="Bot Office">
    {data?.stale && <p className="bo-notice" role="status">資料過期：目前顯示後端保留的舊資料。</p>}
    {deleteNote && <p className="bo-notice" role="status">{deleteNote}</p>}
    {error && <section className="ao-card" role={error.kind==='empty'?'status':'alert'}><h2>{error.kind==='empty'?'尚無資料':error.kind==='auth'?'請重新登入':'暫時無法更新'}</h2><p>{error.message}</p><button onClick={error.kind==='auth'?expireSession:reload}>{error.kind==='auth'?'重新登入':'重試讀取'}</button></section>}
    {item && !project && <OfficeItem item={item} reload={reloadAll} canClose={hy} onBack={() => setItemId(null)} />}
    {itemId && !item && !project && data && <section className="ao-card" role="status"><h2>找不到這張小案卡</h2><p>可能已經結案。</p><button onClick={() => setItemId(null)}>回 Bot Office</button></section>}
    {!project && !itemId && <>
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
      <OfficeHome title="Bot Office" projects={views} details={details} inbox={inbox} loaded={!loading} error={null} creating={creating} onReload={reload} onCreate={()=>setCreating(v=>!v)} onSelect={id=>openProject(id)} creation={creating&&<OfficeRequest type="new_project" projects={data?.projects || []} inline reload={reload} settings={data?.settings?.ai_defaults}/>} showModelsLink={false} progressOf={item => progressLabel(timelineRows(item._milestoneRows, item._flow))} progressEmpty="里程碑尚未提供" hidePackageGap needsYou={data?.totals?.needsYou} pendingItems={pendingItems} onOpenItem={id => { setProjectId(null); setItemId(id) }} onOpenMeeting={id => openProject(id, 'meeting')}/>

    </>}
    {project && view && <section className="ao ao-project">
      <button className="ao-back" onClick={()=>{setProjectId(null);setEditing(false)}}>‹ Bot Office</button>
      <header className="ao-header"><div className="ao-header-top"><h1>{project.title}</h1><span className="ao-type">{project.island}</span><Pill project={project}/>{project.pending&&<button type="button" className="hy-pill ao-pending-pill" data-s="you" onClick={()=>{setTab('meeting');setTimeout(()=>{const el=document.getElementById(`mr-pending-${project.id}`);el?.scrollIntoView({behavior:'smooth',block:'start'});el?.focus({preventScroll:true})},0)}} title="到會議室的「待你處理」">{project.decisions.length} 項待你處理</button>}<div className="ao-header-actions"><button aria-expanded={editing} onClick={()=>setEditing(v=>!v)}>編輯專案</button>{hy && <OfficeStageControl project={project} milestones={(view._flow?.milestones || milestoneRows).filter(m => m?.kind !== 'plan' && !/^m0$/i.test(String(m?.id || '')))} allMilestones={view._flow?.milestones || milestoneRows} onChanged={reload} />}{hy ? <div className="cc5"><OfficeDelete project={project} updatedRaw={data.updatedRaw} onDeleted={async note => { setDeleteNote(typeof note === 'string' ? note : ''); setProjectId(null); await reload() }} /></div> : <span className="ao-muted">刪除專案僅限 HY 本人</span>}</div></div><p className="ao-goal" title={view.goal}>{view.goal||'目標尚未記錄'}</p><div className="ao-header-meta"><span>階段 <b>{view.phase} {headerMilestoneId}</b></span><span>里程碑 <b>{shownMilestones.length ? `${headerCount.done}／${shownMilestones.length}` : '尚未提供'}</b></span><span>開始 <b>{when(view.started_at)}</b></span><span>最近紀錄 <b>{when(view.updated_at)}</b></span>{project.folderUrl&&<span>Drive <a href={project.folderUrl} target="_blank" rel="noopener noreferrer">專案資料夾 ↗</a></span>}</div></header>
      {editing&&<section className="ao-card"><h2>編輯專案（正式規格變更）</h2><p className="ao-muted">目標與範圍走正式規格變更，由你核准後才生效。</p><OfficeRequest type="spec_change" projects={data.projects} projectId={project.id} reload={reload}/></section>}
      <nav className="ao-tabs" aria-label="Bot Office 專案分頁">{OFFICE_TABS.map(([key,label])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}>{label}{key==='meeting'&&project.decisions.length>0&&<span>{project.decisions.length}</span>}</button>)}</nav>
      <p className="ao-tabnote">{NOTES[tab]}</p>
      <div hidden={tab!=='overview'}><OfficeUnifiedReport project={project} report={report} documents={documents} milestones={shownMilestones}/></div>
      <div hidden={tab!=='meeting'}><OfficeMeeting project={project} projects={data.projects} reload={reload} state={data.state} index={data.index}/></div>
      <div hidden={tab!=='log'}><OfficeJournal project={project} reload={reload} onOverview={()=>setTab('meeting')} onExecution={openExecution} state={data.state} index={data.index}/></div>
    </section>}
  </section>
}
