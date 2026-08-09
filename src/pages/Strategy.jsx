import { useEffect, useRef, useState, useCallback } from 'react'
import { fetchStrategyProjects, saveStrategyProject, deleteStrategyProject } from '../api'

// 舊 schema {wants/fears/drivenBy} 與新 schema {note} 統一顯示
function resolveNote(pe) {
  if (pe.note != null) return pe.note
  const parts = []
  if (pe.wants)    parts.push(`要${pe.wants}`)
  if (pe.fears)    parts.push(`怕${pe.fears}`)
  if (pe.drivenBy) parts.push(`驅動${pe.drivenBy}`)
  return parts.join('／')
}

function buildSummary(p) {
  const people = (p.people || []).map(pe =>
    `- ${pe.name}：${resolveNote(pe)}`
  ).join('\n')
  const setup = (p.setup || []).filter(Boolean).map(s => `- ${s}`).join('\n')
  return [
    `【局】${p.name}`,
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
    goal: { success: '', opportunityCost: '' },
    people: [{ name: '', note: '' }],
    setup: [''],
    execution: { nextStep: '' },
    actualResult: '',
    updatedAt: '',
  }
}

// 自動長高 textarea：隨內容增高，不出現內捲軸
function AutoTextarea({ minHeight = '4rem', className = '', ...props }) {
  const ref = useRef(null)
  function grow() {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
  useEffect(() => { grow() }, [props.value])
  return (
    <textarea
      ref={ref}
      className={className}
      style={{ minHeight, overflow: 'hidden', resize: 'none' }}
      onInput={grow}
      {...props}
    />
  )
}

const PREFIX_OPTIMIZE = `以下是我正在推的一個「局」。先幫我把四象限內容本身打磨清楚——不是分析對錯，是把我寫得含糊、太簡、或漏掉的地方補實：
- 目標：「成了」的定義夠不夠具體可判斷？機會成本有沒有寫出來？含糊就逼問我到具體。
- 人性：每個關鍵人的要/怕/驅動有沒有寫全？有沒有漏掉的關鍵人？空泛的形容換成具體。
- 設局：每個設計是否講清楚「對方為什麼會照做」？沒講清因果的幫我補。
- 執行：下一步是否具體到「明天就能動手」？太模糊就收斂。
把優化後的四象限完整重寫一份給我確認。要追問的地方一次問完，別自己腦補填空。

—— 以下為本局內容 ——`

const PREFIX_ANALYZE = `以下是我正在推的一個「局」，內容已優化過。用我的框架跟我對練——不要用「成功率／勝算」當主軸，我要把局看透、把打法練利，不是被評估會不會成。
扣四角度戳我，一次一個：目標清不清、人性準不準、設局是不是真陽謀（讓對方真得利，非我一廂情願或藏陷阱）、下一步推不推得動。
把這當推演練習，不打分。每次至少點出一個你認為我可能有的盲點（最常見：我以為的陽謀對方其實沒那麼想要、或我把某人的「怕」想錯了）。

—— 以下為本局內容 ——`

function buildReviewPrompt(p) {
  const people = (p.people || []).map(pe =>
    `- ${pe.name}：${resolveNote(pe)}`
  ).join('\n')
  const setup = (p.setup || []).filter(Boolean).map(s => `- ${s}`).join('\n')
  return [
    `你是我的策略教練。以下是我對某對象的戰略盤現況，以及我這段期間的實際執行與結果。`,
    `請根據實績複盤，指出哪裡偏離、哪裡該調整，然後給出「修改後」的四塊內容。`,
    ``,
    `【目標】`,
    `成了的定義：${p.goal?.success || '（未填）'}`,
    `機會成本：${p.goal?.opportunityCost || '（未填）'}`,
    ``,
    `【執行】`,
    `下一步：${p.execution?.nextStep || '（未填）'}`,
    ``,
    `【人性】`,
    people || '（未填）',
    ``,
    `【設局】`,
    setup || '（未填）',
    ``,
    `【我實際做了什麼 + 結果】`,
    p.actualResult || '（未填）',
    ``,
    `---`,
    `請先做 3-5 點複盤分析（哪裡有效／哪裡失準／為什麼），`,
    `然後嚴格用以下格式輸出「修改後的四塊」，讓我可以直接貼回我的戰略盤：`,
    ``,
    `■ 目標（修改後）`,
    `...`,
    `■ 執行（修改後）`,
    `...`,
    `■ 人性（修改後）`,
    `...`,
    `■ 設局（修改後）`,
    `...`,
  ].join('\n')
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
      people: [...(prev.people || []), { name: '', note: '' }],
    }))
  }

  function removePerson(idx) {
    setDraft(prev => ({ ...prev, people: prev.people.filter((_, i) => i !== idx) }))
  }

  const setupText = (draft.setup || []).join('\n')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-800">← 返回清單</button>
        <span className="text-xs text-blue-600 border border-blue-200 bg-blue-50 rounded px-2 py-0.5">編輯中</span>
      </div>

      {/* Name */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <label className="text-xs text-slate-400 block mb-1">局名稱</label>
        <input
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
          value={draft.name}
          onChange={e => set('name', e.target.value)}
          placeholder="局的名稱"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 目標 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">🎯 目標</h3>
          <div className="mb-3">
            <label className="text-xs text-slate-400 block mb-1">成了的定義</label>
            <AutoTextarea
              minHeight="6rem"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              value={draft.goal?.success || ''}
              onChange={e => set('goal.success', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">機會成本</label>
            <AutoTextarea
              minHeight="4.5rem"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              value={draft.goal?.opportunityCost || ''}
              onChange={e => set('goal.opportunityCost', e.target.value)}
            />
          </div>
        </div>

        {/* 執行 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">⚡ 執行</h3>
          <label className="text-xs text-slate-400 block mb-1">下一步</label>
          <AutoTextarea
            minHeight="3rem"
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            value={draft.execution?.nextStep || ''}
            onChange={e => set('execution.nextStep', e.target.value)}
          />
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
                <AutoTextarea
                  minHeight="4.5rem"
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                  value={pe.note ?? resolveNote(pe)}
                  onChange={e => setPerson(i, 'note', e.target.value)}
                  placeholder="要什麼／怕什麼／被什麼驅動"
                />
              </div>
            ))}
          </div>
          <button onClick={addPerson} className="mt-3 text-xs text-blue-600 hover:text-blue-800">
            ＋ 新增關鍵人
          </button>
        </div>

        {/* 設局 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">🎭 設局</h3>
          <div className="text-xs text-slate-400 mb-2">陽謀優先 · 一行一點</div>
          <AutoTextarea
            minHeight="8rem"
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400 font-mono"
            value={setupText}
            onChange={e => setDraft(prev => ({ ...prev, setup: e.target.value.split('\n') }))}
            placeholder="每行一個設局點"
          />
        </div>
      </div>

      {/* 實績 */}
      <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">📋 實績（實際做了什麼 + 結果）</h3>
        <AutoTextarea
          minHeight="4.5rem"
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
          value={draft.actualResult ?? ''}
          onChange={e => set('actualResult', e.target.value)}
          placeholder="這段期間實際執行了什麼、結果如何"
        />
      </div>

      {saveError && (
        <div className="mt-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
          儲存失敗：{saveError}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        {!isNew && (
          <button onClick={onDelete} disabled={saving} className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40">
            刪除此局
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button onClick={onCancel} disabled={saving} className="px-4 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40">
            取消
          </button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-40">
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DetailView ────────────────────────────────────────────────────────────────
function DetailView({ project: p, onBack, onEdit }) {
  const [copiedA, setCopiedA] = useState(false)
  const [copiedB, setCopiedB] = useState(false)
  const [copiedC, setCopiedC] = useState(false)

  async function handleCopy(prefix, setFlag) {
    await navigator.clipboard.writeText(prefix + '\n' + buildSummary(p))
    setFlag(true)
    setTimeout(() => setFlag(false), 2000)
  }

  const hasReviewContent = !!(
    p.goal?.success || p.goal?.opportunityCost ||
    p.execution?.nextStep ||
    (p.people || []).some(pe => pe.name || resolveNote(pe)) ||
    (p.setup || []).some(Boolean) ||
    p.actualResult
  )

  async function handleCopyReview() {
    await navigator.clipboard.writeText(buildReviewPrompt(p))
    setCopiedC(true)
    setTimeout(() => setCopiedC(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800">← 返回清單</button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-0.5">唯讀</span>
          <button onClick={onEdit} className="text-sm text-blue-600 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50">
            編輯
          </button>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-6">{p.name}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="text-xs text-slate-400 mb-1">下一步</div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.execution?.nextStep}</p>
          {p.updatedAt && <div className="mt-3 text-xs text-slate-400">更新：{p.updatedAt}</div>}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">🧠 人性</h3>
          <div className="flex flex-col gap-3">
            {(p.people || []).map((pe, i) => (
              <div key={i} className="border-l-2 border-slate-200 pl-3">
                <div className="text-sm font-medium text-slate-700 mb-1">{pe.name}</div>
                <p className="text-xs text-slate-500 whitespace-pre-wrap">{resolveNote(pe)}</p>
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

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => handleCopy(PREFIX_OPTIMIZE, setCopiedA)}
          className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 transition-colors"
        >
          {copiedA ? '已複製 ✓' : '複製優化指令'}
        </button>
        <button
          onClick={() => handleCopy(PREFIX_ANALYZE, setCopiedB)}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 transition-colors"
        >
          {copiedB ? '已複製 ✓' : '複製分析指令'}
        </button>
      </div>

      {/* 實績 + 複盤 */}
      <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">📋 實績（實際做了什麼 + 結果）</h3>
        {p.actualResult
          ? <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.actualResult}</p>
          : <p className="text-sm text-slate-400 italic">尚未填寫</p>
        }
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleCopyReview}
            disabled={!hasReviewContent}
            className="px-4 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={!hasReviewContent ? '先填內容再複盤' : '複製複盤指令，貼到 claude.ai'}
          >
            {copiedC ? '已複製，貼到 claude.ai ✓' : '複盤'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Strategy() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [selected, setSelected]   = useState(null)
  const [editing, setEditing]     = useState(false)
  const [draft, setDraft]         = useState(null)
  const [dirty, setDirty]         = useState(false)
  const [isNew, setIsNew]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const loadProjects = useCallback(() => {
    setLoading(true); setLoadError(null)
    fetchStrategyProjects()
      .then(data => { setProjects(data.projects || []); setLoading(false) })
      .catch(err  => { setLoadError(err.message); setLoading(false) })
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  useEffect(() => {
    if (!dirty) return
    const handler = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function confirmLeave() {
    return dirty ? window.confirm('有未存變更，確定離開？') : true
  }

  function goBackToList() {
    if (!confirmLeave()) return
    setSelected(null); setEditing(false); setDraft(null); setDirty(false); setIsNew(false); setSaveError(null)
  }

  function handleDraftChange(updater) { setDraft(updater); setDirty(true) }

  function addNewProject() {
    const p = newProject()
    setSelected(p); setDraft(structuredClone(p)); setEditing(true); setDirty(false); setIsNew(true); setSaveError(null)
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true); setSaveError(null)
    try {
      await saveStrategyProject(draft)
      await loadProjects()
      setEditing(false); setDirty(false); setIsNew(false); setSelected(draft)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    if (!confirmLeave()) return
    setEditing(false); setDraft(null); setDirty(false); setSaveError(null)
    if (isNew) { setSelected(null); setIsNew(false) }
  }

  async function handleDeleteConfirmed() {
    const id = deleteConfirmId; setDeleteConfirmId(null); setSaving(true)
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

  if (loading) return <div className="text-slate-400 text-sm py-8 text-center">載入中…</div>
  if (loadError) return <div className="text-red-500 text-sm py-8 text-center">載入失敗：{loadError}</div>

  if (deleteConfirmId) return (
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

  if (editing && draft) return (
    <EditView
      draft={draft} setDraft={handleDraftChange}
      onSave={handleSave} onCancel={handleCancelEdit}
      onDelete={() => setDeleteConfirmId(draft.id)}
      saving={saving} saveError={saveError} isNew={isNew}
    />
  )

  if (selected) return (
    <DetailView project={selected} onBack={goBackToList} onEdit={() => { setDraft(structuredClone(selected)); setEditing(true); setDirty(false); setSaveError(null) }} />
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">戰略盤</h1>
        <button onClick={addNewProject} className="text-sm text-blue-600 border border-blue-200 rounded px-3 py-1.5 hover:bg-blue-50">
          ＋ 新增局
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-6">四象限謀局 · 改動須按「儲存」才寫入</p>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          還沒有局，點右上「＋ 新增局」建立第一個
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="w-full text-left bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-400 transition-colors"
            >
              <div className="font-medium text-slate-800 text-sm mb-0.5">{p.name}</div>
              <p className="text-xs text-slate-500 truncate">{p.execution?.nextStep || '（尚無下一步）'}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
