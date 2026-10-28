import { Check, CirclePlay, Folder, Inbox } from 'lucide-react'
import './office-home-summary.css'

// 首頁 Bot Office 統計卡。數字來自 Bot Office（mapOffice 的 totals），和 Bot Office 頁面同一口徑。
const CARDS = [
  { key: 'pending', label: '待你決定', Icon: Inbox, value: t => t.pending },
  { key: 'running', label: '進行中', Icon: CirclePlay, value: t => t.running },
  { key: 'finished', label: '已完成', Icon: Check, value: t => t.finished },
  { key: 'all', label: '全部專案', Icon: Folder, value: t => t.all },
]

export default function OfficeHomeSummary({ totals, failed, onOpen }) {
  if (failed) return <div className="office-summary-error" role="alert"><span>讀不到 Bot Office</span></div>
  return <div className="office-summary" aria-label="Bot Office 總表">
    {CARDS.map(({ key, label, Icon, value }) => {
      const n = totals ? value(totals) : null
      return <button key={key} type="button" onClick={() => onOpen?.()} className="office-stat" data-status={key}
        data-alert={key === 'pending' && n > 0 ? 'true' : undefined}>
        <span className="office-stat-icon"><Icon size={21} aria-hidden="true" /></span>
        <span className="office-stat-copy">
          <strong>{n === null ? '—' : n}</strong>
          <span>{label}</span>
        </span>
      </button>
    })}
  </div>
}
