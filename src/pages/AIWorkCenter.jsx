import { useEffect, useMemo, useState } from 'react'
import { Bot, CheckCircle2, Clock3, ExternalLink, FileText, FolderOpen, MessageSquare, RefreshCw, Send, ShieldCheck, Trash2 } from 'lucide-react'
import { authHeaders } from '../auth'
import { answerWorkClarification, createDirectWorkItem, decideAutonomousPlan, dismissWorkItem, submitWorkFeedback } from '../lifeOSApi'
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
  if (project.plan?.status === 'waiting_approval') return { key: 'waiting', text: '等你決定', cls: 'bg-red-50 text-red-700' }
  const status = project.latest?.status
  if (status === 'needs_clarification') return { key: 'waiting', text: '需要你補充', cls: 'bg-amber-50 text-amber-700' }
  if (ACTIVE.has(status)) return { key: 'running', text: status === 'queued' ? '等待 GPT 接手' : 'GPT 執行中', cls: 'bg-blue-50 text-blue-700' }
  if (DONE.has(status)) return { key: 'optimizing', text: '持續優化', cls: 'bg-emerald-50 text-emerald-700' }
  if (status === 'failed') return { key: 'risk', text: '需要注意', cls: 'bg-red-50 text-red-700' }
  return { key: 'paused', text: '暫停', cls: 'bg-slate-100 text-slate-600' }
}

function projectKey(item) {
  const payload = item?.payload || {}
  return payload.driveProject?.folderId || payload.projectId || item.taskId || item.id
}

export default function AIWorkCenter() {
  const [core, setCore] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState('')
  const [drafts, setDrafts] = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const [ownerFilter, setOwnerFilter] = useState('all')

  async function load() {
    setError('')
    setRefreshing(true)
    try {
      const [response, sessions] = await Promise.all([
        fetch(`${API_BASE}/api/life-os/v1/context`, { headers: authHeaders(), cache: 'no-store' }),
        fetchDispatchSessions(),
      ])
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
    for (const plan of plans.filter(plan => plan.status === 'waiting_approval')) {
      const key = `plan:${plan.id}`
      if (!grouped.has(key)) grouped.set(key, { key, items: [], owner: plan.owner, title: cleanTitle(plan.title), plan, latest: null })
    }
    return [...grouped.values()].sort((a, b) => {
      const aWait = statusMeta(a).key === 'waiting' ? 1 : 0
      const bWait = statusMeta(b).key === 'waiting' ? 1 : 0
      if (aWait !== bWait) return bWait - aWait
      return String(b.latest?.updatedAt || b.plan?.updatedAt || '').localeCompare(String(a.latest?.updatedAt || a.plan?.updatedAt || ''))
    })
  }, [work, plans])

  const visibleProjects = ownerFilter === 'all' ? projects : projects.filter(project => project.owner === ownerFilter)
  const waitingCount = projects.filter(project => statusMeta(project).key === 'waiting').length
  const runningCount = projects.filter(project => statusMeta(project).key === 'running').length
  const riskCount = projects.filter(project => statusMeta(project).key === 'risk').length

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
    if (!value) return
    setBusy(item.id)
    try {
      await submitWorkFeedback(item.id, value, `hy-work-feedback-${item.id}-${Date.now()}`)
      setDraft(key, '')
      await load()
    } catch (err) { setError(err.message || '修改建議送出失敗') } finally { setBusy('') }
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
    const item = project.latest
    const plan = project.plan
    const payload = item?.payload || {}
    const drive = payload.driveProject || {}
    const result = item ? resultFor(results, item) : null
    const output = result?.outcome || result?.summary || item?.result?.text || ''
    const gptWorkUrl = payload.gptWorkUrl || project.gptWorkUrl
    return (
      <section className="mx-3 -mt-3 mb-3 rounded-b-2xl border-x border-b border-blue-200 bg-blue-50/50 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {gptWorkUrl ? <a href={gptWorkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"><MessageSquare size={16} />進入 GPT Work</a>
            : <button disabled className="flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm text-slate-500"><MessageSquare size={16} />GPT Work 尚未連結</button>}
          {drive.folderUrl && <a href={drive.folderUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-blue-700"><FolderOpen size={16} />Google Drive</a>}
          {drive.referenceFolderUrl && <a href={drive.referenceFolderUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-amber-700"><FileText size={16} />上傳參考資料</a>}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">目前進度</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item?.clarificationQuestion || output || plan?.whyNow || payload.summary || '等待 GPT Work 回寫進度。'}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">專案紀錄</h3>
            <div className="mt-2 space-y-2 text-sm text-slate-600">
              <p>執行輪次：{project.items.length || 0}</p>
              <p>目前執行者：{item?.executor || 'GPT Work（待連結）'}</p>
              <p>最近更新：{item?.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-TW') : '尚未執行'}</p>
            </div>
          </div>
        </div>

        {plan && <div className="mt-5 rounded-xl bg-white p-4"><div className="flex items-center gap-2 text-sm text-red-600"><ShieldCheck size={16} />HY Review</div><p className="mt-2 text-sm text-slate-600">{plan.observation || plan.context}</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy === plan.id} onClick={() => decide(plan, 'approve')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">核准並建立 GPT Work</button><button disabled={busy === plan.id} onClick={() => decide(plan, 'reject')} className="rounded-lg bg-slate-100 px-4 py-2 text-sm">不採用</button></div></div>}

        {item?.status === 'needs_clarification' && <div className="mt-5 rounded-xl bg-white p-4"><label className="text-sm font-medium text-slate-700">直接回覆 GPT</label><textarea value={drafts[item.id] || ''} onChange={event => setDraft(item.id, event.target.value)} placeholder="補充方向、限制或希望優先完成的內容" className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm"/><div className="mt-2 flex gap-2"><button disabled={busy === item.id || !(drafts[item.id] || '').trim()} onClick={() => answer(item)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"><Send size={15} />回覆並繼續</button><button disabled={busy === item.id} onClick={() => removeItem(item)} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm"><Trash2 size={15} />移除工作</button></div></div>}

        {item && DONE.has(item.status) && <div className="mt-5 rounded-xl bg-white p-4"><h3 className="text-sm font-semibold text-slate-700">本次成果</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{output || '成果資料已建立，但尚未提供可讀摘要。'}</p><label className="mt-4 block text-sm font-medium text-slate-700">要求修改或加入下一個功能</label><textarea value={drafts[`feedback:${item.id}`] || ''} onChange={event => setDraft(`feedback:${item.id}`, event.target.value)} placeholder="例如：加入主管 Reviewer；下一版增加 PowerPoint 範本套用。" className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm"/><div className="mt-2 flex flex-wrap gap-2"><button disabled={busy === item.id || !(drafts[`feedback:${item.id}`] || '').trim()} onClick={() => sendFeedback(item)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">送出並繼續專案</button><button disabled={busy === item.id} onClick={() => removeItem(item, 'accept')} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm"><CheckCircle2 size={15} />核准本次成果</button></div></div>}
      </section>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">AI Work 專案總覽</h1><p className="mt-1 text-slate-500">統一掌握 GPT Work 專案；需要深入時再進入專案工作室。</p></div><button onClick={load} disabled={refreshing} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-60"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? '同步中…' : '同步狀態'}</button></div>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl border bg-white p-4"><b className="text-2xl">{projects.length}</b><p className="text-sm text-slate-500">全部專案</p></div><div className="rounded-xl border bg-blue-50 p-4"><b className="text-2xl text-blue-700">{runningCount}</b><p className="text-sm text-slate-600">GPT 執行中</p></div><div className="rounded-xl border bg-red-50 p-4"><b className="text-2xl text-red-700">{waitingCount}</b><p className="text-sm text-slate-600">等你決定</p></div><div className="rounded-xl border bg-amber-50 p-4"><b className="text-2xl text-amber-700">{riskCount}</b><p className="text-sm text-slate-600">需要注意</p></div></div>
      <div className="mb-5 flex flex-wrap gap-2">{[['all','全部'],['hy','HY'],['950157','950157'],['family','小因'],['sam','Sam']].map(([value,text]) => <button key={value} onClick={() => setOwnerFilter(value)} className={`rounded-lg border px-3 py-2 text-sm ${ownerFilter === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'bg-white text-slate-600'}`}>{text} {value === 'all' ? projects.length : projects.filter(project => project.owner === value).length}</button>)}</div>
      <div className="space-y-3">{visibleProjects.map(project => { const meta = statusMeta(project); const open = expanded === project.key; const latest = project.latest; const next = latest?.clarificationQuestion || latest?.payload?.nextIntentIfDone || (meta.key === 'optimizing' ? '檢視成果或加入下一個功能' : meta.key === 'running' ? '等待 GPT 回寫最新進度' : project.plan?.suggestedAction || '等待下一步'); return <div key={project.key}><button onClick={() => setExpanded(open ? '' : project.key)} className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition ${open ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-300'}`}><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{project.title}</h2><p className="mt-1 text-sm text-slate-500">{ownerLabel(project.owner)} · GPT Work 專案 · {project.items.length || 0} 個執行輪次</p></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${meta.cls}`}>{meta.text}</span></div><div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600"><span className="line-clamp-1">下一步：{next}</span><span className="shrink-0 text-xs text-slate-400">{latest?.updatedAt ? new Date(latest.updatedAt).toLocaleDateString('zh-TW') : '待建立'}</span></div></button>{open && <ProjectDetail project={project}/>}</div>})}{!visibleProjects.length && <div className="rounded-xl border border-dashed p-10 text-center text-slate-400">此 Bot 目前沒有 AI 專案。</div>}</div>
    </div>
  )
}
