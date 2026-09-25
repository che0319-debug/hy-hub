import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Plus, ExternalLink, Search, Folder, Trash2 } from 'lucide-react'
import './ai-work-pilot.css'
import { createAIWorkPilotProject, sendAIWorkPilotEvent, promoteAIWork, submitWorkFeedback } from '../lifeOSApi'
import { useAIWork, refreshAIWork } from '../aiWorkStore'
import AIWorkSummary from '../components/AIWorkSummary'

const STATUS = { ai_pending: ['待 AI 處理','bg-violet-50 text-violet-700'], ai_running: ['進行中','bg-blue-50 text-blue-700'], confirmation: ['等待確認','bg-amber-50 text-amber-700'], completed: ['完成','bg-emerald-50 text-emerald-700'] }
const BOTS = { hy:'HY', family:'小因', '950157':'950157', sam:'Sam' }
const date = value => value ? new Intl.DateTimeFormat('zh-TW', {timeZone:'Asia/Taipei', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false}).format(new Date(value)) : '—'
const badge = p => <span className={`rounded-full px-3 py-1 text-sm ${STATUS[p.workspaceStatus]?.[1] || ''}`}>{STATUS[p.workspaceStatus]?.[0] || p.workspaceStatus}</span>
const panel = 'rounded-2xl border border-slate-200 bg-white px-6 py-5 pilot-card'

export default function AIWorkPilot() {
  const data = useAIWork()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('project') || params.get('projectId') || ''
  const projects = data.projects || []
  const selected = projects.find(p => p.id === selectedId)
  const [tab, setTab] = useState('目標')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
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
  const [referenceTitle, setReferenceTitle] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [editingReport, setEditingReport] = useState(false)
  const [reportDraft, setReportDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')
  const visible = projects.filter(p => (filter === 'all' || p.workspaceStatus === filter) && `${p.title} ${p.goal}`.toLowerCase().includes(query.toLowerCase()))
  async function run(fn) {
    setBusy(true); setError('')
    try { await fn(); await refreshAIWork(); return true } catch (e) { setError(e.message || '操作失敗'); return false }
    finally { setBusy(false) }
  }
  const act = (event, body={}) => run(() => sendAIWorkPilotEvent(selected.id, event, body))
  const open = id => { setParams(id ? {project:id} : {}); setTab('目標'); setEditingGoal(false); setEditingReport(false); setEditingSummary(false) }
  const report = selected?.developmentReport
  const tabs = ['目標','開發規格與進度','開發日誌','成果','參考資料']

  return <div className="pilot-page text-slate-800">
    <header className="pilot-heading mb-7 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold">AI Work 區</h1><p className="mt-1 text-sm text-slate-500">專案目標、執行進展與實際成果</p></div><button onClick={() => run(refreshAIWork)} disabled={busy} aria-label="重新整理" className="rounded-xl border bg-white p-3"><RefreshCw size={18}/></button></header>
    {(error || data.error) && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error || data.error}</p>}
    {data.migrationRequired && <section className={`${panel} mb-5`}><h3>啟用正式 AI Work 區</h3><p>選擇保留的專案，其餘目前工作區與試跑專案將封存；已封存專案的未完成派工會停止。</p><label className="block my-3">保留專案<select aria-label="保留專案" className="pilot-field" value={keepId} onChange={e=>setKeepId(e.target.value)}><option value="">請選擇</option>{data.migrationCandidates.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><button disabled={!keepId || busy} className="pilot-primary" onClick={()=>run(()=>promoteAIWork({keepProjectId:keepId,expectedProjectIds:data.migrationCandidates.map(p=>p.id)}))}>保留選定專案並啟用 AI Work 區</button></section>}
    {!selected ? <>
      {selectedId && <p className="mb-4 text-slate-500">此專案已封存或不存在。<button className="ml-2 text-blue-600" onClick={()=>open('')}>返回總表</button></p>}
      <AIWorkSummary summary={data.summary} onOpen={setFilter}/>
      <div className="my-5 flex justify-end"><button disabled={busy || data.migrationRequired} className="pilot-primary" onClick={()=>setShowCreate(true)}><Plus className="inline mr-2" size={18}/>新增 AI Work</button></div>
      {showCreate && <form className={`${panel} mb-5 grid gap-3`} onSubmit={async e=>{e.preventDefault();await run(async()=>{const result=await createAIWorkPilotProject({...newProject,successCriteria:criteria.split('\n').map(s=>s.trim()).filter(Boolean)});setShowCreate(false);setNewProject({title:'',goal:'',responsibleBot:'hy'});setCriteria('');open(result.project.id)})}}><h3>新增專案</h3><input required minLength={2} maxLength={120} className="pilot-field" placeholder="專案名稱" value={newProject.title} onChange={e=>setNewProject({...newProject,title:e.target.value})}/><textarea required minLength={5} maxLength={3000} className="pilot-field" placeholder="目標" value={newProject.goal} onChange={e=>setNewProject({...newProject,goal:e.target.value})}/><textarea className="pilot-field" placeholder="完成條件（每行一項，可由 GPT 補充）" value={criteria} onChange={e=>setCriteria(e.target.value)}/><label>負責 Bot<select className="pilot-field" value={newProject.responsibleBot} onChange={e=>setNewProject({...newProject,responsibleBot:e.target.value})}>{Object.entries(BOTS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><p className="text-sm text-slate-500">建立後等待 GPT 領取、讀取需求並整理規劃；Drive 資料夾屆時建立。</p><div className="flex gap-3"><button disabled={busy} className="pilot-primary">建立專案</button><button type="button" onClick={()=>setShowCreate(false)}>取消</button></div></form>}
      <div className="pilot-tools"><div className="pilot-filters my-7 flex gap-2 border-b">{[['all','全部'],...Object.entries(STATUS).map(([key,value])=>[key,value[0]])].map(([key,label])=><button key={key} onClick={()=>setFilter(key)} className={`px-4 py-3 text-sm ${filter===key?'border-b-2 border-blue-600 text-blue-700':''}`}>{label}</button>)}</div><label className="pilot-search"><Search size={18}/><input placeholder="搜尋專案..." value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
      <div className="pilot-list overflow-x-auto rounded-2xl border bg-white"><div className="min-w-[980px]"><div className="pilot-columns grid grid-cols-[2fr_110px_120px_1.4fr_1.4fr_100px] gap-4 border-b px-6 py-4 text-sm"><span>專案名稱 / 目標</span><span>負責 Bot</span><span>狀態</span><span>目前狀況</span><span>下一步</span><span>狀態變更</span></div>{visible.map(p=><button key={p.id} onClick={()=>open(p.id)} className="pilot-row grid w-full grid-cols-[2fr_110px_120px_1.4fr_1.4fr_100px] items-center gap-4 border-b px-6 py-5 text-left"><span className="pilot-project"><span className="pilot-thumb bg-blue-50" aria-hidden="true">✦</span><span><b>{p.title}</b><small className="mt-1 block line-clamp-2 text-slate-500">{p.goal}</small><small className="text-blue-600">{p.phase}{p.currentMilestoneId ? ` · ${p.currentMilestoneId} / ${p.projectPlan.milestones.length}` : ''}</small></span></span><span>{BOTS[p.responsibleBot] || BOTS[p.owner]}</span><span>{badge(p)}</span><span className="text-sm">{p.currentState}</span><span className="text-sm">{p.nextAction}</span><span className="text-xs text-slate-500">{date(p.statusChangedAt)}</span></button>)}{!visible.length && <p className="p-6 text-slate-500">{data.loaded?'目前沒有符合條件的專案。':'讀取中…'}</p>}</div></div>
    </> : <>
      <button onClick={()=>open('')} className="mb-5 flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16}/>返回 AI Work 區</button>
      <div className="pilot-inner-head flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold">{selected.title}</h2><div className="flex items-center gap-3"><select aria-label="負責 Bot" value={selected.responsibleBot || selected.owner} disabled={busy} onChange={e=>act('responsible_bot',{responsibleBot:e.target.value})}>{Object.entries(BOTS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>{badge(selected)}<button aria-label="刪除專案" disabled={busy} onClick={async()=>{if(window.confirm(`刪除「${selected.title}」？專案與未完成派工將封存。`)){if(await act('archive')) open('')}}}><Trash2 size={16}/></button></div></div>
      <p className="text-sm text-slate-500">{selected.phase} · 狀態變更：{date(selected.statusChangedAt)}</p>
      <div className="pilot-tabs my-6 flex flex-wrap gap-8 border-b">{tabs.map(name=><button key={name} onClick={()=>setTab(name)} className={`pb-3 ${tab===name?'border-b-2 border-blue-600 text-blue-700':'text-slate-500'}`}>{name}</button>)}</div>
      {tab==='目標' && <div className="space-y-5">
        <section className={panel}><div className="pilot-card-head"><h3>目標 Goal</h3><button className="pilot-action" onClick={()=>{setGoalDraft(selected.goal);setGoalReason('');setEditingGoal(true)}}>編輯目標</button></div>{editingGoal?<div className="pilot-editor"><textarea rows={4} aria-label="編輯 Goal" value={goalDraft} onChange={e=>setGoalDraft(e.target.value)}/><input placeholder="修改原因（可選）" value={goalReason} onChange={e=>setGoalReason(e.target.value)}/><button disabled={busy || goalDraft.trim().length<5} className="pilot-primary" onClick={async()=>{if(await act('goal_edit',{expectedVersion:selected.goalVersion,goal:goalDraft,reason:goalReason})) setEditingGoal(false)}}>儲存新版本</button><button onClick={()=>setEditingGoal(false)}>取消</button></div>:<p>{selected.goal}</p>}<p className="pilot-version">Goal V{selected.goalVersion} · 由你確認目標版本</p><details className="pilot-versions"><summary>查看 Goal 版本紀錄（{selected.goalHistory.length}）</summary>{selected.goalHistory.slice().reverse().map(h=><div key={h.version}><b>V{h.version}</b> · {date(h.changedAt)}<p>{h.goal}</p></div>)}</details></section>
        <section className={panel}><h3>Bot 晨會標註</h3>{selected.goalNotes.filter(n=>n.actor==='bot').length?selected.goalNotes.filter(n=>n.actor==='bot').map(n=><div key={n.id}><small>{date(n.createdAt)} · {n.source}</small><p>{n.content}</p></div>):<p>目前沒有 Bot 標註。</p>}</section>
        <section className={panel}><h3>我的建議</h3>{selected.goalNotes.filter(n=>n.actor==='user').map(n=><div className="pilot-note" key={n.id}><small>{date(n.createdAt)}</small><p>{n.content}</p></div>)}<textarea rows={3} className="pilot-field" placeholder="輸入你對目標或執行方向的建議…" value={note} onChange={e=>setNote(e.target.value)}/><button className="pilot-primary mt-3" disabled={busy || !note.trim()} onClick={async()=>{if(await act('note_add',{content:note}))setNote('')}}>送出建議</button></section>
      </div>}
      {tab==='開發規格與進度' && <section className={panel}><h3>開發規格與進度</h3>{report?<><div className="pilot-document-actions"><button className="pilot-action" onClick={async()=>{await navigator.clipboard.writeText(report.document);setCopied(true)}}>{copied?'已複製':'複製全文'}</button><button className="pilot-action" onClick={()=>{setReportDraft(report.document);setEditingReport(true)}}>編輯全文</button></div>{editingReport?<div className="pilot-editor"><textarea className="pilot-document-editor" rows={24} value={reportDraft} onChange={e=>setReportDraft(e.target.value)}/><button disabled={busy} className="pilot-primary" onClick={async()=>{if(await act('report_update',{expectedVersion:report.version,value:reportDraft}))setEditingReport(false)}}>儲存並重新整理規劃</button><button onClick={()=>setEditingReport(false)}>取消</button></div>:<pre className="pilot-document">{report.document}</pre>}</>:<p>GPT 領取後，會依目標與參考資料產出執行規劃。</p>}{selected.canApprovePlan && <button disabled={busy} className="pilot-primary mt-4" onClick={()=>act('approve_plan',{workId:selected.latestWorkId})}>核准規劃並開始執行</button>}{!!selected.questions?.length && <div className="mt-5"><h4>需要你確認</h4>{selected.questions.map((q,i)=><p key={i}>{typeof q==='string'?q:JSON.stringify(q)}</p>)}<textarea className="pilot-field" placeholder="回覆問題或補充資料" value={answer} onChange={e=>setAnswer(e.target.value)}/><button disabled={busy || !answer.trim()} className="pilot-primary mt-3" onClick={async()=>{if(await act('answer',{content:answer}))setAnswer('')}}>回覆並繼續</button></div>}</section>}
      {tab==='成果' && <section className={panel}><h3>成果</h3><div className="pilot-result-summary"><div className="pilot-card-head"><h4>目前成果小結</h4><button className="pilot-action" onClick={()=>{setSummaryDraft(selected.resultSummary || '');setEditingSummary(true)}}>編輯小結</button></div>{editingSummary?<><textarea rows={6} className="pilot-field" value={summaryDraft} onChange={e=>setSummaryDraft(e.target.value)}/><button disabled={busy} className="pilot-primary" onClick={async()=>{if(await act('result_summary_update',{summary:summaryDraft}))setEditingSummary(false)}}>儲存小結</button></>:<p>{selected.resultSummary || '尚無實際成果小結。'}</p>}</div>{selected.driveFolderId && <a className="pilot-folder" href={`https://drive.google.com/drive/folders/${selected.driveFolderId}`} target="_blank" rel="noopener noreferrer"><Folder size={18}/>開啟專案資料夾</a>}{selected.artifacts.length?selected.artifacts.map(a=><div className="pilot-artifact" key={a.artifactId}><span className="pilot-artifact-name">{a.title}<small>{a.summary}</small></span>{a.url && <a className="pilot-open" href={a.url} target="_blank" rel="noopener noreferrer">開啟 <ExternalLink size={14}/></a>}</div>):<p>尚無交付成果。</p>}{selected.canApproveResult && <div className="mt-6 space-y-3"><button disabled={busy} className="pilot-primary" onClick={()=>act('approve_result',{workId:selected.latestWorkId})}>驗收通過</button><textarea className="pilot-field" placeholder="需要修改的內容" value={feedback} onChange={e=>setFeedback(e.target.value)}/><button disabled={busy || !feedback.trim()} className="pilot-action" onClick={()=>run(async()=>{await submitWorkFeedback(selected.latestWorkId,feedback,`ai-work-feedback-${crypto.randomUUID()}`);setFeedback('')})}>提出修改並交回 GPT</button></div>}</section>}
      {tab==='參考資料' && <section className={panel}><h3>參考資料</h3>{selected.referenceFolderId?<a className="pilot-folder" target="_blank" rel="noopener noreferrer" href={`https://drive.google.com/drive/folders/${selected.referenceFolderId}`}>開啟 01_參考資料 <ExternalLink size={14}/></a>:<p className="text-sm text-slate-500">GPT 領取工作時建立或連結專案參考資料夾。</p>}{selected.referenceMaterials.map(r=><p key={r.id}><a href={r.url} target="_blank" rel="noopener noreferrer" className="pilot-open">{r.title} <ExternalLink size={14}/></a></p>)}<div className="mt-5 grid gap-3"><input className="pilot-field" placeholder="資料名稱" value={referenceTitle} onChange={e=>setReferenceTitle(e.target.value)}/><input className="pilot-field" placeholder="https://…" value={referenceUrl} onChange={e=>setReferenceUrl(e.target.value)}/><button disabled={busy || !referenceTitle.trim() || !referenceUrl.startsWith('https://')} className="pilot-primary" onClick={async()=>{if(await act('reference_add',{title:referenceTitle,url:referenceUrl})){setReferenceTitle('');setReferenceUrl('')}}}>新增參考資料</button></div></section>}
      {tab==='開發日誌' && <section className={panel}><h3>開發日誌</h3>{[...selected.developmentLog,...selected.statusHistory.map(h=>({label:`狀態：${STATUS[h.from]?.[0] || '建立'} → ${STATUS[h.to]?.[0] || h.to}`,changedAt:h.changedAt}))].sort((a,b)=>(b.changedAt||'').localeCompare(a.changedAt||'')).map((h,i)=><div className="pilot-log-row" key={i}><time>{date(h.changedAt)}</time><span>{h.label}</span></div>)}</section>}
    </>}
  </div>
}
