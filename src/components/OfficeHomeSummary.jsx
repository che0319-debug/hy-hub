import { Check, CirclePlay, ClipboardList, Eye, Folder, Inbox } from 'lucide-react'
import { PROJECT_STAGES } from '../lib/projectStages.mjs'
import './office-home-summary.css'

// 首頁 Bot Office 統計卡。數字來自 Bot Office（mapOffice 的 totals），和 Bot Office 首頁同一口徑：
// 「待你決定」是列表上「待你核示 N 則」的總和（totals.needsYou）。其他格是該階段的專案數。不用其他同義詞。
const ICONS = { assigned: ClipboardList, hy_decision: Inbox, running: CirclePlay, review: Eye, done: Check }
const CARDS = [
  ...PROJECT_STAGES.map(s => ({ key: s.key, label: s.label, tone: s.tone, Icon: ICONS[s.key], value: t => s.key === 'hy_decision' && Number.isInteger(t?.needsYou) ? t.needsYou : (t.stages?.[s.key] ?? null) })),
  { key: 'all', label: '專案總數', tone: 'total', Icon: Folder, value: t => t.all },
]

export default function OfficeHomeSummary({ totals, failed, onOpen }) {
  if (failed) return <div className="office-summary-error" role="alert"><span>讀不到 Bot Office</span></div>
  return <div className="office-summary" aria-label="Bot Office 總表">
    {CARDS.map(({ key, label, tone, Icon, value }) => {
      const n = totals ? value(totals) : null
      return <button key={key} type="button" onClick={() => onOpen?.()} className="office-stat" data-status={key} data-tone={tone}
        data-alert={key === 'hy_decision' && n > 0 ? 'true' : undefined}>
        <span className="office-stat-icon"><Icon size={21} aria-hidden="true" /></span>
        <span className="office-stat-copy">
          <strong>{n === null ? '—' : n}</strong>
          <span>{label}</span>
        </span>
      </button>
    })}
  </div>
}
