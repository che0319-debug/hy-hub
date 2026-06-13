import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchMemoryHealth } from '../api'

const BOT_META = {
  hy:      { name: 'HY',     role: '個人核心・總管' },
  '950157':{ name: '950157', role: 'ITRI 工作分身' },
  family:  { name: '小因',   role: '家庭守護者' },
  sam:     { name: 'Sam',    role: '副業統籌' },
}
const BOT_ORDER = ['hy', '950157', 'family', 'sam']
const AGENT_ROUTE_ID = { hy: 'hy', '950157': '950157', family: 'xiaoyin', sam: 'sam' }
const TZ = 'Asia/Taipei'

function taipeiDateStr(ts) {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: TZ })
}

function relTime(isoStr) {
  if (!isoStr) return null
  const ts = new Date(isoStr).getTime()
  if (isNaN(ts)) return null
  const nowStr = taipeiDateStr(Date.now())
  const tsStr  = taipeiDateStr(ts)
  if (tsStr === nowStr) {
    const hhmm = new Date(ts).toLocaleTimeString('zh-TW', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
    return `今天 ${hhmm}`
  }
  const yesterday = taipeiDateStr(Date.now() - 86400000)
  if (tsStr === yesterday) return '昨天'
  const days = Math.round((new Date(nowStr) - new Date(tsStr)) / 86400000)
  return `${days} 天前`
}

function dailyHealth(isoStr) {
  if (!isoStr) return { ok: null, label: '無資料' }
  const diffMs = Date.now() - new Date(isoStr).getTime()
  return {
    ok: diffMs <= 36 * 3600000,
    label: relTime(isoStr) || isoStr,
  }
}

function reviewsHealth(dateStr) {
  if (!dateStr) return { ok: null, label: '無資料' }
  const nowStr = taipeiDateStr(Date.now())
  const days = Math.round((new Date(nowStr) - new Date(dateStr)) / 86400000)
  const label = days === 0 ? '今天' : days === 1 ? '昨天' : `${days} 天前`
  return { ok: days <= 8, label }
}

function HealthRow({ rowLabel, h }) {
  const color = h.ok === null ? 'text-slate-400' : h.ok ? 'text-green-600' : 'text-red-500'
  const icon  = h.ok === null ? '' : h.ok ? '✅' : '🔴'
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-xs text-slate-400 w-16 flex-shrink-0">{rowLabel}</span>
      <span className={color}>{icon && `${icon} `}{h.label}</span>
    </div>
  )
}

function BotCard({ botId, health }) {
  const meta    = BOT_META[botId]
  const daily   = dailyHealth(health?.daily_last)
  const reviews = reviewsHealth(health?.reviews_last)
  const agentId = AGENT_ROUTE_ID[botId]
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-slate-800">{meta.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{meta.role}</p>
        </div>
        <Link
          to={`/agent/${agentId}`}
          className="text-xs text-slate-400 hover:text-blue-600 flex-shrink-0 mt-0.5"
        >
          ⚙ 人設
        </Link>
      </div>
      <div className="flex flex-col gap-1.5">
        <HealthRow rowLabel="記憶更新" h={daily} />
        <HealthRow rowLabel="週覆盤"   h={reviews} />
      </div>
    </div>
  )
}

export default function Helpers() {
  const [bots, setBots]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetchMemoryHealth()
      .then(data => { setBots(data.bots); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [])

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">我的小幫手</h1>
      </div>
      <p className="text-sm text-slate-400 mb-6 ml-5">記憶健康探針 · 最後更新時間</p>

      {loading && <p className="text-sm text-slate-400">載入中…</p>}
      {error   && <p className="text-sm text-red-400">無法載入：{error}</p>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {BOT_ORDER.map(id => (
            <BotCard key={id} botId={id} health={bots?.[id]} />
          ))}
        </div>
      )}
    </div>
  )
}
