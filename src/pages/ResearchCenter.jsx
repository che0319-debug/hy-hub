import { useEffect, useMemo, useState } from 'react'
import { BookOpen, RefreshCw } from 'lucide-react'
import { fetchResearchCenter, actOnResearch } from '../lifeOSApi'

const BOTS=[
 {id:'hy',name:'HY',role:'人性、AI 管家與系統治理'},
 {id:'950157',name:'950157',role:'本業研發與工作能力'},
 {id:'family',name:'小因',role:'家庭、孩子、健康與行程'},
 {id:'sam',name:'Sam',role:'經濟觀、商機與行銷'},
]
const STATUS={researching:'研究中',priority:'優先研究',needs_direction:'等待方向',review_ready:'通過 HY Review',human_review_ready:'等你查看',stopped:'已停止',archived:'已封存'}
const REVIEW={recommended:'HY 建議保留',needs_research:'HY 建議繼續研究',archive:'HY 建議封存'}

function TopicCard({item,busy,onAction}){
 const state=item.researchStatus||'researching', sources=item.sources||[], synthesis=item.researchSynthesis
 return <article className="rounded-xl border border-slate-200 bg-white p-4">
  <div className="flex items-start justify-between gap-3">
   <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{STATUS[state]||state}</span>
   <span className="text-xs text-slate-400">{Number(item.progress||0)}%</span>
  </div>
  <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-900">{item.title}</h3>
  <p className="mt-2 text-sm leading-6 text-slate-600"><b>要回答：</b>{item.researchQuestion}</p>
  <p className="mt-2 text-sm leading-6 text-slate-500">{item.whyItMatters}</p>
  {item.latestDirection&&<div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900"><b>你最新給的方向：</b>{item.latestDirection}</div>}
  {synthesis?.currentAnswer&&<div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950"><b>目前研究判斷：</b>{synthesis.currentAnswer}</div>}
  {item.hyReview&&<div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><b>{REVIEW[item.hyReview.status]||'HY Review'}：</b>{item.hyReview.summary}</div>}
  <details className="mt-3 rounded-lg border bg-slate-50 p-3">
   <summary className="cursor-pointer text-sm font-medium text-slate-700"><BookOpen className="mr-1 inline" size={15}/>資料來源 {sources.length} 筆</summary>
   <div className="mt-2 space-y-2">{sources.map(s=><div key={s.id||s.url} className="border-t pt-2 text-sm"><a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{s.title}</a>{s.relevanceReason&&<p className="mt-1 text-xs text-slate-500">{s.relevanceReason}</p>}</div>)}{!sources.length&&<p className="text-xs text-slate-400">Bot 尚在蒐集相關資料。</p>}</div>
  </details>
  <div className="mt-3 text-xs text-slate-400">{item.owner==='hy'?'HY 的研究成熟後直接交給你，不自我審查。':'研究成熟後由 Bot 自動送 HY Review。'}</div>
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
 const grouped=useMemo(()=>Object.fromEntries(BOTS.map(b=>[b.id,data.items.filter(x=>x.owner===b.id&&!['archived','stopped'].includes(x.researchStatus))])),[data.items])
 async function act(item,action,ask=false){let note='';if(ask){note=window.prompt('修正研究問題、範圍或條件')||'';if(!note)return}setBusy(item.id);try{await actOnResearch(item.id,action,note);await load()}catch(e){setError(e.message)}finally{setBusy('')}}
 return <div className="mx-auto max-w-7xl space-y-5">
  <header className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Bot 研究中心</h1><p className="mt-1 text-slate-500">研究你的真實問題；新聞、論文與活動只作為資料來源。</p></div><button onClick={load} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={16}/>更新</button></header>
  {error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <div className="grid gap-5 lg:grid-cols-2">{BOTS.map(bot=><section key={bot.id} className="rounded-2xl border bg-slate-50 p-4">
   <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">{bot.name}</h2><p className="text-sm text-slate-500">{bot.role}</p></div><span className="rounded-full bg-white px-3 py-1 text-sm text-slate-500">{grouped[bot.id].length} 個主題</span></div>
   <div className="space-y-3">{grouped[bot.id].map(item=><TopicCard key={item.id} item={item} busy={busy} onAction={act}/>)}{!grouped[bot.id].length&&<div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-400">Bot 尚未從對話與目標中形成研究主題</div>}</div>
  </section>)}</div>
 </div>
}
