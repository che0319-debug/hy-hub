import { ClipboardList, LockKeyhole } from 'lucide-react'

// A real in-app route, deliberately disconnected until Test storage is approved.
// Never import the production work store or simulate approval in browser state.
export default function AIWorkTest() {
  return (
    <section aria-labelledby="ai-work-test-title" className="max-w-6xl mx-auto text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <p className="text-sm text-slate-500">HY Life OS ／ AI Work Test</p>
        <span className="rounded-md bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">V3 Test</span>
      </div>
      <header className="py-7">
        <h1 id="ai-work-test-title" className="flex items-center gap-3 text-3xl font-bold text-slate-900"><ClipboardList className="text-blue-600" aria-hidden="true" />AI Work Test</h1>
        <p className="mt-3 text-sm text-slate-500">在 HY Life OS 內測試規劃核准、里程碑交件與結案確認。</p>
      </header>
      <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm" role="status">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><LockKeyhole size={20} className="text-blue-600" aria-hidden="true" />測試資料尚未接通</h2>
        <p className="mt-3 leading-7 text-slate-600">分頁入口已就緒，正在等待確認獨立測試資料的儲存方式。接通後，才會顯示測試專案及正式核准按鈕。</p>
        <p className="mt-3 text-sm text-slate-500">目前沒有載入專案，也沒有執行或核准任何工作。</p>
      </div>
    </section>
  )
}
