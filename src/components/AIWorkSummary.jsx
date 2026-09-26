import { Check, Clock3, Folder, CirclePlay } from 'lucide-react'
import './ai-work-summary.css'

export default function AIWorkSummary({ summary, onOpen, activeFilter }) {
  return <div className="ai-work-summary" aria-label="AI Work 區總表">
    {[
      ['ai_pending', '待 AI 接手', Clock3], ['ai_running', '進行中', CirclePlay], ['confirmation', '等待確認', Clock3],
      ['completed', '已完成', Check], ['all', '全部專案', Folder],
    ].map(([key, label, Icon]) => <button key={key} type="button" onClick={() => onOpen?.(key)} className="ai-work-stat" data-status={key} aria-pressed={activeFilter === undefined ? undefined : activeFilter === key}>
      <span className="ai-work-stat-icon"><Icon size={21} aria-hidden="true"/></span>
      <span className="ai-work-stat-copy"><strong>{summary ? summary[key] : '—'}</strong><span>{label}</span></span>
    </button>)}
  </div>
}
