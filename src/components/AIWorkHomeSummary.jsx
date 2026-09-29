import { Check, Clock3, Folder, CirclePlay, Inbox, RefreshCw } from 'lucide-react'
import './ai-work-summary.css'

// 首頁 AI Work 統計卡（v5 控制中心口徑）。summary 來自 aiWorkStore → aiWorkV5Data。
const CARDS = [
  { key: 'open', label: '待確認', Icon: Inbox, value: s => s.openTotal, sub: s => `分布在 ${s.openProjects} 個專案`, filter: 'open' },
  { key: 'running', label: '執行中', Icon: CirclePlay, value: s => s.running, filter: 'active' },
  { key: 'waiting', label: '排隊中', Icon: Clock3, value: s => s.waiting, filter: 'active' },
  { key: 'completed', label: '完成', Icon: Check, value: s => s.completed, filter: 'completed' },
  { key: 'all', label: '全部專案', Icon: Folder, value: s => s.all, filter: 'all' },
]

export default function AIWorkHomeSummary({ summary, error, onOpen, onRetry }) {
  if (error) {
    return <div className="ai-work-summary-error" role="alert">
      <span>讀取失敗</span>
      <button type="button" onClick={onRetry}><RefreshCw size={14} aria-hidden="true" />重試</button>
    </div>
  }
  return <div className="ai-work-summary" aria-label="AI Work 總表">
    {CARDS.map(({ key, label, Icon, value, sub, filter }) => {
      const n = summary ? value(summary) : null
      return <button key={key} type="button" onClick={() => onOpen?.(filter)} className="ai-work-stat" data-status={`v5-${key}`}
        data-alert={key === 'open' && n > 0 ? 'true' : undefined}>
        <span className="ai-work-stat-icon"><Icon size={21} aria-hidden="true" /></span>
        <span className="ai-work-stat-copy">
          <strong>{n === null ? '—' : n}</strong>
          <span>{label}</span>
          {sub && summary && <small className="ai-work-stat-sub">{sub(summary)}</small>}
        </span>
      </button>
    })}
  </div>
}
