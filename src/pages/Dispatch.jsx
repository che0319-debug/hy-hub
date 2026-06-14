import { useState, useEffect, Fragment } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useSessionContext } from '../App'
import { fetchDispatchSessions, fireDispatch, saveBriefText } from '../api'

// 狀態 badge 設定：label + Tailwind class
const STATUS_CONFIG = {
  pending: { label: '待派發',   cls: 'bg-slate-100 text-slate-600' },
  running: { label: '執行中',   cls: 'bg-blue-100 text-blue-700'   },
  await:   { label: '等我確認', cls: 'bg-yellow-100 text-yellow-700' },
  done:    { label: '完成',     cls: 'bg-green-100 text-green-700'  },
  failed:  { label: '失敗',     cls: 'bg-red-100 text-red-700'     },
}

// 預設顯示的進行中狀態（可改）
const ACTIVE_STATUSES = ['pending', 'running', 'await']

const BRIEF_TEMPLATE = `【任務目標】
（一句話講清楚要 routine 產出什麼）

【背景脈絡】
（此處自動填入該卡片的 desc）

【參考資料】
（要 routine 去 hy-data 看哪些檔／路徑。routine 唯讀，只讀不寫）

【輸出格式】
（條列摘要 / 表格 / 草稿全文 等）

【交付形式】
（Telegram 摘要回報 / 產出 .md 草稿）`

function buildDraftText(desc) {
  const descPart = (desc || '').trim()
  return [
    '【任務目標】',
    '（一句話講清楚要 routine 產出什麼）',
    '',
    '【背景脈絡】',
    descPart || '（此處自動填入該卡片的 desc）',
    '',
    '【參考資料】',
    '（要 routine 去 hy-data 看哪些檔／路徑。routine 唯讀，只讀不寫）',
    '',
    '【輸出格式】',
    '（條列摘要 / 表格 / 草稿全文 等）',
    '',
    '【交付形式】',
    '（Telegram 摘要回報 / 產出 .md 草稿）',
  ].join('\n')
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}


export default function Dispatch() {
  const { sessions: ctxSessions } = useSessionContext()
  const [sessions, setSessions] = useState(ctxSessions)

  // mount 時 GET（每次路由切到此頁都 mount，是 iframe→派工清單的主要刷新機制）
  useEffect(() => {
    fetchDispatchSessions()
      .then(data => setSessions(data))
      .catch(err => console.warn('[Dispatch] refresh failed:', err))
  }, [])

  // 額外保險：跨分頁切回時也刷新
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        fetchDispatchSessions()
          .then(data => setSessions(data))
          .catch(err => console.warn('[Dispatch] refresh failed:', err))
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // 派發 loading 狀態：{ [milestoneId]: true }
  const [firingIds, setFiringIds] = useState({})
  // 派發錯誤訊息：{ [milestoneId]: string }
  const [fireErrors, setFireErrors] = useState({})

  // 委派單草稿：{ [milestoneId]: string }（undefined = 未編輯）
  const [briefDrafts, setBriefDrafts] = useState({})
  // 委派單儲存中：{ [milestoneId]: true }
  const [savingIds, setSavingIds] = useState({})
  // 委派單儲存錯誤：{ [milestoneId]: string }
  const [saveErrors, setSaveErrors] = useState({})

  // 派發確認 modal
  const [fireModal, setFireModal] = useState({ open: false, session: null, text: '' })

  async function handleSaveBrief(milestoneId, text) {
    setSavingIds(prev => ({ ...prev, [milestoneId]: true }))
    setSaveErrors(prev => { const n = { ...prev }; delete n[milestoneId]; return n })
    try {
      await saveBriefText(milestoneId, text)
      setSessions(prev => prev.map(s =>
        s.milestoneId === milestoneId ? { ...s, briefText: text } : s
      ))
    } catch (err) {
      setSaveErrors(prev => ({ ...prev, [milestoneId]: err.message }))
    } finally {
      setSavingIds(prev => { const n = { ...prev }; delete n[milestoneId]; return n })
    }
  }

  async function handleFire(milestoneId) {
    setFiringIds(prev => ({ ...prev, [milestoneId]: true }))
    setFireErrors(prev => { const n = { ...prev }; delete n[milestoneId]; return n })
    try {
      // 有未存草稿 → 先存再 fire
      if (briefDrafts[milestoneId] !== undefined) {
        await saveBriefText(milestoneId, briefDrafts[milestoneId])
        setSessions(prev => prev.map(s =>
          s.milestoneId === milestoneId ? { ...s, briefText: briefDrafts[milestoneId] } : s
        ))
      }
      await fireDispatch(milestoneId)
      setSessions(prev => prev.map(s =>
        s.milestoneId === milestoneId ? { ...s, status: 'running' } : s
      ))
    } catch (err) {
      setFireErrors(prev => ({ ...prev, [milestoneId]: err.message }))
    } finally {
      setFiringIds(prev => { const n = { ...prev }; delete n[milestoneId]; return n })
    }
  }

  function openFireModal(session) {
    const text =
      briefDrafts[session.milestoneId] !== undefined ? briefDrafts[session.milestoneId] :
      session.briefText                              ? session.briefText :
      buildDraftText(session.desc || '')
    setFireModal({ open: true, session, text })
  }

  async function confirmFire() {
    const { session, text } = fireModal
    setFireModal(prev => ({ ...prev, open: false }))
    setBriefDrafts(prev => ({ ...prev, [session.milestoneId]: text }))
    await handleFire(session.milestoneId)
  }

  // filterStatus: 'all'（預設）| 'active' | 單一 status 值
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [expandedIds, setExpandedIds] = useState(new Set())

  const allAssignees = [...new Set(sessions.map(s => s.assignee))]

  const filtered = sessions.filter(s => {
    const statusOk =
      filterStatus === 'all'    ? true :
      filterStatus === 'active' ? ACTIVE_STATUSES.includes(s.status) :
                                  s.status === filterStatus
    const assigneeOk = filterAssignee === 'all' || s.assignee === filterAssignee
    return statusOk && assigneeOk
  })

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div>
      {/* 頁面標題列 */}
      <div className="flex items-center gap-2 mb-6">
        <span className="inline-block w-3 h-3 rounded-full bg-violet-600" />
        <h1 className="text-xl font-bold text-slate-800">派工與回報</h1>
      </div>

      {/* 篩選列 */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">進行中</option>
          <option value="all">全部狀態</option>
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.label}</option>
          ))}
        </select>

        <select
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部指派對象</option>
          {allAssignees.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* 此週：占位，mock 無時間欄位，標明未實作 */}
        <select
          disabled
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-400 cursor-not-allowed"
        >
          <option>此週（占位）</option>
        </select>
      </div>

      {/* Session 清單表格 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium">
              <th className="text-left px-4 py-3 w-28">狀態</th>
              <th className="text-left px-4 py-3">Session</th>
              <th className="text-left px-4 py-3 w-48">來源 milestone</th>
              <th className="text-left px-4 py-3 w-28">指派</th>
              <th className="text-left px-4 py-3 w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                  無符合條件的 session
                </td>
              </tr>
            ) : (
              filtered.map(session => {
                const expanded = expandedIds.has(session.id)
                return (
                  <Fragment key={session.id}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {session.title}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {session.sourceMilestone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {session.assignee}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => toggleExpand(session.id)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            {expanded
                              ? <><ChevronUp size={13} />收合</>
                              : <><ChevronDown size={13} />展開</>
                            }
                          </button>
                          {session.status === 'pending' && (
                            <button
                              onClick={() => openFireModal(session)}
                              disabled={firingIds[session.milestoneId]}
                              className="text-xs px-2 py-0.5 bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {firingIds[session.milestoneId] ? '派發中…' : '派發'}
                            </button>
                          )}
                          {fireErrors[session.milestoneId] && (
                            <span className="text-xs text-red-500 max-w-[120px] break-words">
                              {fireErrors[session.milestoneId]}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded && (() => {
                      const isPending = session.status === 'pending'
                      const isRunning = session.status === 'running'
                      const currentText = briefDrafts[session.milestoneId] !== undefined
                        ? briefDrafts[session.milestoneId]
                        : (session.briefText || (isPending ? BRIEF_TEMPLATE : ''))
                      return (
                        <tr>
                          <td colSpan={5} className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                            <div className="space-y-3">
                              {isPending ? (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-slate-500">委派單</p>
                                  <textarea
                                    value={currentText}
                                    onChange={e => setBriefDrafts(prev => ({ ...prev, [session.milestoneId]: e.target.value }))}
                                    rows={12}
                                    className="w-full text-xs font-mono border border-slate-200 rounded p-2 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleSaveBrief(session.milestoneId, currentText)}
                                      disabled={savingIds[session.milestoneId]}
                                      className="px-3 py-1 text-xs bg-slate-700 text-white rounded hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {savingIds[session.milestoneId] ? '儲存中…' : '儲存委派單'}
                                    </button>
                                    {saveErrors[session.milestoneId] && (
                                      <span className="text-xs text-red-500">{saveErrors[session.milestoneId]}</span>
                                    )}
                                  </div>
                                </div>
                              ) : isRunning ? (
                                <p className="text-xs text-slate-400 italic">執行中，產出尚未回報</p>
                              ) : (
                                <>
                                  {session.resultText ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-slate-500">產出全文</p>
                                        <button
                                          onClick={() => navigator.clipboard.writeText(session.resultText)}
                                          className="px-2 py-0.5 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-100 transition-colors"
                                        >
                                          複製全文
                                        </button>
                                      </div>
                                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-white border border-slate-200 rounded p-3 max-h-96 overflow-y-auto">
                                        {session.resultText}
                                      </pre>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400">（無產出全文）</p>
                                  )}
                                  {session.briefText && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-semibold text-slate-400">委派單（唯讀）</p>
                                      <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono bg-white border border-slate-100 rounded p-2">
                                        {session.briefText}
                                      </pre>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })()}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        顯示 {filtered.length} / {sessions.length} 筆
      </p>

      {/* 派發確認 modal */}
      {fireModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setFireModal(prev => ({ ...prev, open: false })) }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl mx-4 p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">委派單草稿</h2>
              <p className="text-xs text-slate-400">
                {fireModal.session?.title}
                {fireModal.session?.sourceMilestone ? ` ／ ${fireModal.session.sourceMilestone}` : ''}
              </p>
            </div>
            <textarea
              value={fireModal.text}
              onChange={e => setFireModal(prev => ({ ...prev, text: e.target.value }))}
              rows={16}
              className="w-full text-xs font-mono border border-slate-200 rounded p-2 bg-slate-50 resize-y focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFireModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-1.5 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmFire}
                disabled={firingIds[fireModal.session?.milestoneId]}
                className="px-4 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {firingIds[fireModal.session?.milestoneId] ? '派發中…' : '確認派發'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
