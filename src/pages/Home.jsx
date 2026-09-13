import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle, Coins, RefreshCw, Pencil } from 'lucide-react'
import { homeSummary } from '../mock/data'
import { useSessionContext } from '../App'
import PixelCity from '../mobile/PixelCity'
import { fetchTodaySchedule, fetchAllMilestones, fetchMobileState, fetchWeeklyChange, postWeeklyChange } from '../api'
import { fetchDailyOS } from '../lifeOSApi'

const PENDING_STATUSES = ['await', 'failed']
const REFRESH_INTERVAL_MS = 60000

const BOT_ROUTE = {
  hy:      '/line/hy',
  '950157':'/line/950157',
  family:  '/line/xiaoyin',
  sam:     '/line/sam',
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

function WeeklyTop3Card() {
  const [items, setItems] = useState(null)
  useEffect(() => { fetchMobileState().then(data => setItems(data.weeklyTop3 || [])).catch(() => setItems([])) }, [])
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
      <p className="text-sm font-semibold text-slate-700 mb-3">本週最重要 3 件事</p>
      {items === null ? <p className="text-xs text-slate-400">載入中…</p> : items.length === 0 ? <p className="text-xs text-slate-400">本週尚未設定</p> : (
        <ol className="space-y-2">{items.map((item, index) => <li key={item.id} className={`flex gap-3 text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}><b className="text-blue-600">{index + 1}</b><span>{item.title}</span></li>)}</ol>
      )}
    </div>
  )
}

function TodayResultsCard() {
  const [items, setItems] = useState(null)
  useEffect(() => { fetchMobileState().then(data => setItems(data.todayCompleted || [])).catch(() => setItems([])) }, [])
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4 flex items-center gap-5">
      <div className="min-w-20 text-center border-r border-slate-200 pr-5">
        <div className="text-3xl font-bold text-green-600">{items?.length || 0}</div>
        <div className="text-xs text-slate-400">今日完成</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-700 mb-2">今日成果</p>
        {items === null ? <p className="text-xs text-slate-400">載入中…</p> : items.length === 0 ? <p className="text-xs text-slate-400">尚無完成項目</p> : (
          <ul className="space-y-1">{items.slice(0, 5).map(item => <li key={`${item.source}-${item.id}`} className="text-sm text-slate-600 truncate">✓ {item.title}</li>)}</ul>
        )}
      </div>
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

function weeksUntilFifty(birthDate) {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const fifty = new Date(Date.UTC(by + 50, bm - 1, bd))
  const todayMs = new Date(todayTaipei() + 'T00:00:00Z')
  const diff = fifty - todayMs
  if (diff <= 0) return null
  return Math.floor(diff / (7 * 86400000))
}

function isoWeekOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const startW1 = new Date(jan4 - ((jan4.getUTCDay() + 6) % 7) * 86400000)
  const diff = d - startW1
  if (diff < 0) {
    const jan4p = new Date(Date.UTC(d.getUTCFullYear() - 1, 0, 4))
    const startW1p = new Date(jan4p - ((jan4p.getUTCDay() + 6) % 7) * 86400000)
    return Math.floor((d - startW1p) / (7 * 86400000)) + 1
  }
  return Math.floor(diff / (7 * 86400000)) + 1
}

function WeeklyChangeCard() {
  const [data, setData] = useState(null)    // null=loading, false=error, object=loaded
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftErr, setDraftErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const taRef = useRef(null)

  useEffect(() => {
    fetchWeeklyChange()
      .then(d => setData(d))
      .catch(() => setData(false))
  }, [])

  useEffect(() => {
    if (editing && taRef.current) {
      const el = taRef.current
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [draft, editing])

  function startEdit() {
    setDraft(data?.entries?.[0]?.text || '')
    setDraftErr('')
    setSaveErr('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraftErr('')
    setSaveErr('')
  }

  async function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) { setDraftErr('先寫點東西再存'); return }
    setSaving(true)
    setSaveErr('')
    try {
      const result = await postWeeklyChange({ text: trimmed })
      const today = todayTaipei()
      const newEntry = { id: result.id, text: trimmed, updatedAt: today }
      setData(prev => ({
        ...prev,
        entries: [newEntry, ...(prev?.entries || []).filter(e => e.id !== result.id)]
      }))
      setEditing(false)
    } catch (err) {
      setSaveErr(err.message || '儲存失敗，請再試')
    } finally {
      setSaving(false)
    }
  }

  const CARD_STYLE = { border: '0.5px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }
  const entry = data && data.entries && data.entries[0]
  const birthDate = (data && data.birthDate) || '1980-03-19'
  const weeks = weeksUntilFifty(birthDate)  // always compute; birthDate fallback ensures non-null

  const CountdownBlock = () => (
    <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-slate-200 sm:pr-4 pb-3 sm:pb-0" style={{ minWidth: 80 }}>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>距 50 歲</span>
      {weeks === null ? (
        <span style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>已過 50 歲</span>
      ) : (
        <>
          <span style={{ fontSize: 28, fontWeight: 500, color: '#1e293b', lineHeight: 1.1 }}>
            {weeks}
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>週</span>
        </>
      )}
    </div>
  )

  if (data === null) {
    return (
      <div className="mb-4 bg-white flex flex-col sm:flex-row" style={CARD_STYLE}>
        <CountdownBlock />
        <div className="flex-1 px-4 pt-3 sm:pt-0 flex items-center">
          <span className="text-xs text-slate-400">載入中…</span>
        </div>
      </div>
    )
  }

  if (data === false) {
    return (
      <div className="mb-4 bg-white flex flex-col sm:flex-row" style={CARD_STYLE}>
        <CountdownBlock />
        <div className="flex-1 px-4 pt-3 sm:pt-0 flex items-center">
          <span className="text-sm text-slate-400">讀取失敗</span>
        </div>
        <div className="flex items-center justify-end sm:pl-4 pt-2 sm:pt-0">
          <button disabled className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-300 border border-slate-200 rounded-lg cursor-not-allowed">
            <Pencil size={13} />改
          </button>
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="mb-4 bg-white flex flex-col sm:flex-row" style={{ ...CARD_STYLE, border: '1px solid #3b82f6' }}>
        <CountdownBlock />
        <div className="flex-1 flex flex-col gap-1.5 px-4 pt-3 sm:pt-0">
          <span style={{ fontSize: 11, color: '#94a3b8' }}>本週要改變的</span>
          <textarea
            ref={taRef}
            value={draft}
            onChange={e => { setDraft(e.target.value); if (draftErr) setDraftErr('') }}
            rows={2}
            disabled={saving}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
            style={{ lineHeight: 1.5, overflow: 'hidden' }}
          />
          {draftErr && <span style={{ fontSize: 13, color: '#ef4444' }}>{draftErr}</span>}
          {saveErr && <span style={{ fontSize: 13, color: '#ef4444' }}>{saveErr}</span>}
          <div className="flex justify-end gap-2">
            <button onClick={cancelEdit} disabled={saving} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50">取消</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? '處理中…' : '存檔'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const mmdd = entry ? entry.updatedAt.slice(5) : ''
  const weekN = entry ? isoWeekOf(entry.updatedAt) : null

  return (
    <div className="mb-4 bg-white flex flex-col sm:flex-row" style={CARD_STYLE}>
      <CountdownBlock />
      <div className="flex-1 flex flex-col justify-center gap-0.5 px-4 pt-3 sm:pt-0">
        <span style={{ fontSize: 11, color: '#94a3b8' }}>本週要改變的</span>
        {entry ? (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: '#1e293b', wordBreak: 'break-word' }}>{entry.text}</p>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>更新 {mmdd}・第 {weekN} 週</span>
          </>
        ) : (
          <p style={{ fontSize: 15, color: '#94a3b8' }}>本週還沒定</p>
        )}
      </div>
      <div className="flex items-center justify-end sm:pl-4 pt-2 sm:pt-0">
        <button
          onClick={startEdit}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg transition-colors ${entry ? 'text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-300' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}
        >
          <Pencil size={13} />
          {entry ? '改' : '設定'}
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const [view, setView]           = useState('data')
  const [worldState, setWorldState] = useState(null)
  const [dailyOS, setDailyOS] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const { sessions, refreshSessions } = useSessionContext()
  const navigate  = useNavigate()
  const timerRef  = useRef(null)

  async function loadWorld() {
    const results = await Promise.allSettled([fetchMobileState(), fetchDailyOS()])
    if (results[0].status === 'fulfilled') setWorldState(results[0].value)
    else console.warn('[Home] fetchMobileState failed:', results[0].reason)
    if (results[1].status === 'fulfilled') setDailyOS(results[1].value)
    else console.warn('[Home] fetchDailyOS failed:', results[1].reason)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.allSettled([loadWorld(), refreshSessions()])
    setRefreshing(false)
  }

  useEffect(() => {
    loadWorld()
    timerRef.current = setInterval(handleRefresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = sessions.filter(s => PENDING_STATUSES.includes(s.status)).length

  function handleBotClick(botId) {
    const route = BOT_ROUTE[botId]
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
          <WeeklyChangeCard />
          <WeeklyTop3Card />
          <TodayResultsCard />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
          <PixelCity
            dailyOS={dailyOS}
            state={worldState}
            variant="desktop"
            onOpenDistrict={handleBotClick}
            onOpenWork={() => navigate('/dispatch')}
          />
        </div>
      )}
    </div>
  )
}
