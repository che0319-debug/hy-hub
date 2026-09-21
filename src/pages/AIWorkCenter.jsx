import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bot, CheckCircle2, ExternalLink, FileText, Pencil, Plus, RefreshCw, Save, Send, Trash2, X } from 'lucide-react'
import { approveWorkspacePlan, archiveWorkspaceProject, createWorkspacePlanRevision, createWorkspaceProject, fetchWorkspace, requestWorkspacePlanAnalysis, saveWorkspacePlan } from '../lifeOSApi'

let workspaceCache = null

const WORK_STATUS = {
  queued: '等待執行', running: '執行中', needs_clarification: '等待 HY',
  review: '等待驗收', awaiting_review: '等待驗收', succeeded: '等待驗收',
}

function planMarkdown(project) {
  const plan = project.projectPlan || {}
  if (plan.contentMarkdown) return plan.contentMarkdown
  const scope = typeof plan.scope === 'string' ? plan.scope : JSON.stringify(plan.scope || {}, null, 2)
  const milestones = (plan.milestones || []).map(item => [
    `## ${item.id}｜${item.title}`, '', '### Deliverables',
    ...(item.deliverables || []).map(row => `- ${row.name || row.type || String(row)}`),
    '', '### 驗收條件',
    ...(item.acceptanceCriteria || []).map(row => `- ${typeof row === 'string' ? row : row.name || JSON.stringify(row)}`),
  ].join('\n')).join('\n\n')
  return `# ${project.title}\n\n## 專案目的\n${plan.objective || ''}\n\n## Scope\n${scope}\n\n## 執行策略\n${plan.executionStrategy || ''}\n\n# Milestones\n\n${milestones}`
}

function MarkdownPreview({ value }) {
  return <div className="space-y-2 text-slate-700">{String(value || '').split('\n').map((line, index) => {
    if (line.startsWith('# ')) return <h1 key={index} className="mb-4 mt-7 text-2xl font-bold text-slate-900">{line.slice(2)}</h1>
    if (line.startsWith('## ')) return <h2 key={index} className="mb-2 mt-6 border-b pb-2 text-lg font-semibold text-slate-900">{line.slice(3)}</h2>
    if (line.startsWith('### ')) return <h3 key={index} className="mt-4 font-semibold text-slate-800">{line.slice(4)}</h3>
    if (line.startsWith('- ')) return <div key={index} className="ml-5 list-item">{line.slice(2)}</div>
    if (!line.trim()) return <div key={index} className="h-2" />
    return <p key={index} className="whitespace-pre-wrap leading-7">{line}</p>
  })}</div>
}

function statusMeta(project) {
  if (project.workspaceStatus === 'completed') return ['完成', 'bg-slate-100 text-slate-700']
  if (project.projectPlan?.approvalStatus !== 'approved') return ['規劃中', 'bg-amber-50 text-amber-700']
  return ['進行中', 'bg-blue-50 text-blue-700']
}

export default function AIWorkCenter() {
  const [projects, setProjects] = useState(workspaceCache || [])
  const [workItems, setWorkItems] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [tab, setTab] = useState('overview')
  const [mode, setMode] = useState('preview')
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState('')
  const [clarification, setClarification] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newObjective, setNewObjective] = useState('')

  async function load() {
    setBusy(true); setError('')
    try {
      const data = await fetchWorkspace()
      workspaceCache = data.projects || []
      setProjects(workspaceCache)
      setWorkItems(data.workItems || [])
    }
    catch (err) { setError(err.message || '工作區讀取失敗') }
    finally { setBusy(false) }
  }
  useEffect(() => { load() }, [])
  const selected = useMemo(() => projects.find(item => item.id === selectedId), [projects, selectedId])
  function openProject(project) { setSelectedId(project.id); setTab('overview'); setMode('preview'); setDraft(planMarkdown(project)); setNotice('') }
  function back() { setSelectedId(''); setTab('overview'); setMode('preview'); setNotice('') }

  async function saveDraft() {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      const approved = selected.projectPlan?.approvalStatus === 'approved'
      const payload = { contentMarkdown: draft, changeReason: '使用者直接修改專案規劃書' }
      if (approved) await createWorkspacePlanRevision(selected.id, payload)
      else await saveWorkspacePlan(selected.id, payload)
      await load(); setNotice(approved ? '已建立下一版規劃書草稿。' : '規劃書草稿已儲存。'); setMode('preview')
    } catch (err) { setError(err.message || '規劃書儲存失敗') }
    finally { setBusy(false) }
  }

  async function approvePlan() {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try { await approveWorkspacePlan(selected.id); await load(); setNotice('規劃書已核准，專案可依 Milestone 執行。') }
    catch (err) { setError(err.message || '規劃書核准失敗') }
    finally { setBusy(false) }
  }

  async function addProject() {
    const title = newTitle.trim(), objective = newObjective.trim()
    if (!title) return
    const contentMarkdown = `# ${title}\n\n## 目的\n${objective || '請描述這個專案希望完成什麼。'}\n\n## 限制\n請填寫時間、預算、範圍或不希望執行的事項。\n\n## 階段規劃\n請用自然語言描述預計分成哪些階段，不需要固定格式。\n\n## 產出\n請描述最後希望取得的文件、簡報、程式、數據、圖片或其他可開啟成果。`
    setBusy(true); setError('')
    try {
      const result = await createWorkspaceProject({ title, objective, contentMarkdown, milestones: [] })
      setCreating(false); setNewTitle(''); setNewObjective(''); await load()
      if (result.project) openProject(result.project)
    } catch (err) { setError(err.message || '新增專案失敗') }
    finally { setBusy(false) }
  }

  async function removeProject(event, project) {
    event.stopPropagation()
    if (!window.confirm(`確定刪除「${project.title}」？專案會封存，成果與歷史紀錄仍保留。`)) return
    setBusy(true); setError('')
    try { await archiveWorkspaceProject(project.id); await load() }
    catch (err) { setError(err.message || '刪除專案失敗') }
    finally { setBusy(false) }
  }

  async function analyzePlan() {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try { await requestWorkspacePlanAnalysis(selected.id); await load(); setNotice('已送交 GPT 解析，將由每小時 20 分的巡航接手。') }
    catch (err) { setError(err.message || '送交 AI 解析失敗') }
    finally { setBusy(false) }
  }

  async function confirmAnalysis() {
    const analysis = selected?.planAnalysis?.candidate
    if (!analysis?.milestones?.length || analysis.needsClarification) return
    setBusy(true); setError(''); setNotice('')
    try {
      await saveWorkspacePlan(selected.id, { contentMarkdown: draft, objective: analysis.objective || '', scope: { constraints: analysis.constraints || [] }, milestones: analysis.milestones })
      const result = await approveWorkspacePlan(selected.id)
      await load(); setNotice(`規劃書已核准，${result.item?.title || 'M1'} 已加入 queued，等待下一次 GPT 巡航。`); setTab('overview')
    } catch (err) { setError(err.message || '確認並啟動失敗') }
    finally { setBusy(false) }
  }

  async function submitClarification() {
    if (!selected || !clarification.trim()) return
    const contentMarkdown = `${draft.trim()}\n\n## 補充資訊\n${clarification.trim()}`
    setBusy(true); setError(''); setNotice('')
    try {
      await saveWorkspacePlan(selected.id, { contentMarkdown })
      setDraft(contentMarkdown); setClarification('')
      await requestWorkspacePlanAnalysis(selected.id)
      await load(); setNotice('補充資訊已加入規劃書，等待下一次 GPT 巡航重新解析。')
    } catch (err) { setError(err.message || '補充資訊送出失敗') }
    finally { setBusy(false) }
  }

  if (!selected) return <div className="mx-auto max-w-7xl">
    <div className="mb-8 flex items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">工作區</h1><p className="mt-2 text-slate-500">長期 Project 的規劃、成果與下一步。</p></div><div className="flex gap-2"><button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"><Plus size={16}/>新增專案</button><button onClick={load} disabled={busy} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={16} className={busy ? 'animate-spin' : ''}/>同步</button></div></div>
    {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
    {!!workItems.length && <section className="mb-6 overflow-hidden rounded-2xl border bg-white">
      <div className="border-b bg-slate-50 px-6 py-3"><h2 className="font-semibold text-slate-800">工作</h2></div>
      {workItems.map(item => <article key={item.id} className="grid w-full gap-3 border-b px-6 py-5 text-left last:border-0 md:grid-cols-[2fr_140px_160px_2fr] md:items-center md:gap-5">
        <div><b className="text-slate-900">{item.title}</b><p className="mt-1 text-xs text-slate-400">{item.id}</p></div>
        <span className="text-sm text-slate-600">{WORK_STATUS[item.status] || item.status}</span>
        <span className="flex items-center gap-2 text-sm text-slate-600"><Bot size={15}/>{item.payload?.requestedAgent?.name || (item.owner === 'hy' ? 'HY' : item.owner)} Bot</span>
        <span className="text-sm text-slate-600">{item.latestProgress || item.execution?.current_activity || '等待 Bot 更新進度'}</span>
      </article>)}
    </section>}
    <div className="overflow-hidden rounded-2xl border bg-white">
      <div className="hidden grid-cols-[2fr_140px_2fr_2fr] gap-5 border-b bg-slate-50 px-6 py-3 text-xs font-semibold text-slate-500 md:grid"><span>專案名稱</span><span>狀態</span><span>最新成果</span><span>下一步</span></div>
      {projects.map(project => { const [status, cls] = statusMeta(project); const deliverable = (project.latestDeliverables || [])[0]; const milestone = (project.projectPlan?.milestones || []).find(row => row.id === project.currentMilestoneId); return <button key={project.id} onClick={() => openProject(project)} className="group relative grid w-full gap-3 border-b px-6 py-5 pr-14 text-left last:border-0 hover:bg-blue-50/40 md:grid-cols-[2fr_140px_2fr_2fr] md:items-center md:gap-5"><div><b className="text-slate-900">{project.title}</b><p className="mt-1 text-xs text-slate-400">Plan v{project.projectPlan?.version || '1.0'}</p></div><span><i className={`rounded-full px-3 py-1 text-xs not-italic ${cls}`}>{status}</i></span><span className="text-sm text-slate-600">{deliverable ? deliverable.name || '開啟成果' : '尚無成果'}</span><span className="text-sm text-slate-600">{project.projectPlan?.approvalStatus !== 'approved' ? '檢視並核准規劃書' : milestone ? `執行 ${milestone.id} ${milestone.title}` : '等待下一步'}</span><span role="button" aria-label={`刪除 ${project.title}`} onClick={event => removeProject(event, project)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={17}/></span></button> })}
      {!projects.length && <div className="p-14 text-center"><FileText className="mx-auto text-slate-300"/><h2 className="mt-3 font-semibold text-slate-700">目前沒有正式 Project</h2><p className="mt-1 text-sm text-slate-400">長期工作確認後，第一步會先建立專案規劃書。</p></div>}
    </div>
    {creating && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">新增專案</h2><button onClick={() => setCreating(false)} className="p-2 text-slate-400"><X size={18}/></button></div><label className="mt-5 block text-sm font-medium">專案名稱</label><input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} className="mt-2 w-full rounded-lg border p-3" placeholder="例如：HY Life OS 工作區 V1"/><label className="mt-4 block text-sm font-medium">專案目的</label><textarea value={newObjective} onChange={e => setNewObjective(e.target.value)} className="mt-2 min-h-24 w-full rounded-lg border p-3" placeholder="簡短說明希望完成什麼；建立後可在規劃書完整修改。"/><div className="mt-5 flex justify-end gap-2"><button onClick={() => setCreating(false)} className="rounded-lg border px-4 py-2 text-sm">取消</button><button onClick={addProject} disabled={!newTitle.trim() || busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40">建立並編輯規劃書</button></div></div></div>}
  </div>

  const plan = selected.projectPlan || {}
  const milestones = plan.milestones || []
  const current = milestones.find(row => row.id === selected.currentMilestoneId)
  const deliverable = (selected.latestDeliverables || [])[0]
  return <div className="mx-auto max-w-5xl">
    <button onClick={back} className="mb-5 flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16}/>返回工作區</button>
    <h1 className="text-3xl font-bold text-slate-900">{selected.title}</h1><p className="mt-2 text-sm text-slate-500">Plan v{plan.version || '1.0'} · {plan.approvalStatus === 'approved' ? '已核准' : '草稿／等待核准'}</p>
    <div className="mt-7 flex gap-7 border-b"><button onClick={() => setTab('overview')} className={`pb-3 text-sm font-medium ${tab === 'overview' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}>專案總覽</button><button onClick={() => setTab('plan')} className={`pb-3 text-sm font-medium ${tab === 'plan' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500'}`}>專案規劃書</button></div>
    {error && <div className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}{notice && <div className="mt-5 rounded-lg bg-emerald-50 p-3 text-emerald-700">{notice}</div>}
    {tab === 'overview' ? <div className="mt-6 space-y-5">
      <section className="rounded-2xl border bg-white p-6"><h2 className="font-semibold text-slate-900">目前進度</h2><div className="mt-4 space-y-2">{milestones.map(item => <div key={item.id} className={`rounded-xl border p-4 ${item.id === selected.currentMilestoneId ? 'border-blue-400 bg-blue-50/40' : 'bg-white'}`}><div className="flex justify-between gap-3"><b>{item.id}　{item.title}</b><span className="text-xs text-slate-500">{item.status === 'completed' ? '✓ 完成' : item.id === selected.currentMilestoneId ? '目前' : '待執行'}</span></div></div>)}</div><p className="mt-5 text-sm text-slate-600"><b>目前正在做：</b>{current ? `${current.id} ${current.title}` : plan.approvalStatus === 'approved' ? '等待下一階段' : '等待規劃書核准'}</p><p className="mt-2 text-sm text-slate-600"><b>下一步：</b>{plan.approvalStatus === 'approved' ? '依規劃書產出可開啟成果' : '檢視並核准規劃書'}</p></section>
      <section className="rounded-2xl border bg-white p-6"><h2 className="font-semibold text-slate-900">最新成果</h2>{deliverable ? <a href={deliverable.url || deliverable.uri} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 text-blue-700"><ExternalLink size={16}/>{deliverable.name || '開啟成果'}</a> : <p className="mt-3 text-sm text-slate-400">尚未產生可開啟 Deliverable。</p>}</section>
      <section className="rounded-2xl border bg-white p-6"><h2 className="font-semibold text-slate-900">我的意見／指示</h2><textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="輸入對本 Milestone 或成果的修改要求" className="mt-4 min-h-28 w-full rounded-xl border p-3 text-sm"/><button disabled={!feedback.trim()} className="mt-3 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40"><Send size={15}/>送出意見</button></section>
    </div> : <div className="mt-6 rounded-2xl border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><b>專案規劃書 v{plan.version || '1.0'}</b><span className="ml-3 text-xs text-slate-400">{plan.approvalStatus === 'approved' ? '已核准' : '草稿'}</span></div><div className="flex gap-2"><button onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Pencil size={15}/>{mode === 'edit' ? '預覽' : '編輯'}</button>{mode === 'edit' && <button onClick={saveDraft} disabled={busy} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"><Save size={15}/>儲存草稿</button>}{plan.approvalStatus !== 'approved' && mode !== 'edit' && !selected.planAnalysis?.candidate && <button onClick={analyzePlan} disabled={busy || ['queued','claimed','running','in_progress'].includes(selected.planAnalysis?.status)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">AI 解析規劃書</button>}</div></div>
      <div className="p-6">{mode === 'edit' ? <textarea value={draft} onChange={e => setDraft(e.target.value)} spellCheck="false" className="min-h-[620px] w-full resize-y rounded-xl border bg-slate-950 p-5 font-mono text-sm leading-7 text-slate-100 outline-none focus:border-blue-500"/> : <MarkdownPreview value={draft}/>}</div>
      {selected.planAnalysis && <div className="border-t bg-slate-50 p-6"><h3 className="font-semibold text-slate-900">AI 解析結果</h3>{['queued','claimed','running','in_progress'].includes(selected.planAnalysis.status) && <p className="mt-2 text-sm text-blue-700">等待 GPT 巡航解析中；巡航為每小時 20 分。</p>}{selected.planAnalysis.candidate && <div className="mt-4 space-y-3">{selected.planAnalysis.candidate.needsClarification && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>下一步：請補充以下資訊</b><ul className="mt-2 list-disc space-y-1 pl-5">{(selected.planAnalysis.candidate.questions || []).map((question, index) => <li key={index}>{question}</li>)}</ul><textarea value={clarification} onChange={event => setClarification(event.target.value)} className="mt-4 min-h-28 w-full rounded-lg border border-amber-200 bg-white p-3 text-slate-800" placeholder="直接回答上面的問題；答案會加入規劃書，再交給 GPT 重新解析。"/><button onClick={submitClarification} disabled={busy || !clarification.trim()} className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-40">送出補充並重新解析</button></div>}{(selected.planAnalysis.candidate.milestones || []).map(item => <div key={item.id} className="rounded-xl border bg-white p-4"><b>{item.id}　{item.title}</b><p className="mt-2 text-xs text-slate-500">成果：{(item.deliverables || []).map(row => row.name || String(row)).join('、')}</p><p className="mt-1 text-xs text-slate-500">驗收：{(item.acceptanceCriteria || []).map(row => typeof row === 'string' ? row : row.name).join('、')}</p></div>)}{!selected.planAnalysis.candidate.needsClarification && <button onClick={confirmAnalysis} disabled={busy} className="mt-2 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"><CheckCircle2 size={15}/>確認 Milestones 並核准啟動</button>}</div>}</div>}
    </div>}
  </div>
}
