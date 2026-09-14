import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { fetchResearchCenter, actOnResearch } from '../lifeOSApi'

const BOTS=[
 {id:'hy',name:'HY',role:'總管研究｜系統、事業與重大決策'},
 {id:'950157',name:'950157',role:'本業研究｜技術、產業與工作成果'},
 {id:'family',name:'小因',role:'家庭研究｜親子、生活與共同安排'},
 {id:'sam',name:'Sam',role:'副業研究｜產品、商模與市場驗證'},
]
const STATUS={researching:'研究中',priority:'優先研究',needs_direction:'等待方向',review_ready:'已通過 HY Review',review_failed:'Review 暫停',analysis_failed:'分析暫停',stopped:'已停止',archived:'已封存',pro:'研究中',new:'研究中'}
const REVIEW={recommended:'HY 建議保留',needs_research:'HY 建議補研究',archive:'HY 建議封存'}

function ResearchCard({item,busy,onAction}){
 const state=item.researchStatus||item.status||'researching'
 const review=item.hyReview
 const analysis=item.modelAnalysis
 return <article className="rounded-xl border border-slate-200 bg-white p-4">
  <div className="flex items-start justify-between gap-3">
   <div>
    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{STATUS[state]||state}</span>
    <h3 className="mt-3 font-semibold leading-6 text-slate-900">{item.title||'未命名研究'}</h3>
   </div>
   <span className="shrink-0 text-xs text-slate-400">{item.updatedAt?.slice(0,10)||item.createdAt?.slice(0,10)||''}</span>
  </div>
  <p className="mt-3 text-sm leading-6 text-slate-600">{analysis?.summary||item.relevance||item.summary||'Bot 正在整理關聯、證據與下一步。'}</p>
  {item.hyDirection&&<div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900"><b>你的方向：</b>{item.hyDirection}</div>}
  {review&&<div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><b>{REVIEW[review.status]||'HY Review'}：</b>{review.summary||'審查已完成。'}</div>}
  <div className="mt-3 text-xs text-slate-400">Bot 研究成熟後會自動送 HY Review；通過才可能進入 AI 工作中心。</div>
  <div className="mt-4 flex flex-wrap gap-2">
   <button disabled={busy===item.id} onClick={()=>onAction(item,'direction',true)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">給方向</button>
   <button disabled={busy===item.id} onClick={()=>onAction(item,'prioritize')} className="rounded-lg border px-3 py-2 text-sm">設為優先</button>
   <button disabled={busy===item.id} onClick={()=>onAction(item,'archive')} className="rounded-lg bg-slate-100 px-3 py-2 text-sm">封存</button>
  </div>
 </article>
}

export default function ResearchCenter(){
 const [data,setData]=useState({items:[],counts:{}}),[busy,setBusy]=useState(''),[error,setError]=useState('')
 async function load(){setError('');try{setData(await fetchResearchCenter({}))}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[])
 const grouped=useMemo(()=>Object.fromEntries(BOTS.map(bot=>[bot.id,data.items.filter(x=>x.owner===bot.id&&!['archived','stopped'].includes(x.researchStatus))])),[data.items])
 async function act(item,action,ask=false){
  let note=''
  if(ask){note=window.prompt('給這個 Bot 的研究方向')||'';if(!note)return}
  setBusy(item.id)
  try{await actOnResearch(item.id,action,note);await load()}catch(e){setError(e.message)}finally{setBusy('')}
 }
 return <div className="mx-auto max-w-7xl space-y-5">
  <header className="flex items-start justify-between gap-3">
   <div><h1 className="text-2xl font-bold text-slate-900">Bot 研究中心</h1><p className="mt-1 text-slate-500">四個 Bot 各自研究、自動送 HY Review；你只負責給方向與調整優先。</p></div>
   <button onClick={load} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={16}/>更新</button>
  </header>
  {error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <div className="grid gap-5 lg:grid-cols-2">
   {BOTS.map(bot=><section key={bot.id} className="rounded-2xl border bg-slate-50 p-4">
    <div className="mb-4 flex items-center justify-between gap-3">
     <div><h2 className="text-xl font-bold text-slate-900">{bot.name}</h2><p className="text-sm text-slate-500">{bot.role}</p></div>
     <span className="rounded-full bg-white px-3 py-1 text-sm text-slate-500">{grouped[bot.id].length} 筆</span>
    </div>
    <div className="space-y-3">
     {grouped[bot.id].slice(0,3).map(item=><ResearchCard key={item.id} item={item} busy={busy} onAction={act}/>)}
     {!grouped[bot.id].length&&<div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-400">目前沒有研究主題</div>}
     {grouped[bot.id].length>3&&<p className="text-center text-xs text-slate-400">先顯示最新 3 筆，其餘由 Bot 保留整理。</p>}
    </div>
   </section>)}
  </div>
 </div>
}
