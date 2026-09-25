import { Check, Clock3, Folder, GitBranch } from 'lucide-react'

export default function AIWorkSummary({ summary, onOpen }) {
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-5" aria-label="AI Work 區總表">
    {[
      ['ai_pending', '待 AI 接手', Clock3], ['ai_running', '進行中', GitBranch], ['confirmation', '等待確認', Clock3],
      ['completed', '已完成', Check], ['all', '全部專案', Folder],
    ].map(([key, label, Icon]) => <button key={key} type="button" onClick={() => onOpen?.(key)} className="flex min-h-24 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left">
      <span className="rounded-full bg-blue-50 p-3 text-blue-600"><Icon size={20}/></span>
      <span><span className="block text-sm text-slate-500">{label}</span><strong className="mt-1 block text-3xl text-slate-800">{summary ? summary[key] : '—'}</strong></span>
    </button>)}
  </div>
}
