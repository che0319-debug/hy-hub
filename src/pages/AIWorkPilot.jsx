import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Plus, ExternalLink, Search, Check, Clock3, Folder, GitBranch } from 'lucide-react'
import './ai-work-pilot.css'
import { fetchAIWorkPilot, createAIWorkPilotProject, sendAIWorkPilotEvent } from '../lifeOSApi'

const STATUS = {
  ai_pending: ['待 AI 處理', 'bg-violet-50 text-violet-700'],
  ai_running: ['進行中', 'bg-blue-50 text-blue-700'],
  confirmation: ['等待確認', 'bg-amber-50 text-amber-700'],
  completed: ['完成', 'bg-emerald-50 text-emerald-700'],
}
const DRIVE = {
  'TEST-01': { folder: '1vuTLtkyUnDdNUgQDj59WYXRY9RktKmie', files: { '中秋小旅行方案 V1': '1WfkQuwypXYmoholNJtMpCckat4kAVJwE', '中秋台中詳細行程 V1': '1TtNoK5YzMpk0N5asaAN_PDPMuEC7IUhn' } },
  'TEST-02': { folder: '1vVi7U8HrJ9NZmt-W4YBFOSjV5W2RsJAJ', files: { '競品與價格帶分析 V1': '1BNZGO67HJraxKoDgNjKYyIj46IUVrFEF', '成本與毛利模型 V1': '1mxkqjkkhFAGcw4oOKrI0TKAbCqYRj8l1' } },
  'TEST-03': { folder: '1GOPkyapZn7z6SUflMMlbef1ZWk5T_4vC', files: { 'PPT AI Tool 需求與系統架構 V1': '1KA4PQMDz0MTrmYt9pG_HT3MDrqbIY1Qq', 'PPT AI Tool MVP Prototype V1': '1gqThSYEuQay-gj0bamJadOxzFNjasaBc' } },
}
const fileUrl = (p, a) => a.url || (a.driveFileId || DRIVE[p.testCode]?.files?.[a.title] ? `https://drive.google.com/file/d/${a.driveFileId || DRIVE[p.testCode]?.files?.[a.title]}/view` : null)
const folderUrl = p => p.driveFolderId || DRIVE[p.testCode]?.folder ? `https://drive.google.com/drive/folders/${p.driveFolderId || DRIVE[p.testCode]?.folder}` : null
const BOTS = { family: '小因', sam: 'Sam', '950157': '950157', hy: 'HY' }
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
const artifacts = p => p.artifacts.length ? p.artifacts.slice().reverse().map(a => <div key={a.artifactId} className="pilot-artifact"><span className="pilot-file-icon">▤</span><span className="pilot-artifact-name">{a.title}<small>{a.summary}</small></span>{fileUrl(p, a) ? <a className="pilot-open" href={fileUrl(p, a)} target="_blank" rel="noopener noreferrer">開啟 <ExternalLink size={14}/></a> : <span>待上傳</span>}</div>) : <p>尚無成果</p>
const panel = 'rounded-2xl border border-slate-200 bg-white px-6 py-5'

export default function AIWorkPilot() {
  const [projects, setProjects] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [tab, setTab] = useState('目標')
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const [goalReason, setGoalReason] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [summaryDraft, setSummaryDraft] = useState('')
  const [editingSummary, setEditingSummary] = useState(false)
  const [referenceTitle, setReferenceTitle] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [editingReport, setEditingReport] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reportDraft, setReportDraft] = useState('')
  const [filter, setFilter] = useState('全部')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newProject, setNewProject] = useState({ title: '', goal: '', responsibleBot: 'hy' })
  const [newCriteria, setNewCriteria] = useState('')
  const [error, setError] = useState('')
  const selected = projects.find(p => p.id === selectedId)
  const counts = useMemo(() => Object.fromEntries(Object.keys(STATUS).map(k => [k, projects.filter(p => p.workspaceStatus === k).length])), [projects])
  const visible = projects.filter(p => (filter === '全部' || STATUS[p.workspaceStatus]?.[0] === filter) && `${p.title} ${p.goal}`.toLowerCase().includes(query.toLowerCase()))
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
  const tabs = ['目標', '開發規格與進度', '開發日誌', '成果', '參考資料']
  const report = selected?.developmentReport
  const eventLabel = { claim: 'AI 接手', artifact: '新增成果', criterion: '驗證完成條件', progress: '更新進展', checkpoint: '等待使用者決策', resume: '依決策繼續', complete: '目標完成' }
  return <div className="pilot-page text-slate-800">
    <div className="pilot-heading mb-7 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold">AI Work Test</h1><p className="mt-1 text-sm text-slate-500">隔離 Pilot · 三個 TEST 專案 · 不影響正式工作區</p></div><button onClick={() => run(refresh)} disabled={busy} aria-label="重新整理" className="rounded-xl border bg-white p-3"><RefreshCw size={18}/></button></div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {!selected ? <>
      <div className="pilot-stats grid gap-4 md:grid-cols-5">{[['ai_running', '進行中'], ['confirmation', '等待確認'], ['completed', '已完成'], ['all', '全部專案']].map(([key, title]) => <div key={key} className="pilot-stat"><span className={`pilot-stat-icon ${key}`}>{key === 'ai_running' ? <GitBranch size={20}/> : key === 'confirmation' ? <Clock3 size={20}/> : key === 'completed' ? <Check size={20}/> : <Folder size={20}/>}</span><div><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-semibold">{key === 'all' ? projects.length : counts[key]}</p></div></div>)}<button onClick={() => setShowCreate(true)} disabled={busy} className="pilot-create rounded-2xl bg-blue-600 px-4 py-5 text-white"><Plus className="mr-2 inline" size={18}/>新增 AI Work Test</button></div>
      {showCreate && <form className={`${panel} pilot-card mb-5 grid gap-3`} onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { const result = await createAIWorkPilotProject({ ...newProject, successCriteria: newCriteria.split('\n').map(s => s.trim()).filter(Boolean) }); await refresh(); setSelectedId(result.project.id); setTab('目標'); setShowCreate(false); setNewProject({ title: '', goal: '', responsibleBot: 'hy' }); setNewCriteria('') } catch (err) { setError(err.message || '建立失敗') } finally { setBusy(false) } }}><h3>新增隔離 TEST 專案</h3><input required minLength={2} maxLength={120} className="pilot-field" placeholder="專案名稱" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })}/><textarea required minLength={5} maxLength={3000} className="pilot-field" placeholder="目標" value={newProject.goal} onChange={e => setNewProject({ ...newProject, goal: e.target.value })}/><textarea required className="pilot-field" placeholder="完成條件（每行一項）" value={newCriteria} onChange={e => setNewCriteria(e.target.value)}/><label>負責 Bot　<select className="pilot-field" value={newProject.responsibleBot} onChange={e => setNewProject({ ...newProject, responsibleBot: e.target.value })}>{Object.entries(BOTS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><p className="pilot-muted">新案僅存於 AI Work Test；Drive 資料夾需另行建立。</p><div className="flex gap-3"><button className="pilot-primary" disabled={busy}>建立 TEST 專案</button><button type="button" onClick={() => setShowCreate(false)}>取消</button></div></form>}
      <div className="pilot-tools"><div className="pilot-filters my-7 flex gap-2 border-b">{['全部', '進行中', '等待確認', '完成'].map(name => <button key={name} onClick={() => setFilter(name)} className={`px-4 py-3 text-sm ${filter === name ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-slate-500'}`}>{name}</button>)}</div><label className="pilot-search"><Search size={18}/><input placeholder="搜尋專案..." value={query} onChange={e => setQuery(e.target.value)}/></label></div>
      <div className="pilot-list overflow-x-auto rounded-2xl border bg-white"><div className="min-w-[980px]"><div className="pilot-columns grid grid-cols-[2fr_110px_120px_1.4fr_1.4fr_100px] gap-4 border-b bg-slate-50 px-6 py-4 text-sm text-slate-500"><span>專案名稱 / 目標</span><span>負責 Bot</span><span>狀態</span><span>目前狀況</span><span>下一步</span><span>更新時間</span></div>{visible.map(p => <button key={p.id} onClick={() => { setSelectedId(p.id); setTab('目標'); setEditingGoal(false); setGoalDraft(p.goal) }} className="pilot-row grid w-full grid-cols-[2fr_110px_120px_1.4fr_1.4fr_100px] items-center gap-4 border-b px-6 py-5 text-left last:border-0 hover:bg-blue-50/40"><span className="pilot-project"><span className={`pilot-thumb thumb-${p.testCode}`} aria-hidden="true">{p.testCode === 'TEST-01' ? '🏞' : p.testCode === 'TEST-02' ? '🍰' : '✦'}</span><span><b>{p.title.replace('TEST｜AI Work V2｜', '')}</b><small className="mt-1 block line-clamp-2 text-slate-500">{p.goal}</small></span></span><span className="pilot-bot"><i>{p.responsibleBot === 'family' ? '🌸' : p.responsibleBot === 'sam' ? 'S' : '95'}</i>{BOTS[p.responsibleBot]}</span><span>{badge(p)}</span><span className="text-sm">{p.currentState}</span><span className="text-sm">{p.nextAction}</span><span className="text-xs text-slate-500">{date(p.updatedAt)}</span></button>)}</div></div>
    </> : <>
      <button onClick={() => setSelectedId('')} className="mb-5 flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16}/>返回 AI Work Test</button>
      <div className="pilot-inner-head flex flex-wrap items-center justify-between gap-3"><h2 className="text-3xl font-semibold">{selected.title}</h2><div className="flex items-center gap-3">{BOTS[selected.responsibleBot]} · {badge(selected)}</div></div>
      <div className="pilot-tabs my-6 flex flex-wrap gap-8 border-b">{tabs.map(name => <button key={name} onClick={() => setTab(name)} className={`pb-3 ${tab === name ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}>{name}</button>)}</div>
      {tab === '目標' && <div className="pilot-overview space-y-5">
        <section className={`${panel} pilot-card`}><div className="pilot-card-head"><h3 className="text-xl font-semibold">目標 Goal</h3>{!editingGoal && <button className="pilot-action" onClick={() => { setGoalDraft(selected.goal); setGoalReason(''); setEditingGoal(true) }}>編輯目標</button>}</div>
          {editingGoal ? <div className="pilot-editor"><textarea value={goalDraft} onChange={e => setGoalDraft(e.target.value)} aria-label="編輯 Goal" rows={4}/><input value={goalReason} onChange={e => setGoalReason(e.target.value)} placeholder="這次修改的原因（可選）"/><div><button disabled={busy || goalDraft.trim().length < 5} onClick={async () => { await run(() => sendAIWorkPilotEvent(selected.id, 'goal_edit', { actor: 'user', expectedVersion: selected.goalVersion, goal: goalDraft, reason: goalReason })); setEditingGoal(false) }} className="pilot-primary">儲存新版本</button><button className="pilot-action" onClick={() => setEditingGoal(false)}>取消</button></div></div> : <p>{selected.goal}</p>}
          <p className="pilot-version">Goal V{selected.goalVersion} · 只有你儲存後才正式改版；Bot 註記不會覆寫 Goal。</p>
          <details className="pilot-versions"><summary>查看 Goal 版本紀錄（{selected.goalHistory.length}）</summary>{selected.goalHistory.slice().reverse().map(h => <div key={h.version}><b>V{h.version}</b> · {date(h.changedAt)} · {h.reason || '建立目標'}<p>{h.goal}</p></div>)}</details>
        </section>
        <section className={`${panel} pilot-card`}><h3 className="text-xl font-semibold">Bot 晨會標註</h3><p className="pilot-muted">對話自動擷取仍待串接；以下註記會標示來源與時間。</p>
          {(selected.goalNotes || []).filter(n => n.actor === 'bot').length ? selected.goalNotes.filter(n => n.actor === 'bot').slice().reverse().map(n => <div className="pilot-note" key={n.id}><b>{BOTS[selected.responsibleBot]} · Bot 註記</b><small>{date(n.createdAt)}{n.source ? ` · ${n.source}` : ''}</small><p>{n.content}</p></div>) : <p className="pilot-muted">目前沒有 Bot 標註。</p>}
        </section>
        <section className={`${panel} pilot-card`}><h3 className="text-xl font-semibold">我的建議</h3>
          {(selected.goalNotes || []).filter(n => n.actor === 'user').slice().reverse().map(n => <div className="pilot-note" key={n.id}><small>{date(n.createdAt)}</small><p>{n.content}</p></div>)}
          <textarea className="pilot-note-input" rows={3} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="輸入你對目標或執行方向的建議…" aria-label="輸入目標建議"/><button disabled={busy || !noteDraft.trim()} className="pilot-primary" onClick={async () => { await run(() => sendAIWorkPilotEvent(selected.id, 'note_add', { actor: 'user', content: noteDraft })); setNoteDraft('') }}>送出建議</button>
        </section>
      </div>}
      {tab === '成果' && <section className={`${panel} pilot-card`}><h3>成果</h3><div className="pilot-result-summary"><div className="pilot-card-head"><h4>目前成果小結</h4><button className="pilot-action" onClick={() => { setSummaryDraft(selected.resultSummary || ''); setEditingSummary(true) }}>編輯小結</button></div>{editingSummary ? <><textarea className="pilot-field" rows={6} value={summaryDraft} onChange={e => setSummaryDraft(e.target.value)} placeholder="根據實際成果寫出關鍵發現、交付內容、品質與限制；不要報檔案數或狀態。"/><button disabled={busy} className="pilot-primary" onClick={async () => { await run(() => sendAIWorkPilotEvent(selected.id, 'result_summary_update', { actor: 'user', summary: summaryDraft })); setEditingSummary(false) }}>儲存小結</button></> : <p>{selected.resultSummary || '尚未撰寫成果內容小結；請先核對實際檔案後補上。'}</p>}</div>{folderUrl(selected) && <a className="pilot-folder" target="_blank" rel="noopener noreferrer" href={folderUrl(selected)}><Folder size={20}/>開啟 Drive 資料夾 <ExternalLink size={16}/></a>}{artifacts(selected)}</section>}
      {tab === '參考資料' && <section className={`${panel} pilot-card`}><h3>參考資料</h3><p className="pilot-muted">放需求、範例、照片與來源文件，與交付成果分開。</p>{(selected.referenceMaterials || []).map(item => <p key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer" className="pilot-open">{item.title} <ExternalLink size={14}/></a></p>)}{!(selected.referenceMaterials || []).length && <p>尚未加入參考資料。</p>}<div className="grid gap-3 mt-5"><input className="pilot-field" placeholder="資料名稱" value={referenceTitle} onChange={e => setReferenceTitle(e.target.value)}/><input className="pilot-field" type="url" placeholder="https://…" value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)}/><button className="pilot-primary" disabled={busy || !referenceTitle.trim() || !referenceUrl.startsWith('https://')} onClick={async () => { await run(() => sendAIWorkPilotEvent(selected.id, 'reference_add', { actor: 'user', title: referenceTitle, url: referenceUrl })); setReferenceTitle(''); setReferenceUrl('') }}>新增參考資料</button></div></section>}
      {tab === '開發規格與進度' && <div className="pilot-overview"><section className={`${panel} pilot-card`}>
        {!report ? <><h3>開發規格與進度</h3><p className="pilot-muted">先用 PPT 開發程式建立一份可編輯的 TEST 範本，記錄規格、進度與版本。</p>{selected.testCode === 'TEST-03' && <button className="pilot-primary" disabled={busy} onClick={() => run(() => sendAIWorkPilotEvent(selected.id, 'report_seed', {}))}>建立 TEST 開發範本</button>}</> : <>
          <div className="pilot-card-head"><h3>{report.title}</h3><span className="pilot-version">V{report.version} · 更新 {date(report.updatedAt)}</span></div><p className="pilot-muted">隔離試跑範本：內容描述目前驗證過的部分，未完成事項仍需實際執行。</p>
          <div className="pilot-document-actions"><button className="pilot-action" onClick={async () => { await navigator.clipboard.writeText(report.document); setCopied(true) }}>{copied ? '已複製' : '複製全文'}</button><button className="pilot-action" onClick={() => { setReportDraft(report.document); setEditingReport(true); setCopied(false) }}>編輯全文</button>{selected.testCode === 'TEST-03' && <button className="pilot-action" disabled={busy} onClick={() => { if (window.confirm('將以詳細 TEST 範本取代目前規劃書內容並建立新版本，確定繼續？')) run(() => sendAIWorkPilotEvent(selected.id, 'report_template_upgrade', { actor: 'user', expectedVersion: report.version })) }}>套用詳細 TEST 規劃範本</button>}</div>
          {editingReport ? <div className="pilot-editor"><textarea className="pilot-document-editor" value={reportDraft} onChange={e => setReportDraft(e.target.value)} rows={24} aria-label="編輯完整工作規劃書"/><div><button disabled={busy || !reportDraft.trim()} className="pilot-primary" onClick={async () => { await run(() => sendAIWorkPilotEvent(selected.id, 'report_update', { actor: 'user', expectedVersion: report.version, field: 'document', value: reportDraft, reason: '編輯整份工作規劃書' })); setEditingReport(false) }}>儲存新版本</button><button className="pilot-action" onClick={() => setEditingReport(false)}>取消</button></div></div> : <pre className="pilot-document">{report.document}</pre>}
          <details className="pilot-versions"><summary>版本更新紀錄（{report.history.length}）</summary>{report.history.slice().reverse().map(h => <p key={h.version}>V{h.version} · {date(h.changedAt)} · {h.reason}</p>)}</details>
        </>}
      </section></div>}
      {tab === '開發日誌' && <section className={`${panel} pilot-card`}><h3>開發日誌</h3><p className="pilot-muted">保留每次進展與決策；開發規格與進度頁顯示目前有效版本。</p>{[...(selected.developmentReport?.history || []).map(h => ({ label: `開發規格與進度 V${h.version} · ${h.reason}`, at: h.changedAt })), ...(selected.developmentLog || []).map(h => ({ label: h.label, at: h.changedAt })), ...(selected.pilotEvents || []).map(e => ({ label: `${eventLabel[e.event] || e.event}${e.detail ? ` · ${e.detail}` : ''}`, at: e.changedAt })), ...selected.statusHistory.map(h => ({ label: `狀態：${STATUS[h.from]?.[0] || '建立'} → ${STATUS[h.to]?.[0]}`, at: h.changedAt }))].sort((a,b) => (b.at || '').localeCompare(a.at || '')).map((entry, i) => <div className="pilot-log-row" key={i}><time>{date(entry.at)}</time><span>{entry.label}</span></div>)}</section>}
    </>}
  </div>
}
