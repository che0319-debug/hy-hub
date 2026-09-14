import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bot, FolderKanban, RefreshCw, Target } from 'lucide-react'
import { fetchLifeOSContext } from '../api'

const AGENTS = ['hy', '950157', 'family', 'sam']
const LABELS = { hy: 'HY', '950157': '950157', family: '小因', sam: 'Sam' }
const ACTIVE = new Set(['pending', 'active', 'in_progress', 'running', 'blocked', 'needs_decision'])

function Card({ title, icon: Icon, children }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><Icon size={18} />{title}</h2>
    {children}
  </section>
}

function Summary({ context, planCount }) {
  const activeTasks = (context.tasks || []).filter(task => ACTIVE.has(task.status)).length
  const openGaps = (context.realityGaps || []).filter(gap => Number(gap.gap) > 0).length
  const items = [
    ['目標', (context.goals || []).length],
    ['待改善差距', openGaps],
    ['進行中任務', activeTasks],
    ['待核准 AI 工作', planCount],
  ]
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {items.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    </div>)}
  </div>
}

function GapView({ context }) {
  const desired = new Map((context.desiredStates || []).map(x => [x.dimension, x.target]))
  const reality = new Map((context.realityStates || []).map(x => [x.dimension, x.value]))
  const goals = new Map((context.goals || []).map(x => [x.title, x]))
  const rows = (context.realityGaps || [])
    .map(x => ({ ...x, target: desired.get(x.dimension) ?? 100, value: reality.get(x.dimension) ?? 0, goal: goals.get(x.dimension) }))
    .sort((a, b) => b.gap - a.gap)

  return <Card title="Goal → Reality Gap" icon={Target}>
    <div className="space-y-4">{rows.map(row => <div key={row.id}>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <div><b>{row.goal?.title || row.dimension}</b><span className="ml-2 text-xs text-slate-400">{row.goal ? '已連結目標' : '尚未連結目標'}</span></div>
        <span className="whitespace-nowrap text-slate-500">現況 {row.value} / 目標 {row.target}・差距 {row.gap}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, row.value))}%` }} /></div>
    </div>)}</div>
  </Card>
}

function ProjectTaskView({ context }) {
  const projects = context.projects || []
  const tasks = context.tasks || []
  const unlinked = projects.filter(project => !project.goalId).length

  return <Card title="Project → Task 執行鏈" icon={FolderKanban}>
    {unlinked > 0 && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      {unlinked} 個專案尚未指定 Goal；目前保留真實資料，不自動猜測關聯。
    </p>}
    <div className="grid gap-4 lg:grid-cols-2">{AGENTS.map(owner => {
      const ownedProjects = projects.filter(project => project.owner === owner)
      const ownerTasks = tasks.filter(task => task.owner === owner)
      return <section key={owner} className="rounded-lg border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <b className="flex items-center gap-2"><Bot size={15} />{LABELS[owner]}</b>
          <span className="text-xs text-slate-500">{ownedProjects.length} 專案・{ownerTasks.length} 任務</span>
        </div>
        {ownedProjects.length ? <div className="space-y-2">{ownedProjects.map(project => {
          const projectTasks = tasks.filter(task => task.projectId === project.id)
          const active = projectTasks.filter(task => ACTIVE.has(task.status))
          return <details key={project.id} className="rounded-lg bg-slate-50 px-3 py-2" open={active.length > 0}>
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
              <span>{project.title || project.id}</span>
              <span className="ml-2 text-xs font-normal text-slate-400">{active.length}/{projectTasks.length} 進行中</span>
            </summary>
            {projectTasks.length ? <ul className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
              {projectTasks.map(task => <li key={task.id} className="flex items-start justify-between gap-2 text-xs text-slate-600">
                <span>{task.title || task.id}</span><span className="whitespace-nowrap text-slate-400">{task.status}</span>
              </li>)}
            </ul> : <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-400">尚無任務</p>}
          </details>
        })}</div> : <p className="text-sm text-slate-400">目前沒有專案</p>}
      </section>
    })}</div>
  </Card>
}

function DecisionView({ context }) {
  const items = (context.tasks || []).filter(t => ['blocked', 'needs_decision'].includes(t.status) || t.needsDecision)
  return <Card title="Needs HY Decision" icon={AlertTriangle}>
    {items.length ? <ul className="space-y-2">{items.map(item => <li key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"><b>{item.title}</b><span className="ml-2 text-amber-700">{LABELS[item.owner] || item.owner}</span></li>)}</ul> : <p className="text-sm text-slate-500">目前沒有其他等待 HY 決策的事項。</p>}
  </Card>
}

export default function LifeOS() {
  const [context, setContext] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function load() {
    setLoading(true); setError('')
    try {
      setContext(await fetchLifeOSContext())
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const updated = useMemo(() => context?.metadata?.updatedAt?.replace('T', ' ').slice(0, 16) || '—', [context])
  if (!context && loading) return <p className="text-sm text-slate-500">載入 Life OS…</p>
  if (!context) return <div><p className="mb-3 text-sm text-red-600">Life OS 讀取失敗：{error}</p><button onClick={load} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">重試</button></div>
  return <div className="space-y-5">
    <header className="flex items-start justify-between gap-4"><div><h1 className="text-xl font-bold text-slate-800">HY Life OS</h1><p className="text-sm text-slate-500">Canonical Core・目標差距・四分身執行鏈・更新 {updated}</p></div><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />刷新</button></header>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">更新失敗：{error}</p>}
    <Summary context={context} planCount={(context.autonomousPlans || []).filter(p => p.status === 'waiting_approval').length} />
    <GapView context={context} />
    <ProjectTaskView context={context} />
    <DecisionView context={context} />
  </div>
}
