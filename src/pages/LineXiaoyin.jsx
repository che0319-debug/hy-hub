import AgentBoard from '../components/AgentBoard'
import { boardXiaoyin } from '../mock/data'

export default function LineXiaoyin() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
        <h1 className="text-xl font-bold text-slate-800">小因</h1>
        <span className="text-slate-400 text-sm font-normal">控制中心</span>
      </div>
      <AgentBoard boardData={boardXiaoyin} botConfig={{ id: "xiaoyin", name: "小因" }} />
    </div>
  )
}
