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
    <section aria-labelledby="ai-work-test-title" className="max-w-6xl mx-auto text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <p className="text-sm text-slate-500">HY Life OS ／ AI Work Test</p>
        <span className="rounded-md bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">V3 Test</span>
      </div>
      <header className="py-7">
        <h1 id="ai-work-test-title" className="flex items-center gap-3 text-3xl font-bold text-slate-900"><ClipboardList className="text-blue-600" aria-hidden="true" />AI Work Test</h1>
        <p className="mt-3 text-sm text-slate-500">規劃核准、里程碑交件與結案確認。</p>
      </header>
      {!endpoint ? <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm" role="status">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><LockKeyhole size={20} className="text-blue-600" aria-hidden="true" />測試資料尚未接通</h2>
        <p className="mt-3 leading-7 text-slate-600">Test 儲存已初始化，正在完成後端啟用、登入與連線驗收。接通後，才會顯示測試專案及正式核准按鈕。</p>
        <p className="mt-3 text-sm text-slate-500">目前沒有載入專案，也沒有執行或核准任何工作。</p>
      </div> : <>
        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-blue-100 bg-white p-4">
          <p className="text-sm text-slate-600">請在下方使用 Test 帳號登入。若畫面空白或登入後未進入專案，請重新載入；仍無法登入時請回報瀏覽器與畫面訊息。</p>
          <button type="button" className="flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm" onClick={() => setAttempt(v => v + 1)}><RefreshCw size={16} aria-hidden="true" />重新載入</button>
        </div>
        <iframe key={attempt} title="AI Work Test 操作區" src={endpoint}
          className="w-full rounded-xl border border-slate-200 bg-white" style={{ minHeight: '75vh' }}
          sandbox="allow-forms allow-same-origin" referrerPolicy="no-referrer" />
      </>}
    </section>
  )
}
