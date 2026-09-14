import { useEffect, useMemo, useState } from 'react'
import { fetchMemoryCenter, promoteShortTermMemory, dismissShortTermMemory, reviewAgentMemory, updateAgentMemory } from '../api'

const owners = ['', 'hy', '950157', 'family', 'sam']
const ownerLabel = { '': '全部分身', hy: 'HY', '950157': '950157', family: '小因', sam: 'Sam' }
const levelStyle = { green: 'bg-green-50 text-green-700 border-green-200', yellow: 'bg-amber-50 text-amber-700 border-amber-200', red: 'bg-red-50 text-red-700 border-red-200' }
const levelLabel = { green: '健康', yellow: '需整理', red: '需優先處理' }

function Metric({ label, value }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-bold text-slate-800">{value ?? 0}</p></div>
}

export default function MemoryCenter() {
  const [data, setData] = useState(null)
  const [owner, setOwner] = useState('')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('long')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    setLoading(true); setError('')
    try { setData(await fetchMemoryCenter({ owner, status, q: query })) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { const id = setTimeout(load, 200); return () => clearTimeout(id) }, [owner, status, query])

  async function act(id, fn) {
    setBusy(id); setError('')
    try { await fn(); await load() } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  async function edit(memory) {
    const content = window.prompt('修改記憶內容（修改後需重新確認）', memory.content)
    if (!content || content === memory.content) return
    await act(memory.id, () => updateAgentMemory(memory.id, { ...memory, content, actor: 'human_hy' }))
  }

  const h = data?.health
  const short = useMemo(() => (data?.shortTerm || []).filter(x => !x.dismissed), [data])
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold text-slate-800">記憶中心</h1><p className="mt-1 text-sm text-slate-400">以正式長期記憶為主；短期內容由 Bots 自動整理</p></div>
        {h && <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelStyle[h.level]}`}>● {levelLabel[h.level]}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="短期記憶" value={h?.counts?.shortTerm} /><Metric label="正式長期" value={h?.counts?.longTerm} />
        <Metric label="待確認超過 7 天" value={h?.counts?.pendingOver7Days} /><Metric label="重複／衝突" value={(h?.counts?.duplicateGroups || 0) + (h?.counts?.conflicts || 0)} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <select value={owner} onChange={e => setOwner(e.target.value)} className="rounded border border-slate-200 px-3 py-2 text-sm">{owners.map(x => <option key={x} value={x}>{ownerLabel[x]}</option>)}</select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded border border-slate-200 px-3 py-2 text-sm"><option value="">全部狀態</option><option value="pending_confirmation">待確認</option><option value="confirmed">已確認</option><option value="archived">已封存</option></select>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜尋內容、來源…" className="min-w-48 flex-1 rounded border border-slate-200 px-3 py-2 text-sm" />
      </div>

      <div className="flex gap-1 border-b border-slate-200">{[['long','長期記憶'],['short','短期工作區'],['health','健康監測']].map(([k,l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm ${tab === k ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-slate-500'}`}>{l}</button>)}</div>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-400">載入中…</p>}

      {!loading && tab === 'short' && <div className="space-y-3">{short.length === 0 && <p className="text-sm text-slate-400">目前沒有短期記憶。</p>}{short.map(m => <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="text-sm font-medium text-slate-800">{m.summary}</p><p className="mt-1 text-xs text-slate-400">{ownerLabel[m.owner]} · {m.date} · 來源 {m.source || m.owner} · 未確認 · Bot 工作區 · 保留 7 天</p></div><div className="flex gap-2"><button disabled={busy === m.id} onClick={() => act(m.id, () => promoteShortTermMemory(m))} className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">升級候選</button><button disabled={busy === m.id} onClick={() => act(m.id, () => dismissShortTermMemory(m.id))} className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-600">忽略</button></div></div>{m.highlights?.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">{m.highlights.map((x,i) => <li key={i}>{x}</li>)}</ul>}</div>)}</div>}

      {!loading && tab === 'long' && <div className="space-y-3">{(data?.longTerm || []).length === 0 && <p className="text-sm text-slate-400">目前沒有符合條件的長期記憶。</p>}{(data?.longTerm || []).map(m => <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-800">{m.content}</p><p className="mt-1 text-xs text-slate-400">{ownerLabel[m.owner]} · {m.category || m.kind} · {m.status} · 來源 {m.sourceType}{m.sourceRef ? ` / ${m.sourceRef}` : ''}</p><div className="mt-3 flex gap-2"><button onClick={() => edit(m)} className="rounded border border-slate-300 px-3 py-1 text-xs">編輯</button>{m.status === 'pending_confirmation' && <button onClick={() => act(m.id, () => reviewAgentMemory(m.id, 'confirm'))} className="rounded bg-green-600 px-3 py-1 text-xs text-white">確認</button>}{m.status !== 'archived' && <button onClick={() => act(m.id, () => reviewAgentMemory(m.id, 'archive'))} className="rounded border border-red-200 px-3 py-1 text-xs text-red-600">封存</button>}</div></div>)}</div>}

      {!loading && tab === 'health' && h && <div className="space-y-4"><div className={`rounded-xl border p-4 ${levelStyle[h.level]}`}><p className="font-semibold">資料庫判斷：{h.migration.recommended ? '建議提出遷移評估' : '目前不需導入資料庫'}</p><p className="mt-1 text-sm">{h.migration.reason}；{h.migration.decision}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="mb-3 text-sm font-semibold text-slate-700">監測項目</p><div className="grid gap-2 text-sm md:grid-cols-2">{Object.entries(h.thresholds).map(([k,v]) => <div key={k} className="flex justify-between rounded bg-slate-50 px-3 py-2"><span>{k}</span><span className={v ? 'text-red-600' : 'text-green-600'}>{v ? '觸發' : '正常'}</span></div>)}</div><p className="mt-3 text-xs text-slate-400">政策：短期保留 {h.policy.shortTermRetentionDays} 天；候選超過 {h.policy.pendingReviewDays} 天提醒；{h.policy.databaseRule}</p></div></div>}
    </div>
  )
}
