import AgentBoard from '../components/AgentBoard'
import { boardHY } from '../mock/data'

export default function LineHY() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="inline-block w-3 h-3 rounded-full bg-violet-600" />
        <h1 className="text-xl font-bold text-slate-800">HY</h1>
        <span className="text-slate-400 text-sm font-normal">控制中心</span>
      </div>
      <AgentBoard boardData={boardHY} botConfig={{ id: "hy", name: "HY" }} />
    </div>
  )
}
