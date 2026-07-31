import { useEffect, useState, useCallback } from 'react'
import { fetchStrategyProjects, saveStrategyProject, deleteStrategyProject } from '../api'

const STATUS_MAP = {
  active:  { label: '進行中', cls: 'bg-yellow-100 text-yellow-800' },
  onhold:  { label: '擱置',   cls: 'bg-slate-100 text-slate-500' },
  won:     { label: '已成',   cls: 'bg-green-100 text-green-800' },
  dropped: { label: '放棄',   cls: 'bg-slate-100 text-slate-400' },
}
const DOMAIN_MAP = { hy: 'HY', '950157': '950157', family: '家庭', sam: 'Sam' }
const ALL_DOMAINS = ['hy', '950157', 'family', 'sam']

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'bg-slate-100 text-slate-500' }
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>
}

function buildSummary(p) {
  const statusLabel = (STATUS_MAP[p.status] || { label: p.status }).label
  const people = (p.people || []).map(pe =>
    `- ${pe.name}：要${pe.wants}／怕${pe.fears}／驅動${pe.drivenBy}`
  ).join('\n')
  const setup = (p.setup || []).filter(Boolean).map(s => `- ${s}`).join('\n')
  return [
    `【局】${p.name}（${statusLabel}）`,
    `目標：${p.goal?.success || ''}`,
    `機會成本：${p.goal?.opportunityCost || ''}`,
    `關鍵人：`,
    people,
    `設局：`,
    setup,
    `下一步：${p.execution?.nextStep || ''}`,
  ].join('\n')
}

function newProject() {
  return {
    id: `strat_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    status: 'active',
    keyDate: null,
    keyDateLabel: '',
    domains: [],
    goal: { success: '', opportunityCost: '' },
    people: [{ name: '', wants: '', fears: '', drivenBy: '' }],
    setup: [''],
    execution: { nextStep: '', linkedDispatchId: null, linkedLabel: '' },
    updatedAt: '',
  }
}

// ── EditView ──────────────────────────────────────────────────────────────────
function EditView({ draft, setDraft, onSave, onCancel, onDelete, saving, saveError, isNew }) {
  function set(path, value) {
    setDraft(prev => {
      const next = structuredClone(prev)
      const parts = path.split('.')
      let obj = next
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]]
      obj[parts[parts.length - 1]] = value
      return next
    })
  }

  function setPerson(idx, field, value) {
    setDraft(prev => {
      const next = structuredClone(prev)
      next.people[idx][field] = value
      return next
    })
  }

  function addPerson() {
    setDraft(prev => ({
      ...prev,
      people: [...(prev.people || []), { name: '', wants: '', fears: '', drivenBy: '' }],
    }))
  }

  function removePerson(idx) {
    setDraft(prev => ({ ...prev, people: prev.people.filter((_, i) => i !== idx) }))
  }

  const setupText = (draft.setup || []).join('\n')

  function handleSetupChange(text) {
    setDraft(prev => ({ ...prev, setup: text.split('\n') }))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-800">← 返回清單</button>
        <span className="text-xs text-blue-600 border border-blue-200 bg-blue-50 rounded px-2 py-0.5">編輯中</span>
      </div>

      {/* Name + Status + Key Date */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="text-xs text-slate-400 block mb-1">局名稱</label>
          <input
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            value={draft.name}
            onChange={e => set('name', e.target.value)}
            placeholder="局的名稱"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">狀態</label>
          <select
            className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            value={draft.status}
            onChange={e => set('status', e.target.value)}
          >
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">關鍵日</label>
          <input
            type="date"
            className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            value={draft.keyDate || ''}
            onChange={e => set('keyDate', e.target.value || null)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">日期標籤</label>
          <input
            className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400 w-24"
            value={draft.keyDateLabel || ''}
            onChange={e => set('keyDateLabel', e.target.value)}
            placeholder="如：提案"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">領域</label>
          <div className="flex gap-2">
            {ALL_DOMAINS.map(d => (
              <label key={d} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={(draft.domains || []).includes(d)}
                  onChange={e => {
                    const cur = draft.domains || []
                    set('domains', e.target.checked ? [...cur, d] : cur.filter(x => x !== d))
                  }}
                />
                {DOMAIN_MAP[d]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 目標 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">🎯 目標</h3>
          <div className="mb-3">
            <label className="text-xs text-slate-400 block mb-1">成了的定義</label>
            <textarea
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:border-blue-400"
              rows={4}
              value={draft.goal?.success || ''}
              onChange={e => set('goal.success', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">機會成本</label>
            <textarea
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:border-blue-400"
              rows={3}
              value={draft.goal?.opportunityCost || ''}
              onChange={e => set('goal.opportunityCost', e.target.value)}
            />
          </div>
        </div>

        {/* 執行 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">⚡ 執行</h3>
          <div className="mb-3">
            <label className="text-xs text-slate-400 block mb-1">下一步</label>
            <input
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              value={draft.execution?.nextStep || ''}
              onChange={e => set('execution.nextStep', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">關聯派工（純文字）</label>
            <input
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              value={draft.execution?.linkedLabel || ''}
              onChange={e => set('execution.linkedLabel', e.target.value)}
              placeholder="如：#48 一頁式數字框架"
            />
          </div>
        </div>

        {/* 人性 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">🧠 人性</h3>
          <div className="flex flex-col gap-4">
            {(draft.people || []).map((pe, i) => (
              <div key={i} className="border-l-2 border-slate-200 pl-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:border-blue-400"
                    value={pe.name}
                    onChange={e => setPerson(i, 'name', e.target.value)}
                    placeholder="代號（如：總監D）"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">用代號，勿本名</span>
                  {(draft.people || []).length > 1 && (
                    <button onClick={() => removePerson(i)} className="text-slate-300 hover:text-red-400 text-xs">✕</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['wants', '要'], ['fears', '怕'], ['drivenBy', '驅動']].map(([field, label]) => (
                    <div key={field}>
                      <label className="text-xs text-slate-400 block mb-0.5">{label}</label>
                      <input
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
                        value={pe[field] || ''}
                        onChange={e => setPerson(i, field, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addPerson}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800"
          >
            ＋ 新增關鍵人
          </button>
        </div>

        {/* 設局 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">🎭 設局</h3>
          <div className="text-xs text-slate-400 mb-2">陽謀優先 · 一行一點</div>
          <textarea
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:border-blue-400 font-mono"
            rows={8}
            value={setupText}
            onChange={e => handleSetupChange(e.target.value)}
            placeholder="每行一個設局點"
          />
        </div>
      </div>

      {/* Save / Cancel / Delete */}
      {saveError && (
        <div className="mt-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
          儲存失敗：{saveError}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        {!isNew && (
          <button
            onClick={onDelete}
            disabled={saving}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40"
          >
            刪除此局
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40"
          >
            取消
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-40"
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DetailView ────────────────────────────────────────────────────────────────
function DetailView({ project: p, onBack, onEdit }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(buildSummary(p))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800">← 返回清單</button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-0.5">唯讀</span>
          <button
            onClick={onEdit}
            className="text-sm text-blue-600 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50"
          >
            編輯
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold">{p.name}</h2>
        <StatusBadge status={p.status} />
        {(p.domains || []).map(d => (
          <span key={d} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
            {DOMAIN_MAP[d] || d}
          </span>
        ))}
        {p.keyDate && (
          <span className="text-xs text-slate-500 ml-auto">
            {p.keyDateLabel || '截止'} {p.keyDate}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">🎯 目標</h3>
          <div className="mb-3">
            <div className="text-xs text-slate-400 mb-1">成了的定義</div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.goal?.success}</p>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">機會成本</div>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{p.goal?.opportunityCost}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">⚡ 執行</h3>
          <div className="mb-3">
            <div className="text-xs text-slate-400 mb-1">下一步</div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.execution?.nextStep}</p>
          </div>
          {p.execution?.linkedLabel && (
            <div>
              <div className="text-xs text-slate-400 mb-1">關聯派工</div>
              {p.execution.linkedDispatchId ? (
                <span className="text-sm text-blue-600 underline cursor-pointer">{p.execution.linkedLabel}</span>
              ) : (
                <span className="text-sm text-slate-600">{p.execution.linkedLabel}</span>
              )}
            </div>
          )}
          {p.updatedAt && (
            <div className="mt-3 text-xs text-slate-400">更新：{p.updatedAt}</div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">🧠 人性</h3>
          <div className="flex flex-col gap-3">
            {(p.people || []).map((pe, i) => (
              <div key={i} className="border-l-2 border-slate-200 pl-3">
                <div className="text-sm font-medium text-slate-700 mb-1">{pe.name}</div>
                <div className="text-xs text-slate-500 space-y-0.5">
                  <div><span className="font-medium text-slate-600">要：</span>{pe.wants}</div>
                  <div><span className="font-medium text-slate-600">怕：</span>{pe.fears}</div>
                  <div><span className="font-medium text-slate-600">驅動：</span>{pe.drivenBy}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">🎭 設局</h3>
          <div className="text-xs text-slate-400 mb-3">陽謀優先</div>
          <ul className="flex flex-col gap-2">
            {(p.setup || []).filter(Boolean).map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-slate-400 shrink-0">{i + 1}.</span>
                <span className="whitespace-pre-wrap">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 transition-colors"
        >
          {copied ? '已複製 ✓' : '複製注入摘要'}
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Strategy() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [selected, setSelected] = useState(null)   // project in detail/edit
  const [editing, setEditing]   = useState(false)
  const [draft, setDraft]       = useState(null)
  const [dirty, setDirty]       = useState(false)  // unsaved changes
  const [isNew, setIsNew]       = useState(false)

  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)

  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // Load
  const loadProjects = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    fetchStrategyProjects()
      .then(data => { setProjects(data.projects || []); setLoading(false) })
      .catch(err  => { setLoadError(err.message); setLoading(false) })
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  // Unsaved changes → browser back/refresh warning
  useEffect(() => {
    if (!dirty) return
    const handler = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function confirmLeave() {
    if (dirty) return window.confirm('有未存變更，確定離開？')
    return true
  }

  function goBackToList() {
    if (!confirmLeave()) return
    setSelected(null); setEditing(false); setDraft(null); setDirty(false); setIsNew(false); setSaveError(null)
  }

  function enterEdit(p) {
    setDraft(structuredClone(p))
    setEditing(true)
    setDirty(false)
    setSaveError(null)
    setIsNew(false)
  }

  function handleDraftChange(updater) {
    setDraft(updater)
    setDirty(true)
  }

  function addNewProject() {
    const p = newProject()
    setSelected(p)
    setDraft(structuredClone(p))
    setEditing(true)
    setDirty(false)
    setIsNew(true)
    setSaveError(null)
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setSaveError(null)
    try {
      await saveStrategyProject(draft)
      await loadProjects()
      // Update selected to latest
      setEditing(false)
      setDirty(false)
      setIsNew(false)
      // Keep detail view open for the saved project
      setSelected(draft)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    if (!confirmLeave()) return
    setEditing(false)
    setDraft(null)
    setDirty(false)
    setSaveError(null)
    if (isNew) { setSelected(null); setIsNew(false) }
  }

  async function handleDeleteConfirmed() {
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    setSaving(true)
    try {
      await deleteStrategyProject(id)
      await loadProjects()
      setSelected(null); setEditing(false); setDraft(null); setDirty(false)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return <div className="text-slate-400 text-sm py-8 text-center">載入中…</div>
  if (loadError) return <div className="text-red-500 text-sm py-8 text-center">載入失敗：{loadError}</div>

  // Delete confirm modal
  if (deleteConfirmId) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
          <h3 className="font-semibold text-slate-800 mb-2">確定刪除？</h3>
          <p className="text-sm text-slate-500 mb-6">此操作不可逆，局的所有資料將從 hy-data 移除。</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50">取消</button>
            <button onClick={handleDeleteConfirmed} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">確定刪除</button>
          </div>
        </div>
      </div>
    )
  }

  if (editing && draft) {
    return (
      <EditView
        draft={draft}
        setDraft={handleDraftChange}
        onSave={handleSave}
        onCancel={handleCancelEdit}
        onDelete={() => setDeleteConfirmId(draft.id)}
        saving={saving}
        saveError={saveError}
        isNew={isNew}
      />
    )
  }

  if (selected) {
    return (
      <DetailView
        project={selected}
        onBack={goBackToList}
        onEdit={() => enterEdit(selected)}
      />
    )
  }

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">戰略盤</h1>
        <button
          onClick={addNewProject}
          className="text-sm text-blue-600 border border-blue-200 rounded px-3 py-1.5 hover:bg-blue-50"
        >
          ＋ 新增局
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-6">四象限謀局 · 改動須按「儲存」才寫入</p>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          還沒有局，去 GitHub 新增第一個，或點右上「＋ 新增局」
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="w-full text-left bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-400 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-800 text-sm">{p.name}</span>
                <StatusBadge status={p.status} />
                {(p.domains || []).map(d => (
                  <span key={d} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                    {DOMAIN_MAP[d] || d}
                  </span>
                ))}
                {p.keyDate && (
                  <span className="ml-auto text-xs text-slate-400 shrink-0">
                    {p.keyDateLabel || ''} {p.keyDate}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {p.execution?.nextStep || '（尚無下一步）'}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
