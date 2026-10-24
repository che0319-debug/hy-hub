// 3D 世界的資料轉換層：純函式，不碰網路也不碰畫面。
// 原始資料來源與首頁相同（/api/mobile/state、/api/life-os/v1/today、AI Work 總表），規則沿用首頁像素視圖（PixelCity）。
// 之後後端欄位變動，只要改這裡；3D 場景與卡片只讀這裡整理好的格式。

// 3D 小人 id → 後端 agent id。只有這四位有後端資料；Atlas／Claude／GPT／Grok Build 還沒有（第二、三階段）。
export const FIG_AGENT = { hy: 'hy', p950157: '950157', xiaoyin: 'family', sam: 'sam' }

// 後端 runner id → 3D 小人 id。GPT Chat 與 GPT Work 合為一位（HY：GPT 小人含工作）；Grok 先接到 Grok Build，Atlas 還沒接。
export const RUNNER_FIG = { 'gpt-chat': 'gpt', 'chatgpt-work': 'gpt', 'claude-worker': 'claude', 'claude-review': 'claude', grok: 'grokbuild', 'grok-review': 'grokbuild' }
// 有接資料的小人（卡片用來判斷要不要顯示「還沒接資料」）
export const LIVE_FIGS = new Set([...Object.keys(FIG_AGENT), ...Object.values(RUNNER_FIG)])

const clip = (text, n) => { const t = String(text || '').trim().replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1) + '…' : t }
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

// 狀態判定（與首頁像素視圖同一套）：
//   需要你處理：Bot 狀態 attention、有待核准提案、有風險／待決定的訊號
//   AI 執行中：Bot 狀態 running、有進行中的工作
//   其他：等待／追蹤中
export function botStatus({ mobileStatus, waiting = 0, working = 0, risks = 0 }) {
  if (mobileStatus === 'attention' || waiting > 0 || risks > 0) return 'you'
  if (mobileStatus === 'running' || working > 0) return 'ai'
  return 'wait'
}

export function deriveBots(mobile, daily) {
  const out = {}
  for (const [figId, agentId] of Object.entries(FIG_AGENT)) {
    const mb = (mobile?.bots || []).find(b => b.id === agentId)
    const ag = daily?.agents?.[agentId]
    if (!mb && !ag) { out[figId] = null; continue }   // 兩邊都沒有資料：不顯示假的
    const waiting = num(ag?.waitingApproval), working = num(ag?.working), risks = num(ag?.proposals?.counts?.risks)
    const status = botStatus({ mobileStatus: mb?.status, waiting, working, risks })
    const parts = []
    if (waiting) parts.push(`${waiting} 項提案等你核准`)
    if (risks) parts.push(`${risks} 項風險或決定待處理`)
    if (working) parts.push(`${working} 項工作進行中`)
    const doing = clip(mb?.current, 40) || parts.join('、') || '目前沒有進行中的工作'
    const latest = ag?.proposals?.results?.[0]
    out[figId] = {
      status, doing,
      last: latest?.outcome ? clip(latest.outcome, 40) : '尚無完成紀錄',
      counts: { waiting, working, risks },
    }
  }
  return out
}

// 頂部狀態列的兩個數字。
//   待你確認：AI Work 的 openTotal（與首頁「待確認」同一個數字）
//   系統：讀不到資料的來源數（Bot 狀態、每日總覽、執行者活動、AI Work），0 代表正常
export function deriveSummary({ aiWork, aiWorkError, mobileFailed, dailyFailed, runnersFailed, loaded }) {
  const needsYou = aiWork && Number.isFinite(Number(aiWork.openTotal)) ? Number(aiWork.openTotal) : null
  const systemIssues = loaded ? [mobileFailed, dailyFailed, runnersFailed, aiWorkError].filter(Boolean).length : null
  return { needsYou, systemIssues }
}

// 執行者小人（GPT／Claude／Grok Build）：由 /runners/activity 彙整。
// 工作中＝有工作包執行中；其他＝等待。沒有資料（後端未上線或讀取失敗）就是 null，不編造。
export function deriveRunners(activity) {
  if (!activity || typeof activity.runners !== 'object' || !activity.runners) return {}
  const out = {}
  for (const fig of new Set(Object.values(RUNNER_FIG))) out[fig] = { running: 0, ready: 0, inferred: 0, current: '' }
  for (const [runner, v] of Object.entries(activity.runners)) {
    const fig = RUNNER_FIG[runner]
    if (!fig) continue
    const o = out[fig]
    o.running += num(v?.running); o.ready += num(v?.ready); o.inferred += num(v?.inferred)
    if (!o.current && v?.current) o.current = clip(v.current, 40)
  }
  const res = {}
  for (const [fig, o] of Object.entries(out)) {
    const counts = [o.running && `${o.running} 件執行中`, o.ready && `${o.ready} 件排隊`].filter(Boolean).join('、')
    res[fig] = {
      status: o.running > 0 ? 'ai' : 'wait',
      doing: o.current ? `${o.current}${counts ? `（${counts}）` : ''}` : counts || '目前沒有工作',
      last: null,   // 後端沒有完成時間，不顯示以免誤導
      counts: { working: o.running, waiting: o.ready },
      inferred: o.inferred > 0,
    }
  }
  return res
}
