import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bot, CheckCircle2, FolderKanban, RefreshCw, Sparkles, Target, XCircle } from 'lucide-react'
import { decideAutonomousPlan, fetchAutonomousPlans, fetchLifeOSContext } from '../api'

const AGENTS = ['hy', '950157', 'family', 'sam']
const LABELS = { hy: 'HY', '950157': '950157', family: '小因', sam: 'Sam' }
const ACTIVE = new Set(['pending', 'active', 'in_progress', 'running', 'blocked', 'needs_decision'])

function Card({ title, icon: Icon, children }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Icon size={18} />{title}</h2>
    {children}
  </section>
}

function Summary({ context, plans }) {
  const activeTasks = (context.tasks || []).filter(task => ACTIVE.has(task.status)).length
  const openGaps = (context.realityGaps || []).filter(gap => Number(gap.gap) > 0).length
  const items = [
    ['待核准 AI 規劃', plans.length],
    ['待改善差距', openGaps],
    ['專案', (context.projects || []).length],
    ['進行中任務', activeTasks],
  ]
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {items.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    </div>)}
  </div>
}

function PlanInbox({ plans, onDecision, busyId }) {
  return <Card title="950157｜工作規劃 Inbox" icon={Sparkles}>
    {!plans.length ? <p className="text-sm text-slate-500">目前沒有等待核准的自主工作規劃。</p> : <div className="space-y-4">
      {plans.map(plan => <article key={plan.id} className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-blue-700">{plan.projectName || '950157'} {plan.due ? `・到期 ${plan.due}` : ''}</p>
            <h3 className="mt-1 font-semibold text-slate-900">{plan.title}</h3>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800">等待 HY 核准</span>
        </div>
        {plan.whyNow && <p className="mt-3 text-sm text-slate-600"><b>為什麼現在做：</b>{plan.whyNow}</p>}
        {!!(plan.proposedSteps || []).length && <div className="mt-3">
          <p className="text-xs font-semibold text-slate-500">950157 準備這樣做</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">{plan.proposedSteps.map((s,i)=><li key={i}>{s}</li>)}</ol>
        </div>}
        {!!(plan.questions || []).length && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">開始前希望你補充</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">{plan.questions.map((q,i)=><li key={i}>{q}</li>)}</ul>
        </div>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={busyId===plan.id} onClick={()=>onDecision(plan,'approve')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><CheckCircle2 size={15}/>核准</button>
          <button disabled={busyId===plan.id} onClick={()=>onDecision(plan,'approve_with_judgment')} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-50">核准・自行判斷</button>
          <button disabled={busyId===plan.id} onClick={()=>onDecision(plan,'reject')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 disabled:opacity-50"><XCircle size={15}/>取消</button>
        </div>
      </article>)}
    </div>}
  </Card>
}

function GapView({ context }) {
  const desired = new Map((context.desiredStates || []).map(x => [x.dimension, x.target]))
  const reality = new Map((context.realityStates || []).map(x => [x.dimension, x.value]))
  const goals = new Map((context.goals || []).map(x => [x.title, x]))
  const rows = (context.realityGaps || []).map(x => ({ ...x, target: desired.get(x.dimension) ?? 100, value: reality.get(x.dimension) ?? 0, goal: goals.get(x.dimension) })).sort((a,b)=>b.gap-a.gap)
  return <Card title="Goal → Reality Gap" icon={Target}><div className="space-y-4">{rows.map(row => <div key={row.id}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><div><b>{row.goal?.title || row.dimension}</b><span className="ml-2 text-xs text-slate-400">{row.goal ? '已連結目標' : '尚未連結目標'}</span></div><span className="whitespace-nowrap text-slate-500">現況 {row.value} / 目標 {row.target}・差距 {row.gap}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:`${Math.max(0,Math.min(100,row.value))}%`}}/></div></div>)}</div></Card>
}

function ProjectTaskView({ context }) {
  const projects=context.projects||[], tasks=context.tasks||[], unlinked=projects.filter(p=>!p.goalId).length
  return <Card title="Project → Task 執行鏈" icon={FolderKanban}>{unlinked>0&&<p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{unlinked} 個專案尚未指定 Goal；目前保留真實資料，不自動猜測關聯。</p>}<div className="grid gap-4 lg:grid-cols-2">{AGENTS.map(owner=>{const owned=projects.filter(p=>p.owner===owner), ownerTasks=tasks.filter(t=>t.owner===owner);return <section key={owner} className="rounded-lg border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><b className="flex items-center gap-2"><Bot size={15}/>{LABELS[owner]}</b><span className="text-xs text-slate-500">{owned.length} 專案・{ownerTasks.length} 任務</span></div>{owned.length?<div className="space-y-2">{owned.map(project=>{const pt=tasks.filter(t=>t.projectId===project.id),active=pt.filter(t=>ACTIVE.has(t.status));return <details key={project.id} className="rounded-lg bg-slate-50 px-3 py-2" open={active.length>0}><summary className="cursor-pointer list-none text-sm font-medium text-slate-700"><span>{project.title||project.id}</span><span className="ml-2 text-xs font-normal text-slate-400">{active.length}/{pt.length} 進行中</span></summary>{pt.length?<ul className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">{pt.map(task=><li key={task.id} className="flex items-start justify-between gap-2 text-xs text-slate-600"><span>{task.title||task.id}</span><span className="whitespace-nowrap text-slate-400">{task.status}</span></li>)}</ul>:<p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-400">尚無任務</p>}</details>})}</div>:<p className="text-sm text-slate-400">目前沒有專案</p>}</section>})}</div></Card>
}

function DecisionView({ context }) {
  const items=(context.tasks||[]).filter(t=>['blocked','needs_decision'].includes(t.status)||t.needsDecision)
  return <Card title="Needs HY Decision" icon={AlertTriangle}>{items.length?<ul className="space-y-2">{items.map(item=><li key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"><b>{item.title}</b><span className="ml-2 text-amber-700">{LABELS[item.owner]||item.owner}</span></li>)}</ul>:<p className="text-sm text-slate-500">目前沒有其他等待 HY 決策的事項。</p>}</Card>
}

export default function LifeOS(){
  const [context,setContext]=useState(null),[plans,setPlans]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[busyId,setBusyId]=useState('')
  async function load(){setLoading(true);setError('');try{const [ctx,p]=await Promise.all([fetchLifeOSContext(),fetchAutonomousPlans()]);setContext(ctx);setPlans(p.plans||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
  async function decide(plan,decision){setBusyId(plan.id);setError('');try{let note='';if(decision==='approve' && (plan.questions||[]).length){note=window.prompt('可補充執行前資訊；沒有可直接留空。','')||''}await decideAutonomousPlan(plan.id,decision,note);await load()}catch(e){setError(e.message)}finally{setBusyId('')}}
  useEffect(()=>{load()},[])
  const updated=useMemo(()=>context?.metadata?.updatedAt?.replace('T',' ').slice(0,16)||'—',[context])
  if(!context&&loading)return <p className="text-sm text-slate-500">載入 Life OS…</p>
  if(!context)return <div><p className="mb-3 text-sm text-red-600">Life OS 讀取失敗：{error}</p><button onClick={load} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">重試</button></div>
  return <div className="space-y-5"><header className="flex items-start justify-between gap-4"><div><h1 className="text-xl font-bold text-slate-800">HY Life OS</h1><p className="text-sm text-slate-500">AI 主動規劃・HY 核准・核准後自主執行・更新 {updated}</p></div><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"><RefreshCw size={15} className={loading?'animate-spin':''}/>刷新</button></header>{error&&<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}<Summary context={context} plans={plans}/><PlanInbox plans={plans} onDecision={decide} busyId={busyId}/><GapView context={context}/><ProjectTaskView context={context}/><DecisionView context={context}/></div>
}
