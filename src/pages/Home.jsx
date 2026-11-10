import WeeklyDirection from '../life-goals/WeeklyDirection'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { homeSummary } from '../mock/data'
import OfficeHomeSummary from '../components/OfficeHomeSummary'
import { useInbox } from '../inbox/InboxContext'
import { fetchTodaySchedule, fetchAllMilestones } from '../api'

let todoCache
let scheduleCache

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

function TodoSection() {
  const [milestones, setMilestones] = useState(todoCache ?? null)

  useEffect(() => {
    let active = true
    const refresh = () => fetchAllMilestones()
      .then(data => { todoCache = data; if (active) setMilestones(data) })
      .catch(err => { console.warn('[Home] fetchAllMilestones failed:', err); if (active && todoCache === undefined) setMilestones([]) })
    refresh()
    const onFocus = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
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
  const [events, setEvents] = useState(scheduleCache ?? null)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (scheduleCache !== undefined) return
    fetchTodaySchedule()
      .then(data => { if (data.error) setError(data.error); else { scheduleCache = data.events || []; setEvents(scheduleCache) } })
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
  const navigate = useNavigate()
  const { roster, officeFailed } = useInbox()
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{homeSummary.greeting}</h1>
          <p className="text-slate-500 text-sm">{todayTaipei()}</p>
        </div>
      </div>

      <div>
          <WeeklyDirection />
          <section className="mb-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-600">Bot Office</h2>
            <OfficeHomeSummary totals={roster.office?.totals} failed={officeFailed} onOpen={() => navigate('/bot-office')} />
          </section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TodoSection />
            <ScheduleSection />
          </div>
        </div>
    </div>
  )
}

