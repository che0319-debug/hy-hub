// 3D 世界的資料轉換層：純函式，不碰網路也不碰畫面。
// 原始資料來源與首頁相同（/api/mobile/state、/api/life-os/v1/today、AI Work 總表），規則沿用首頁像素視圖（PixelCity）。
// 之後後端欄位變動，只要改這裡；3D 場景與卡片只讀這裡整理好的格式。

// 3D 小人 id → 後端 agent id。只有這四位有後端資料；Atlas／Claude／GPT／Grok Build 還沒有（第二、三階段）。
export const FIG_AGENT = { hy: 'hy', p950157: '950157', xiaoyin: 'family', sam: 'sam' }

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
//   系統：讀不到資料的來源數（Bot 狀態、每日總覽、AI Work），0 代表正常
export function deriveSummary({ aiWork, aiWorkError, mobileFailed, dailyFailed, loaded }) {
  const needsYou = aiWork && Number.isFinite(Number(aiWork.openTotal)) ? Number(aiWork.openTotal) : null
  const systemIssues = loaded ? [mobileFailed, dailyFailed, aiWorkError].filter(Boolean).length : null
  return { needsYou, systemIssues }
}
