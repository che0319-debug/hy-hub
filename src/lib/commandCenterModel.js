export const LABEL = { idle:'閒置', queued:'排隊中', claimed:'已領取', running:'執行中', researching:'搜尋研究', reading:'閱讀中', analyzing:'分析中', generating:'產出中', waiting:'等待中', review:'待驗收', succeeded:'已完成', failed:'失敗', cancelled:'已取消' }
export const ACTIVE = new Set(['claimed','running','researching','reading','analyzing','generating'])
export function isStalled(work, now = Date.now()) {
  const time = Date.parse(work.updated_at)
  return ACTIVE.has(work.status) && Number.isFinite(time) && now - time > 30 * 60 * 1000
}
export function agentGroups(work) {
  const groups = new Map()
  for (const w of work) {
    const id = w.agent || '__unassigned__'
    if (!groups.has(id)) groups.set(id, { id, name: w.agent_name || '尚未標示 Agent', assigned: Boolean(w.agent), work: [] })
    groups.get(id).work.push(w)
  }
  return [...groups.values()]
}
export function contextText(selection, offices, work) {
  const office = offices.find(o => o.id === selection.bot)
  const item = work.find(w => w.work === selection.work)
  return [office?.name || 'HY', selection.agent_name, item?.project_name || selection.project_name, item?.title].filter(Boolean).join(' / ')
}
export function commandDraft(selection, offices, work, text) {
  const item = work.find(w => w.work === selection.work)
  return `請透過既有 HY Life OS connector 處理以下指令。\n對象：${contextText(selection, offices, work)}\nBot owner：${selection.bot}${selection.agent ? `\nAgent：${selection.agent}` : ''}${(item?.project || selection.project) ? `\nProject ID：${item?.project || selection.project}` : ''}${item ? `\nAI Work ID：${item.work}` : ''}\n指令：${text.trim()}\n請先讀取最新狀態，再依指令操作；重大系統修改須由 HY 核准。`
}
