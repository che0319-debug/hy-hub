import { useState } from 'react'
import { Boxes, BrainCircuit, Workflow, ShieldCheck, Users, FileText, Gauge, Home, BriefcaseBusiness, Bot, BookOpen, Settings, Database, Link2, HardDrive, Github, LockKeyhole, ListTodo, ChevronRight, X } from 'lucide-react'

/** Proposed architecture only. Never infer readiness from the existence of legacy code. */
const layers = [
  { id: 'ui', title: '前台功能', subtitle: 'User Interface', items: [
    ['home','首頁','異常提醒',Home], ['office','AI Office','專案執行',BriefcaseBusiness],
    ['experts-ui','專家團','專家與 Skill',Users], ['helpers','小幫手','AI 工具與額度',Bot],
    ['knowledge','知識庫','知識與研究',BookOpen], ['settings','設定','系統設定',Settings]
  ] },
  { id: 'engine', title: '核心引擎', subtitle: 'Engines', items: [
    ['pi','PI Engine','自主規劃與整合',BrainCircuit], ['mission','Mission Engine','循環、派工與調度',Workflow],
    ['quality','Quality Engine','品質驗證與審查',ShieldCheck]
  ] },
  { id: 'service', title: '共用服務', subtitle: 'Services', items: [
    ['expert','Expert Service','專家、Skill 與能力',Users], ['report','Report Service','HTML 成果與版本',FileText],
    ['resource','Resource Service','模型、工具與額度',Gauge]
  ] },
  { id: 'infra', title: '基礎設施', subtitle: 'Infrastructure', items: [
    ['mcp','MCP','模型工具通訊',Link2], ['queue','Task Queue','任務佇列',ListTodo],
    ['drive','Google Drive','文件儲存',HardDrive], ['github','GitHub','程式與版本',Github],
    ['database','Database','正式資料',Database], ['auth','Auth','身分與權限',LockKeyhole]
  ] }
]

const descriptions = {
  pi:'接手 Goal、研究、規劃、組織專家、整合成果與判斷下一步；不直接核准或變更正式專案狀態。',
  mission:'管理執行循環、工作依賴、工作包、認領、提交、重試與狀態轉換。',
  quality:'驗證交付證據、品質關卡、Claude 獨立審查及退回補強。',
  expert:'跨 Life OS 管理 Expert、Skill、能力評測與版本；專家團是它的前台。',
  report:'維護持續更新的 HTML 成果報告、版本快照、附件與 Google Drive 關聯。',
  resource:'登錄可用模型、執行工具、額度來源與路由限制；額度明細在小幫手。',
  mcp:'提供受控的 AI 工具連線與呼叫契約。',
  queue:'提供可恢復、可追溯的任務排隊與執行鎖。',
  drive:'儲存專案正式文件、參考資料與成果證據。',
  github:'維護程式碼、PR、測試與發布版本。',
  database:'保存正式專案、模組與事件資料。',
  auth:'管理身分、權限與 HY／代理授權邊界。'
}

function ModuleTile({ item, onSelect }) {
  const [id, name, subtitle, Icon] = item
  return <button type="button" onClick={() => onSelect(id)} className="text-left rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 p-3 min-h-[106px] transition-colors" aria-label={name + '：查看規劃詳情'}>
    <div className="flex items-center gap-2 text-slate-600"><Icon size={21}/><span className="font-semibold text-sm">{name}</span></div>
    <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
    <span className="inline-flex mt-2 text-[11px] text-slate-500 bg-slate-200 rounded px-2 py-0.5">待驗收</span>
  </button>
}

export default function SystemArchitecture() {
  const [selected, setSelected] = useState(null)
  const found = layers.flatMap(layer => layer.items.map(item => ({ layer, item }))).find(x => x.item[0] === selected)
  return <div className="max-w-6xl mx-auto space-y-5">
    <header className="flex items-start gap-3">
      <Boxes className="text-slate-600 shrink-0 mt-1" size={28}/>
      <div><h1 className="text-2xl font-bold text-slate-800">系統架構</h1><p className="text-sm text-slate-500 mt-1">HY Life OS 的模組建設地圖 · 架構規劃版</p></div>
    </header>
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h2 className="font-semibold text-slate-700">整體架構</h2><span className="text-xs text-slate-500">灰色虛線＝尚未完成新版模組驗收</span></div>
      <div className="space-y-2">
        {layers.map((layer, i) => <div key={layer.id}>
          <section className="rounded-xl bg-slate-100/80 p-3 md:p-4" aria-label={layer.title}>
            <div className="flex justify-between items-baseline mb-3"><h3 className="font-semibold text-slate-700">{layer.title}</h3><span className="text-xs text-slate-400">{layer.subtitle}</span></div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">{layer.items.map(item => <ModuleTile key={item[0]} item={item} onSelect={setSelected}/>)}</div>
          </section>
          {i < layers.length - 1 && <div className="text-center text-slate-400 text-xl leading-6" aria-hidden="true">↕</div>}
        </div>)}
      </div>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="font-semibold text-slate-700">模組建設原則</h2>
      <p className="text-sm text-slate-600 mt-2">先建立模組契約與驗收標準，再由 AI Office 等前台調用；能力不足時優先升級所屬模組，不在前台重建平行邏輯。</p>
      <p className="text-xs text-slate-500 mt-2">目前僅為規劃清冊；已存在的舊功能不代表新版模組 READY。未來由正式驗收紀錄決定彩色顯示，不依 AI 自行判定。</p>
    </div>
    {found && <div className="fixed inset-0 z-[70] bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
      <section role="dialog" aria-modal="true" aria-label={found.item[1]} onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-xl shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-800">{found.item[1]}</h2><button onClick={() => setSelected(null)} aria-label="關閉"><X size={20}/></button></div>
        <p className="text-xs text-slate-500">{found.layer.title} / {found.layer.subtitle} · 待驗收</p>
        <p className="text-sm text-slate-700">{descriptions[selected] || found.item[2]}</p>
        <div className="rounded-lg bg-slate-50 border border-dashed border-slate-300 p-3 text-sm text-slate-600">正式版本：未登錄<br/>模組契約：待建立或確認<br/>驗收證據：尚未登錄<br/>GitHub 程式位置：待盤點</div>
        <button className="text-sm text-blue-700 flex items-center gap-1" onClick={() => setSelected(null)}>返回架構圖 <ChevronRight size={15}/></button>
      </section>
    </div>}
  </div>
}
