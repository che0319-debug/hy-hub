import { useParams, useNavigate } from 'react-router-dom'
import { bots } from '../mock/data'

const STATUS_COLOR = {
  running: 'bg-blue-500',
  idle:    'bg-slate-300',
  collab:  'bg-green-500',
  error:   'bg-red-500',
}

const STATUS_LABEL = {
  running: '執行中',
  idle:    '閒置',
  collab:  '協作中',
  error:   '出錯',
}

function MockBadge() {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
      mock · 待接 API 核對
    </span>
  )
}

function ConfigSection({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <p className="text-xs font-semibold text-slate-500 mb-3">{title}</p>
      {children}
    </div>
  )
}

function ListOrEmpty({ items }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-slate-400">（尚無）</p>
  }
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
          <span className="text-slate-300 mt-0.5">·</span>
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function AgentConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const bot = bots.find(b => b.id === id)

  if (!bot) {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm text-center">
        <p className="text-slate-500 mb-4">找不到此 agent：<code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{id}</code></p>
        <button
          onClick={() => navigate('/helpers')}
          className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-100 transition-colors"
        >
          ← 返回我的小幫手
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* 頂部返回 + 標頭 */}
      <button
        onClick={() => navigate('/helpers')}
        className="mb-4 text-xs text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1"
      >
        ← 返回我的小幫手
      </button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <span
            title={STATUS_LABEL[bot.status] ?? bot.status}
            className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${STATUS_COLOR[bot.status] ?? 'bg-slate-300'}`}
          />
          <div>
            <h1 className="text-xl font-bold text-slate-800">{bot.name}</h1>
            <p className="text-sm text-slate-500">{bot.role}</p>
          </div>
        </div>
        <MockBadge />
      </div>

      {/* 配置區塊 */}
      <div className="grid grid-cols-1 gap-4">

        <ConfigSection title="Model">
          <p className="text-sm text-slate-800 font-medium">{bot.model}</p>
        </ConfigSection>

        <ConfigSection title="System Prompt">
          <p className="text-sm text-slate-700 leading-relaxed">{bot.systemPrompt}</p>
        </ConfigSection>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ConfigSection title="Tools">
            <ListOrEmpty items={bot.tools} />
          </ConfigSection>

          <ConfigSection title="MCP Servers">
            <ListOrEmpty items={bot.mcpServers} />
          </ConfigSection>

          <ConfigSection title="Skills">
            <ListOrEmpty items={bot.skills} />
          </ConfigSection>
        </div>

        <ConfigSection title="Memory">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Scope</p>
              <p className="text-xs text-slate-700">{bot.memory.scope}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Store</p>
              <p className="text-xs text-slate-700">{bot.memory.store}</p>
            </div>
          </div>
        </ConfigSection>

        <ConfigSection title="Triggers / 排程">
          <ListOrEmpty items={bot.triggers} />
        </ConfigSection>

      </div>
    </div>
  )
}
