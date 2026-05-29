import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { bots } from '../mock/data'

// 狀態燈顏色對應（key = data.js status 英文值）
const STATUS_COLOR = {
  running: 'bg-blue-500',
  idle:    'bg-slate-300',
  collab:  'bg-green-500',
  error:   'bg-red-500',
}

const STATUS_LABEL = {
  running: '執行中',
  idle:    '閒置',
  collab:  '協作中',
  error:   '出錯',
}

function BotCard({ bot }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
      {/* 名稱 + 角色 + 狀態燈 */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-bold text-slate-800">{bot.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{bot.role}</p>
        </div>
        <span
          title={STATUS_LABEL[bot.status] ?? bot.status}
          className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${STATUS_COLOR[bot.status] ?? 'bg-slate-300'}`}
        />
      </div>

      {/* 今日件數 + 花費 */}
      <div className="flex gap-4">
        <div>
          <p className="text-xs text-slate-400">今天幫你</p>
          <p className="text-xl font-semibold text-slate-800">{bot.todayDone} <span className="text-sm font-normal text-slate-500">件</span></p>
        </div>
        <div>
          <p className="text-xs text-slate-400">花費</p>
          <p className="text-xl font-semibold text-slate-800">${bot.cost.toFixed(2)}</p>
        </div>
      </div>

      {/* 按鈕列 */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => navigate('/line/' + bot.id)}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          查看
        </button>
        <button
          disabled
          title="待開發"
          className="flex items-center gap-1 px-3 py-1 text-xs border border-slate-200 text-slate-400 rounded cursor-not-allowed"
        >
          <Settings size={11} />
          設定
        </button>
      </div>
    </div>
  )
}

export default function Helpers() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">我的小幫手</h1>
      </div>
      <p className="text-sm text-slate-400 mb-6 ml-5">所有可被指派的小幫手 · 今天做了什麼 · 花多少錢</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {bots.map(bot => (
          <BotCard key={bot.id} bot={bot} />
        ))}
      </div>
    </div>
  )
}
