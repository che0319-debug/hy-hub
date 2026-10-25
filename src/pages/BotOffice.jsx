// Match the actual AIOfficeV1 five-tab structure; data stays on the new Office APIs.
import { useCallback, useEffect, useRef, useState } from 'react'
import { authHeaders, expireSession } from '../auth'
import { loadBotOffice, OFFICE_TABS, REFRESH_MS, OFFICE_NAMES } from '../botOfficeData'
import './bot-office.css'
import Decisions from '../components/OfficeDecisions'
import { OfficeRequest, OfficeFollowUps } from '../components/OfficeActions'
import { OfficeSnapshot, OfficeJournal, OfficeMeeting, OfficeExecution, OfficeResults } from '../components/BotOfficePanels'
import { TAB_NOTES, milestones, progress, PACKAGE_STATUS } from '../lib/aiOffice.mjs'
import OfficeHome from './OfficeHome'
import ReviewBlockers from '../components/ReviewBlockers'
import {laneLabel} from '../lib/lanes'
import {officeView} from '../lib/botOfficeView.mjs'

const NOTES = TAB_NOTES
const when = value => value ? new Date(value*1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}) : '尚未記錄'
const Pill = ({ project }) => <span className="hy-pill" data-s={project.tone}>{project.stageLabel}</span>
function DecisionList({items, filter, setFilter, reload}) {
  const visible = items.filter(d => filter === 'all' || d.status === filter)
  const filters = <details><summary>已回覆與歷史</summary><div className="ao-chips" role="group" aria-label="決策篩選">{[['open','待你決定'],['answered','已回覆'],['all','全部歷史']].map(([key,label])=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div></details>
  return visible.length ? <Decisions items={visible} title={filter==='open'?'待你決定':'決策與歷史'} reload={reload} toolbar={filters}/> : <section className="ao-card ao-decide"><h2>{filter==='open'?'待你決定':'決策與歷史'}</h2><p className="ao-empty">目前沒有需要你決定的事。PI 需要你時會出現在這裡。</p>{filters}</section>
}

export default function BotOffice() {
  const [data, setData] = useState(null), [error, setError] = useState(null), [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState(null), [tab, setTab] = useState('overview'), [decisionFilter, setDecisionFilter] = useState('open'), [editing, setEditing] = useState(false), [creating,setCreating] = useState(false), [selectedWork,setSelectedWork] = useState(null)
  const generation = useRef(0), controller = useRef(null), initialLoad = useRef(true)
  const reload = useCallback(async () => {
    const version = ++generation.current
    controller.current?.abort(); controller.current = new AbortController()
    setLoading(initialLoad.current)
    try {
      const next = await loadBotOffice({ headers: authHeaders(), signal: controller.current.signal })
      if (version === generation.current) { setData(next); setError(null) }
    } catch (e) {
      if (version === generation.current && e.name !== 'AbortError') {
        setError({ kind: e.kind || 'error', message: e.message })
        if (e.kind === 'auth' || e.kind === 'empty') setData(null)
      }
    } finally { if (version === generation.current) { initialLoad.current = false; setLoading(false) } }
  }, [])
  useEffect(() => {
    reload(); const interval = setInterval(reload, REFRESH_MS)
    return () => { generation.current++; controller.current?.abort(); clearInterval(interval) }
  }, [reload])
  const project = data?.projects.find(p => p.id === projectId)
  const views = (data?.projects || []).map(officeView)
  const view = project ? officeView(project) : null
  const details = Object.fromEntries(views.filter(p=>Array.isArray(p.packages)&&Array.isArray(p._rawPackages)).map(p=>[p.id,p]))
  const inbox = views.flatMap(p=>p.actions.filter(a=>a.status==='OPEN'))
  const openExecution = work => {setSelectedWork(work);setTab('execution')}
  const count = view ? progress(view) : null
  const ms = view ? milestones(view) : []
  const active = view?.packages.filter(p=>['RUNNING','READY','BLOCKED','FAILED'].includes(p.status)&&p.type!=='PROJECT_REPORT') || []
  return <section className="ao bo-page" aria-label="Bot Office">
    {data?.stale && <p className="bo-notice" role="status">資料過期：目前顯示後端保留的舊資料。</p>}
    {error && <section className="ao-card" role={error.kind==='empty'?'status':'alert'}><h2>{error.kind==='empty'?'尚無資料':error.kind==='auth'?'請重新登入':'暫時無法更新'}</h2><p>{error.message}</p><button onClick={error.kind==='auth'?expireSession:reload}>{error.kind==='auth'?'重新登入':'重試讀取'}</button></section>}
    {!project && <OfficeHome title="Bot Office" projects={views} details={details} inbox={inbox} loaded={!loading} error={null} creating={creating} onReload={reload} onCreate={()=>setCreating(v=>!v)} onSelect={id=>{setProjectId(id);setTab('overview');setDecisionFilter('open');setEditing(false);setSelectedWork(null)}} creation={creating&&<OfficeRequest type="new_project" projects={data?.projects || []} inline reload={reload}/>}/>} 
    {project && <section className="ao ao-project">
      <button className="ao-back" onClick={()=>{setProjectId(null);setEditing(false)}}>‹ Bot Office</button>
      <header className="ao-header"><div className="ao-header-top"><h1>{project.title}</h1>{view.plan?.project_type&&<span className="ao-type">{view.plan.project_type}</span>}<Pill project={project.pending ? {...project,tone:'you',stageLabel:project.stage==='assigned'&&project.decisions.some(d=>d.kind==='intake')?'等 HY 回答':'待你決定'} : project}/><div className="ao-header-actions"><button aria-expanded={editing} onClick={()=>setEditing(v=>!v)}>編輯專案</button><button disabled title="新流程尚未提供刪除端點">刪除專案</button></div></div><p className="ao-goal" title={view.goal}>{view.goal||'目標尚未記錄'}</p><div className="ao-header-meta"><span>階段 <b>{view.phase} {view.milestone_id||''}</b></span><span>工作包 <b>{Array.isArray(view._rawPackages)?`${count.done}／${count.total}`:'尚未提供'}</b></span><span>開始 <b>{when(view.started_at)}</b></span><span>最近紀錄 <b>{when(view.updated_at)}</b></span>{project.folderUrl&&<span>Drive <a href={project.folderUrl} target="_blank" rel="noopener noreferrer">專案資料夾 ↗</a></span>}</div></header>
      <ReviewBlockers items={view.system_blockers}/>{editing&&<section className="ao-card"><h2>編輯專案（正式規格變更）</h2><p className="ao-muted">目標與範圍走正式規格變更，由你核准後才生效。</p><OfficeRequest type="spec_change" projects={data.projects} projectId={project.id} reload={reload}/></section>}
      <nav className="ao-tabs" aria-label="Bot Office 專案分頁">{OFFICE_TABS.map(([key,label])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}>{label}{key==='overview'&&project.decisions.length>0&&<span>{project.decisions.length}</span>}</button>)}</nav>
      <p className="ao-tabnote">{NOTES[tab]}</p>
      <div hidden={tab!=='overview'}><div className="ao-overview ao-overview-v2"><OfficeSnapshot report={view.report}/>
      <section className="ao-card ao-milestone-strip"><h2>里程碑</h2><ol className="ao-timeline">{ms.map(m=><li key={m.id} className={m.id===view.milestone_id?'is-current':undefined}><button onClick={()=>openExecution(m.id)}><b>{m.id} {m.name}</b><small>{m.packages.filter(w=>w.status==='COMPLETED').length}／{m.packages.length} 工作包{m.id===view.milestone_id?' · 目前':''}</small></button></li>)}</ol>{!ms.length&&<p className="ao-empty">正式規劃尚未提供里程碑。</p>}</section>
      <div className="ao-overview-main"><DecisionList items={project.allDecisions} filter={decisionFilter} setFilter={setDecisionFilter} reload={reload}/><section className="ao-card"><h2>AI 正在做什麼</h2>{active.map(w=><button className="ao-row ao-work" key={w.id} onClick={()=>openExecution(w.id)}><span className="ao-lane">{laneLabel(w.executor)}</span><span className="ao-work-main"><b>{w.task}</b><small>{w.milestone_id||'規劃期'}</small></span><span className="hy-pill" data-s={w.status==='FAILED'?'bad':w.status==='BLOCKED'?'you':'ai'}>{PACKAGE_STATUS[w.status]||w.status}</span></button>)}{!active.length&&<p className="ao-empty">{Array.isArray(view._rawPackages)?'沒有執行中或待開始的工作包。':'執行工作明細尚未提供。'}</p>}</section></div>
      {(project.pendingAdvances.length>0||project.followUps.length>0)&&<details><summary>決策後續與執行前待辦</summary>{project.pendingAdvances.map(d=><p key={d.id}>{d.advance?.stage==='returned'?'已退回，待推進修訂。':d.advance?.stage==='done'?'已核准，待推進完成。':'決策已作答，待推進。'}</p>)}<OfficeFollowUps project={project}/></details>}
      </div><details className="hy rt-root hy-card"><summary>AI 執行配置</summary><p>執行者：{OFFICE_NAMES[project.executor]||project.executor}</p><p>審查者：{OFFICE_NAMES[project.reviewer]||project.reviewer||'尚未指定'}</p><OfficeRequest type="reassign" projects={data.projects} projectId={project.id} reload={reload}/></details></div>
      <div hidden={tab!=='meeting'}><OfficeMeeting project={project} projects={data.projects} reload={reload} onOverview={()=>setTab('overview')}/></div>
      <div hidden={tab!=='execution'}><OfficeExecution project={view} plan={view.plan} selected={selectedWork} select={setSelectedWork}/></div>
      <div hidden={tab!=='outputs'}><OfficeResults project={project} onOverview={()=>setTab('overview')}/></div>
      <div hidden={tab!=='log'}><OfficeJournal project={project} reload={reload} onOverview={()=>setTab('overview')} onExecution={openExecution}/></div>
    </section>}
  </section>
}
