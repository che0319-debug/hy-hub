export const taipeiDate = (now = Date.now()) => new Date(now + 8 * 3600000).toISOString().slice(0, 10)
export function weeklyRange(id) {
  const match = /^w-(\d{4})-(\d{2})$/.exec(id || '')
  if (!match || +match[2] < 1 || +match[2] > 53) return null
  const jan4 = new Date(Date.UTC(+match[1], 0, 4))
  const start = new Date(+jan4 - ((jan4.getUTCDay()+6)%7)*86400000 + (+match[2]-1)*7*86400000)
  return { start:start.toISOString().slice(0,10), end:new Date(+start+6*86400000).toISOString().slice(0,10) }
}
export function weeksUntilFifty(birthDate, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate || '')) return null
  const [y,m,d] = birthDate.split('-').map(Number)
  return Math.max(0,Math.floor((Date.UTC(y+50,m-1,d)-Date.parse(taipeiDate(now)+'T00:00:00Z'))/(7*86400000)))
}
export function weeklyView(data, now = Date.now()) {
  const entry = [...(data?.entries || [])].sort((a,b)=>String(b.id).localeCompare(String(a.id)))[0]
  const range = weeklyRange(entry?.id), today = taipeiDate(now)
  return { entry,range,weeks:weeksUntilFifty(data?.birthDate,now),stale:!!range && range.end<today,
    title:range?.start>today?'下週方向':'每週方向',updatedDate:entry?.writtenAt && Number.isFinite(Date.parse(entry.writtenAt)) ? taipeiDate(Date.parse(entry.writtenAt)) : entry?.updatedAt }
}
