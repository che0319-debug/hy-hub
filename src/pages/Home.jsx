import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle, Coins, RefreshCw } from 'lucide-react'
import { homeSummary } from '../mock/data'
import { useSessionContext } from '../App'
import PixelWorld from '../components/PixelWorld'
import { fetchTodaySchedule, fetchAllMilestones, fetchMemoryHealth } from '../api'

const PENDING_STATUSES = ['await', 'failed']
const REFRESH_INTERVAL_MS = 60000

const BOT_ROUTE = {
  HY:      '/line/hy',
  '950157':'/line/950157',
  '小因':  '/line/xiaoyin',
  Sam:     '/line/sam',
}

function todayTaipei() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function normalizeDue(due) {
  return due ? due.replace(/\//g, '-') : ''
}

function MetricCard({ icon: Icon, label, value, highlight, onClick }) {
  return (
    <div
      className={`bg-white rounded-xl p-5 flex flex-col gap-2 border border-slate-200 shadow-sm ${onClick ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
      onClick={onClick}
    >
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

function TodoSection() {
  const [milestones, setMilestones] = useState(null)

  useEffect(() => {
    fetchAllMilestones()
      .then(data => setMilestones(data))
      .catch(err => { console.warn('[Home] fetchAllMilestones failed:', err); setMilestones([]) })
  }, [])

  const today = todayTaipei()
  const limit = addDays(today, 3)
  const upcoming = (milestones || [])
    .filter(m => { const d = normalizeDue(m.due); return d && d <= limit })
    .sort((a, b) => normalizeDue(a.due).localeCompare(normalizeDue(b.due)))

  function dueDateColor(due) {
    const d = normalizeDue(due)
    if (d < today) return 'text-red-500'
    if (d === today) return 'text-blue-500'
    return 'text-slate-500'
  }

  function formatDue(due) {
    const d = normalizeDue(due)
    if (!d) return ''
    const [y, mo, dd] = d.split('-').map(Number)
    const weekday = ['日','一','二','三','四','五','六'][new Date(y, mo - 1, dd).getDay()]
    return `${d.slice(5)} (${weekday})`
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      <p className="text-sm font-semibold text-slate-700">
        待辦清單
        <span className="ml-2 text-xs font-normal text-slate-400">逾期 + 近 3 天</span>
      </p>
      {milestones === null ? (
        <p className="text-xs text-slate-400">載入中…</p>
      ) : upcoming.length === 0 ? (
        <p className="text-xs text-slate-400">近 3 天沒有待辦</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((m, i) => {
            const color = dueDateColor(m.due)
            return (
              <li key={i} className="flex items-center justify-between gap-2 px-1">
                <p className={`text-xs font-medium flex-1 min-w-0 truncate ${color}`}>{m.title}</p>
                <span className={`text-xs font-mono flex-shrink-0 ${color}`}>{formatDue(m.due)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ScheduleSection() {
  const [events, setEvents] = useState(null)
  const [error, setError]   = useState(null)

  useEffect(() => {
    fetchTodaySchedule()
      .then(data => { if (data.error) setError(data.error); else setEvents(data.events || []) })
      .catch(err => { console.warn('[Home] fetchTodaySchedule failed:', err); setError(err.message) })
  }, [])

  const sorted = (events || []).sort((a, b) => (a.start || '').localeCompare(b.start || ''))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      <p className="text-sm font-semibold text-slate-700">今日行程</p>
      {events === null && !error ? (
        <p className="text-xs text-slate-400">載入中…</p>
      ) : error ? (
        <p className="text-xs text-red-500">行程暫時讀取失敗</p>
      ) : sorted.length === 0 ? (
        <p className="text-xs text-slate-400">今天沒有行程</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((item, i) => (
            <li key={i} className="flex items-start gap-3 px-1">
              <span className="text-xs font-mono text-slate-400 w-10 flex-shrink-0 pt-0.5">{item.start || '全天'}</span>
              <p className="text-xs text-slate-800">{item.title}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Home() {
  const [view, setView]           = useState('data')
  const [healthData, setHealthData] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const { sessions, refreshSessions } = useSessionContext()
  const navigate  = useNavigate()
  const timerRef  = useRef(null)

  async function loadHealth() {
    try {
      const data = await fetchMemoryHealth()
      setHealthData(data)
    } catch (err) {
      console.warn('[Home] fetchMemoryHealth failed:', err)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.allSettled([loadHealth(), refreshSessions()])
    setRefreshing(false)
  }

  useEffect(() => {
    loadHealth()
    timerRef.current = setInterval(handleRefresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = sessions.filter(s => PENDING_STATUSES.includes(s.status)).length

  function handleBotClick(botName) {
    const route = BOT_ROUTE[botName]
    if (route) navigate(route)
    else navigate('/line/hy')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{homeSummary.greeting}</h1>
          <p className="text-slate-500 text-sm">{todayTaipei()}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md overflow-hidden border border-slate-200">
            <button
              onClick={() => setView('data')}
              className={`px-4 py-1.5 text-sm transition-colors ${view === 'data' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              資料
            </button>
            <button
              onClick={() => setView('pixel')}
              className={`px-4 py-1.5 text-sm transition-colors ${view === 'pixel' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              像素
            </button>
          </div>
        </div>
      </div>

      {view === 'data' ? (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MetricCard
              icon={Bell}
              label="待確認派工"
              value={pendingCount}
              highlight={pendingCount > 0}
              onClick={() => navigate('/dispatch')}
            />
            <MetricCard
              icon={CheckCircle}
              label="進行中派工"
              value={`${sessions.filter(s => s.status === 'running').length} 件`}
            />
            <MetricCard
              icon={Coins}
              label="花費"
              value="查看 Console →"
              onClick={() => window.open('https://console.anthropic.com', '_blank')}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TodoSection />
            <ScheduleSection />
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
          <div
            className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm"
            style={{ position: 'relative', paddingTop: '75%' }}
          >
            <div style={{ position: 'absolute', inset: 0 }}>
              <PixelWorld
                healthData={healthData}
                sessions={sessions}
                onBotClick={handleBotClick}
                onDocClick={() => navigate('/dispatch')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
