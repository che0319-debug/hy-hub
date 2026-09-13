import { useEffect, useMemo, useState } from 'react'
import { Bot, CheckCircle2, Clock3, FileText, RefreshCw, ShieldCheck } from 'lucide-react'
import { authHeaders } from '../auth'
import { decideAutonomousPlan } from '../lifeOSApi'

const API_BASE=import.meta.env.VITE_API_BASE||''
const ACTIVE=new Set(['queued','running','claimed','in_progress','waiting_approval','needs_clarification'])
const DONE=new Set(['succeeded','completed','done'])
const label=o=>({hy:'HY',family:'小因','950157':'950157',sam:'Sam',codex:'Codex'})[o]||o||'HY'
const title=x=>x?.title||x?.name||x?.outcome||'未命名工作'

export default function AIWorkCenter(){
 const [core,setCore]=useState(null),[busy,setBusy]=useState(''),[error,setError]=useState('')
 async function load(){setError('');try{const r=await fetch(`${API_BASE}/api/life-os/v1/context`,{headers:authHeaders(),cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);setCore(await r.json())}catch(e){setError(`AI 工作讀取失敗：${e.message}`)}}
 useEffect(()=>{load()},[])
 const work=core?.workItems||[], plans=core?.autonomousPlans||[], results=core?.results||[]
 const waiting=plans.filter(p=>p.status==='waiting_approval'), clarify=work.filter(w=>w.status==='needs_clarification')
 const active=work.filter(w=>ACTIVE.has(w.status)&&w.status!=='needs_clarification')
 const done=work.filter(w=>DONE.has(w.status)).slice().reverse().slice(0,12)
 async function decide(p,d){setBusy(p.id);try{await decideAutonomousPlan(p.id,d);await load()}catch(e){setError(e.message)}finally{setBusy('')}}
 const Card=({w,doneCard=false})=>{const r=results.find(x=>x.workItemId===w.id||x.id===w.resultId);const arts=r?.artifacts||w.artifacts||[];return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{title(w)}</h3><p className="mt-1 text-sm text-slate-500">{label(w.owner)}・{doneCard?'已完成':w.status}</p></div>{doneCard?<CheckCircle2 className="text-emerald-500" size={20}/>:<Bot className="text-blue-500" size={20}/>}</div><p className="mt-3 text-sm text-slate-600">{r?.outcome||r?.summary||w.payload?.summary||w.kind||'AI 正在處理這項工作。'}</p>{arts.length>0&&<div className="mt-3 flex items-center gap-2 text-sm text-blue-600"><FileText size={16}/>{arts.length} 個成果檔案</div>}</article>}
 return <div className="max-w-7xl mx-auto"><div className="flex items-start justify-between gap-4 mb-6"><div><h1 className="text-2xl font-bold text-slate-900">AI 工作中心</h1><p className="text-slate-500 mt-1">你給方向・AI 自動工作・產出成果・你做決定</p></div><button onClick={load} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={16}/>重新整理</button></div>{error&&<div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
 <div className="grid grid-cols-3 gap-4 mb-8"><div className="rounded-xl bg-red-50 p-4"><b className="text-2xl text-red-600">{waiting.length+clarify.length}</b><p className="text-sm">等你處理</p></div><div className="rounded-xl bg-amber-50 p-4"><b className="text-2xl text-amber-600">{active.length}</b><p className="text-sm">AI 執行中</p></div><div className="rounded-xl bg-emerald-50 p-4"><b className="text-2xl text-emerald-600">{done.length}</b><p className="text-sm">最近完成</p></div></div>
 {(waiting.length+clarify.length)>0&&<section className="mb-8"><h2 className="text-lg font-bold mb-3">🔴 等你處理</h2><div className="grid lg:grid-cols-2 gap-4">{waiting.map(p=><article key={p.id} className="rounded-xl border-l-4 border-red-400 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-sm text-red-600"><ShieldCheck size={16}/>{label(p.owner)} 準備開始</div><h3 className="font-semibold mt-2">{title(p)}</h3><p className="text-sm text-slate-600 mt-2">{p.whyNow||p.context}</p><div className="flex gap-2 mt-4"><button disabled={busy===p.id} onClick={()=>decide(p,'approve')} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm">同意</button><button disabled={busy===p.id} onClick={()=>decide(p,'approve_with_judgment')} className="rounded-lg bg-emerald-50 text-emerald-700 px-4 py-2 text-sm">同意＋自行判斷</button><button disabled={busy===p.id} onClick={()=>decide(p,'reject')} className="rounded-lg bg-slate-100 px-4 py-2 text-sm">取消</button></div></article>)}{clarify.map(w=><article key={w.id} className="rounded-xl border-l-4 border-amber-400 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-sm text-amber-600"><Clock3 size={16}/>{label(w.owner)} 需要補充</div><h3 className="font-semibold mt-2">{title(w)}</h3><p className="text-sm text-slate-600 mt-2">{w.clarificationQuestion||w.error||'需要你的方向才能繼續。'}</p></article>)}</div></section>}
 <section className="mb-8"><h2 className="text-lg font-bold mb-3">🟡 AI 正在工作</h2><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{active.map(w=><Card key={w.id} w={w}/>)}{!active.length&&<p className="text-slate-400">目前沒有執行中的工作。</p>}</div></section>
 <section><h2 className="text-lg font-bold mb-3">🟢 最近完成</h2><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{done.map(w=><Card key={w.id} w={w} doneCard/>)}{!done.length&&<p className="text-slate-400">完成的 AI 工作會出現在這裡。</p>}</div></section></div>
}
