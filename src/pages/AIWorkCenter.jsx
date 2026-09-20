import { useEffect, useMemo, useState } from 'react'
import { Bot, CheckCircle2, CircleAlert, Clock3, ExternalLink, FileText, FolderOpen, MessageSquare, RefreshCw, Send, ShieldCheck, Telescope, Trash2 } from 'lucide-react'
import { authHeaders } from '../auth'
import { actOnResearch, answerWorkClarification, approveWorkspacePlan, createDirectWorkItem, decideAutonomousPlan, dismissWorkItem, fetchResearchCenter, submitWorkFeedback } from '../lifeOSApi'
import { fetchDispatchSessions } from '../api'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const ACTIVE = new Set(['queued', 'running', 'claimed', 'in_progress'])
const DONE = new Set(['succeeded', 'completed', 'done'])
const OWNER_LABELS = { hy: 'HY', family: '小因', '950157': '950157', sam: 'Sam', codex: 'Codex' }
const ownerLabel = owner => OWNER_LABELS[owner] || owner || 'HY'
const itemTitle = item => item?.title || item?.name || item?.outcome || '未命名工作'
const cleanTitle = value => String(value || '未命名專案').replace(/｜依建議修訂.*$/, '')

function resultFor(results, item) {
  return results.find(result =>
    result.workItemId === item.id ||
    result.sourceWorkItemId === item.id ||
    result.id === item.resultId
  )
}

function statusMeta(project) {
  if (project.workspaceProject) {
    const formal = project.workspaceProject
    if (formal.workspaceStatus === 'completed') return { key: 'completed', text: '完成', cls: 'bg-slate-100 text-slate-700' }
    if (formal.projectPlan?.approvalStatus !== 'approved') return { key: 'waiting', text: '規劃中', cls: 'bg-amber-50 text-amber-700' }
    const latestStatus = project.latest?.status
    if (DONE.has(latestStatus)) return { key: 'review', text: '等我確認', cls: 'bg-emerald-50 text-emerald-700' }
    return { key: 'running', text: '進行中', cls: 'bg-blue-50 text-blue-700' }
  }
  if (project.research) {
    if (project.research.needsUserInput) return { key: 'waiting', text: '等我確認', cls: 'bg-amber-50 text-amber-700' }
    if (['ready_for_review', 'completed'].includes(project.research.researchStatus)) return { key: 'review', text: '等我確認', cls: 'bg-emerald-50 text-emerald-700' }
    return { key: 'running', text: '進行中', cls: 'bg-blue-50 text-blue-700' }
  }
  if (project.plan?.status === 'waiting_approval') return { key: 'waiting', text: '等你決定', cls: 'bg-red-50 text-red-700' }
  const status = project.latest?.status
  if (status === 'needs_clarification') return { key: 'waiting', text: '需要你補充', cls: 'bg-amber-50 text-amber-700' }
  if (ACTIVE.has(status)) return { key: 'running', text: status === 'queued' ? '等待 GPT 接手' : 'GPT 執行中', cls: 'bg-blue-50 text-blue-700' }
  if (DONE.has(status)) return { key: 'review', text: '待你驗收', cls: 'bg-emerald-50 text-emerald-700' }
  if (status === 'failed') return { key: 'risk', text: '需要注意', cls: 'bg-red-50 text-red-700' }
  return { key: 'paused', text: '暫停', cls: 'bg-slate-100 text-slate-600' }
}

function projectKey(item) {
  const payload = item?.payload || {}
  return payload.workspaceProjectId || payload.driveProject?.folderId || payload.projectId || item.taskId || item.id
}

export default function AIWorkCenter() {
  const [core, setCore] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState('')
  const [drafts, setDrafts] = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [feedbackStatus, setFeedbackStatus] = useState({})
  const [researchItems, setResearchItems] = useState([])

  async function load() {
    setError('')
    setRefreshing(true)
    try {
      const [response, sessions, research] = await Promise.all([
        fetch(`${API_BASE}/api/life-os/v1/context`, { headers: authHeaders(), cache: 'no-store' }),
        fetchDispatchSessions(),
        fetchResearchCenter({}),
      ])
      setResearchItems((research.items || []).filter(item => !['archived', 'stopped'].includes(item.researchStatus)))
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      let nextCore = await response.json()
      const existingByMilestone = new Map(
        (nextCore.workItems || []).filter(item => item?.payload?.milestoneId).map(item => [item.payload.milestoneId, item])
      )
      const pendingAssignments = sessions.filter(session => {
        if (session.status !== 'pending' || !session.milestoneId) return false
        const existing = existingByMilestone.get(session.milestoneId)
        return !existing || (existing.kind === 'direct-milestone-assignment' && existing.status === 'queued')
      })
      if (pendingAssignments.length) {
        await Promise.all(pendingAssignments.map(session => createDirectWorkItem({
          title: session.title, milestoneId: session.milestoneId, owner: session.assignee,
          sourceMilestone: session.sourceMilestone, projectName: session.sourceMilestone, desc: session.desc || '',
        })))
        const refreshed = await fetch(`${API_BASE}/api/life-os/v1/context`, { headers: authHeaders(), cache: 'no-store' })
        if (!refreshed.ok) throw new Error(`HTTP ${refreshed.status}`)
        nextCore = await refreshed.json()
      }
      setCore(nextCore)
    } catch (err) {
      setError(`AI 工作讀取失敗：${err.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const work = core?.workItems || []
  const plans = core?.autonomousPlans || []
  const results = core?.results || []
  const projects = useMemo(() => {
    const grouped = new Map()
    for (const item of work) {
      const key = projectKey(item)
      if (!grouped.has(key)) grouped.set(key, { key, items: [], owner: item.owner, title: cleanTitle(item.title) })
      const project = grouped.get(key)
      project.items.push(item)
      project.latest = item
      project.owner = item.owner || project.owner
      project.title = cleanTitle(item.title || project.title)
    }
    for (const formal of (core?.projects || []).filter(project => project?.projectPlan)) {
      const key = formal.id
      const existing = grouped.get(key) || { key, items: [], owner: formal.owner, title: cleanTitle(formal.title), latest: null }
      existing.workspaceProject = formal
      existing.owner = formal.owner || existing.owner
      existing.title = cleanTitle(formal.title || existing.title)
      grouped.set(key, existing)
    }
    for (const plan of plans.filter(plan => plan.status === 'waiting_approval')) {
      const key = `plan:${plan.id}`
      if (!grouped.has(key)) grouped.set(key, { key, items: [], owner: plan.owner, title: cleanTitle(plan.title), plan, latest: null })
    }
    for (const research of researchItems) {
      const key = `research:${research.id}`
      if (!grouped.has(key)) grouped.set(key, {
        key, items: [], owner: research.owner, title: cleanTitle(research.title),
        research, latest: { status: research.researchStatus, updatedAt: research.updatedAt || research.lastResearchRunAt },
      })
    }
    return [...grouped.values()].sort((a, b) => {
      const aWait = statusMeta(a).key === 'waiting' ? 1 : 0
      const bWait = statusMeta(b).key === 'waiting' ? 1 : 0
      if (aWait !== bWait) return bWait - aWait
      return String(b.latest?.updatedAt || b.plan?.updatedAt || '').localeCompare(String(a.latest?.updatedAt || a.plan?.updatedAt || ''))
    })
  }, [work, plans, researchItems, core?.projects])

  const visibleProjects = ownerFilter === 'all' ? projects : projects.filter(project => project.owner === ownerFilter)
  const waitingCount = projects.filter(project => statusMeta(project).key === 'waiting').length
  const runningCount = projects.filter(project => statusMeta(project).key === 'running').length
  const reviewCount = projects.filter(project => statusMeta(project).key === 'review').length
  const riskCount = projects.filter(project => statusMeta(project).key === 'risk').length
  const gptWorkConnected = Boolean(
    core?.gptWorkConnected ??
    core?.runtime?.gptWorkConnected ??
    work.some(item => Number(item?.attempt || 0) > 0 || item?.startedAt || item?.finishedAt)
  )

  function setDraft(id, value) { setDrafts(current => ({ ...current, [id]: value })) }

  async function decide(plan, decision) {
    setBusy(plan.id)
    try {
      const note = decision === 'reject' ? (window.prompt('可選填不採用原因，Bot 會用來改善下一次提案') || '') : ''
      await decideAutonomousPlan(plan.id, decision, note)
      await load()
    } catch (err) { setError(err.message || '決策寫入失敗') } finally { setBusy('') }
  }

  async function answer(item) {
    const value = (drafts[item.id] || '').trim()
    if (!value) return
    setBusy(item.id)
    try {
      await answerWorkClarification(item.id, value)
      setDraft(item.id, '')
      await load()
    } catch (err) { setError(err.message || '補充資料送出失敗') } finally { setBusy('') }
  }

  async function sendFeedback(item) {
    const key = `feedback:${item.id}`
    const value = (drafts[key] || '').trim()
    if (!value || busy) return
    setBusy(item.id)
    setFeedbackStatus(current => ({ ...current, [item.id]: { type: 'sending', text: '正在建立下一輪工作…' } }))
    try {
      const response = await submitWorkFeedback(item.id, value, `hy-work-feedback-${item.id}-${Date.now()}`)
      setDraft(key, '')
      setFeedbackStatus(current => ({ ...current, [item.id]: { type: 'success', text: `已送出修改建議：「${value}」；下一輪狀態：${response.item?.status === 'queued' ? '等待 AI 接手' : response.item?.status || '已送出'}` } }))
      await load()
    } catch (err) {
      const message = err.message || '修改建議送出失敗'
      setFeedbackStatus(current => ({ ...current, [item.id]: { type: 'error', text: message } }))
      setError(message)
    } finally { setBusy('') }
  }

  async function approveFormalPlan(project) {
    setBusy(project.id)
    try {
      await approveWorkspacePlan(project.id)
      await load()
    } catch (err) {
      setError(err.message || '規劃書核准失敗')
    } finally {
      setBusy('')
    }
  }

  async function updateResearch(project, action) {
    const item = project.research
    let note = ''
    if (action === 'direction') {
      note = window.prompt(item.needsUserInput ? (item.userQuestion || '請回答研究問題') : '請輸入新的研究方向或限制') || ''
      if (!note) return
    }
    setBusy(item.id)
    try {
      await actOnResearch(item.id, action, note)
      await load()
    } catch (err) {
      setError(err.message || '研究更新失敗')
    } finally {
      setBusy('')
    }
  }

  async function removeItem(item, mode = 'dismiss') {
    const message = mode === 'accept'
      ? `確認核准本次成果？專案與 Google Drive 檔案會保留，仍可繼續加入新功能。`
      : `確認移除這筆工作？Google Drive 專案檔案不會刪除。`
    if (!window.confirm(message)) return
    setBusy(item.id)
    try { await dismissWorkItem(item.id); await load() }
    catch (err) { setError(err.message || '移除工作失敗') }
    finally { setBusy('') }
  }

  function ProjectDetail({ project }) {
    const formal = project.workspaceProject
    if (formal) {
      const plan = formal.projectPlan || {}
      const milestones = plan.milestones || []
      return (
        <section className="mx-3 -mt-3 mb-3 rounded-b-2xl border-x border-b border-blue-200 bg-blue-50/50 p-5">
          <div className="rounded-xl bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-slate-700">專案規劃書 v{plan.version || '1.0'}</h3><p className="mt-1 text-xs text-slate-400">{plan.approvalStatus === 'approved' ? `已核准 · ${new Date(plan.approvedAt).toLocaleDateString('zh-TW')}` : '等待核准'}</p></div>{plan.approvalStatus !== 'approved' && <button disabled={busy === formal.id} onClick={() => approveFormalPlan(formal)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">核准並啟動專案</button>}</div><p className="mt-3 text-sm leading-6 text-slate-600">{plan.objective || '尚未填寫專案目的。'}</p></div>
          <div className="mt-5"><h3 className="text-sm font-semibold text-slate-700">目前進度</h3><div className="mt-3 space-y-2">{milestones.map(item => <div key={item.id} className={`rounded-lg border bg-white p-3 text-sm ${formal.currentMilestoneId === item.id ? 'border-blue-400' : 'border-slate-200'}`}><div className="flex items-center justify-between"><span>{item.id} {item.title}</span><span className="text-xs text-slate-400">{item.status === 'completed' ? '✓ 完成' : formal.currentMilestoneId === item.id ? '目前' : '待執行'}</span></div><p className="mt-1 text-xs text-slate-500">成果：{(item.deliverables || []).map(row => row.name || row.type || String(row)).join('、')}</p></div>)}</div></div>
          <div className="mt-5 rounded-xl bg-white p-4"><h3 className="text-sm font-semibold text-slate-700">最新成果</h3><p className="mt-2 text-sm text-slate-600">{project.latest ? '本 Milestone 已有執行紀錄；成果與 Feedback 顯示於下方工作輪次。' : plan.approvalStatus === 'approved' ? '尚未產生可開啟 Deliverable。' : '規劃書核准前禁止啟動 Milestone。'}</p></div>
          <div className="mt-5 rounded-xl bg-white p-4"><label className="text-sm font-medium text-slate-700">我的意見／指示</label><p className="mt-2 text-sm text-slate-500">規劃變更必須建立新版規劃書並重新核准；AI 不會直接修改已核准版本。</p></div>
        </section>
      )
    }
    if (project.research) {
      const research = project.research
      const synthesis = research.researchSynthesis || {}
      const sources = research.sources || []
      return (
        <section className="mx-3 -mt-3 mb-3 rounded-b-2xl border-x border-b border-blue-200 bg-blue-50/50 p-5">
          <div><h3 className="text-sm font-semibold text-slate-700">專案規劃書</h3><p className="mt-2 text-sm leading-6 text-slate-600">研究目的：{research.researchQuestion || research.title}</p><p className="mt-1 text-xs text-amber-700">既有 Bot 研究已映射進工作區；正式 Milestones 將在規劃書核准後建立。</p></div>
          <div className="mt-5"><h3 className="text-sm font-semibold text-slate-700">目前進度</h3><p className="mt-2 text-sm text-slate-600">{research.latestDirection || synthesis.currentAnswer || '正在累積研究證據。'}</p><p className="mt-1 text-xs text-slate-400">累積資料 {sources.length} 筆 · 進度 {Number(research.progress || 0)}%</p></div>
          <div className="mt-5 rounded-xl bg-white p-4"><h3 className="text-sm font-semibold text-slate-700">最新成果</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{synthesis.currentAnswer || '尚未形成可驗收 Deliverable；因此不會標示完成。'}</p>{!!sources.length && <div className="mt-3 space-y-2">{sources.slice(0, 5).map(source => <a key={source.id || source.url} href={source.url} target="_blank" rel="noreferrer" className="block text-sm text-blue-700 hover:underline">{source.title || source.url}</a>)}</div>}</div>
          <div className="mt-5 rounded-xl bg-white p-4"><label className="text-sm font-medium text-slate-700">我的意見／指示</label>{research.needsUserInput && <p className="mt-2 text-sm text-amber-700">{research.userQuestion || '需要你補充研究條件。'}</p>}<div className="mt-3 flex flex-wrap gap-2"><button disabled={busy === research.id} onClick={() => updateResearch(project, 'direction')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">送出意見</button><button disabled={busy === research.id} onClick={() => updateResearch(project, 'prioritize')} className="rounded-lg border bg-white px-4 py-2 text-sm">設為優先</button></div></div>
        </section>
      )
    }
    const item = project.latest
    const plan = project.plan
    const payload = item?.payload || {}
    const drive = payload.driveProject || {}
    const result = item ? resultFor(results, item) : null
    const output = result?.outcome || result?.summary || item?.result?.summary || item?.result?.text || ''
    const report = result?.report || item?.result?.report || {}
    const executor = result?.executor || item?.executor || {}
    const gptWorkUrl = payload.gptWorkUrl || project.gptWorkUrl
    return (
      <section className="mx-3 -mt-3 mb-3 rounded-b-2xl border-x border-b border-blue-200 bg-blue-50/50 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {gptWorkUrl ? <a href={gptWorkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"><MessageSquare size={16} />進入 GPT Work</a>
            : gptWorkConnected
              ? <span className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"><CheckCircle2 size={16} />GPT Work 已連線（雲端執行）</span>
              : <span className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700"><CircleAlert size={16} />GPT Work 等待首次執行驗證</span>}
          {drive.folderUrl && <a href={drive.folderUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-blue-700"><FolderOpen size={16} />Google Drive</a>}
          {drive.referenceFolderUrl && <a href={drive.referenceFolderUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-amber-700"><FileText size={16} />上傳參考資料</a>}
        </div>

        <div className="mt-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">目前進度</h3>
            {payload.revisionFeedback && <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs font-medium text-emerald-700">本輪修改需求</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{payload.revisionFeedback}</p></div>}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item?.clarificationQuestion || output || plan?.whyNow || payload.summary || '等待 AI 回寫進度。'}</p>
          </div>
        </div>

        {plan && <div className="mt-5 rounded-xl bg-white p-4"><div className="flex items-center gap-2 text-sm text-red-600"><ShieldCheck size={16} />HY Review</div><p className="mt-2 text-sm text-slate-600">{plan.observation || plan.context}</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy === plan.id} onClick={() => decide(plan, 'approve')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">核准並建立 GPT Work</button><button disabled={busy === plan.id} onClick={() => decide(plan, 'reject')} className="rounded-lg bg-slate-100 px-4 py-2 text-sm">不採用</button></div></div>}

        {item?.status === 'needs_clarification' && <div className="mt-5 rounded-xl bg-white p-4"><label className="text-sm font-medium text-slate-700">直接回覆 GPT</label><textarea value={drafts[item.id] || ''} onChange={event => setDraft(item.id, event.target.value)} placeholder="補充方向、限制或希望優先完成的內容" className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm"/><div className="mt-2 flex gap-2"><button disabled={busy === item.id || !(drafts[item.id] || '').trim()} onClick={() => answer(item)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"><Send size={15} />回覆並繼續</button><button disabled={busy === item.id} onClick={() => removeItem(item)} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm"><Trash2 size={15} />移除工作</button></div></div>}

        {item && DONE.has(item.status) && <div className="mt-5 rounded-xl bg-white p-4"><div className="max-h-80 overflow-y-auto overscroll-contain pr-3"><h3 className="text-sm font-semibold text-slate-700">本次交付（待你驗收）</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{report.summary || output || '尚未提供可驗收摘要。'}</p>
          {!!report.workPerformed?.length && <div className="mt-4"><h4 className="text-sm font-medium text-slate-700">實際執行</h4><ul className="mt-1 list-disc pl-5 text-sm text-slate-600">{report.workPerformed.map((text, index) => <li key={index}>{String(text)}</li>)}</ul></div>}
          {!!report.deliverables?.length && <div className="mt-4"><h4 className="text-sm font-medium text-slate-700">成果檔案</h4><div className="mt-2 space-y-2">{report.deliverables.map((file, index) => <div key={index} className="rounded-lg border p-3 text-sm">{file.url ? <a href={file.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700">{file.name || '開啟成果'}</a> : <span className="text-amber-700">{file.name || '成果'}：尚未建立可開啟檔案</span>}</div>)}</div></div>}
          {!!report.acceptanceChecks?.length && <div className="mt-4"><h4 className="text-sm font-medium text-slate-700">驗收檢查</h4><div className="mt-2 space-y-1 text-sm">{report.acceptanceChecks.map((check, index) => <p key={index} className={check.passed ? 'text-emerald-700' : 'text-amber-700'}>{check.passed ? '✓' : '○'} {check.item}{check.evidence ? ` — ${check.evidence}` : ''}</p>)}</div></div>}</div><div className="sticky bottom-0 mt-4 border-t border-slate-100 bg-white pt-4"><label className="block text-sm font-medium text-slate-700">要求修改或加入下一個功能</label><textarea value={drafts[`feedback:${item.id}`] || ''} onChange={event => setDraft(`feedback:${item.id}`, event.target.value)} placeholder="例如：加入主管 Reviewer；下一版增加 PowerPoint 範本套用。" className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm"/><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy === item.id || !(drafts[`feedback:${item.id}`] || '').trim()} onClick={() => sendFeedback(item)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">{busy === item.id ? '送出中…' : '送出並繼續專案'}</button><button type="button" disabled={busy === item.id} onClick={() => removeItem(item, 'accept')} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm"><CheckCircle2 size={15} />核准本次成果</button></div>{feedbackStatus[item.id] && <p className={`mt-2 text-sm ${feedbackStatus[item.id].type === 'error' ? 'text-red-600' : feedbackStatus[item.id].type === 'success' ? 'text-emerald-700' : 'text-blue-600'}`}>{feedbackStatus[item.id].text}</p>}</div></div>}
      </section>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">工作區</h1><p className="mt-1 text-slate-500">長期 Project 的規劃、Milestone、成果與意見集中在同一處。</p></div><button onClick={load} disabled={refreshing} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-60"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? '同步中…' : '同步狀態'}</button></div>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl border bg-white p-4"><b className="text-2xl">{projects.length}</b><p className="text-sm text-slate-500">全部專案</p></div><div className="rounded-xl border bg-blue-50 p-4"><b className="text-2xl text-blue-700">{runningCount}</b><p className="text-sm text-slate-600">GPT 執行中</p></div><div className="rounded-xl border bg-red-50 p-4"><b className="text-2xl text-red-700">{waitingCount}</b><p className="text-sm text-slate-600">等你決定</p></div><div className="rounded-xl border bg-amber-50 p-4"><b className="text-2xl text-emerald-700">{reviewCount}</b><p className="text-sm text-slate-600">待你驗收</p></div></div>
      <div className="mb-5 flex flex-wrap gap-2">{[['all','全部'],['hy','HY'],['950157','950157'],['family','小因'],['sam','Sam']].map(([value,text]) => <button key={value} onClick={() => setOwnerFilter(value)} className={`rounded-lg border px-3 py-2 text-sm ${ownerFilter === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'bg-white text-slate-600'}`}>{text} {value === 'all' ? projects.length : projects.filter(project => project.owner === value).length}</button>)}</div>
      <section className="mb-5 flex flex-col gap-3 rounded-xl border bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="font-semibold text-slate-800">工作區執行原則</p><p className="mt-1 text-sm text-slate-500">規劃書核准後才啟動 Milestone；沒有可開啟成果，不得標示完成。</p></div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
          <span className="flex items-center gap-1.5"><Bot size={15} className="text-blue-600"/>目前：HY Life OS 工作器</span>
          <span className={`flex items-center gap-1.5 ${gptWorkConnected ? 'text-emerald-700' : ''}`}>{gptWorkConnected ? <CheckCircle2 size={15} className="text-emerald-600"/> : <CircleAlert size={15} className="text-amber-600"/>}GPT Work：{gptWorkConnected ? '已連線' : '等待首次執行驗證'}</span>
          <span className="flex items-center gap-1.5"><FolderOpen size={15} className="text-blue-600"/>成果：Google Drive 保存</span>
        </div>
      </section>
      <div className="space-y-3">{visibleProjects.map(project => { const meta = statusMeta(project); const open = expanded === project.key; const latest = project.latest; const next = latest?.clarificationQuestion || latest?.payload?.nextIntentIfDone || (meta.key === 'review' ? '檢視並驗收本輪交付' : meta.key === 'running' ? '等待 GPT 回寫最新進度' : project.plan?.suggestedAction || '等待下一步'); return <div key={project.key}><button onClick={() => setExpanded(open ? '' : project.key)} className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition ${open ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-300'}`}><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{project.title}</h2><p className="mt-1 text-sm text-slate-500">{ownerLabel(project.owner)} · {project.workspaceProject ? '正式 Project' : project.research ? '研究 Project' : '長期 Project'} · {project.workspaceProject ? `Plan v${project.workspaceProject.projectPlan?.version || '1.0'}` : project.research ? `${project.research.sources?.length || 0} 筆證據` : `${project.items.length || 0} 個執行輪次`}</p></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${meta.cls}`}>{meta.text}</span></div><div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600"><span className="line-clamp-1">下一步：{next}</span><span className="shrink-0 text-xs text-slate-400">{latest?.updatedAt ? new Date(latest.updatedAt).toLocaleDateString('zh-TW') : '待建立'}</span></div></button>{open && ProjectDetail({ project })}</div>})}{!visibleProjects.length && <div className="rounded-xl border border-dashed p-10 text-center text-slate-400">目前沒有符合條件的長期 Project。</div>}</div>
    </div>
  )
}
