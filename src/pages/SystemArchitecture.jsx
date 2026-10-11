import { useState, useEffect } from 'react'
import { authHeaders } from '../auth'
import { Boxes, FlaskConical } from 'lucide-react'

import ModuleRegistryOverview from '../components/ModuleRegistryOverview'

const testModules = [['pi','PI Engine'], ['mission','Mission Engine'], ['quality','Quality Engine']]

export default function SystemArchitecture() {
  const [view, setView] = useState('architecture')
  const [testModule, setTestModule] = useState('pi')
  const [testGoal, setTestGoal] = useState('開發一個自用健身教練 App。')
  const [labPayload,setLabPayload] = useState(null)
  const [labJob,setLabJob] = useState(null)
  const [labError,setLabError] = useState('')
  const [labBusy,setLabBusy] = useState(false)
  const [pinJson,setPinJson] = useState('[{"id":"pi-discovery","version":"0.0.0-lab","content_hash":"sandbox-only-not-published"}]')
  const [formal,setFormal]=useState(false)
  const [formalExperts,setFormalExperts]=useState([])
  const [expertVersion,setExpertVersion]=useState('')
  useEffect(()=>{const base=import.meta.env.VITE_API_BASE || '';fetch(`${base}/api/ai-work-packages/experts/pi/readiness`,{headers:authHeaders(),cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('正式 Expert 讀取失敗');return r.json()}).then(d=>setFormalExperts(d.experts.filter(e=>e.usable))).catch(e=>setLabError(e.message))},[])
  function labBody(){
    const expert=formalExperts.find(e=>e.version===expertVersion)
    if(formal&&!expert)throw new Error('請選擇已發布且綁定有效的 PI Expert')
    const pins=formal?expert.skills:JSON.parse(pinJson)
    return {context:{goal:testGoal,project_id:'pi-lab-isolated',expert_pin:formal?{id:'pi',version:expert.version,content_hash:expert.content_hash}:{id:'pi',version:'1.0.0'},capabilities:{},plan_revision:0,current_phase:'LAB',evidence:[]},skill_pins:pins}
  }
  async function preparePiLab() {
    setLabError('')
    setLabPayload(null)
    setLabJob(null)
    setLabBusy(true)
    try {
      const body=labBody()
      const base=import.meta.env.VITE_API_BASE || ''
      const res=await fetch(`${base}/api/ai-work-packages/${formal?'pi-lab/formal/prepare':'pi-lab/prepare'}`,{
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
      const base=import.meta.env.VITE_API_BASE || ''
      const body=labBody()
      const res=await fetch(`${base}/api/ai-work-packages/${formal?'pi-lab/formal/jobs':'pi-lab/jobs'}`,{
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
  return <div className="max-w-6xl mx-auto space-y-5">
    <header className="flex items-start gap-3">
      <Boxes className="text-slate-600 shrink-0 mt-1" size={28}/>
      <div><h1 className="text-2xl font-bold text-slate-800">系統架構</h1><p className="text-sm text-slate-500 mt-1">正式模組登錄中心 · 建置與驗收分離</p></div>
    </header>
    <nav className="flex gap-2 border-b border-slate-200" aria-label="系統架構功能">
      <button onClick={()=>setView('architecture')} className={view==='architecture'?'px-4 py-3 border-b-2 border-blue-600 text-blue-700':'px-4 py-3 text-slate-500'}>架構總覽</button>
      <button onClick={()=>setView('tests')} className={view==='tests'?'px-4 py-3 border-b-2 border-blue-600 text-blue-700':'px-4 py-3 text-slate-500'}>引擎測試</button>
    </nav>
    {view==='tests' && <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2"><FlaskConical size={20}/><h2 className="font-semibold">共用模組測試台</h2><span className="text-xs bg-slate-200 rounded px-2 py-1">PI 獨立測試</span></div>
      <p className="text-sm text-slate-600">PI Lab 是隔離測試，不代表正式產品驗收。Mission 與 Quality 的正式案例狀態與證據請查看架構總覽。正式發布版本與沙盒分開選擇；測試工作由 GPT Chat 領取。</p>
      <label className="block text-sm">測試模組
        <select value={testModule} onChange={e=>setTestModule(e.target.value)} className="block mt-1 p-2 border rounded-lg w-full max-w-md">
          {testModules.map(item=><option key={item[0]} value={item[0]}>{item[1]}</option>)}
        </select>
      </label>
      <label className="block text-sm">測試案例／Goal
        <textarea value={testGoal} onChange={e=>setTestGoal(e.target.value)} rows={3} className="block mt-1 p-3 border rounded-lg w-full"/>
      </label>
      {testModule==='pi' && <div className="space-y-3"><label><input type="checkbox" checked={formal} onChange={e=>{setFormal(e.target.checked);setLabPayload(null);setLabJob(null)}}/> 使用正式發布 PI Expert／Skills</label>{formal&&<select aria-label="正式 PI Expert 版本" value={expertVersion} onChange={e=>setExpertVersion(e.target.value)} className="p-3 border rounded-lg w-full"><option value="">選擇正式版本</option>{formalExperts.map(e=><option key={e.version} value={e.version}>PI @ {e.version}</option>)}</select>}{formal&&!formalExperts.length&&<p>尚無可用正式 PI Expert，請先於專家團完成 Skill 與 Expert 核准。</p>}</div>}
      {testModule==='pi' && !formal && <label className="block text-sm">PI 測試 Skill pins（JSON，預設為沙盒占位，非正式 Skill）
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
    {view==='architecture' && <ModuleRegistryOverview/>}
  </div>
}
