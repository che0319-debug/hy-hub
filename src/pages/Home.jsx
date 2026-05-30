import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle, Coins } from 'lucide-react'
import { homeSummary, todaySchedule } from '../mock/data'
import { useSessionContext } from '../App'
import PixelWorld from '../components/PixelWorld'

// 待我處理定義：需要我介入的 session（等我確認 + 失敗待處理）
const PENDING_STATUSES = ['await', 'failed']

const STATUS_CONFIG = {
  await:   { label: '等我確認', cls: 'bg-yellow-100 text-yellow-700' },
  failed:  { label: '失敗',     cls: 'bg-red-100 text-red-700'      },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function MetricCard({ icon: Icon, label, value, highlight }) {
  return (
    <div className="bg-white rounded-xl p-5 flex flex-col gap-2 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Icon size={16} />
        {label}
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-red-500' : 'text-slate-800'}`}>
        {value}
      </div>
    </div>
  )
}

function PendingSection({ sessions }) {
  const navigate = useNavigate()
  const pending = sessions.filter(s => PENDING_STATUSES.includes(s.status))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">
          待我處理
          <span className="ml-2 text-xs font-normal text-slate-400">{pending.length} 項</span>
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-xs text-slate-400">目前沒有待處理項目</p>
      ) : (
        <ul className="space-y-2">
          {pending.map(s => (
            <li key={s.id}>
              <button
                onClick={() => navigate('/dispatch')}
                className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.assignee}</p>
                </div>
                <StatusBadge status={s.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ScheduleSection() {
  const sorted = [...todaySchedule].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">今日行程</p>
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
          mock · 待接 Google Calendar
        </span>
      </div>

      <ul className="space-y-2">
        {sorted.map(item => (
          <li key={item.id} className="flex items-start gap-3 px-1">
            <span className="text-xs font-mono text-slate-400 w-10 flex-shrink-0 pt-0.5">{item.time}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.source}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Home() {
  const [view, setView] = useState('data')
  const { sessions } = useSessionContext()

  // 動態推導：與 PendingSection 同源，metric 卡永遠與列表一致
  const pendingCount = sessions.filter(s => PENDING_STATUSES.includes(s.status)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{homeSummary.greeting}</h1>
          <p className="text-slate-500 text-sm">{homeSummary.date}</p>
        </div>
        <div className="flex rounded-md overflow-hidden border border-slate-200">
          <button
            onClick={() => setView('data')}
            className={`px-4 py-1.5 text-sm transition-colors ${
              view === 'data' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'
            }`}
          >
            資料
          </button>
          <button
            onClick={() => setView('pixel')}
            className={`px-4 py-1.5 text-sm transition-colors ${
              view === 'pixel' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'
            }`}
          >
            像素
          </button>
        </div>
      </div>

      {view === 'data' ? (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MetricCard
              icon={Bell}
              label="待我處理"
              value={pendingCount}
              highlight={pendingCount > 0}
            />
            <MetricCard
              icon={CheckCircle}
              label="今日做了"
              value={homeSummary.todayDone}
            />
            <MetricCard
              icon={Coins}
              label="花費"
              value={`$${homeSummary.todayCost.toFixed(2)}`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PendingSection sessions={sessions} />
            <ScheduleSection />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: '500px' }}>
          <PixelWorld />
        </div>
      )}
    </div>
  )
}
