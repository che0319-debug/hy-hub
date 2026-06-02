import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { computeScore } from '../mock/data'
import { fetchLifeGoals, saveLifeGoals, fetchBotProjects } from '../api'

// ─── Constants ───────────────────────────────────────────────────────────────

const BOT_DISPLAY = {
  hy:       { name: 'HY',     color: 'bg-blue-100 text-blue-700' },
  xiaoyin:  { name: '小因',   color: 'bg-purple-100 text-purple-700' }, // legacy fallback
  family:   { name: '小因',   color: 'bg-purple-100 text-purple-700' },
  '950157': { name: '950157', color: 'bg-orange-100 text-orange-700' },
  sam:      { name: 'Sam',    color: 'bg-green-100 text-green-700' },
}

// Maps normalized bot key → react-router route segment
const BOT_ROUTE = {
  hy: 'hy', '950157': '950157', family: 'family', xiaoyin: 'xiaoyin', sam: 'sam',
}

// Bot selection options for add-linked-project UI (uses canonical keys)
const BOT_MENU = [
  { value: 'hy',     label: 'HY' },
  { value: '950157', label: '950157' },
  { value: 'family', label: '小因' },
  { value: 'sam',    label: 'Sam' },
]

const LAYER_CONFIG = {
  engine:  { label: '引擎層', emoji: '⚙️',  desc: '推進自由',    barColor: 'bg-blue-500',  badgeColor: 'bg-blue-100 text-blue-600' },
  base:    { label: '地基層', emoji: '🛡️', desc: '守住才跑得動', barColor: 'bg-amber-400', badgeColor: 'bg-amber-100 text-amber-700' },
  sustain: { label: '續航層', emoji: '🔋',  desc: '自我滿足',    barColor: 'bg-slate-400', badgeColor: 'bg-slate-100 text-slate-500' },
}
const LAYER_ORDER = ['engine', 'base', 'sustain']

// ─── Module-level project cache (survives re-renders within a session) ────────
const _projectsCache = {}
function cachedFetchBotProjects(bot) {
  if (!_projectsCache[bot]) _projectsCache[bot] = fetchBotProjects(bot)
  return _projectsCache[bot]
}

// ─── Normalize ───────────────────────────────────────────────────────────────
// Converts old schema (current + goals[]) → new schema.
// Idempotent: dims already having currentState object are passed through.

export function normalizeLifeGoals(data) {
  const dims = (data.dimensions || []).map(dim => {
    if (dim.currentState && typeof dim.currentState === 'object') return dim
    const goals = dim.goals || []
    const seen = new Set()
    const linkedProjects = []
    for (const g of goals) {
      if (g.collaborator) {
        const bot = g.collaborator === 'xiaoyin' ? 'family' : g.collaborator
        if (!seen.has(bot)) {
          seen.add(bot)
          linkedProjects.push({ bot, projectId: null })
        }
      }
    }
    const { current, goals: _goals, ...rest } = dim
    return {
      ...rest,
      currentState: { type: 'text', value: null, target: null, unit: '', note: current ?? '' },
      linkedProjects,
      subGoals: goals.map(g => ({ id: g.id, title: g.title, done: g.achieved ?? false })),
      progress: dim.progress ?? 0,
      progressSource: 'manual',
      aiNote: '',
    }
  })
  return { ...data, dimensions: dims }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

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
  return dim.linkedProjects?.[0]?.bot ?? 'hy'
}

// ─── DimEditForm (unchanged) ──────────────────────────────────────────────────

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

// ─── ① CurrentStateSection ───────────────────────────────────────────────────

function CurrentStateSection({ dimId, cs, onSave }) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState('text')
  const [value, setValue] = useState('')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [note, setNote] = useState('')

  function startEdit() {
    setType(cs?.type ?? 'text')
    setValue(cs?.value != null ? String(cs.value) : '')
    setTarget(cs?.target != null ? String(cs.target) : '')
    setUnit(cs?.unit ?? '')
    setNote(cs?.note ?? '')
    setEditing(true)
  }

  function confirm() {
    onSave({
      type,
      value: type === 'quant' ? (value !== '' ? Number(value) : null) : null,
      target: type === 'quant' ? (target !== '' ? Number(target) : null) : null,
      unit: type === 'quant' ? unit : '',
      note,
    })
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {cs?.type === 'quant' && cs.value != null && cs.target != null ? (
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-medium">{cs.value} / {cs.target}{cs.unit ? ` ${cs.unit}` : ''}</span>
                <span className="text-slate-400">({Math.min(100, Math.round(cs.value / cs.target * 100))}%)</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round(cs.value / cs.target * 100))}%` }} />
              </div>
              {cs.note && <div className="text-xs text-slate-400 mt-0.5">{cs.note}</div>}
            </div>
          ) : (
            <span className="text-xs text-slate-600">
              {cs?.note || <span className="text-slate-300 italic">未填寫</span>}
            </span>
          )}
        </div>
        <button onClick={startEdit} className="flex-shrink-0 text-xs text-slate-300 hover:text-blue-500 transition-colors px-1">✎</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200 text-xs">
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name={`cs-type-${dimId}`} checked={type === 'text'} onChange={() => setType('text')} />
          <span>文字</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name={`cs-type-${dimId}`} checked={type === 'quant'} onChange={() => setType('quant')} />
          <span>量化</span>
        </label>
      </div>
      {type === 'quant' ? (
        <div className="flex gap-1.5 items-center flex-wrap">
          <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="目前值"
            className="w-20 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
          <span className="text-slate-400">/</span>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="目標值"
            className="w-20 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
          <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="單位"
            className="w-16 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="補充（選填）"
            className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white" />
        </div>
      ) : (
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="現況描述"
          rows={2}
          className="border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white resize-none" />
      )}
      <div className="flex gap-1.5">
        <button onClick={confirm} className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">確認</button>
        <button onClick={() => setEditing(false)} className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">取消</button>
      </div>
    </div>
  )
}

// ─── ② LinkedProjectsSection ─────────────────────────────────────────────────

// Row for a project that hasn't been bound yet (projectId === null)
function PendingRow({ bot, onBind, onRemove }) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState('')

  async function toggle() {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const ps = await cachedFetchBotProjects(bot)
      setProjects(ps)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 text-xs flex-wrap">
      <AgentChip id={bot} small />
      <button onClick={toggle} className="text-slate-400 hover:text-blue-500 transition-colors">
        待綁定 {open ? '▲' : '▾'}
      </button>
      {open && loading && <span className="text-slate-400">載入中…</span>}
      {open && error && <span className="text-red-400">載入失敗</span>}
      {open && !loading && !error && projects.length === 0 && <span className="text-slate-400">（無專案）</span>}
      {open && !loading && !error && projects.length > 0 && (
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="border border-slate-200 rounded px-1.5 py-0.5 outline-none bg-white text-xs">
          <option value="">— 選擇 —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
        </select>
      )}
      {open && selected && (
        <button onClick={() => { onBind(selected); setOpen(false) }}
          className="text-blue-600 hover:text-blue-800 underline transition-colors">綁定</button>
      )}
      <button onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors ml-auto px-1">✕</button>
    </div>
  )
}

function LinkedProjectsSection({ dimId, linkedProjects, onAdd, onRemove, onBindProject }) {
  const navigate = useNavigate()
  const [addMode, setAddMode] = useState(false)
  const [addBot, setAddBot] = useState('hy')
  const [addProjects, setAddProjects] = useState([])
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)
  const [addProjectId, setAddProjectId] = useState('')
  const [nameCache, setNameCache] = useState({}) // bot → Project[]

  // Load project names for already-bound entries
  const boundKey = linkedProjects.filter(lp => lp.projectId).map(lp => `${lp.bot}:${lp.projectId}`).join(',')
  useEffect(() => {
    const bots = [...new Set(linkedProjects.filter(lp => lp.projectId).map(lp => lp.bot))]
    for (const bot of bots) {
      if (!nameCache[bot]) {
        cachedFetchBotProjects(bot)
          .then(ps => setNameCache(prev => ({ ...prev, [bot]: ps })))
          .catch(() => {})
      }
    }
  }, [boundKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function getProjectName(bot, projectId) {
    const ps = nameCache[bot] || []
    return ps.find(p => p.id === projectId)?.name ?? projectId
  }

  async function handleAddBotChange(bot) {
    setAddBot(bot)
    setAddProjectId('')
    setAddProjects([])
    setAddLoading(true)
    setAddError(null)
    try {
      const ps = await cachedFetchBotProjects(bot)
      setAddProjects(ps)
      setNameCache(prev => ({ ...prev, [bot]: ps }))
    } catch (e) {
      setAddError(e.message)
    } finally {
      setAddLoading(false)
    }
  }

  function openAdd() {
    setAddMode(true)
    setAddBot('hy')
    setAddProjectId('')
    handleAddBotChange('hy')
  }

  function confirmAdd() {
    if (!addProjectId) return
    onAdd({ bot: addBot, projectId: addProjectId })
    setAddMode(false)
  }

  return (
    <div className="space-y-1.5">
      {linkedProjects.length === 0 && !addMode && (
        <div className="text-xs text-slate-300 italic">尚無綁定專案</div>
      )}
      {linkedProjects.map((lp, idx) =>
        lp.projectId ? (
          <div key={idx} className="flex items-center gap-1.5 text-xs">
            <AgentChip id={lp.bot} small />
            <span className="text-slate-700">{getProjectName(lp.bot, lp.projectId)}</span>
            <button
              onClick={() => navigate('/line/' + (BOT_ROUTE[lp.bot] ?? lp.bot))}
              className="text-blue-500 hover:text-blue-700 underline transition-colors"
            >查看 milestone</button>
            <button onClick={() => onRemove(idx)} className="text-slate-300 hover:text-red-400 transition-colors ml-auto px-1">✕</button>
          </div>
        ) : (
          <PendingRow
            key={idx}
            bot={lp.bot}
            onBind={projectId => onBindProject(idx, projectId)}
            onRemove={() => onRemove(idx)}
          />
        )
      )}

      {addMode ? (
        <div className="flex flex-col gap-1.5 bg-slate-50 rounded-lg p-2 border border-slate-200 text-xs">
          <div className="flex gap-1.5 items-center flex-wrap">
            <select value={addBot} onChange={e => handleAddBotChange(e.target.value)}
              className="border border-slate-200 rounded px-1.5 py-1 outline-none bg-white text-xs">
              {BOT_MENU.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {addLoading && <span className="text-slate-400">載入中…</span>}
            {addError && <span className="text-red-400">載入失敗</span>}
            {!addLoading && !addError && addProjects.length === 0 && <span className="text-slate-400">（無專案）</span>}
            {!addLoading && !addError && addProjects.length > 0 && (
              <select value={addProjectId} onChange={e => setAddProjectId(e.target.value)}
                className="flex-1 min-w-0 border border-slate-200 rounded px-1.5 py-1 outline-none bg-white text-xs">
                <option value="">— 選擇專案 —</option>
                {addProjects.map(p => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-1.5">
            <button onClick={confirmAdd} disabled={!addProjectId}
              className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">確認</button>
            <button onClick={() => setAddMode(false)}
              className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">取消</button>
          </div>
        </div>
      ) : (
        <button onClick={openAdd}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 py-1 transition-colors">
          + 綁定專案
        </button>
      )}
    </div>
  )
}

// ─── ③ SubGoalsSection ───────────────────────────────────────────────────────

function SubGoalsSection({ subGoals, onToggleDone, onDelete, onAdd }) {
  const [newTitle, setNewTitle] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    onAdd(newTitle.trim())
    setNewTitle('')
  }

  return (
    <div className="space-y-1">
      {subGoals.length === 0 && (
        <div className="text-xs text-slate-300 italic">尚無子項</div>
      )}
      {subGoals.map(sg => (
        <div key={sg.id} className="flex items-center gap-2 group">
          <button
            onClick={() => onToggleDone(sg.id)}
            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
              sg.done ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
            }`}
          >
            {sg.done && <span className="text-[10px] leading-none">✓</span>}
          </button>
          <span className={`text-xs flex-1 min-w-0 ${sg.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
            {sg.title}
          </span>
          <button
            onClick={() => onDelete(sg.id)}
            className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs px-1"
          >✕</button>
        </div>
      ))}
      <form onSubmit={submit} className="flex gap-1.5 mt-1.5">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="新增子項…"
          className="flex-1 min-w-0 text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
        />
        {newTitle.trim() && (
          <button type="submit"
            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">新增</button>
        )}
      </form>
    </div>
  )
}

// ─── Main Goals component ─────────────────────────────────────────────────────

export default function Goals() {
  const [dimensions, setDimensions] = useState([])
  const [freedomIndex, setFreedomIndex] = useState({ note: '', formula: '' })
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [showAddDim, setShowAddDim] = useState(false)
  const [newDimName, setNewDimName] = useState('')
  const [newDimLayer, setNewDimLayer] = useState('engine')
  const [saveMsg, setSaveMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingDimId, setEditingDimId] = useState(null)

  useEffect(() => {
    fetchLifeGoals()
      .then(data => {
        const normalized = normalizeLifeGoals(data)
        setDimensions(structuredClone(normalized.dimensions || []))
        setFreedomIndex(normalized.freedomIndex || { note: '', formula: '' })
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

  // ── Dimension CRUD ──────────────────────────────────────────────────────────

  function addDimension() {
    if (!newDimName.trim()) return
    setDimensions(prev => [...prev, {
      id: `dim-${Date.now()}`,
      name: newDimName.trim(),
      layer: newDimLayer,
      weight: 0,
      progress: 0,
      totalGoal: '',
      currentState: { type: 'text', value: null, target: null, unit: '', note: '' },
      linkedProjects: [],
      subGoals: [],
      progressSource: 'manual',
      aiNote: '',
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

  // ── currentState ────────────────────────────────────────────────────────────

  function updateCurrentState(dimId, cs) {
    setDimensions(prev => prev.map(d => d.id !== dimId ? d : { ...d, currentState: cs }))
  }

  // ── linkedProjects ──────────────────────────────────────────────────────────

  function addLinkedProject(dimId, lp) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : { ...d, linkedProjects: [...(d.linkedProjects || []), lp] }
    ))
  }

  function removeLinkedProject(dimId, idx) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : { ...d, linkedProjects: d.linkedProjects.filter((_, i) => i !== idx) }
    ))
  }

  function bindLinkedProject(dimId, idx, projectId) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : {
        ...d,
        linkedProjects: d.linkedProjects.map((lp, i) => i !== idx ? lp : { ...lp, projectId }),
      }
    ))
  }

  // ── subGoals ────────────────────────────────────────────────────────────────

  function addSubGoal(dimId, title) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : {
        ...d,
        subGoals: [...(d.subGoals || []), { id: `g-${Date.now()}`, title, done: false }],
      }
    ))
  }

  function removeSubGoal(dimId, sgId) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : { ...d, subGoals: d.subGoals.filter(sg => sg.id !== sgId) }
    ))
  }

  function toggleSubGoalDone(dimId, sgId) {
    setDimensions(prev => prev.map(d =>
      d.id !== dimId ? d : {
        ...d,
        subGoals: d.subGoals.map(sg => sg.id !== sgId ? sg : { ...sg, done: !sg.done }),
      }
    ))
  }

  // ── Save ────────────────────────────────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">人生目標對齊</h1>
        <div className="flex items-center gap-3">
          {saveMsg && <span className="text-sm text-slate-500 italic">{saveMsg}</span>}
          {!dataLoaded && !loadError && <span className="text-sm text-slate-400">載入中…</span>}
          <button
            onClick={handleSave}
            disabled={!dataLoaded || saving}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? '儲存中…' : '儲存總體目標'}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          ⚠ 離線模式（禁止儲存）：{loadError}
        </div>
      )}

      {/* 北極星大卡 */}
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

      {/* 三層總覽 */}
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
                    const pct = dim.progress ?? 0
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

      {/* 維度詳情 */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">維度詳情</h2>
        <div className="space-y-4">
          {dimensions.map(dim => {
            const layerCfg = LAYER_CONFIG[dim.layer]
            return (
              <div key={dim.id} className="bg-white rounded-xl border border-slate-200">
                {/* Card header */}
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

                {/* totalGoal row */}
                {dim.totalGoal && (
                  <div className="px-4 pt-2.5 pb-1 text-xs text-slate-500">
                    <span className="text-slate-400">總目標：</span>{dim.totalGoal}
                  </div>
                )}

                <div className="px-4 py-3 space-y-4">
                  {/* ① 現況 */}
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1.5">現況</div>
                    <CurrentStateSection
                      dimId={dim.id}
                      cs={dim.currentState}
                      onSave={cs => updateCurrentState(dim.id, cs)}
                    />
                  </div>

                  {/* ② 綁定專案 */}
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1.5">綁定專案</div>
                    <LinkedProjectsSection
                      dimId={dim.id}
                      linkedProjects={dim.linkedProjects || []}
                      onAdd={lp => addLinkedProject(dim.id, lp)}
                      onRemove={idx => removeLinkedProject(dim.id, idx)}
                      onBindProject={(idx, projectId) => bindLinkedProject(dim.id, idx, projectId)}
                    />
                  </div>

                  {/* ③ 我的子項 */}
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1.5">我的子項</div>
                    <SubGoalsSection
                      subGoals={dim.subGoals || []}
                      onToggleDone={sgId => toggleSubGoalDone(dim.id, sgId)}
                      onDelete={sgId => removeSubGoal(dim.id, sgId)}
                      onAdd={title => addSubGoal(dim.id, title)}
                    />
                  </div>
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
    </div>
  )
}
