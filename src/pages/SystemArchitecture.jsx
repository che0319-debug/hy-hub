import { useState } from 'react'
import { authHeaders } from '../auth'
import { Boxes, BrainCircuit, Workflow, ShieldCheck, Users, FileText, Gauge, Home, BriefcaseBusiness, Bot, BookOpen, Settings, Database, Link2, HardDrive, Github, LockKeyhole, ListTodo, ChevronRight, X, FlaskConical } from 'lucide-react'

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
  const [view, setView] = useState('architecture')
  const [testModule, setTestModule] = useState('pi')
  const [testGoal, setTestGoal] = useState('開發一個自用健身教練 App。')
  const [labPayload,setLabPayload] = useState(null)
  const [labJob,setLabJob] = useState(null)
  const [labError,setLabError] = useState('')
  const [labBusy,setLabBusy] = useState(false)
  const [pinJson,setPinJson] = useState('[{"id":"pi-discovery","version":"0.0.0-lab","content_hash":"sandbox-only-not-published"}]')
  async function preparePiLab() {
    setLabError('')
    setLabPayload(null)
    setLabJob(null)
    setLabBusy(true)
    try {
      const pins=JSON.parse(pinJson)
      if (!Array.isArray(pins) || !pins.length) throw new Error('請提供測試 Skill pin（id、version、content_hash）')
      const body={context:{goal:testGoal,project_id:'pi-lab-isolated',
        expert_pin:{id:'pi',version:'1.0.0'},capabilities:{},
        plan_revision:0,current_phase:'LAB',evidence:[]},skill_pins:pins}
      const base=import.meta.env.VITE_API_BASE || ''
      const res=await fetch(`${base}/api/ai-work-packages/pi-lab/prepare`,{
        method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify(body)})
      const data=await res.json()
      if (!res.ok || !data.ok) throw new Error(data.detail||data.error||'PI Lab API 未就緒')
      setLabPayload(data.payload)
    } catch(err) {setLabError(String(err.message||err))}
    finally {setLabBusy(false)}
  }
  async function createPiLabJob() {
    setLabBusy(true);setLabError('')
    try {
      const pins=JSON.parse(pinJson)
      const base=import.meta.env.VITE_API_BASE || ''
      const body={context:{goal:testGoal,project_id:'pi-lab-isolated',
        expert_pin:{id:'pi',version:'1.0.0'},capabilities:{},
        plan_revision:0,current_phase:'LAB',evidence:[]},skill_pins:pins}
      const res=await fetch(`${base}/api/ai-work-packages/pi-lab/jobs`,{
        method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify(body)})
      const data=await res.json()
      if(!res.ok||!data.ok)throw new Error(data.detail||data.error||'建立失敗')
      setLabJob(data.job)
    } catch(err){setLabError(String(err.message||err))}
    finally{setLabBusy(false)}
  }
  async function deletePiLabJob() {
    if(!labJob?.request_id)return
    setLabBusy(true);setLabError('')
    try {
      const base=import.meta.env.VITE_API_BASE || ''
      const res=await fetch(`${base}/api/ai-work-packages/pi-lab/jobs/${encodeURIComponent(labJob.request_id)}`,{method:'DELETE',headers:authHeaders()})
      const data=await res.json()
      if(!res.ok||!data.ok)throw new Error(data.detail||data.error||'刪除失敗')
      setLabJob(null)
    }catch(err){setLabError(String(err.message||err))}
    finally{setLabBusy(false)}
  }
  async function refreshPiLabJob() {
    if(!labJob?.request_id)return
    setLabBusy(true);setLabError('')
    try {
      const base=import.meta.env.VITE_API_BASE || ''
      const res=await fetch(`${base}/api/ai-work-packages/pi-lab/jobs/${encodeURIComponent(labJob.request_id)}`,{headers:authHeaders(),cache:'no-store'})
      const data=await res.json()
      if(!res.ok||!data.ok)throw new Error(data.detail||data.error||'查詢失敗')
      setLabJob(data.job)
    } catch(err){setLabError(String(err.message||err))}
    finally{setLabBusy(false)}
  }
  const found = layers.flatMap(layer => layer.items.map(item => ({ layer, item }))).find(x => x.item[0] === selected)
  return <div className="max-w-6xl mx-auto space-y-5">
    <header className="flex items-start gap-3">
      <Boxes className="text-slate-600 shrink-0 mt-1" size={28}/>
      <div><h1 className="text-2xl font-bold text-slate-800">系統架構</h1><p className="text-sm text-slate-500 mt-1">HY Life OS 的模組建設地圖 · 架構規劃版</p></div>
    </header>
    <nav className="flex gap-2 border-b border-slate-200" aria-label="系統架構功能">
      <button onClick={()=>setView('architecture')} className={view==='architecture'?'px-4 py-3 border-b-2 border-blue-600 text-blue-700':'px-4 py-3 text-slate-500'}>架構總覽</button>
      <button onClick={()=>setView('tests')} className={view==='tests'?'px-4 py-3 border-b-2 border-blue-600 text-blue-700':'px-4 py-3 text-slate-500'}>引擎測試</button>
    </nav>
    {view==='tests' && <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2"><FlaskConical size={20}/><h2 className="font-semibold">共用模組測試台</h2><span className="text-xs bg-slate-200 rounded px-2 py-1">尚未啟用</span></div>
      <p className="text-sm text-slate-600">所有 Engine／Service 共用測試框架；測試資料與正式專案隔離，目前不會真正執行測試。</p>
      <label className="block text-sm">測試模組
        <select value={testModule} onChange={e=>setTestModule(e.target.value)} className="block mt-1 p-2 border rounded-lg w-full max-w-md">
          {layers.filter(l=>l.id==='engine'||l.id==='service').flatMap(l=>l.items.map(item=><option key={item[0]} value={item[0]}>{item[1]}</option>))}
        </select>
      </label>
      <label className="block text-sm">測試案例／Goal
        <textarea value={testGoal} onChange={e=>setTestGoal(e.target.value)} rows={3} className="block mt-1 p-3 border rounded-lg w-full"/>
      </label>
      {testModule==='pi' && <label className="block text-sm">PI 測試 Skill pins（JSON，預設為沙盒占位，非正式 Skill）
        <textarea value={pinJson} onChange={e=>setPinJson(e.target.value)} rows={3} className="block mt-1 p-3 border rounded-lg w-full font-mono text-xs" />
      </label>}
      <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-sm">預計驗收：輸入輸出契約、權限、品質、失敗處理、版本比較與證據。測試工作獨立於正式專案。建立後請在已連接 HY Life OS MCP 的 GPT Chat 對話中要求「執行 PI Lab 待測工作」，由 GPT Chat 領取與提交；此頁只讀回結果，不會自動呼叫付費 API。</div>
      {testModule==='pi' ? <button type="button" disabled={labBusy||!testGoal.trim()} onClick={preparePiLab} className="bg-slate-700 text-white disabled:opacity-50 px-4 py-2 rounded-lg text-sm">{labBusy?'處理中…':'準備 PI 測試請求'}</button>
      : <button type="button" disabled className="bg-slate-200 text-slate-500 px-4 py-2 rounded-lg cursor-not-allowed">執行測試（待接入）</button>}
      {testModule==='pi' && <button type="button" disabled={labBusy||!labPayload} onClick={createPiLabJob} className="ml-2 border border-slate-400 px-4 py-2 rounded-lg text-sm disabled:opacity-50">建立隔離測試工作</button>}
      {labJob && <div className="rounded-lg border p-3 space-y-2 text-sm"><div>測試 ID：{labJob.request_id}</div><div>狀態：{labJob.status}</div><button type="button" onClick={refreshPiLabJob} disabled={labBusy} className="text-blue-700 underline">重新讀取結果</button><button type="button" onClick={deletePiLabJob} disabled={labBusy||labJob.status==='RUNNING'} className="ml-3 text-slate-600 underline disabled:opacity-50">刪除測試紀錄</button>{labJob.result && <pre className="overflow-auto max-h-80 bg-slate-100 p-3 text-xs">{JSON.stringify(labJob.result,null,2)}</pre>}</div>}
      {labError && <p role="alert" className="text-sm text-red-700">{labError}</p>}
      {testModule==='pi' && labPayload && <div className="space-y-2"><p className="font-medium text-sm">PI 測試請求（未執行模型）</p><pre className="overflow-auto max-h-80 p-3 rounded-lg bg-slate-100 text-xs">{JSON.stringify(labPayload,null,2)}</pre></div>}
    </section>}
    {view==='architecture' && <>
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
    </>}
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
