import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { bots } from '../mock/data'
import { fetchPersona, savePersona, fetchAgentTools, fetchAgentModels } from '../api'

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

// Map frontend bot id → backend persona bot name
const PERSONA_BOT_MAP = {
  hy:       'hy',
  xiaoyin:  'family',
  '950157': '950157',
  sam:      'sam',
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

// ─── Persona Modal ──────────────────────────────────────────────

const PERSONA_FIELDS = [
  { key: 'role',        label: '角色定義',   rows: 2 },
  { key: 'scope',       label: '管理範疇',   rows: 2 },
  { key: 'personality', label: '個性風格',   rows: 2 },
  { key: 'interaction', label: '互動方式',   rows: 2 },
  { key: 'dosDonts',    label: '規則 / 禁忌', rows: 3 },
  { key: 'special',     label: '特殊指令',   rows: 2 },
]

function PersonaModal({ personaBot, onClose }) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPersona(personaBot)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [personaBot])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await savePersona(personaBot, data)
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
          <p className="text-sm font-semibold text-slate-800">人設編輯 · {personaBot}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {loading && <p className="text-xs text-slate-400 text-center py-4">載入中…</p>}
          {!loading && PERSONA_FIELDS.map(({ key, label, rows }) => (
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

// ─── Page ──────────────────────────────────────────────────────

export default function AgentConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const bot = bots.find(b => b.id === id)
  const personaBot = PERSONA_BOT_MAP[id]
  const [personaOpen, setPersonaOpen] = useState(false)

  const [tools, setTools] = useState(null)
  const [toolsError, setToolsError] = useState(false)
  const [models, setModels] = useState(null)

  useEffect(() => {
    if (!personaBot) return
    fetchAgentTools(personaBot)
      .then(d => setTools(d.tools))
      .catch(() => setToolsError(true))
  }, [personaBot])

  useEffect(() => {
    fetchAgentModels()
      .then(d => setModels(d.models))
      .catch(() => {})
  }, [])

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
      </div>

      {/* 配置區塊 */}
      <div className="grid grid-cols-1 gap-4">

        {personaBot && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">人設</p>
              <button
                onClick={() => setPersonaOpen(true)}
                className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition-colors"
              >
                編輯
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">role / scope / personality / interaction / dosDonts / special</p>
          </div>
        )}

        <ConfigSection title="Model">
          {models === null ? (
            <p className="text-xs text-slate-400">載入中…</p>
          ) : (
            <ul className="space-y-1">
              {models.map(({ provider, model }) => (
                <li key={provider} className="text-xs text-slate-700 flex items-start gap-1.5">
                  <span className="text-slate-400 font-medium w-14 flex-shrink-0">{provider}</span>
                  <span className="text-slate-500">{model}</span>
                </li>
              ))}
            </ul>
          )}
        </ConfigSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ConfigSection title="Tools">
            {toolsError ? (
              <p className="text-xs text-slate-400">（讀取失敗）</p>
            ) : tools === null ? (
              <p className="text-xs text-slate-400">載入中…</p>
            ) : (
              <ListOrEmpty items={tools} />
            )}
          </ConfigSection>

          <ConfigSection title="Skills">
            <ListOrEmpty items={[]} />
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

      </div>

      {personaOpen && personaBot && (
        <PersonaModal personaBot={personaBot} onClose={() => setPersonaOpen(false)} />
      )}
    </div>
  )
}
