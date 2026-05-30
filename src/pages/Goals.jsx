import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { goalsData, computeScore } from '../mock/data'

const BOT_DISPLAY = {
  hy:       { name: 'HY',     color: 'bg-blue-100 text-blue-700' },
  xiaoyin:  { name: '小因',   color: 'bg-purple-100 text-purple-700' },
  '950157': { name: '950157', color: 'bg-orange-100 text-orange-700' },
  sam:      { name: 'Sam',    color: 'bg-green-100 text-green-700' },
}

// 協作下拉：value=bot id（空字串=無）
const COLLAB_OPTIONS = [
  { value: '',        label: '無' },
  { value: 'xiaoyin', label: '小因' },
  { value: '950157',  label: '950157' },
  { value: 'sam',     label: 'Sam' },
]

// 三層常數表：label/emoji/desc/進度條色/badge 色
const LAYER_CONFIG = {
  engine:  { label: '引擎層', emoji: '⚙️',  desc: '推進自由',    barColor: 'bg-blue-500',  badgeColor: 'bg-blue-100 text-blue-600' },
  base:    { label: '地基層', emoji: '🛡️', desc: '守住才跑得動', barColor: 'bg-amber-400', badgeColor: 'bg-amber-100 text-amber-700' },
  sustain: { label: '續航層', emoji: '🔋',  desc: '自我滿足',    barColor: 'bg-slate-400', badgeColor: 'bg-slate-100 text-slate-500' },
}
const LAYER_ORDER = ['engine', 'base', 'sustain']

// 分數變色：<50 紅 / 50-79 黃 / ≥80 綠
function scoreColor(score) {
  if (score >= 80) return { border: 'border-green-400', text: 'text-green-600' }
  if (score >= 50) return { border: 'border-yellow-400', text: 'text-yellow-600' }
  return { border: 'border-red-400', text: 'text-red-500' }
}

function AgentChip({ id }) {
  const cfg = BOT_DISPLAY[id] ?? { name: id, color: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.name}
    </span>
  )
}

// 維度層 agent chip：取第一個有 collaborator 的目標；全無 → HY
function dimAgent(dim) {
  return dim.goals.find(g => g.collaborator)?.collaborator ?? 'hy'
}

function AddGoalForm({ onAdd, onCancel }) {
  const [title, setTitle] = useState('')
  const [current, setCurrent] = useState('')
  const [required, setRequired] = useState(false)
  const [collaborator, setCollaborator] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({ title: title.trim(), current, required, collaborator: collaborator || null })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="目標名稱"
          className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400"
          autoFocus
        />
        <input
          value={current}
          onChange={e => setCurrent(e.target.value)}
          placeholder="目前進度（選填）"
          className="w-36 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400"
        />
      </div>
      <div className="flex gap-3 items-center flex-wrap">
        <select
          value={collaborator}
          onChange={e => setCollaborator(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-white"
        >
          {COLLAB_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          確認
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  )
}

export default function Goals() {
  const navigate = useNavigate()
  // 深拷貝 mock，不污染原物件；重整即還原
  const [dimensions, setDimensions] = useState(() => structuredClone(goalsData.dimensions))
  const [addGoalDimId, setAddGoalDimId] = useState(null)
  const [showAddDim, setShowAddDim] = useState(false)
  const [newDimName, setNewDimName] = useState('')
  const [saveMsg, setSaveMsg] = useState('')

  const { freedomIndex } = goalsData
  const score = computeScore(dimensions)

  // required 欄位保留待未來「關卡/解鎖條件」系統復用（H13 暫不顯示）

  // --- 維度操作 ---
  function addDimension() {
    if (!newDimName.trim()) return
    setDimensions(prev => [
      ...prev,
      { id: `dim-${Date.now()}`, name: newDimName.trim(), goals: [] },
    ])
    setNewDimName('')
    setShowAddDim(false)
  }

  function deleteDimension(dimId) {
    setDimensions(prev => prev.filter(d => d.id !== dimId))
  }

  // --- 目標操作 ---
  function addGoal(dimId, { title, current, required, collaborator }) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : {
        ...d,
        goals: [
          ...d.goals,
          { id: `g-${Date.now()}`, title, current, required, achieved: false, owner: 'HY', collaborator },
        ],
      }
    ))
    setAddGoalDimId(null)
  }

  function deleteGoal(dimId, goalId) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : { ...d, goals: d.goals.filter(g => g.id !== goalId) }
    ))
  }

  function toggleGoalField(dimId, goalId, field) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : {
        ...d,
        goals: d.goals.map(g =>
          g.id !== goalId ? g : { ...g, [field]: !g[field] }
        ),
      }
    ))
  }

  function updateCollaborator(dimId, goalId, value) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : {
        ...d,
        goals: d.goals.map(g =>
          g.id !== goalId ? g : { ...g, collaborator: value || null }
        ),
      }
    ))
  }

  function handleSave() {
    setSaveMsg('已暫存（mock·重整還原；持久化待接後端）')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const colors = scoreColor(score)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold text-slate-800">人生目標對齊</h1>

      {/* 北極星大卡：人生自由指數 */}
      <section>
        <div className={`bg-white rounded-xl p-6 border-2 ${colors.border} shadow-sm transition-colors`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-500">🧭 人生自由指數</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">mock · 公式待校準</span>
          </div>
          <div className={`text-5xl font-bold mt-2 transition-colors ${colors.text}`}>
            {score}
            <span className="text-2xl font-normal text-slate-400 ml-1">/ 100</span>
          </div>
          <div className="mt-3 text-sm text-slate-500">{freedomIndex.note}</div>
        </div>
      </section>

      {/* 三層總覽 */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">維度進度總覽</h2>
        <div className="space-y-4">
          {LAYER_ORDER.map(layerKey => {
            const cfg  = LAYER_CONFIG[layerKey]
            const dims = dimensions.filter(d => d.layer === layerKey)
            if (dims.length === 0) return null
            return (
              <div key={layerKey} className="bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                  <span className="text-sm">{cfg.emoji}</span>
                  <span className="text-sm font-semibold text-slate-700">{cfg.label}</span>
                  <span className="text-xs text-slate-400">— {cfg.desc}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {dims.map(dim => {
                    const dimAchieved = dim.goals.filter(g => g.achieved).length
                    const dimTotal    = dim.goals.length
                    const pct         = dim.progress != null ? dim.progress : (dimTotal > 0 ? Math.round((dimAchieved / dimTotal) * 100) : 0)
                    const noData      = dim.progress == null && (dimTotal === 0 || (dimAchieved === 0 && !dim.current))
                    const collab      = dimAgent(dim)
                    return (
                      <div key={dim.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-32 flex-shrink-0">
                          <div className="text-sm text-slate-700 truncate">{dim.name}</div>
                          {dim.current ? (
                            <div className="text-xs text-slate-400 truncate mt-0.5">{dim.current}</div>
                          ) : (
                            <div className="text-xs text-slate-300 mt-0.5">—</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-slate-400 truncate mb-1">{dim.totalGoal ?? ''}</div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            {noData ? (
                              <div className="h-full w-full bg-slate-100 rounded-full" />
                            ) : (
                              <div
                                className={`h-full ${cfg.barColor} rounded-full transition-all`}
                                style={{ width: `${pct}%` }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 w-16 text-right flex-shrink-0">
                          {noData
                            ? <span className="text-slate-300">待設定</span>
                            : dim.progress != null
                              ? <>{pct}%</>
                              : <>{dimAchieved}/{dimTotal}（{pct}%）</>
                          }
                        </div>
                        <div className="flex-shrink-0">
                          <AgentChip id={collab} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 維度詳情（H12 互動完整保留，加層級 badge + totalGoal 行）*/}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">維度詳情</h2>
        <div className="space-y-4">
          {dimensions.map(dim => {
            const layerCfg = LAYER_CONFIG[dim.layer]
            return (
              <div key={dim.id} className="bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-slate-800 text-sm truncate">{dim.name}</span>
                    {layerCfg && (
                      <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${layerCfg.badgeColor}`}>
                        {layerCfg.label}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteDimension(dim.id)}
                    className="flex-shrink-0 text-xs text-slate-300 hover:text-red-400 transition-colors"
                  >
                    刪除維度
                  </button>
                </div>
                {/* 總目標 + 現況 */}
                {dim.totalGoal && (
                  <div className="px-4 pt-2.5 pb-1 text-xs text-slate-500">
                    <span className="text-slate-400">總目標：</span>{dim.totalGoal}
                    {dim.current && (
                      <span className="ml-3 text-slate-400">現況：<span className="text-slate-600">{dim.current}</span></span>
                    )}
                  </div>
                )}
                <div className="px-4">
                  {dim.goals.length === 0 && (
                    <div className="py-3 text-xs text-slate-400 italic">尚無目標 · 待設定</div>
                  )}
                  <div className="divide-y divide-slate-50">
                    {dim.goals.map(goal => (
                      <div key={goal.id} className="py-3 flex flex-col gap-1.5 group">
                        <div className="flex items-start gap-2">
                          {/* 已達成 toggle */}
                          <button
                            onClick={() => toggleGoalField(dim.id, goal.id, 'achieved')}
                            className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                              goal.achieved
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-slate-300 hover:border-green-400'
                            }`}
                            title="切換已達成"
                          >
                            {goal.achieved && <span className="text-[10px] leading-none">✓</span>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm ${goal.achieved ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {goal.title}
                            </span>
                            {goal.current && (
                              <span className="ml-2 text-xs text-slate-400">目前：{goal.current}</span>
                            )}
                          </div>
                          {/* 刪除目標 */}
                          <button
                            onClick={() => deleteGoal(dim.id, goal.id)}
                            className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                        {/* 關聯 agent */}
                        <div className="flex items-center gap-2 pl-6 text-xs text-slate-500 flex-wrap">
                          <span>Owner：</span>
                          <AgentChip id="hy" />
                          <span>協作：</span>
                          <select
                            value={goal.collaborator ?? ''}
                            onChange={e => updateCollaborator(dim.id, goal.id, e.target.value)}
                            className="text-xs border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-blue-400 bg-white"
                          >
                            {COLLAB_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          {goal.collaborator && (
                            <>
                              <AgentChip id={goal.collaborator} />
                              <span className="text-slate-400">推進中</span>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => navigate('/line/' + goal.collaborator)}
                                className="text-blue-500 hover:text-blue-700 underline transition-colors"
                              >
                                查看 milestone
                              </button>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-400 italic">agent 自動拆解建議 · 待接後端</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 新增目標 */}
                  {addGoalDimId === dim.id ? (
                    <div className="py-3 border-t border-slate-100">
                      <AddGoalForm
                        onAdd={g => addGoal(dim.id, g)}
                        onCancel={() => setAddGoalDimId(null)}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddGoalDimId(dim.id)}
                      className="my-2 w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-blue-600 py-1.5 border border-dashed border-slate-200 hover:border-blue-300 rounded-lg transition-colors"
                    >
                      + 新增目標
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* 新增維度 */}
          {showAddDim ? (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex gap-2 items-center">
              <input
                value={newDimName}
                onChange={e => setNewDimName(e.target.value)}
                placeholder="維度名稱"
                className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400"
                onKeyDown={e => e.key === 'Enter' && addDimension()}
                autoFocus
              />
              <button
                onClick={addDimension}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                確認
              </button>
              <button
                onClick={() => { setShowAddDim(false); setNewDimName('') }}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddDim(true)}
              className="w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-blue-600 py-2 border border-dashed border-slate-200 hover:border-blue-300 rounded-xl transition-colors"
            >
              + 新增維度
            </button>
          )}
        </div>
      </section>

      {/* 儲存占位（不真寫入）*/}
      <div className="flex items-center gap-4 pb-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          儲存總體目標
        </button>
        {saveMsg && (
          <span className="text-sm text-slate-500 italic">{saveMsg}</span>
        )}
      </div>
    </div>
  )
}
