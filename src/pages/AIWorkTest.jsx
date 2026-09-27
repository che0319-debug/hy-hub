import { useState } from 'react'
import { ClipboardList, LockKeyhole, RefreshCw } from 'lucide-react'

// Public deployment configuration only. Never place a runtime token here.
function testEndpoint() {
  const config = import.meta.env || {}
  if (config.VITE_AI_WORK_TEST_ENABLED !== '1') return null
  try {
    const u = new URL(config.VITE_AI_WORK_TEST_BASE)
    if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || u.pathname !== '/') return null
    return `${u.origin}/ai-work-v3-test/ai-work-test`
  } catch { return null }
}
export default function AIWorkTest() {
  const [attempt, setAttempt] = useState(0)
  const endpoint = testEndpoint()
  return (
    <section aria-labelledby="ai-work-test-title" className="flex h-full min-h-0 flex-col text-slate-800">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white py-3 pl-14 pr-3 md:px-6">
        <h1 id="ai-work-test-title" className="flex items-center gap-2 text-base font-semibold text-slate-900"><ClipboardList size={18} className="text-blue-600" aria-hidden="true" />AI Work Test</h1>
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">V3 Test</span>
          {endpoint && <button type="button" className="flex items-center gap-1 rounded-md border px-2 py-2 text-xs" onClick={() => setAttempt(v => v + 1)}><RefreshCw size={14} aria-hidden="true" />重新載入</button>}
        </div>
      </header>
      {!endpoint ? <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm" role="status">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><LockKeyhole size={20} className="text-blue-600" aria-hidden="true" />測試資料尚未接通</h2>
        <p className="mt-3 leading-7 text-slate-600">Test 儲存已初始化，正在完成後端啟用、登入與連線驗收。接通後，才會顯示測試專案及正式核准按鈕。</p>
        <p className="mt-3 text-sm text-slate-500">目前沒有載入專案，也沒有執行或核准任何工作。</p>
      </div> : <>
        <p className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">使用 Test 帳號登入；操作結果以專案內的系統回執為準。</p>
        <iframe key={attempt} title="AI Work Test 操作區" src={endpoint}
          className="min-h-0 w-full flex-1 border-0 bg-white"
          sandbox="allow-forms allow-same-origin" referrerPolicy="no-referrer" />
      </>}
    </section>
  )
}
