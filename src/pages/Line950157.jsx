import { useState } from 'react'
import { Calendar, CheckSquare, Square, Plus } from 'lucide-react'
import { board950157 } from '../mock/data'
import { useSessionContext } from '../App'

function initBoard() {
  return {
    ...board950157,
    columns: board950157.columns.map(col => ({
      ...col,
      items: col.items.map(item => ({ ...item }))
    }))
  }
}

function MilestoneCard({ item, colId, colName, onToggle, sessions }) {
  const assigned = sessions.some(s => s._milestoneId === item.id)
  return (
    <div
      className={`bg-white rounded-xl p-4 border shadow-sm mb-2 transition-colors ${
        assigned ? 'border-blue-500' : 'border-slate-200'
      }`}
    >
      <p className="text-slate-800 font-medium text-sm leading-snug mb-1">{item.title}</p>
      {item.desc && (
        <p className="text-slate-500 text-xs mb-2">{item.desc}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="flex items-center gap-1 text-slate-500 text-xs">
          <Calendar size={12} />
          {item.due}
        </span>
        <button
          onClick={() => onToggle(colId, item.id, colName, item.title)}
          className="flex items-center gap-1.5 text-xs transition-colors"
        >
          {assigned ? (
            <>
              <CheckSquare size={14} className="text-blue-600" />
              <span className="text-blue-600 font-medium">已交給 950157</span>
            </>
          ) : (
            <>
              <Square size={14} className="text-slate-400" />
              <span className="text-slate-400 hover:text-slate-600">交給 950157</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function BoardColumn({ col, onToggle, sessions }) {
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
          />
        ))}
      </div>
      <button
        className="mt-1 flex items-center gap-1.5 text-slate-400 text-xs py-2 px-1 w-full cursor-default"
        tabIndex={-1}
        onClick={e => e.preventDefault()}
      >
        <Plus size={13} />
        新增里程碑
      </button>
    </div>
  )
}

export default function Line950157() {
  const [board, setBoard] = useState(initBoard)
  const { sessions, addSession, removeSession } = useSessionContext()

  function toggleAssign(colId, itemId, colName, itemTitle) {
    const alreadyAssigned = sessions.some(s => s._milestoneId === itemId)
    if (!alreadyAssigned) {
      addSession({
        title: itemTitle,
        sourceMilestone: colName,
        assignee: "950157",
        status: "pending",
        _milestoneId: itemId
      })
    } else {
      removeSession(itemId)
    }
  }

  return (
    <div>
      {/* 分頁標題列 */}
      <div className="flex items-center gap-2 mb-6">
        <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">950157</h1>
        <span className="text-slate-400 text-sm font-normal">控制中心</span>
      </div>

      {/* 三欄看板 */}
      <div className="grid grid-cols-3 gap-3">
        {board.columns.map(col => (
          <BoardColumn key={col.id} col={col} onToggle={toggleAssign} sessions={sessions} />
        ))}
      </div>
    </div>
  )
}
