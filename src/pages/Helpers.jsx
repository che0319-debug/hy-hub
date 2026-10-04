import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchMemoryHealth } from '../api'
import MemoryCenter from './MemoryCenter'
import { freshness } from '../lib/memoryFreshness'

const BOT_META = {
  hy:      { name: 'HY',     role: '個人核心・總管' },
  '950157':{ name: '950157', role: 'ITRI 工作分身' },
  family:  { name: '小因',   role: '家庭守護者' },
  sam:     { name: 'Sam',    role: '副業統籌' },
}
const BOT_ORDER = ['hy', '950157', 'family', 'sam']
const AGENT_ROUTE_ID = { hy: 'hy', '950157': '950157', family: 'xiaoyin', sam: 'sam' }
// 綠＝今天／昨天；黑＝2–7 天；紅＝超過 7 天（長期記憶與短期記憶同一套規則）
const LEVEL_STYLE = {
  fresh: { color: 'text-green-600', icon: '✅' },
  aging: { color: 'text-slate-900', icon: '' },
  stale: { color: 'text-red-500', icon: '🔴' },
  none:  { color: 'text-slate-400', icon: '' },
}

function HealthRow({ rowLabel, isoStr }) {
  const h = freshness(isoStr)
  const { color, icon } = LEVEL_STYLE[h.level]
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-xs text-slate-400 w-16 flex-shrink-0">{rowLabel}</span>
      <span className={color}>{icon && `${icon} `}{h.label}</span>
    </div>
  )
}

function BotCard({ botId, health }) {
  const meta    = BOT_META[botId]
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
          ⚙ 人設與記憶
        </Link>
      </div>
      <div className="flex flex-col gap-1.5">
        <HealthRow rowLabel="長期記憶" isoStr={health?.memory_last} />
        <HealthRow rowLabel="短期記憶" isoStr={health?.short_term_last} />
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
      <div className="mb-6 ml-5 flex items-center gap-3"><p className="text-sm text-slate-400">Bot 狀態、記憶與學習狀況</p></div>

      {loading && <p className="text-sm text-slate-400">載入中…</p>}
      {error   && <p className="text-sm text-red-400">無法載入：{error}</p>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {BOT_ORDER.map(id => (
            <BotCard key={id} botId={id} health={bots?.[id]} />
          ))}
        </div>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <MemoryCenter embedded />
      </div>
    </div>
  )
}
