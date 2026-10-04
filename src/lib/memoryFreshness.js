// 小幫手卡片的記憶新鮮度（以台北日期計算天數）：
// 今天／昨天 → fresh（綠）；2–7 天 → aging（黑）；超過 7 天 → stale（紅）；沒有時間 → none。
const TZ = 'Asia/Taipei'
const DAY = 86400000

const taipeiDate = ts => new Date(ts).toLocaleDateString('en-CA', { timeZone: TZ })

export function daysAgo(isoStr, now = Date.now()) {
  const ts = new Date(isoStr).getTime()
  if (!isoStr || Number.isNaN(ts)) return null
  return Math.round((new Date(taipeiDate(now)) - new Date(taipeiDate(ts))) / DAY)
}

export function freshness(isoStr, now = Date.now()) {
  const days = daysAgo(isoStr, now)
  if (days === null) return { level: 'none', label: '無資料' }
  let label
  if (days <= 0) {
    const hhmm = new Date(isoStr).toLocaleTimeString('zh-TW', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
    label = `今天 ${hhmm}`
  } else if (days === 1) label = '昨天'
  else label = `${days} 天前`
  const level = days <= 1 ? 'fresh' : days <= 7 ? 'aging' : 'stale'
  return { level, label, days }
}
