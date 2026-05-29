import { Bell, Coins } from 'lucide-react'
import { topbar } from '../mock/data'

const statusConfig = {
  ok:      { color: 'bg-green-500',  label: '系統正常' },
  partial: { color: 'bg-yellow-400', label: '部分異常' },
  down:    { color: 'bg-red-500',    label: '系統異常' },
}

export default function TopBar() {
  const status = statusConfig[topbar.systemStatus] ?? statusConfig.ok

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-slate-900 text-white flex items-center px-4 z-50 border-b border-slate-700">
      <span className="font-bold text-lg tracking-wide">HY World</span>
      <div className="ml-auto flex items-center gap-6">
        {/* 待我處理 */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <Bell size={16} />
          <span className={topbar.pendingCount > 0 ? 'text-red-500 font-semibold' : ''}>
            {topbar.pendingCount}
          </span>
        </div>
        {/* 今日花費 */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <Coins size={16} />
          <span>${topbar.todayCost.toFixed(2)}</span>
        </div>
        {/* 系統狀態 */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${status.color}`} />
          <span className="text-sm">{status.label}</span>
        </div>
      </div>
    </header>
  )
}
