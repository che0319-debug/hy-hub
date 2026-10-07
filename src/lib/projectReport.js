// 專案報告（後端 /projects/{id}/report）的顯示邏輯：純函式，方便測試。
export const REPORT_FILENAME = '00_專案報告.html'
export const REPORT_PACKAGE_TYPE = 'PROJECT_REPORT'

export const isReportPackage = p => p?.type === REPORT_PACKAGE_TYPE
export const isReportFile = f => f?.filename === REPORT_FILENAME

// info = GET /projects/{id}/report；回傳卡片要顯示的狀態、說明與可用按鈕。
export function reportView(info) {
  if (!info) return { tone: 'wait', label: '讀取中', title: '專案報告', hint: '', canOpen: false, canRefresh: false }
  const title = info.final ? '結案報告' : '專案報告'
  const rev = info.latest?.revision
  const base = { title, canOpen: !!info.latest, revision: rev || null, updatedAt: info.latest?.created_at || null }
  if (info.state === 'running') return { ...base, tone: 'ai', label: '整理中', canRefresh: false,
    hint: 'AI 正在整合所有產出，完成後這裡會自動更新。' }
  if (info.state === 'queued') return { ...base, tone: 'wait', label: '排隊中', canRefresh: false,
    hint: '已排入，等 AI 領取後開始整理。' }
  if (info.state === 'failed') return { ...base, tone: 'bad', label: '整理失敗', canRefresh: true,
    hint: info.latest ? '最近一次整理沒有成功，目前顯示上一版。可以再按一次「整理報告」。' : '報告整理沒有成功，可以按「整理報告」再試一次。' }
  if (!info.latest) return { ...base, tone: 'wait', label: '尚未產生', canRefresh: true,
    hint: '規劃書核准後會自動產生第一版；也可以現在按「整理報告」。' }
  if (info.stale) return { ...base, tone: 'you', label: '有新進度', canRefresh: true,
    hint: '上次整理後有新的產出或決定。下一次 Milestone 核准時會自動更新，想現在看到可按「整理報告」。' }
  return { ...base, tone: 'done', label: info.final ? '已結案' : '最新', canRefresh: true,
    hint: info.final ? '專案已完成，這是最終版結案報告。' : '報告已涵蓋目前所有產出。' }
}

// POST /report/refresh 的結果 → 給 HY 看的一句話。
export function refreshMessage(result) {
  switch (result?.status) {
    case 'queued': return { text: '已排入整理，AI 領取後會更新報告。', tone: 'ok' }
    case 'already_queued': return { text: '已經在整理中，不用重複按。', tone: 'ok' }
    case 'no_change': return { text: '自上次整理後沒有新內容，所以沒有重新整理（不耗 AI 額度）。', tone: 'info', canForce: true }
    case 'not_ready': return { text: '規劃書核准後才能整理報告。', tone: 'info' }
    default: return { text: '整理報告沒有成功，請稍後再試。', tone: 'bad' }
  }
}

// 狀態變化時要不要繼續輪詢：排隊／整理中才需要。
export const shouldPoll = info => info?.state === 'queued' || info?.state === 'running'

// 下載檔名：專案名＋版本，避免覆蓋。
export function downloadName(title, info) {
  const safe = String(title || '專案').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 40)
  const rev = info?.latest?.revision
  return `${safe}_${info?.final ? '結案報告' : '專案報告'}${rev ? `_v${rev}` : ''}.html`
}
