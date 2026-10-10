import { Users, BrainCircuit, BookOpen, ShieldCheck } from 'lucide-react'

const planned = [
  {name:'PI · Project Integrator',role:'專案整合專家',skills:['需求探索','專案規劃','專家組織','動態執行','研究推導','品質整合','系統操作','能力缺口管理']},
]

export default function ExpertTeam() {
  return <div className="max-w-5xl mx-auto space-y-5">
    <header className="flex items-center gap-3"><Users size={26} className="text-slate-500"/><div><h1 className="text-2xl font-bold">專家團</h1><p className="text-sm text-slate-500">跨 HY Life OS 共用的 Expert 與 Skill</p></div></header>
    <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">目前為建置中介面，尚未接入正式 Expert Service。下列 PI 為規劃草案，不代表已建立、核准或發布。</div>
    <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2"><BrainCircuit size={20}/><h2 className="font-semibold">專家清單</h2></div>
      {planned.map(e=><div key={e.name} className="border border-dashed border-slate-300 rounded-lg p-4 space-y-2">
        <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{e.name}</h3><p className="text-xs text-slate-500">{e.role}</p></div><span className="text-xs bg-slate-100 text-slate-500 rounded px-2 py-1 h-fit">規劃中</span></div>
        <div className="flex flex-wrap gap-2">{e.skills.map(s=><span key={s} className="bg-slate-100 rounded px-2 py-1 text-xs text-slate-600">{s}</span>)}</div>
      </div>)}
    </section>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <section className="bg-white rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 font-semibold"><BookOpen size={18}/> Skill Registry</div><p className="text-sm text-slate-500 mt-2">未來連接已發布 Skill、版本、候選與升級紀錄；不建立第二套 Registry。</p></section>
      <section className="bg-white rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 font-semibold"><ShieldCheck size={18}/> 能力驗收</div><p className="text-sm text-slate-500 mt-2">專家及 Skill 需通過評測與 HY 正式核准後才可用於專案。</p></section>
    </div>
  </div>
}
