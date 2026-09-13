import { useEffect, useState } from 'react'
import { Bot, CheckCircle2, Clock3, ExternalLink, FileText, RefreshCw, ShieldCheck } from 'lucide-react'
import { authHeaders } from '../auth'
import { answerWorkClarification, decideAutonomousPlan, submitWorkFeedback } from '../lifeOSApi'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const ACTIVE = new Set(['queued', 'running', 'claimed', 'in_progress', 'waiting_approval', 'needs_clarification'])
const DONE = new Set(['succeeded', 'completed', 'done'])
const label = owner => ({ hy: 'HY', family: '小因', '950157': '950157', sam: 'Sam', codex: 'Codex' })[owner] || owner || 'HY'
const title = item => item?.title || item?.name || item?.outcome || '未命名工作'

function artifactLabel(item, index) {
  return item?.title || item?.name || item?.filename || item?.type || `成果 ${index + 1}`
}

function artifactUrl(item) {
  return item?.url || item?.href || item?.downloadUrl || item?.download_url || ''
}

export default function AIWorkCenter() {
  const [core, setCore] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState('')
  const [drafts, setDrafts] = useState({})

  async function load() {
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/life-os/v1/context`, {
        headers: authHeaders(), cache: 'no-store',
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setCore(await response.json())
    } catch (err) {
      setError(`AI 工作讀取失敗：${err.message}`)
    }
  }

  useEffect(() => { load() }, [])

  const work = core?.workItems || []
  const plans = core?.autonomousPlans || []
  const results = core?.results || []
  const waiting = plans.filter(item => item.status === 'waiting_approval')
  const clarify = work.filter(item => item.status === 'needs_clarification')
  const active = work.filter(item => ACTIVE.has(item.status) && item.status !== 'needs_clarification')
  const done = work.filter(item => DONE.has(item.status)).slice().reverse().slice(0, 12)

  function setDraft(id, value) {
    setDrafts(current => ({ ...current, [id]: value }))
  }

  async function decide(plan, decision) {
    setBusy(plan.id)
    try {
      await decideAutonomousPlan(plan.id, decision)
      await load()
    } catch (err) {
      setError(err.message || '決策寫入失敗')
    } finally {
      setBusy('')
    }
  }

  async function answer(item) {
    const value = (drafts[item.id] || '').trim()
    if (!value) return
    setBusy(item.id)
    try {
      await answerWorkClarification(item.id, value)
      setDraft(item.id, '')
      await load()
    } catch (err) {
      setError(err.message || '補充資料送出失敗')
    } finally {
      setBusy('')
    }
  }

  async function sendFeedback(item) {
    const value = (drafts[`feedback:${item.id}`] || '').trim()
    if (!value) return
    setBusy(item.id)
    try {
      await submitWorkFeedback(item.id, value, `hy-work-feedback-${item.id}-${Date.now()}`)
      setDraft(`feedback:${item.id}`, '')
      setExpanded('')
      await load()
    } catch (err) {
      setError(err.message || '修改建議送出失敗')
    } finally {
      setBusy('')
    }
  }

  function Card({ item, doneCard = false }) {
    const result = results.find(x => x.workItemId === item.id || x.id === item.resultId)
    const artifacts = result?.artifacts || item.artifacts || []
    const summary = result?.outcome || result?.summary || item.payload?.summary || item.kind || 'AI 正在處理這項工作。'
    const isOpen = expanded === item.id

    return (
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">{title(item)}</h3>
            <p className="mt-1 text-sm text-slate-500">{label(item.owner)}・{doneCard ? '已完成' : item.status}</p>
          </div>
          {doneCard ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Bot className="text-blue-500" size={20} />}
        </div>

        <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 ${!isOpen ? 'line-clamp-3' : ''}`}>{summary}</p>

        {artifacts.length > 0 && (
          <div className="mt-3 grid gap-2">
            {artifacts.map((artifact, index) => {
              const url = artifactUrl(artifact)
              const body = <><FileText size={15} /><span>{artifactLabel(artifact, index)}</span>{url && <ExternalLink size={13} />}</>
              return url
                ? <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">{body}</a>
                : <div key={index} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{body}</div>
            })}
          </div>
        )}

        {doneCard && (
          <div className="mt-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => setExpanded(isOpen ? '' : item.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
                {isOpen ? '收合成果' : '查看成果'}
              </button>
            </div>
            {isOpen && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <label className="text-sm font-medium text-slate-700">給修改建議，HY 會建立修訂工作並繼續執行</label>
                <textarea
                  value={drafts[`feedback:${item.id}`] || ''}
                  onChange={event => setDraft(`feedback:${item.id}`, event.target.value)}
                  placeholder="例如：主管版再精簡一點，保留三個重點；簡報多一張比較表。"
                  className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                />
                <button disabled={busy === item.id || !(drafts[`feedback:${item.id}`] || '').trim()} onClick={() => sendFeedback(item)} className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  送出建議並讓 AI 繼續做
                </button>
              </div>
            )}
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI 工作中心</h1>
          <p className="mt-1 text-slate-500">你給方向・AI 自動工作・產出成果・你做決定</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={16} />重新整理</button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-red-50 p-4"><b className="text-2xl text-red-600">{waiting.length + clarify.length}</b><p className="text-sm">等你處理</p></div>
        <div className="rounded-xl bg-amber-50 p-4"><b className="text-2xl text-amber-600">{active.length}</b><p className="text-sm">AI 執行中</p></div>
        <div className="rounded-xl bg-emerald-50 p-4"><b className="text-2xl text-emerald-600">{done.length}</b><p className="text-sm">最近完成</p></div>
      </div>

      {(waiting.length + clarify.length) > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold">🔴 等你處理</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {waiting.map(plan => (
              <article key={plan.id} className="rounded-xl border-l-4 border-red-400 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-red-600"><ShieldCheck size={16} />{label(plan.owner)} 準備開始</div>
                <h3 className="mt-2 font-semibold">{title(plan)}</h3>
                <p className="mt-2 text-sm text-slate-600">{plan.whyNow || plan.context}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button disabled={busy === plan.id} onClick={() => decide(plan, 'approve')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">同意</button>
                  <button disabled={busy === plan.id} onClick={() => decide(plan, 'approve_with_judgment')} className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">同意＋自行判斷</button>
                  <button disabled={busy === plan.id} onClick={() => decide(plan, 'reject')} className="rounded-lg bg-slate-100 px-4 py-2 text-sm">取消</button>
                </div>
              </article>
            ))}
            {clarify.map(item => (
              <article key={item.id} className="rounded-xl border-l-4 border-amber-400 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-amber-600"><Clock3 size={16} />{label(item.owner)} 需要補充</div>
                <h3 className="mt-2 font-semibold">{title(item)}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.clarificationQuestion || item.error || '需要你的方向才能繼續。'}</p>
                <textarea
                  value={drafts[item.id] || ''}
                  onChange={event => setDraft(item.id, event.target.value)}
                  placeholder="直接回答 AI；送出後會自動續跑。"
                  className="mt-3 min-h-20 w-full rounded-lg border border-slate-300 p-3 text-sm"
                />
                <button disabled={busy === item.id || !(drafts[item.id] || '').trim()} onClick={() => answer(item)} className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  回覆並繼續執行
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold">🟡 AI 正在工作</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map(item => <Card key={item.id} item={item} />)}
          {!active.length && <p className="text-slate-400">目前沒有執行中的工作。</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">🟢 最近完成</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {done.map(item => <Card key={item.id} item={item} doneCard />)}
          {!done.length && <p className="text-slate-400">完成的 AI 工作會出現在這裡。</p>}
        </div>
      </section>
    </div>
  )
}
