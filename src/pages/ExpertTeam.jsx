import { useState, useEffect } from 'react'
import { authHeaders } from '../auth'
import { Users, BrainCircuit, BookOpen, ShieldCheck, Search, Puzzle, ArrowLeft, Sparkles } from 'lucide-react'

const proposed = [{
  id:'pi', name:'PI · Project Integrator', role:'專案整合專家',
  skills:['需求探索','專案規劃','專家組織','動態執行','研究推導','品質整合','系統操作','能力缺口管理'],
  icon:BrainCircuit, image:null, state:'規劃中'
}]

// Expert portraits are optional approved illustration assets, never photographs.
// New experts default to a neutral symbolic icon until their visual identity is reviewed.
function ExpertAvatar({ expert, large=false }) {
  const Icon=expert.icon || Puzzle
  return <div className={`flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-slate-500 ${large?'w-20 h-20':'w-14 h-14'}`} aria-label="專家意象圖，待設計">
    <Icon size={large?38:27} strokeWidth={1.6}/>
  </div>
}

export default function ExpertTeam() {
  const [tab,setTab]=useState('experts')
  const [selected,setSelected]=useState(null)
  const [query,setQuery]=useState('')
  const [published,setPublished]=useState([])
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  useEffect(()=>{
    let active=true
    const base=import.meta.env.VITE_API_BASE || ''
    fetch(`${base}/api/ai-work-packages/experts`,{headers:authHeaders(),cache:'no-store'})
      .then(async res=>{if(!res.ok) throw new Error(`HTTP ${res.status}`);return res.json()})
      .then(data=>{if(active){setPublished(Array.isArray(data.experts)?data.experts:[]);setLoading(false)}})
      .catch(err=>{if(active){setLoadError(err.message);setLoading(false)}})
    return ()=>{active=false}
  },[])
  const actual=published.map(e=>({...e,role:e.role||'專家',skills:(e.skills||[]).map(pin=>pin.id+' @ '+pin.version),icon:Puzzle,state:'已發布'}))
  const allExperts=[...actual,...proposed.filter(p=>!actual.some(e=>e.id===p.id))]
  const expert=allExperts.find(x=>x.id===selected)
  return <div className="max-w-5xl mx-auto space-y-5">
    <header className="flex items-center gap-3"><Users size={26} className="text-slate-500"/><div><h1 className="text-2xl font-bold">專家團</h1><p className="text-sm text-slate-500">跨 HY Life OS 共用的 Expert 與 Skill</p></div></header>
    <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">建置中示意：專家、Skill 及圖像均未正式發布。每位專家的意象圖於建立時個別討論，不使用真人照片。</div>
    <nav className="flex gap-2 border-b border-slate-200" aria-label="專家團功能">
      {[['experts','專家列表'],['skills','Skill 管理'],['requests','能力請求']].map(([id,label])=><button key={id} onClick={()=>{setTab(id);setSelected(null)}} className={`px-4 py-3 text-sm border-b-2 ${tab===id?'border-blue-600 text-blue-700 font-semibold':'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>)}
    </nav>
    {tab==='experts' && (expert ? <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <button onClick={()=>setSelected(null)} className="flex items-center gap-1 text-sm text-blue-700"><ArrowLeft size={16}/>返回專家列表</button>
      <div className="flex gap-4 items-center"><ExpertAvatar expert={expert} large/><div><h2 className="text-xl font-bold">{expert.name}</h2><p className="text-sm text-slate-500">{expert.role}</p><span className="text-xs text-slate-500">{expert.state === '已發布' ? '已發布 · 正式資料' : '候選規劃 · 未發布'}</span></div></div>
      <h3 className="font-semibold">預計配置 Skill</h3><div className="flex flex-wrap gap-2">{expert.skills.map(s=><span key={s} className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-lg">{s}</span>)}</div>
      <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600"><div className="flex items-center gap-2 font-medium"><Sparkles size={16}/>專家形象規劃</div><p className="mt-1">正式建立此專家時，再討論專屬擬人化插畫或抽象意象圖；目前只用中性符號占位，不產生真人照片。</p></div>
    </section> : <>
      <div className="flex items-center gap-2 border border-slate-200 rounded-lg bg-white px-3 py-2 max-w-md"><Search size={17} className="text-slate-400"/><input aria-label="搜尋專家" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋專家或能力…" className="w-full outline-none text-sm"/></div>
      {loading && <p className="text-sm text-slate-500">讀取正式專家資料中…</p>}
      {loadError && <p className="text-sm text-amber-700">正式專家資料尚不可用（{loadError}）；以下規劃卡片不是正式發布資料。</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allExperts.filter(e=>(e.name+e.role+e.skills.join(' ')).toLowerCase().includes(query.toLowerCase())).map(e=><button key={e.id} onClick={()=>setSelected(e.id)} className="text-left bg-white rounded-xl border border-dashed border-slate-300 p-4 hover:border-blue-400 focus-visible:outline-blue-500 space-y-3">
          <div className="flex items-center gap-3"><ExpertAvatar expert={e}/><div><h2 className="font-semibold text-sm">{e.name}</h2><p className="text-xs text-slate-500">{e.role}</p></div></div>
          <div className="flex flex-wrap gap-1">{e.skills.slice(0,3).map(s=><span key={s} className="bg-slate-100 rounded px-2 py-1 text-xs text-slate-600">{s}</span>)}<span className="text-xs text-slate-500">+{e.skills.length-3}</span></div>
          <p className="text-xs text-slate-500">{e.state} · 圖像待確認</p>
        </button>)}
      </div>
    </>)}
    {tab==='skills' && <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-2"><div className="flex items-center gap-2 font-semibold"><BookOpen size={20}/>Skill Registry</div><p className="text-sm text-slate-500">將串接既有 Skill Registry，顯示已發布 Skill、候選、版本與升級紀錄；不另建第二套資料庫。</p></section>}
    {tab==='requests' && <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-2"><div className="flex items-center gap-2 font-semibold"><ShieldCheck size={20}/>能力建置請求</div><p className="text-sm text-slate-500">未來顯示 PI 發現的 Expert、Skill、Tool、Engine 缺口，及候選建置與審查進度；目前尚未接入後端。</p></section>}
  </div>
}
