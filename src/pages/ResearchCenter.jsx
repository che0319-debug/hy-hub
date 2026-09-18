import { useEffect, useMemo, useState } from 'react'
import { BookOpen, RefreshCw } from 'lucide-react'
import { fetchResearchCenter, actOnResearch } from '../lifeOSApi'

const BOTS=[
 {id:'hy',name:'HY',role:'人性、AI 管家與系統治理'},
 {id:'950157',name:'950157',role:'本業研發與工作能力'},
 {id:'family',name:'小因',role:'家庭、孩子、健康與行程'},
 {id:'sam',name:'Sam',role:'經濟觀、商機與行銷'},
]
const STAGES=['問題定義','資料蒐集','比較分析','形成建議','審查完成']
const STATUS={researching:'研究中',priority:'優先研究',needs_direction:'等待你的回答',review_ready:'通過 HY Review',human_review_ready:'等你查看',stopped:'已停止',archived:'已封存'}
const REVIEW={recommended:'HY 建議保留',needs_research:'HY 建議繼續研究',archive:'HY 建議封存'}
const stageIndex=item=>{
 if(['review_ready','human_review_ready'].includes(item.researchStatus))return 4
 const p=Number(item.progress||10)
 return p<20?0:p<45?1:p<70?2:3
}
const dateTime=value=>value?new Date(value).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'尚未自動更新'

function Progress({item}){
 const active=stageIndex(item),progress=Number(item.progress||10)
 return <div className="mt-4">
  <div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium text-slate-600">{STAGES[active]}</span><span className="text-slate-400">{progress}%</span></div>
  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${Math.max(6,progress)}%`}}/></div>
  <div className="mt-2 grid grid-cols-5 gap-1">{STAGES.map((s,i)=><span key={s} className={`text-center text-[10px] ${i<=active?'text-blue-700':'text-slate-300'}`}>{s}</span>)}</div>
 </div>
}

function Findings({synthesis}){
 if(!synthesis)return <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">尚在建立資料基礎，還沒有足夠證據形成判斷。</div>
 const groups=[
  ['已確認發現',synthesis.confirmedFindings,'text-emerald-900 bg-emerald-50'],
  ['尚缺資料',synthesis.missingEvidence,'text-amber-900 bg-amber-50'],
  ['下一步研究',synthesis.nextQuestions,'text-blue-900 bg-blue-50'],
 ]
 return <div className="mt-3 space-y-2">{groups.map(([title,rows,color])=>rows?.length?<div key={title} className={`rounded-lg p-3 text-sm ${color}`}><b>{title}</b><ul className="mt-1 list-disc space-y-1 pl-5">{rows.slice(0,3).map((x,i)=><li key={i}>{x}</li>)}</ul></div>:null)}</div>
}

function TopicCard({item,busy,onAction}){
 const state=item.researchStatus||'researching',sources=item.sources||[],synthesis=item.researchSynthesis,run=item.lastResearchRun||{}
 return <article className="rounded-xl border border-slate-200 bg-white p-4">
  <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{STATUS[state]||state}</span><span className="text-xs text-slate-400">更新：{dateTime(item.updatedAt||item.lastResearchRunAt)}</span></div>
  <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-900">{item.title}</h3>
  <p className="mt-2 text-sm leading-6 text-slate-600"><b>要回答：</b>{item.researchQuestion}</p>
  <Progress item={item}/>
  <div className="mt-3 flex gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2 py-1">累積資料 {sources.length} 筆</span><span className="rounded-full bg-slate-100 px-2 py-1">本輪新增 {item.sourcesAddedLastRun||0} 筆</span></div>
  {item.lastResearchRunAt&&<div className="mt-3 grid grid-cols-4 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-xs"><div><b className="block text-base text-blue-700">{run.found||0}</b>找到</div><div><b className="block text-base text-cyan-700">{run.read||0}</b>讀取</div><div><b className="block text-base text-slate-500">{run.discarded||0}</b>淘汰</div><div><b className="block text-base text-emerald-700">{run.adopted||0}</b>採用</div></div>}
  {item.latestDirection&&<div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900"><b>你最新給的方向：</b>{item.latestDirection}</div>}
  {item.needsUserInput&&<div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b>正在等你回答：</b>{item.userQuestion||'Bot 需要你補充研究條件。'}</div>}
  {synthesis?.currentAnswer&&<div className="mt-3 rounded-lg bg-violet-50 p-3 text-sm leading-6 text-violet-950"><b>目前研究判斷：</b>{synthesis.currentAnswer}</div>}
  <Findings synthesis={synthesis}/>
  {item.hyReview&&<div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><b>{REVIEW[item.hyReview.status]||'HY Review'}：</b>{item.hyReview.summary}</div>}
  <details className="mt-3 rounded-lg border bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-medium text-slate-700"><BookOpen className="mr-1 inline" size={15}/>查看資料來源（{sources.length}）</summary><div className="mt-2 space-y-2">{sources.map(s=><div key={s.id||s.url} className="border-t pt-2 text-sm"><a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{s.title}</a>{s.relevanceReason&&<p className="mt-1 text-xs text-slate-500">{s.relevanceReason}</p>}</div>)}{!sources.length&&<p className="text-xs text-slate-400">Bot 尚在蒐集相關資料。</p>}</div></details>
  <div className="mt-3 text-xs text-slate-400">{item.owner==='hy'?'HY 的研究成熟後直接交給你，不自我審查。':'研究成熟後由 Bot 自動送 HY Review。'}</div>
  <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy===item.id} onClick={()=>onAction(item,'direction',true)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">給方向／回答</button><button disabled={busy===item.id} onClick={()=>onAction(item,'prioritize')} className="rounded-lg border px-3 py-2 text-sm">設為優先</button><button disabled={busy===item.id} onClick={()=>onAction(item,'archive')} className="rounded-lg bg-slate-100 px-3 py-2 text-sm">封存</button></div>
 </article>
}

export default function ResearchCenter(){
 const [data,setData]=useState({items:[],counts:{}}),[busy,setBusy]=useState(''),[error,setError]=useState('')
 async function load(){setError('');try{setData(await fetchResearchCenter({}))}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[])
 const grouped=useMemo(()=>Object.fromEntries(BOTS.map(b=>[b.id,data.items.filter(x=>x.owner===b.id&&!['archived','stopped'].includes(x.researchStatus))])),[data.items])
 async function act(item,action,ask=false){let note='';if(ask){note=window.prompt(item.needsUserInput?(item.userQuestion||'請回答 Bot 的問題'):'修正研究問題、範圍或條件')||'';if(!note)return}setBusy(item.id);try{await actOnResearch(item.id,action,note);await load()}catch(e){setError(e.message)}finally{setBusy('')}}
 return <div className="mx-auto max-w-7xl space-y-5"><header className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Bot 研究中心</h1><p className="mt-1 text-slate-500">看階段、證據、缺口與下一步；需要你時，Bot 會明確提問。</p></div><button onClick={load} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={16}/>更新</button></header>
 {error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
 <div className="grid gap-5 lg:grid-cols-2">{BOTS.map(bot=><section key={bot.id} className="rounded-2xl border bg-slate-50 p-4"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">{bot.name}</h2><p className="text-sm text-slate-500">{bot.role}</p></div><span className="rounded-full bg-white px-3 py-1 text-sm text-slate-500">{grouped[bot.id].length} 個主題</span></div><div className="space-y-3">{grouped[bot.id].map(item=><TopicCard key={item.id} item={item} busy={busy} onAction={act}/>)}{!grouped[bot.id].length&&<div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-400">Bot 尚未從對話與目標中形成研究主題</div>}</div></section>)}</div></div>
}
