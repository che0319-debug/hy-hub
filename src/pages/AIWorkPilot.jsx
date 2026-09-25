import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw, Plus, ExternalLink } from 'lucide-react'
import { fetchAIWorkPilot, seedAIWorkPilot, sendAIWorkPilotEvent } from '../lifeOSApi'

const STATUS = {
  ai_pending: ['待 AI 處理', 'bg-violet-50 text-violet-700'],
  ai_running: ['進行中', 'bg-blue-50 text-blue-700'],
  confirmation: ['等待確認', 'bg-amber-50 text-amber-700'],
  completed: ['完成', 'bg-emerald-50 text-emerald-700'],
}
const BOTS = { family: '小櫻', sam: 'Sam', '950157': '950157', hy: 'HY' }
const SCENARIOS = {
  'TEST-01': [
    ['claim', {}, 'AI 接手'],
    ['artifact', { title: '中秋小旅行方案 V1', summary: '兩個目的地、交通與三代同行比較；測試成果 metadata' }, '加入候選方案'],
    ['criterion', { criterion: '至少兩個目的地方案' }, '驗證方案數'],
    ['criterion', { criterion: '基本交通、景點與三代同行條件' }, '驗證基本條件'],
    ['progress', { currentState: '候選方案比較完成', nextAction: '等待選擇目的地後細排行程' }, '更新目前與下一步'],
    ['checkpoint', { question: '選擇哪個目的地？', basis: '已完成兩個目的地比較', options: ['台中', '苗栗'] }, '等待使用者選擇'],
    ['resume', { choice: '台中' }, '模擬使用者選擇台中'],
    ['criterion', { criterion: '使用者選定目的地' }, '確認目的地'],
    ['artifact', { title: '中秋台中詳細行程 V1', summary: '測試行程 metadata，未寫入 Google Drive' }, '加入詳細行程'],
    ['criterion', { criterion: '最終行程成果' }, '驗證最終行程'],
    ['complete', {}, '完成 Goal'],
  ],
  'TEST-02': [
    ['claim', {}, 'AI 接手'],
    ['artifact', { title: '競品與價格帶分析 V1', summary: '測試成果 metadata' }, '加入競品分析'],
    ['criterion', { criterion: '競品與價格帶分析' }, '驗證競品分析'],
    ['progress', { currentState: '競品與價格分析完成，進入成本與定價驗證', nextAction: '建立產品成本與毛利模型' }, '自主推進'],
    ['artifact', { title: '成本與毛利模型 V1', summary: '測試成果 metadata' }, '加入毛利模型'],
    ['criterion', { criterion: '成本與毛利模型' }, '驗證模型'],
    ['progress', { currentState: '毛利模型完成，整體品牌目標尚未完成', nextAction: '驗證商品定價與市場推廣模式' }, '自主規劃下一步'],
  ],
  'TEST-03': [
    ['claim', {}, 'AI 接手'],
    ['artifact', { title: 'PPT AI Tool 需求與系統架構 V1', summary: '測試規格 metadata' }, '加入架構文件'],
    ['criterion', { criterion: '需求與系統架構' }, '驗證架構'],
    ['progress', { currentState: '架構完成', nextAction: '建立 MVP 核心流程' }, '開始 MVP'],
    ['artifact', { title: 'PPT AI Tool MVP Prototype V1', type: 'prototype', summary: '隔離規格原型；未修改正式 PPT Studio' }, '加入原型'],
    ['progress', { currentState: '第一次驗證未通過，正在修正', nextAction: '修正後重新測試 MVP 核心流程' }, '模擬失敗與修正'],
    ['progress', { currentState: '修正後重新測試通過，整體 MVP 尚待驗收', nextAction: '補足可用性驗收' }, '重新測試'],
    ['criterion', { criterion: 'MVP 核心流程' }, '驗證流程'],
    ['criterion', { criterion: '測試通過' }, '驗證測試'],
  ],
}
const date = value => value ? new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) : '—'
const badge = p => <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS[p.workspaceStatus]?.[1] || ''}`}>{STATUS[p.workspaceStatus]?.[0] || p.workspaceStatus}</span>
const panel = 'rounded-2xl border border-slate-200 bg-white px-6 py-5'

export default function AIWorkPilot() {
  const [projects, setProjects] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [tab, setTab] = useState('總覽')
  const [filter, setFilter] = useState('全部')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selected = projects.find(p => p.id === selectedId)
  const counts = useMemo(() => Object.fromEntries(Object.keys(STATUS).map(k => [k, projects.filter(p => p.workspaceStatus === k).length])), [projects])
  const visible = projects.filter(p => filter === '全部' || STATUS[p.workspaceStatus]?.[0] === filter)
  async function refresh() {
    try { const data = await fetchAIWorkPilot(); setProjects(data.projects || []); setError('') }
    catch (e) { setError(e.message || '測試資料讀取失敗') }
  }
  useEffect(() => { refresh() }, [])
  async function run(fn) {
    setBusy(true); setError('')
    try { await fn(); await refresh() } catch (e) { setError(e.message || '操作失敗') }
    finally { setBusy(false) }
  }
  async function nextStep(project) {
    const index = project.pilotEvents?.length || 0
    const step = SCENARIOS[project.testCode]?.[index]
    if (!step) return
    await run(async () => {
      await sendAIWorkPilotEvent(project.id, step[0], step[1])
    })
  }
  const tabs = ['總覽', '成果', '推進紀錄', '目標歷程', 'Google Drive']
  return <div className="mx-auto max-w-7xl text-slate-800">
    <div className="mb-7 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold">AI Work Test</h1><p className="mt-1 text-sm text-slate-500">隔離 Pilot · 三個 TEST 專案 · 不影響正式工作區</p></div><button onClick={() => run(refresh)} disabled={busy} aria-label="重新整理" className="rounded-xl border bg-white p-3"><RefreshCw size={18}/></button></div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {!selected ? <>
      <div className="grid gap-4 md:grid-cols-5">{[['ai_running', '進行中'], ['confirmation', '等待確認'], ['completed', '已完成'], ['all', '全部專案']].map(([key, title]) => <div key={key} className={panel}><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-semibold">{key === 'all' ? projects.length : counts[key]}</p></div>)}<button onClick={() => run(seedAIWorkPilot)} disabled={busy || projects.length > 0} className="rounded-2xl bg-blue-600 px-4 py-5 text-white disabled:opacity-50"><Plus className="mr-2 inline" size={18}/>建立三個 TEST 案</button></div>
      <div className="my-7 flex gap-2 border-b">{['全部', '進行中', '等待確認', '完成'].map(name => <button key={name} onClick={() => setFilter(name)} className={`px-4 py-3 text-sm ${filter === name ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-slate-500'}`}>{name}</button>)}</div>
      <div className="overflow-x-auto rounded-2xl border bg-white"><div className="min-w-[980px]"><div className="grid grid-cols-[2fr_110px_120px_1.4fr_1.4fr_100px] gap-4 border-b bg-slate-50 px-6 py-4 text-sm text-slate-500"><span>專案名稱 / 目標</span><span>負責 Bot</span><span>狀態</span><span>目前狀況</span><span>下一步</span><span>更新時間</span></div>{visible.map(p => <button key={p.id} onClick={() => { setSelectedId(p.id); setTab('總覽') }} className="grid w-full grid-cols-[2fr_110px_120px_1.4fr_1.4fr_100px] items-center gap-4 border-b px-6 py-5 text-left last:border-0 hover:bg-blue-50/40"><span><b>{p.title}</b><small className="mt-1 block line-clamp-2 text-slate-500">{p.goal}</small></span><span>{BOTS[p.responsibleBot]}</span><span>{badge(p)}</span><span className="text-sm">{p.currentState}</span><span className="text-sm">{p.nextAction}</span><span className="text-xs text-slate-500">{date(p.updatedAt)}</span></button>)}</div></div>
    </> : <>
      <button onClick={() => setSelectedId('')} className="mb-5 flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16}/>返回 AI Work Test</button>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold">{selected.title}</h2><div className="flex items-center gap-3">{BOTS[selected.responsibleBot]} · {badge(selected)}</div></div>
      <div className="my-6 flex flex-wrap gap-8 border-b">{tabs.map(name => <button key={name} onClick={() => setTab(name)} className={`pb-3 ${tab === name ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}>{name}</button>)}</div>
      {tab === '總覽' && <div className="space-y-5"><section className={panel}><h3 className="mb-2 text-xl font-semibold">🎯 目標 Goal</h3><p>{selected.goal}</p><p className="mt-2 text-sm text-slate-500">Goal V{selected.goalVersion} · 正式修改需由使用者確認</p></section><div className="grid gap-5 md:grid-cols-2"><section className={panel}><h3 className="mb-2 text-xl font-semibold">目前狀況</h3><p>{selected.currentState}</p></section><section className={panel}><h3 className="mb-2 text-xl font-semibold">下一步</h3><p>{selected.nextAction}</p></section></div><section className={panel}><h3 className="mb-2 text-xl font-semibold">需要你</h3>{selected.checkpoint ? <><p>{selected.checkpoint.question}</p><p className="text-sm text-slate-500">{selected.checkpoint.basis}</p><p className="mt-2">選項：{selected.checkpoint.options.join(' / ')}</p></> : <p>{selected.workspaceStatus === 'completed' ? '目標已完成，目前沒有需要你處理的事項。' : '目前沒有需要你處理的事項，AI 可繼續自主推進。'}</p>}</section><section className={panel}><h3 className="mb-2 text-xl font-semibold">最新成果</h3>{selected.artifacts.length ? selected.artifacts.slice().reverse().map(a => <p key={a.artifactId} className="py-1">{date(a.createdAt)}　{a.title} <span className="text-xs text-slate-400">（測試索引，未寫入 Drive）</span></p>) : <p className="text-slate-500">尚無成果</p>}</section></div>}
      {tab === '成果' && <div className={panel}>{selected.artifacts.length ? selected.artifacts.map(a => <div key={a.artifactId} className="border-b py-3"><b>{a.title}</b><p className="text-sm text-slate-500">{a.summary}</p><small>Google Drive 未接通 · 無可開啟連結</small></div>) : '尚無成果'}</div>}
      {tab === '推進紀錄' && <div className={panel}>{selected.statusHistory.map((h, i) => <p key={i} className="border-b py-3 text-sm">{date(h.changedAt)}　{STATUS[h.from]?.[0] || '建立'} → {STATUS[h.to]?.[0]}　<span className="text-slate-500">{h.event}</span></p>)}</div>}
      {tab === '目標歷程' && <div className={panel}>{selected.goalHistory.map(h => <p key={h.version}>V{h.version}　{h.goal}　<span className="text-sm text-slate-500">{date(h.changedAt)}</span></p>)}</div>}
      {tab === 'Google Drive' && <div className={panel}><h3 className="font-semibold">Google Drive</h3><p className="mt-2 text-slate-500">尚未建立測試資料夾；目前僅記錄成果 metadata，無 Drive 檔案。</p></div>}
      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5"><p className="mb-3 text-sm text-blue-900">Pilot 試跑：每按一次執行下一個隔離測試事件。模擬使用者選擇只作用於 TEST 專案。</p><button disabled={busy || !SCENARIOS[selected.testCode]?.[selected.pilotEvents?.length || 0]} onClick={() => nextStep(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{SCENARIOS[selected.testCode]?.[selected.pilotEvents?.length || 0]?.[2] || '本案試跑步驟完成'}</button><p className="mt-2 text-xs text-slate-500">完成條件：{selected.criteriaMet.length}/{selected.successCriteria.length}；單一成果不會自動結案。</p></div>
    </>}
  </div>
}
