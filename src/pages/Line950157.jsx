import AgentBoard from '../components/AgentBoard'
import { board950157 } from '../mock/data'

export default function Line950157() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">950157</h1>
        <span className="text-slate-400 text-sm font-normal">控制中心</span>
      </div>
      <AgentBoard boardData={board950157} botConfig={{ id: "950157", name: "950157" }} />
    </div>
  )
}
