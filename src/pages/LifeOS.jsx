import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bot, RefreshCw, Target } from 'lucide-react'
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

function GapView({ context }) {
  const desired = new Map((context.desiredStates || []).map(x => [x.dimension, x.target]))
  const reality = new Map((context.realityStates || []).map(x => [x.dimension, x.value]))
  const rows = (context.realityGaps || []).map(x => ({ ...x, target: desired.get(x.dimension) ?? 100, value: reality.get(x.dimension) ?? 0 })).sort((a, b) => b.gap - a.gap)
  return <Card title="Desired State vs Reality State" icon={Target}>
    <div className="space-y-4">{rows.map(row => <div key={row.id}>
      <div className="mb-1 flex justify-between text-sm"><b>{row.dimension}</b><span className="text-slate-500">現況 {row.value} / 目標 {row.target}・差距 {row.gap}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, row.value))}%` }} /></div>
    </div>)}</div>
  </Card>
}

function AgentView({ context }) {
  const tasks = (context.tasks || []).filter(t => ACTIVE.has(t.status))
  return <Card title="數位分身目前在做什麼" icon={Bot}>
    <div className="grid gap-3 sm:grid-cols-2">{AGENTS.map(owner => {
      const owned = tasks.filter(t => t.owner === owner)
      return <div key={owner} className="rounded-lg border border-slate-200 p-4">
        <div className="mb-2 flex items-center justify-between"><b>{LABELS[owner]}</b><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{owned.length} 項</span></div>
        {owned.length ? <ul className="space-y-1.5">{owned.slice(0, 5).map(t => <li key={t.id} className="text-sm text-slate-600">• {t.title}</li>)}</ul> : <p className="text-sm text-slate-400">目前沒有進行中事項</p>}
      </div>
    })}</div>
  </Card>
}

function DecisionView({ context }) {
  const items = (context.tasks || []).filter(t => ['blocked', 'needs_decision'].includes(t.status) || t.needsDecision)
  return <Card title="Needs HY Decision" icon={AlertTriangle}>
    {items.length ? <ul className="space-y-2">{items.map(item => <li key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"><b>{item.title}</b><span className="ml-2 text-amber-700">{LABELS[item.owner] || item.owner}</span></li>)}</ul> : <p className="text-sm text-slate-500">目前沒有等待 HY 決策的事項。</p>}
  </Card>
}

export default function LifeOS() {
  const [context, setContext] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function load() { setLoading(true); setError(''); try { setContext(await fetchLifeOSContext()) } catch (e) { setError(e.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const updated = useMemo(() => context?.metadata?.updatedAt?.replace('T', ' ').slice(0, 16) || '—', [context])
  if (!context && loading) return <p className="text-sm text-slate-500">載入 Life OS…</p>
  if (!context) return <div><p className="mb-3 text-sm text-red-600">Life OS 讀取失敗：{error}</p><button onClick={load} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">重試</button></div>
  return <div className="space-y-5">
    <header className="flex items-start justify-between gap-4"><div><h1 className="text-xl font-bold text-slate-800">HY Life OS</h1><p className="text-sm text-slate-500">管理現況、差距、數位分身與待決策事項・更新 {updated}</p></div><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />刷新</button></header>
    {error && <p className="text-sm text-red-600">更新失敗，保留上次資料：{error}</p>}
    <GapView context={context} />
    <AgentView context={context} />
    <DecisionView context={context} />
  </div>
}

