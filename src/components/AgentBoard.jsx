import { useState } from 'react'
import { Calendar, CheckSquare, Square, Plus, X, Pencil, Check } from 'lucide-react'
import { useSessionContext } from '../App'
import { postMilestone } from '../api'

function initBoard(boardData) {
  return {
    ...boardData,
    columns: boardData.columns.map(col => ({
      ...col,
      items: col.items.map(item => ({ ...item }))
    }))
  }
}

function MilestoneCard({ item, colId, colName, onToggle, sessions, botConfig, onMutate }) {
  const [editingDue, setEditingDue] = useState(false)
  const [dueValue, setDueValue] = useState(item.due || "")
  const [busy, setBusy] = useState(false)
  const assigned = sessions.some(s => s._milestoneId === item.id)
  const realId = item.id.replace(/^hy-/, "")

  async function handleDelete() {
    if (!confirm(`刪除「${item.title}」？`)) return
    setBusy(true)
    try {
      await postMilestone({ action: "delete", milestone_id: realId })
      onMutate()
    } catch (e) {
      alert(`刪除失敗：${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdateDue() {
    if (!dueValue) return
    setBusy(true)
    try {
      await postMilestone({ action: "update_due", milestone_id: realId, new_due: dueValue })
      setEditingDue(false)
      onMutate()
    } catch (e) {
      alert(`改期失敗：${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl p-4 border shadow-sm mb-2 transition-colors ${assigned ? 'border-blue-500' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-slate-800 font-medium text-sm leading-snug mb-1 flex-1">{item.title}</p>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
          title="刪除"
        >
          <X size={13} />
        </button>
      </div>
      {item.desc && <p className="text-slate-500 text-xs mb-2">{item.desc}</p>}
      <div className="flex items-center justify-between mt-2">
        {editingDue ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={dueValue}
              onChange={e => setDueValue(e.target.value)}
              placeholder="YYYY/MM/DD"
              className="text-xs border border-slate-300 rounded px-1.5 py-0.5 w-28 focus:outline-none focus:border-blue-400"
              onKeyDown={e => { if (e.key === 'Enter') handleUpdateDue() }}
            />
            <button onClick={handleUpdateDue} disabled={busy} className="text-green-500 hover:text-green-600">
              <Check size={13} />
            </button>
            <button onClick={() => { setEditingDue(false); setDueValue(item.due || "") }} className="text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingDue(true)}
            className="flex items-center gap-1 text-slate-500 text-xs hover:text-blue-500 transition-colors"
            title="點擊改期"
          >
            <Calendar size={12} />
            <span>{item.due || "—"}</span>
            <Pencil size={10} className="ml-0.5 opacity-40" />
          </button>
        )}
        <button
          onClick={() => onToggle(colId, item.id, colName, item.title)}
          className="flex items-center gap-1.5 text-xs transition-colors"
        >
          {assigned ? (
            <>
              <CheckSquare size={14} className="text-blue-600" />
              <span className="text-blue-600 font-medium">已交給 {botConfig.name}</span>
            </>
          ) : (
            <>
              <Square size={14} className="text-slate-400" />
              <span className="text-slate-400 hover:text-slate-600">交給 {botConfig.name}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function BoardColumn({ col, onToggle, sessions, botConfig, onMutate }) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDue, setNewDue] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleAdd() {
    if (!newTitle.trim()) return
    setBusy(true)
    try {
      await postMilestone({ action: "add", project_id: col.id, title: newTitle.trim(), due: newDue.trim() })
      setNewTitle("")
      setNewDue("")
      setAdding(false)
      onMutate()
    } catch (e) {
      alert(`新增失敗：${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: col.color }}
        />
        <span className="font-semibold text-slate-800 text-sm flex-1 leading-tight">{col.name}</span>
        <span className="bg-slate-200 text-slate-500 text-xs font-medium rounded-full px-2 py-0.5">
          {col.items.length}
        </span>
      </div>
      <div className="flex-1">
        {col.items.map(item => (
          <MilestoneCard
            key={item.id}
            item={item}
            colId={col.id}
            colName={col.name}
            onToggle={onToggle}
            sessions={sessions}
            botConfig={botConfig}
            onMutate={onMutate}
          />
        ))}
      </div>
      {adding ? (
        <div className="mt-1 flex flex-col gap-1.5 bg-white rounded-lg p-2 border border-slate-200">
          <input
            autoFocus
            type="text"
            placeholder="里程碑標題"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
          <input
            type="text"
            placeholder="截止日（YYYY/MM/DD，可空）"
            value={newDue}
            onChange={e => setNewDue(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleAdd}
              disabled={busy || !newTitle.trim()}
              className="flex-1 text-xs bg-blue-500 text-white rounded py-1 hover:bg-blue-600 disabled:opacity-50"
            >
              新增
            </button>
            <button
              onClick={() => { setAdding(false); setNewTitle(""); setNewDue("") }}
              className="flex-1 text-xs text-slate-500 hover:text-slate-700 rounded py-1 border border-slate-200"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          className="mt-1 flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs py-2 px-1 w-full transition-colors"
          onClick={() => setAdding(true)}
        >
          <Plus size={13} />
          新增里程碑
        </button>
      )}
    </div>
  )
}

export default function AgentBoard({ boardData, botConfig, onMutate }) {
  const [board] = useState(() => initBoard(boardData))
  const { sessions, addSession, removeSession } = useSessionContext()

  function toggleAssign(colId, itemId, colName, itemTitle) {
    const alreadyAssigned = sessions.some(s => s._milestoneId === itemId)
    if (!alreadyAssigned) {
      addSession({
        title: itemTitle,
        sourceMilestone: colName,
        assignee: botConfig.name,
        status: "pending",
        _milestoneId: itemId
      })
    } else {
      removeSession(itemId)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {board.columns.map(col => (
        <BoardColumn
          key={col.id}
          col={col}
          onToggle={toggleAssign}
          sessions={sessions}
          botConfig={botConfig}
          onMutate={onMutate}
        />
      ))}
    </div>
  )
}
