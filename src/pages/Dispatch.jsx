import { useState, Fragment } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useSessionContext } from '../App'

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

// 展開區 mock 占位資料（全部 session 共用同一份假資料）
const MOCK_EXPAND_DATA = {
  dialogues: [
    { role: 'HY',     text: '請整理本週北海岸拜訪的重點摘要。' },
    { role: '950157', text: '好的，已讀取行事曆與備忘錄，正在彙整中...' },
    { role: '950157', text: '摘要草稿已完成，請確認後我再送出。' },
  ],
  files: ['週報摘要_20260528.md'],
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function ExpandedRow({ session }) {
  return (
    <tr>
      <td colSpan={5} className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">對話紀錄</p>
            <div className="space-y-1.5">
              {MOCK_EXPAND_DATA.dialogues.map((d, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className={`font-medium w-14 flex-shrink-0 ${d.role === 'HY' ? 'text-blue-600' : 'text-slate-500'}`}>
                    {d.role}
                  </span>
                  <span className="text-slate-700">{d.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">產出檔案</p>
            <div className="flex gap-2">
              {MOCK_EXPAND_DATA.files.map((f, i) => (
                <span key={i} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => console.log('[Dispatch] 繼續對話 session:', session.id)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              繼續對話
            </button>
            <button
              onClick={() => console.log('[Dispatch] 結案 session:', session.id)}
              className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-100 transition-colors"
            >
              結案
            </button>
            <button
              onClick={() => console.log('[Dispatch] 匯出 session:', session.id)}
              className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-100 transition-colors"
            >
              匯出
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function Dispatch() {
  const { sessions } = useSessionContext()

  // filterStatus: 'active'（預設，進行中三種）| 'all' | 單一 status 值
  const [filterStatus, setFilterStatus] = useState('active')
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
          <option value="active">進行中（預設）</option>
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
                        <button
                          onClick={() => toggleExpand(session.id)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          {expanded
                            ? <><ChevronUp size={13} />收合</>
                            : <><ChevronDown size={13} />展開</>
                          }
                        </button>
                      </td>
                    </tr>
                    {expanded && <ExpandedRow session={session} />}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        顯示 {filtered.length} / {sessions.length} 筆　·　完成與失敗記錄請切換「全部狀態」查看
      </p>
    </div>
  )
}
