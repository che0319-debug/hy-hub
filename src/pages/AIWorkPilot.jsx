import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, RefreshCw, Plus, ExternalLink, Folder, Trash2, Clock3, CirclePlay, CircleCheck } from 'lucide-react'
import './ai-work-pilot.css'
import { createAIWorkPilotProject, sendAIWorkPilotEvent, promoteAIWork } from '../lifeOSApi'
import { useAIWork, refreshAIWork } from '../aiWorkStore'
import AIWorkSummary from '../components/AIWorkSummary'
import WorkDocument from '../components/WorkDocument'
import { getProjectPresentation } from '../aiWorkPresentation'

const STATUS = { ai_pending: ['待 AI 接手','bg-violet-50 text-violet-700'], ai_running: ['進行中','bg-blue-50 text-blue-700'], confirmation: ['等待確認','bg-amber-50 text-amber-700'], completed: ['完成','bg-emerald-50 text-emerald-700'] }
const BOTS = { hy:'HY', family:'小因', '950157':'950157', sam:'Sam' }
const date = value => value ? new Intl.DateTimeFormat('zh-TW', {timeZone:'Asia/Taipei', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false}).format(new Date(value)) : '—'
const badge = p => {
  const Icon = p.workspaceStatus === 'completed' ? CircleCheck : p.workspaceStatus === 'ai_running' ? CirclePlay : Clock3
  return <span className="pilot-badge" data-status={p.workspaceStatus}><Icon size={15} aria-hidden="true"/>{STATUS[p.workspaceStatus]?.[0] || p.workspaceStatus}</span>
}
const panel = 'rounded-2xl border border-slate-200 bg-white px-6 py-5 pilot-card'

export default function AIWorkPilot() {
  const data = useAIWork()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('project') || params.get('projectId') || ''
  const projects = data.projects || []
  const selected = projects.find(p => p.id === selectedId)
  const [tab, setTab] = useState('目標')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newProject, setNewProject] = useState({title:'',goal:'',responsibleBot:'hy'})
  const [criteria, setCriteria] = useState('')
  const [keepId, setKeepId] = useState('')
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const [goalReason, setGoalReason] = useState('')
  const [note, setNote] = useState('')
  const [answer, setAnswer] = useState('')
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState('')
  const [editingReport, setEditingReport] = useState(false)
  const [reportDraft, setReportDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')
  const visible = projects.filter(p => filter === 'all' || p.workspaceStatus === filter)
  async function run(fn) {
    setBusy(true); setError('')
    try { await fn(); await refreshAIWork(); return true } catch (e) { setError(e.message || '操作失敗'); return false }
    finally { setBusy(false) }
  }
  const act = (event, body={}) => run(() => sendAIWorkPilotEvent(selected.id, event, body))
  const review = selected?.humanAction
  const decide = (event, content='') => act(event, {workId:review.workId, actionId:review.actionId, content})
  const open = id => { setParams(id ? {project:id} : {}); setTab('目標'); setEditingGoal(false); setEditingReport(false); setEditingSummary(false) }
  const report = selected?.developmentReport
  const tabs = ['目標','開發規格與進度','開發日誌','成果','參考資料']

  return <div className="pilot-page text-slate-800">
    <header className="pilot-heading"><div><h1>AI Work 區</h1><p>專案目標、執行進展與實際成果</p></div><button onClick={() => run(refreshAIWork)} disabled={busy} aria-label="重新整理" className="pilot-action pilot-refresh"><RefreshCw size={16} aria-hidden="true"/><span>重新整理</span></button></header>
    {(error || data.error) && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error || data.error}</p>}
    {data.migrationRequired && <section className={`${panel} mb-5`}><h3>啟用正式 AI Work 區</h3><p>選擇保留的專案，其餘目前工作區與試跑專案將封存；已封存專案的未完成派工會停止。</p><label className="block my-3">保留專案<select aria-label="保留專案" className="pilot-field" value={keepId} onChange={e=>setKeepId(e.target.value)}><option value="">請選擇</option>{data.migrationCandidates.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><button disabled={!keepId || busy} className="pilot-primary" onClick={()=>run(()=>promoteAIWork({keepProjectId:keepId,expectedProjectIds:data.migrationCandidates.map(p=>p.id)}))}>保留選定專案並啟用 AI Work 區</button></section>}
    {!selected ? <>
      {selectedId && <p className="mb-4 text-slate-500">此專案已封存或不存在。<button className="ml-2 text-blue-600" onClick={()=>open('')}>返回總表</button></p>}
      <AIWorkSummary summary={data.summary} onOpen={setFilter} activeFilter={filter}/>
      {showCreate && <form className={`${panel} mb-5 grid gap-3`} onSubmit={async e=>{e.preventDefault();await run(async()=>{const result=await createAIWorkPilotProject({...newProject,successCriteria:criteria.split('\n').map(s=>s.trim()).filter(Boolean)});setShowCreate(false);setNewProject({title:'',goal:'',responsibleBot:'hy'});setCriteria('');open(result.project.id)})}}><h3>新增專案</h3><input required minLength={2} maxLength={120} className="pilot-field" placeholder="專案名稱" value={newProject.title} onChange={e=>setNewProject({...newProject,title:e.target.value})}/><textarea required minLength={5} maxLength={3000} className="pilot-field" placeholder="目標" value={newProject.goal} onChange={e=>setNewProject({...newProject,goal:e.target.value})}/><textarea className="pilot-field" placeholder="完成條件（每行一項，可由 GPT 補充）" value={criteria} onChange={e=>setCriteria(e.target.value)}/><label>負責 Bot<select className="pilot-field" value={newProject.responsibleBot} onChange={e=>setNewProject({...newProject,responsibleBot:e.target.value})}>{Object.entries(BOTS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><p className="text-sm text-slate-500">建立後等待 GPT 領取、讀取需求並整理規劃；Drive 資料夾屆時建立。</p><div className="flex gap-3"><button disabled={busy} className="pilot-primary">建立專案</button><button type="button" onClick={()=>setShowCreate(false)}>取消</button></div></form>}
      <div className="pilot-tools">
        <div className="pilot-filters" aria-label="篩選專案狀態">{[['all','全部'],...Object.entries(STATUS).map(([key,value])=>[key,value[0]])].map(([key,label])=><button key={key} onClick={()=>setFilter(key)} aria-pressed={filter===key}>{label}</button>)}</div>
        <button disabled={busy || data.migrationRequired} className="pilot-primary" onClick={()=>setShowCreate(true)}><Plus size={17} aria-hidden="true"/>新增 AI Work</button>
      </div>
      <div className="pilot-list" tabIndex={0} role="region" aria-label="專案列表，可橫向捲動">
        <div className="pilot-list-content">
          <div className="pilot-columns pilot-grid"><span>專案名稱／目標</span><span>負責 Bot</span><span>狀態</span><span>目前狀況</span><span>下一步</span><span>狀態變更</span></div>
          {visible.map(p=>{
            const presentation = getProjectPresentation(p)
            return <button key={p.id} onClick={()=>open(p.id)} className="pilot-row pilot-grid" data-needs-review={!!p.humanAction}>
              <span className="pilot-project">
                <span className="pilot-thumb">{presentation.imageUrl ? <img src={presentation.imageUrl} alt={presentation.imageAlt} loading="lazy" width="60" height="60"/> : <Folder size={24} aria-hidden="true"/>}</span>
                <span><b>{p.title}</b><small className="pilot-goal-summary">{presentation.goalSummary}</small><span className="pilot-phase">{p.phase}{p.currentMilestoneId ? ` · ${p.currentMilestoneId} / ${p.projectPlan.milestones.length}` : ''}</span></span>
              </span>
              <span className="pilot-owner">{BOTS[p.responsibleBot] || BOTS[p.owner]}</span>
              <span>{badge(p)}</span>
              <span className="pilot-current">{Array.from(p.currentState || '').length > 50 ? `${Array.from(p.currentState).slice(0, 49).join('')}…` : p.currentState}</span>
              <span className="pilot-next">{p.humanAction ? <><span className="pilot-row-action">前往確認 <ArrowRight size={15} aria-hidden="true"/></span><span className="sr-only">{p.nextAction}</span></> : p.nextAction}</span>
              <span className="pilot-time">{date(p.statusChangedAt)}</span>
            </button>
          })}
          {!visible.length && <p className="pilot-empty">{data.loaded?'目前沒有符合條件的專案。':'讀取中…'}</p>}
        </div>
      </div>
    </> : <>
      <button onClick={()=>open('')} className="pilot-back"><ArrowLeft size={16} aria-hidden="true"/>返回 AI Work 區</button>
      <div className="pilot-inner-head"><h2>{selected.title}</h2><button className="pilot-icon-action" aria-label="刪除專案" disabled={busy} onClick={async()=>{if(window.confirm(`刪除「${selected.title}」？專案與未完成派工將封存。`)){if(await act('archive')) open('')}}}><Trash2 size={17}/></button></div>
      <div className="pilot-meta">
        <label>負責 Bot <select aria-label="負責 Bot" value={selected.responsibleBot || selected.owner} disabled={busy} onChange={e=>act('responsible_bot',{responsibleBot:e.target.value})}>{Object.entries(BOTS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <span className="pilot-phase">{selected.phase}{selected.currentMilestoneId ? ` · ${selected.currentMilestoneId} / ${selected.projectPlan.milestones.length}` : ''}</span>
        {badge(selected)}
        <span className="pilot-time">狀態變更：{date(selected.statusChangedAt)}</span>
      </div>
      {review && <section aria-label="需要你處理" className="pilot-review">
        <header className="pilot-review-heading"><Clock3 size={22} aria-hidden="true"/><div><h3>需要你處理：{review.title}</h3><p>規劃版本 {review.planVersion} · {review.effect}</p></div></header>
        <div className={`pilot-review-body ${review.kind==='clarification'?'pilot-review-questions':''}`}>
          <div className="pilot-review-content">
            {review.document && <details open className="pilot-review-document"><summary>查看待確認規劃全文</summary><div className="pilot-review-scroll" tabIndex={0} role="region" aria-label="待確認規劃"><WorkDocument>{review.document}</WorkDocument></div></details>}
            {review.summary && <WorkDocument>{review.summary}</WorkDocument>}
            {!!review.deliverables?.length && <div className="pilot-deliverables">{review.deliverables.map((a,i)=><a key={i} className="pilot-deliverable" href={a.url || a.uri || a.commit} target="_blank" rel="noopener noreferrer"><span>{a.title || a.name || '開啟成果'}</span><ExternalLink size={16}/></a>)}</div>}
            {review.kind==='clarification' && <ul className="pilot-questions">{review.questions.map((q,i)=><li key={i}>{q}</li>)}</ul>}
          </div>
          <div className="pilot-review-actions">
            {review.kind==='clarification' ? <>
              <label htmlFor="review-answer">補充資料</label>
              <textarea id="review-answer" rows={5} className="pilot-field" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="直接回答左側或上方的問題"/>
              <button disabled={busy || !answer.trim()} className="pilot-primary" onClick={async()=>{if(await decide('answer',answer))setAnswer('')}}>{review.confirmLabel}<ArrowRight size={16} aria-hidden="true"/></button>
            </> : <>
              <button disabled={busy} className="pilot-primary" onClick={()=>decide(review.kind==='plan'?'approve_plan':review.kind==='delivery'?'acknowledge_result':'approve_result')}>{review.confirmLabel}<ArrowRight size={16} aria-hidden="true"/></button>
              <div className="pilot-revision">
                <label htmlFor="review-feedback">修改意見<span>需要調整時填寫</span></label>
                <textarea id="review-feedback" rows={4} className="pilot-field" placeholder="輸入需要修改的內容…" value={feedback} onChange={e=>setFeedback(e.target.value)}/>
                <button disabled={busy || !feedback.trim()} className="pilot-action" onClick={async()=>{if(await decide('request_revision',feedback))setFeedback('')}}>退回修改並交回 AI</button>
              </div>
            </>}
          </div>
        </div>
      </section>}
      <div className="pilot-tabs my-6 flex flex-wrap gap-8 border-b">{tabs.map(name=><button key={name} onClick={()=>setTab(name)} className={`pb-3 ${tab===name?'border-b-2 border-blue-600 text-blue-700':'text-slate-500'}`}>{name}</button>)}</div>
      {tab==='目標' && <div className="space-y-5">
        <section className={panel}><div className="pilot-card-head"><h3>目標 Goal</h3><button className="pilot-action" onClick={()=>{setGoalDraft(selected.goal);setGoalReason('');setEditingGoal(true)}}>編輯目標</button></div>{editingGoal?<div className="pilot-editor"><textarea rows={4} aria-label="編輯 Goal" value={goalDraft} onChange={e=>setGoalDraft(e.target.value)}/><input placeholder="修改原因（可選）" value={goalReason} onChange={e=>setGoalReason(e.target.value)}/><button disabled={busy || goalDraft.trim().length<5} className="pilot-primary" onClick={async()=>{if(await act('goal_edit',{expectedVersion:selected.goalVersion,goal:goalDraft,reason:goalReason})) setEditingGoal(false)}}>儲存新版本</button><button onClick={()=>setEditingGoal(false)}>取消</button></div>:<p>{selected.goal}</p>}<p className="pilot-version">Goal V{selected.goalVersion} · 由你確認目標版本</p><details className="pilot-versions"><summary>查看 Goal 版本紀錄（{selected.goalHistory.length}）</summary>{selected.goalHistory.slice().reverse().map(h=><div key={h.version}><b>V{h.version}</b> · {date(h.changedAt)}<p>{h.goal}</p></div>)}</details></section>
        <section className={panel}><h3>Bot 晨會標註</h3>{selected.goalNotes.filter(n=>n.actor==='bot').length?selected.goalNotes.filter(n=>n.actor==='bot').map(n=><div key={n.id}><small>{date(n.createdAt)} · {n.source}</small><p>{n.content}</p></div>):<p>目前沒有 Bot 標註。</p>}</section>
        <section className={panel}><h3>我的建議</h3>{selected.goalNotes.filter(n=>n.actor==='user').map(n=><div className="pilot-note" key={n.id}><small>{date(n.createdAt)}</small><p>{n.content}</p></div>)}<textarea rows={3} className="pilot-field" placeholder="輸入你對目標或執行方向的建議…" value={note} onChange={e=>setNote(e.target.value)}/><button className="pilot-primary mt-3" disabled={busy || !note.trim()} onClick={async()=>{if(await act('note_add',{content:note}))setNote('')}}>送出建議</button></section>
      </div>}
      {tab==='開發規格與進度' && <section className={panel}><h3>開發規格與進度</h3>{report?<><div className="pilot-document-actions"><button className="pilot-action" onClick={async()=>{await navigator.clipboard.writeText(report.document);setCopied(true)}}>{copied?'已複製':'複製全文'}</button><button className="pilot-action" onClick={()=>{setReportDraft(report.document);setEditingReport(true)}}>編輯全文</button></div>{editingReport?<div className="pilot-editor"><textarea className="pilot-document-editor" rows={24} value={reportDraft} onChange={e=>setReportDraft(e.target.value)}/><button disabled={busy} className="pilot-primary" onClick={async()=>{if(await act('report_update',{expectedVersion:report.version,value:reportDraft}))setEditingReport(false)}}>儲存並重新整理規劃</button><button onClick={()=>setEditingReport(false)}>取消</button></div>:<WorkDocument>{report.document}</WorkDocument>}</>:<p>GPT 領取後，會依目標與參考資料產出執行規劃。</p>}{selected.canApprovePlan && <button disabled={busy} className="pilot-primary mt-4" onClick={()=>decide('approve_plan')}>核准規劃並開始執行</button>}{!!selected.questions?.length && <div className="mt-5"><h4>需要你確認</h4>{selected.questions.map((q,i)=><p key={i}>{typeof q==='string'?q:JSON.stringify(q)}</p>)}<textarea className="pilot-field" placeholder="回覆問題或補充資料" value={answer} onChange={e=>setAnswer(e.target.value)}/><button disabled={busy || !answer.trim()} className="pilot-primary mt-3" onClick={async()=>{if(await decide('answer',answer))setAnswer('')}}>回覆並繼續</button></div>}</section>}
      {tab==='成果' && <section className={panel}><h3>成果</h3><div className="pilot-result-summary"><div className="pilot-card-head"><h4>目前成果小結</h4><button className="pilot-action" onClick={()=>{setSummaryDraft(selected.resultSummary || '');setEditingSummary(true)}}>編輯小結</button></div>{editingSummary?<><textarea rows={6} className="pilot-field" value={summaryDraft} onChange={e=>setSummaryDraft(e.target.value)}/><button disabled={busy} className="pilot-primary" onClick={async()=>{if(await act('result_summary_update',{summary:summaryDraft}))setEditingSummary(false)}}>儲存小結</button></>:<WorkDocument>{selected.resultSummary || '尚無實際成果小結。'}</WorkDocument>}</div>{selected.driveFolderId && <a className="pilot-folder" href={`https://drive.google.com/drive/folders/${selected.driveFolderId}`} target="_blank" rel="noopener noreferrer"><Folder size={18}/>開啟專案資料夾</a>}{selected.artifacts.length?selected.artifacts.map(a=><div className="pilot-artifact" key={a.artifactId}><span className="pilot-artifact-name">{a.title}<small>{a.summary}</small></span>{a.url && <a className="pilot-open" href={a.url} target="_blank" rel="noopener noreferrer">開啟 <ExternalLink size={14}/></a>}</div>):<p>尚無交付成果。</p>}{selected.canApproveResult && <div className="mt-6 space-y-3"><button disabled={busy} className="pilot-primary" onClick={()=>decide('approve_result')}>驗收通過</button><textarea className="pilot-field" placeholder="需要修改的內容" value={feedback} onChange={e=>setFeedback(e.target.value)}/><button disabled={busy || !feedback.trim()} className="pilot-action" onClick={()=>run(async()=>{await sendAIWorkPilotEvent(selected.id,'request_revision',{workId:review.workId,actionId:review.actionId,content:feedback});setFeedback('')})}>提出修改並交回 GPT</button></div>}</section>}
      {tab==='參考資料' && <section className={panel}><h3>參考資料</h3>{selected.referenceFolderId?<a className="pilot-folder" target="_blank" rel="noopener noreferrer" href={`https://drive.google.com/drive/folders/${selected.referenceFolderId}`}>開啟 01_參考資料 <ExternalLink size={14}/></a>:<p className="text-sm text-slate-500">GPT 領取工作時建立或連結專案參考資料夾。</p>}{selected.referenceMaterials.map(r=><p key={r.id}><a href={r.url} target="_blank" rel="noopener noreferrer" className="pilot-open">{r.title} <ExternalLink size={14}/></a></p>)}</section>}
      {tab==='開發日誌' && <section className={panel}><h3>開發日誌</h3>{[...selected.developmentLog,...selected.statusHistory.map(h=>({label:`狀態：${STATUS[h.from]?.[0] || '建立'} → ${STATUS[h.to]?.[0] || h.to}`,changedAt:h.changedAt}))].sort((a,b)=>(b.changedAt||'').localeCompare(a.changedAt||'')).map((h,i)=><div className="pilot-log-row" key={i}><time>{date(h.changedAt)}</time><span>{h.label}</span></div>)}</section>}
    </>}
  </div>
}
