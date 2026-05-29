import { useState } from 'react'
import { Bell, CheckCircle, Coins } from 'lucide-react'
import { homeSummary } from '../mock/data'

function MetricCard({ icon: Icon, label, value, highlight }) {
  return (
    <div className="bg-white rounded-xl p-5 flex flex-col gap-2 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Icon size={16} />
        {label}
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-red-500' : 'text-slate-800'}`}>
        {value}
      </div>
    </div>
  )
}

export default function Home() {
  const [view, setView] = useState('data')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{homeSummary.greeting}</h1>
          <p className="text-slate-500 text-sm">{homeSummary.date}</p>
        </div>
        {/* 視圖切換 */}
        <div className="flex rounded-md overflow-hidden border border-slate-200">
          <button
            onClick={() => setView('data')}
            className={`px-4 py-1.5 text-sm transition-colors ${
              view === 'data' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'
            }`}
          >
            資料
          </button>
          <button
            onClick={() => setView('pixel')}
            className={`px-4 py-1.5 text-sm transition-colors ${
              view === 'pixel' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'
            }`}
          >
            像素
          </button>
        </div>
      </div>

      {view === 'data' ? (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MetricCard
              icon={Bell}
              label="待我處理"
              value={homeSummary.pendingCount}
              highlight={homeSummary.pendingCount > 0}
            />
            <MetricCard
              icon={CheckCircle}
              label="今日做了"
              value={homeSummary.todayDone}
            />
            <MetricCard
              icon={Coins}
              label="花費"
              value={`$${homeSummary.todayCost.toFixed(2)}`}
            />
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm text-slate-400 text-sm">
            今日行程・待我處理（後續批次實作）
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-10 border border-slate-200 shadow-sm text-center text-slate-400">
          HY-World 像素場景（後續批次實作）
        </div>
      )}
    </div>
  )
}
