// One read contract for the goal page, building labels and island cards.
export const DIMENSIONS = {
  'dim-biz': { owner: 'sam', bot: 'Sam', building: 'sidehq' },
  'dim-fin': { owner: 'sam', bot: 'Sam', building: 'vault' },
  'dim-health': { owner: 'family', bot: '小因', building: 'gym' },
  'dim-family': { owner: 'family', bot: '小因', building: 'home' },
  'dim-job': { owner: '950157', bot: '950157', building: 'hq' },
  'dim-leisure': { owner: 'hy', bot: 'HY', building: 'lakeside' },
  'dim-growth': { owner: 'hy', bot: 'HY', building: 'dojo' },
}
export const BUILDING_DIMENSIONS = Object.fromEntries(Object.entries(DIMENSIONS).map(([id, d]) => [d.building, id]))
export const LAYERS = [{ id: 'engine', name: '引擎層', note: '事業與財務' },
  { id: 'base', name: '地基層', note: '健康、家庭與本業' }, { id: 'sustain', name: '續航層', note: '休閒與成長' }]
export const ACTIVITY = { green: { text: '7 天內有行動', tone: 'done' }, yellow: { text: '8–21 天有行動', tone: 'you' },
  red: { text: '超過 21 天的紀錄', tone: 'bad' }, unknown: { text: '行動日期待補', tone: 'wait' } }
const taipeiDay = value => { if (typeof value !== 'string' || !value) return null; const time = Date.parse(value.length === 10 ? value + 'T00:00:00+08:00' : value); return Number.isFinite(time) ? Math.floor((time + 8 * 3600000) / 86400000) : null }
export function activityOf(lastActionAt, now = Date.now()) {
  const day = taipeiDay(lastActionAt), today = taipeiDay(new Date(now).toISOString())
  if (day === null || day > today) return 'unknown'
  const days = today - day
  return days <= 7 ? 'green' : days <= 21 ? 'yellow' : 'red'
}
export function validateGoals(value) {
  const ids = Array.isArray(value?.dimensions) ? value.dimensions.map(d => d?.id) : null
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length || Object.keys(DIMENSIONS).some(id => !ids.includes(id))) throw new Error('七維資料不完整，請稍後重試。')
  if (value.dimensions.some(d => DIMENSIONS[d.id] && !LAYERS.some(layer => layer.id === d.layer))) throw new Error('七維分層資料待核對，請稍後重試。')
  return value
}
export function dimensionView(d, now = Date.now()) {
  if (!d || !DIMENSIONS[d.id]) return null
  const history = Array.isArray(d.history) ? d.history.filter(h => h && typeof h === 'object') : []
  const initialized = !!d.initializedAt || history.some(h => h.kind === 'initial')
  const score = initialized && Number.isInteger(d.progress) && d.progress >= 0 && d.progress <= 100 ? d.progress : null
  const vision = d.tenYearVision || { text: d.totalGoal || '', source: 'legacy', confirmedByUser: false }
  return { ...d, ...DIMENSIONS[d.id], score, scoreText: score === null ? '未評分' : `${score} / 100`,
    scoreSourceText: score === null ? '待負責 Bot 提供真實證據' : 'v2 起算 · Bot 依證據評分',
    activity: activityOf(d.lastActionAt, now), evidenceStatus: d.evidenceStatus || 'insufficient',
    vision, visionLabel: vision.confirmedByUser ? '已確認' : vision.source === 'hy' ? '待你點頭' : '草稿・待你改',
    nowSummary: d.nowSummary || '等待負責 Bot 整理真實證據。', nextStep: d.nextStep || '由負責 Bot 補上具體下一步。',
    history, recent: history.filter(h => ['initial', 'assessment', 'assessment_status', 'score_clear', 'action', 'setback', 'decay', 'correction', 'revert'].includes(h.kind)).slice(-3).reverse(),
    updatedAt: history.at(-1)?.at || d.statusAt || d.initializedAt || null }
}
export function dimensionForBuilding(document, buildingId, now) {
  const id = BUILDING_DIMENSIONS[buildingId]
  return id ? dimensionView(document?.dimensions?.find(d => d.id === id), now) : null
}
export function principlesText(document) {
  const principles = document?.lifePrinciples
  return typeof principles === 'string' ? principles : typeof principles?.text === 'string' ? principles.text : ''
}
export function dateText(value) {
  const date = new Date(value)
  return value && Number.isFinite(date.getTime()) ? date.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }) : '尚未更新'
}
export function evidenceItems(entry) { return Array.isArray(entry?.evidence) ? entry.evidence : entry?.evidence ? [entry.evidence] : [] }
export function safeEvidenceUrl(ref) { try { const u = new URL(ref); return ['https:', 'http:'].includes(u.protocol) ? u.href : null } catch { return null } }
