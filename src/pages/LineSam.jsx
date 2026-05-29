import AgentBoard from '../components/AgentBoard'
import { boardSam } from '../mock/data'

export default function LineSam() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="inline-block w-3 h-3 rounded-full bg-orange-500" />
        <h1 className="text-xl font-bold text-slate-800">Sam</h1>
        <span className="text-slate-400 text-sm font-normal">控制中心</span>
      </div>
      <AgentBoard boardData={boardSam} botConfig={{ id: "sam", name: "Sam" }} />
    </div>
  )
}
