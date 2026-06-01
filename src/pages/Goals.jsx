import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { computeScore } from '../mock/data'
import { fetchLifeGoals, saveLifeGoals } from '../api'

const BOT_DISPLAY = {
  hy:       { name: 'HY',     color: 'bg-blue-100 text-blue-700' },
  xiaoyin:  { name: '小因',   color: 'bg-purple-100 text-purple-700' },
  '950157': { name: '950157', color: 'bg-orange-100 text-orange-700' },
  sam:      { name: 'Sam',    color: 'bg-green-100 text-green-700' },
}

const COLLAB_OPTIONS = [
  { value: '',        label: '無' },
  { value: 'xiaoyin', label: '小因' },
  { value: '950157',  label: '950157' },
  { value: 'sam',     label: 'Sam' },
]

const LAYER_CONFIG = {
  engine:  { label: '引擎層', emoji: '⚙️',  desc: '推進自由',    barColor: 'bg-blue-500',  badgeColor: 'bg-blue-100 text-blue-600' },
  base:    { label: '地基層', emoji: '🛡️', desc: '守住才跑得動', barColor: 'bg-amber-400', badgeColor: 'bg-amber-100 text-amber-700' },
  sustain: { label: '續航層', emoji: '🔋',  desc: '自我滿足',    barColor: 'bg-slate-400', badgeColor: 'bg-slate-100 text-slate-500' },
}
const LAYER_ORDER = ['engine', 'base', 'sustain']

function scoreColor(score) {
  if (score >= 80) return { border: 'border-green-400', text: 'text-green-600' }
  if (score >= 50) return { border: 'border-yellow-400', text: 'text-yellow-600' }
  return { border: 'border-red-400', text: 'text-red-500' }
}

function AgentChip({ id, small }) {
  const cfg = BOT_DISPLAY[id] ?? { name: id, color: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-block rounded-full font-medium ${cfg.color} ${small ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-xs'}`}>
      {cfg.name}
    </span>
  )
}

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
        <button type="submit" className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">確認</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">取消</button>
      </div>
    </form>
  )
}

function DimEditForm({ dim, onSave, onDelete, onCancel }) {
  const [name, setName] = useState(dim.name)
  const [weight, setWeight] = useState(dim.weight ?? 0)
  const [progress, setProgress] = useState(dim.progress ?? 0)
  const [totalGoal, setTotalGoal] = useState(dim.totalGoal ?? '')
  const [layer, setLayer] = useState(dim.layer ?? 'engine')

  function submit(e) {
    e.preventDefault()
    onSave({ name, weight: Number(weight), progress: Number(progress), totalGoal, layer })
  }

  return (
    <form onSubmit={submit} className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-2 text-xs">
      <div className="flex gap-1.5">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="維度名稱"
          className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white text-xs" />
        <select value={layer} onChange={e => setLayer(e.target.value)}
          className="border border-slate-200 rounded px-1.5 py-1 outline-none bg-white text-xs">
          <option value="engine">引擎</option>
          <option value="base">地基</option>
          <option value="sustain">續航</option>
        </select>
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-slate-500 flex-shrink-0">權重</label>
        <input type="number" min="0" max="100" value={weight} onChange={e => setWeight(e.target.value)}
          className="w-16 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white text-xs" />
        <span className="text-slate-400">%</span>
        <label className="text-slate-500 flex-shrink-0 ml-2">進度</label>
        <input type="number" min="0" max="100" value={progress} onChange={e => setProgress(e.target.value)}
          className="w-16 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white text-xs" />
        <span className="text-slate-400">%</span>
      </div>
      <input value={totalGoal} onChange={e => setTotalGoal(e.target.value)} placeholder="總目標（選填）"
        className="border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white text-xs" />
      <div className="flex gap-1.5 items-center">
        <button type="submit" className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">確認</button>
        <button type="button" onClick={onCancel} className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">取消</button>
        <button type="button" onClick={() => { if (window.confirm(`刪除維度「${dim.name}」？`)) onDelete() }}
          className="ml-auto px-2.5 py-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">刪除</button>
      </div>
    </form>
  )
}

export default function Goals() {
  const navigate = useNavigate()
  const [dimensions, setDimensions] = useState([])
  const [freedomIndex, setFreedomIndex] = useState({ note: '', formula: '' })
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [addGoalDimId, setAddGoalDimId] = useState(null)
  const [showAddDim, setShowAddDim] = useState(false)
  const [newDimName, setNewDimName] = useState('')
  const [newDimLayer, setNewDimLayer] = useState('engine')
  const [saveMsg, setSaveMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingDimId, setEditingDimId] = useState(null)

  useEffect(() => {
    fetchLifeGoals()
      .then(data => {
        setDimensions(structuredClone(data.dimensions || []))
        setFreedomIndex(data.freedomIndex || { note: '', formula: '' })
        setDataLoaded(true)
      })
      .catch(err => {
        setLoadError(err.message)
        setDataLoaded(false)
      })
  }, [])

  const score = computeScore(dimensions)
  const weightSum = dimensions.reduce((s, d) => s + (d.weight || 0), 0)
  const colors = scoreColor(score)

  function addDimension() {
    if (!newDimName.trim()) return
    setDimensions(prev => [...prev, {
      id: `dim-${Date.now()}`,
      name: newDimName.trim(),
      layer: newDimLayer,
      weight: 0,
      progress: 0,
      totalGoal: '',
      current: '',
      goals: [],
    }])
    setNewDimName('')
    setNewDimLayer('engine')
    setShowAddDim(false)
  }

  function deleteDimension(dimId) {
    setDimensions(prev => prev.filter(d => d.id !== dimId))
  }

  function updateDimFields(dimId, fields) {
    setDimensions(prev => prev.map(d => d.id !== dimId ? d : { ...d, ...fields }))
    setEditingDimId(null)
  }

  function addGoal(dimId, { title, current, required, collaborator }) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : {
        ...d,
        goals: [...d.goals, { id: `g-${Date.now()}`, title, current, required, achieved: false, owner: 'HY', collaborator }],
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
        goals: d.goals.map(g => g.id !== goalId ? g : { ...g, [field]: !g[field] }),
      }
    ))
  }

  function updateCollaborator(dimId, goalId, value) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : {
        ...d,
        goals: d.goals.map(g => g.id !== goalId ? g : { ...g, collaborator: value || null }),
      }
    ))
  }

  async function handleSave() {
    if (!dataLoaded) return
    setSaving(true)
    try {
      await saveLifeGoals({ freedomIndex, dimensions })
      setSaveMsg('✅ 已儲存')
    } catch (err) {
      setSaveMsg(`⚠️ 儲存失敗：${err.message}`)
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 4000)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <h1 className="text-xl font-bold text-slate-800">人生目標對齊</h1>

      {/* 載入失敗提示 */}
      {loadError && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          ⚠ 離線模式（禁止儲存）：{loadError}
        </div>
      )}

      {/* 北極星大卡：人生自由指數 */}
      <section>
        <div className={`bg-white rounded-xl p-6 border-2 ${colors.border} shadow-sm transition-colors`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-500">🧭 人生自由指數</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
              {freedomIndex.formula || '公式待校準'}
            </span>
          </div>
          <div className={`text-5xl font-bold mt-2 transition-colors ${colors.text}`}>
            {score}
            <span className="text-2xl font-normal text-slate-400 ml-1">/ 100</span>
          </div>
          <div className="mt-3 text-sm text-slate-500">{freedomIndex.note}</div>
          {/* 權重總和提醒 */}
          <div className="mt-2">
            {weightSum !== 100 && dimensions.length > 0 && (
              <span className={`text-xs font-medium ${weightSum > 100 ? 'text-red-500' : 'text-amber-600'}`}>
                ⚠ 權重總和 {weightSum}%，差 {100 - weightSum}% 待分配
              </span>
            )}
            {weightSum === 100 && dimensions.length > 0 && (
              <span className="text-xs text-green-600">✓ 權重總和 100%</span>
            )}
          </div>
        </div>
      </section>

      {/* 三層總覽：三欄並排 */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">維度進度總覽</h2>
        <div className="grid grid-cols-3 gap-4">
          {LAYER_ORDER.map(layerKey => {
            const cfg  = LAYER_CONFIG[layerKey]
            const dims = dimensions.filter(d => d.layer === layerKey)
            return (
              <div key={layerKey} className="bg-white rounded-xl border border-slate-200">
                <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-1.5">
                  <span className="text-sm">{cfg.emoji}</span>
                  <span className="text-sm font-semibold text-slate-700">{cfg.label}</span>
                  <span className="text-xs text-slate-400 hidden xl:inline">— {cfg.desc}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {dims.length === 0 && (
                    <div className="px-3 py-3 text-xs text-slate-300 italic">此層無維度</div>
                  )}
                  {dims.map(dim => {
                    const dimAchieved = dim.goals.filter(g => g.achieved).length
                    const dimTotal    = dim.goals.length
                    const pct = dim.progress != null
                      ? dim.progress
                      : (dimTotal > 0 ? Math.round((dimAchieved / dimTotal) * 100) : 0)
                    const isEditing = editingDimId === dim.id
                    return (
                      <div key={dim.id} className="px-3 py-2.5">
                        <div
                          className="flex items-baseline justify-between cursor-pointer group"
                          onClick={() => setEditingDimId(isEditing ? null : dim.id)}
                        >
                          <span className="text-sm font-medium text-slate-700 truncate">{dim.name}</span>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                            <span className="text-xs text-slate-400">{pct}%</span>
                            <span className="text-[10px] text-slate-300 group-hover:text-blue-400 transition-colors">✎</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {dim.totalGoal || '—'}
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full ${cfg.barColor} rounded-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1.5">
                          <AgentChip id={dimAgent(dim)} small />
                        </div>
                        {isEditing && (
                          <DimEditForm
                            dim={dim}
                            onSave={fields => updateDimFields(dim.id, fields)}
                            onDelete={() => { deleteDimension(dim.id); setEditingDimId(null) }}
                            onCancel={() => setEditingDimId(null)}
                          />
                        )}
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
                          <button
                            onClick={() => deleteGoal(dim.id, goal.id)}
                            className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
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
              <select
                value={newDimLayer}
                onChange={e => setNewDimLayer(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-white"
              >
                <option value="engine">引擎層</option>
                <option value="base">地基層</option>
                <option value="sustain">續航層</option>
              </select>
              <button onClick={addDimension} className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">確認</button>
              <button onClick={() => { setShowAddDim(false); setNewDimName('') }} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">取消</button>
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

      {/* 儲存 */}
      <div className="flex items-center gap-4 pb-4">
        <button
          onClick={handleSave}
          disabled={!dataLoaded || saving}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? '儲存中…' : '儲存總體目標'}
        </button>
        {!dataLoaded && !loadError && (
          <span className="text-sm text-slate-400">載入中…</span>
        )}
        {saveMsg && (
          <span className="text-sm text-slate-500 italic">{saveMsg}</span>
        )}
      </div>
    </div>
  )
}
