import { useState, useEffect } from 'react'
import { Wrench, Clock, Cpu, Sparkles, Database, Server, ExternalLink, User } from 'lucide-react'
import { bots } from '../mock/data'
import { fetchProfile, saveProfile } from '../api'

// 彙整：tool → 使用的 agent name 清單
const toolMap = {}
bots.forEach(b => (b.tools || []).forEach(t => {
  (toolMap[t] ||= []).push(b.name)
}))

// 彙整：[ { trigger, agentName } ]，依 agent 順序排列
const allTriggers = bots.flatMap(b =>
  (b.triggers || []).map(t => ({ trigger: t, agentName: b.name }))
)

// 彙整：model → 使用的 agent name 清單（去重）
const modelMap = {}
bots.forEach(b => {
  (modelMap[b.model] ||= []).push(b.name)
})

// ─── 共用小元件 ────────────────────────────────────────────────

function Badge({ text, color = 'bg-slate-100 text-slate-500' }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {text}
    </span>
  )
}

function Section({ icon: Icon, title, badge, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-slate-700">{title}</p>
        </div>
        <Badge text={badge} />
      </div>
      {children}
    </div>
  )
}

function AgentTags({ names }) {
  return (
    <span className="flex flex-wrap gap-1 ml-1">
      {names.map(n => (
        <span key={n} className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded">
          {n}
        </span>
      ))}
    </span>
  )
}

// ─── Profile Modal ──────────────────────────────────────────────

const PROFILE_FIELDS = [
  { key: 'basic',     label: '基本資料',   rows: 3 },
  { key: 'stage',     label: '人生階段',   rows: 2 },
  { key: 'values',    label: '價值觀',     rows: 2 },
  { key: 'workStyle', label: '工作風格',   rows: 3 },
  { key: 'commStyle', label: '溝通風格',   rows: 3 },
  { key: 'relations', label: '家庭 / 社交', rows: 2 },
  { key: 'taboos',    label: '禁忌',       rows: 2 },
  { key: 'goalFocus', label: '目標焦點',   rows: 2 },
]

function ProfileModal({ onClose }) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProfile()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await saveProfile(data)
      onClose()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">我的資料</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {loading && <p className="text-xs text-slate-400 text-center py-4">載入中…</p>}
          {!loading && PROFILE_FIELDS.map(({ key, label, rows }) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 mb-1">{label}</label>
              <textarea
                rows={rows}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={data[key] ?? ''}
                onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
                disabled={saving}
              />
            </div>
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-50"
          >
            關閉
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '儲存中…' : '存檔'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 六區塊 ────────────────────────────────────────────────────

function MyDataCard({ onEdit }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <User size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-slate-700">我的資料</p>
        </div>
        <button
          onClick={onEdit}
          className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition-colors"
        >
          編輯
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">profile · persona 各 bot 共讀</p>
    </div>
  )
}

function ToolRegistry() {
  return (
    <Section icon={Wrench} title="Tool 註冊" badge="彙整自各 agent">
      <ul className="space-y-2">
        {Object.entries(toolMap).map(([tool, agents]) => (
          <li key={tool} className="flex items-start gap-2 text-xs">
            <span className="text-slate-300 mt-0.5 flex-shrink-0">·</span>
            <span className="text-slate-700 flex-shrink-0">{tool}</span>
            <AgentTags names={agents} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function CronTable() {
  return (
    <Section icon={Clock} title="cron 總表" badge="彙整自各 agent · 外連管理後台">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-left">
              <th className="pb-2 font-medium w-36">Agent</th>
              <th className="pb-2 font-medium">排程</th>
            </tr>
          </thead>
          <tbody>
            {allTriggers.map(({ trigger, agentName }, i) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="py-1.5 text-blue-600 font-medium">{agentName}</td>
                <td className="py-1.5 text-slate-700">{trigger}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100 items-center">
        <a
          href="https://cron-job.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-100 transition-colors"
        >
          <ExternalLink size={11} />
          cron-job.org
        </a>
        <a
          href="https://dashboard.render.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-100 transition-colors"
        >
          <ExternalLink size={11} />
          Render Logs
        </a>
        <span className="text-xs text-slate-400">（深連結待 HY 補）</span>
      </div>
    </Section>
  )
}

function ModelList() {
  return (
    <Section icon={Cpu} title="模型清單" badge="現況模型 · 目標態待拍板">
      <ul className="space-y-2 mb-4">
        {Object.entries(modelMap).map(([model, agents]) => (
          <li key={model} className="flex items-start gap-2 text-xs">
            <span className="text-slate-300 mt-0.5 flex-shrink-0">·</span>
            <span className="text-slate-700 flex-shrink-0">{model}</span>
            <AgentTags names={agents} />
          </li>
        ))}
      </ul>
      <div className="pt-3 border-t border-slate-100 flex gap-6">
        <div>
          <p className="text-xs text-slate-400">金鑰管理</p>
          <p className="text-xs text-slate-400 italic">待接後端</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">用量統計</p>
          <p className="text-xs text-slate-400 italic">待接後端</p>
        </div>
      </div>
    </Section>
  )
}

function SkillLibrary() {
  return (
    <Section icon={Sparkles} title="Skill 庫" badge="藍圖目標 · 尚未實作">
      <p className="text-xs text-slate-400">
        （尚無）藍圖 §5 目標能力，系統尚未實作 skill 熱插拔。
      </p>
    </Section>
  )
}

function McpConnectors() {
  return (
    <Section icon={Database} title="MCP 連接器" badge="藍圖目標 · 尚未實作">
      <p className="text-xs text-slate-400">
        （尚無）目標態對接外部系統用，現況未實作。
      </p>
    </Section>
  )
}

function EnvDeploy() {
  return (
    <Section icon={Server} title="環境 / 部署" badge="現況 Render · 移植目標 Zeabur">
      <div className="space-y-2 text-xs">
        <div>
          <p className="text-slate-400 mb-0.5">現況</p>
          <p className="text-slate-700">Bot 後端：Render（telegram-bot-t82n.onrender.com）</p>
          <p className="text-slate-700">Hub 前端：GitHub Pages（目標部署位置）</p>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <p className="text-slate-400 mb-0.5">移植目標</p>
          <p className="text-slate-700">Zeabur — service 編排、Redis / Postgres+pgvector</p>
          <p className="text-slate-400 italic mt-0.5">（移植規劃中，尚未遷移）</p>
        </div>
      </div>
    </Section>
  )
}

// ─── 頁面主體 ──────────────────────────────────────────────────

export default function Settings() {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-3 h-3 rounded-full bg-slate-500" />
        <h1 className="text-xl font-bold text-slate-800">設定 · 平台全域</h1>
      </div>
      <p className="text-sm text-slate-400 mb-6 ml-5">跨 agent 共享資源 · 環境 · 監控</p>

      <div className="flex flex-col gap-4">
        <MyDataCard onEdit={() => setProfileOpen(true)} />
        <ToolRegistry />
        <CronTable />
        <ModelList />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkillLibrary />
          <McpConnectors />
          <EnvDeploy />
        </div>
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
