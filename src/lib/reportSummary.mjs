// 一頁摘要的結構。正式成果報告 HTML（section.focus）與概況卡共用這份解析，版面由 ReportSummaryCard 畫。
// 清單與 reportSummaryLines 共用一個上限。
export const SUMMARY_ITEM_LIMIT = 8
export const DONE_MILESTONE = new Set(['done', 'completed', 'complete', 'closed', 'passed', '完成', '已完成'])
const NOT_STARTED = new Set(['', 'open', 'pending', 'not_started', 'todo', '未開始', '尚未開工', '未開工'])
const CLOSED_FOLLOW_UP = new Set(['done', 'resolved', 'cancelled', '已完成', '已取消'])
const TEXT = value => typeof value === 'string' ? value.trim() : ''
const statusKey = value => TEXT(value).toLowerCase()
const decode = value => TEXT(value)
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
export const plain = value => decode(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

export function isMilestoneDone(milestone) {
  return DONE_MILESTONE.has(statusKey(milestone?.status))
}

const SUMMARY_HEADING = /一頁摘要|現在怎樣.*你要做什麼|現在怎樣.*接下來做什麼/

export function extractSummarySection(html) {
  if (typeof html !== 'string' || !html.trim()) return null
  const source = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '')
  const heading = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi
  let found = null
  for (const match of source.matchAll(heading)) {
    if (SUMMARY_HEADING.test(plain(match[2]))) { found = match; break }
  }
  if (!found) return null
  const rest = source.slice(found.index + found[0].length)
  const level = Number(found[1])
  const next = new RegExp(`<h[1-${level}]\\b`, 'i').exec(rest)
  return { title: plain(found[2]), html: next ? rest.slice(0, next.index) : rest }
}

function classNames(attrs) {
  const match = String(attrs || '').match(/\bclass\s*=\s*["']([^"']*)["']/i)
  return match ? match[1].split(/\s+/).filter(Boolean) : []
}

function tagTone(names) {
  if (names.includes('done')) return 'done'
  if (names.includes('you')) return 'you'
  if (names.includes('risk')) return 'bad'
  if (names.includes('info')) return 'ai'
  return 'wait'
}

function cleanLead(value) {
  return TEXT(value).replace(/\s*[：:]\s*$/, '')
}

export function splitLead(value) {
  const raw = stripTagSpans(value).trim()
  if (!raw) return null
  const marked = raw.match(/^<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>\s*([：:])?\s*([\s\S]*)$/i)
  if (marked) {
    const lead = cleanLead(plain(marked[2]))
    const text = plain(marked[4])
    if (lead && text) return { lead, text }
  }
  const whole = plain(raw)
  if (!whole) return null
  const soft = whole.match(/^([^：:]{1,32})[：:]\s*(\S[\s\S]*)$/)
  if (soft) return { lead: soft[1].trim(), text: soft[2].trim() }
  return { lead: '', text: whole }
}

function stripTagSpans(html) {
  return String(html || '').replace(/<span\b([^>]*)>[\s\S]*?<\/span>/gi, (whole, attrs) => (
    classNames(attrs).includes('tag') ? '' : whole
  ))
}

function takeConclusion(items, existing) {
  const sentence = TEXT(existing).replace(/^結論\s*[：:]\s*/, '').trim()
  if (sentence) return { conclusion: sentence, items }
  const full = item => (item.lead ? `${item.lead}：${item.text}` : item.text).trim()
  const index = items.findIndex(item => item.lead === '結論' || /^結論\s*[：:]?/.test(full(item)))
  if (index < 0) return { conclusion: '', items }
  const text = full(items[index]).replace(/^結論\s*[：:]\s*/, '').trim()
  return { conclusion: text, items: items.filter((_, itemIndex) => itemIndex !== index) }
}

export function parseReportSummary(html) {
  const section = extractSummarySection(html)
  if (!section) return { title: '', badges: [], metrics: [], conclusion: '', items: [] }
  const badges = []
  for (const match of section.html.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi)) {
    const names = classNames(match[1])
    if (!names.includes('tag')) continue
    const text = plain(match[2])
    if (text) badges.push({ tone: tagTone(names), text })
  }
  const metrics = []
  for (const match of section.html.matchAll(/<div\b([^>]*\bclass\s*=\s*["'][^"']*\bmetric\b[^"']*["'][^>]*)>([\s\S]*?)<\/div>/gi)) {
    const value = plain((match[2].match(/<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>/i) || [])[1] || '')
    const label = plain((match[2].match(/<span\b[^>]*>([\s\S]*?)<\/span>/i) || [])[1] || '')
    if (value && label) metrics.push({ value, label })
  }
  let conclusion = ''
  const paragraphs = []
  for (const match of section.html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const body = stripTagSpans(match[1])
    const text = plain(body)
    if (!text) continue
    if (/^結論\s*[：:]?/.test(text)) {
      conclusion = text
      continue
    }
    paragraphs.push(body)
  }
  let items = [...section.html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(match => splitLead(match[1])).filter(Boolean).slice(0, SUMMARY_ITEM_LIMIT)
  if (!items.length) items = paragraphs.map(splitLead).filter(Boolean).slice(0, SUMMARY_ITEM_LIMIT)
  if (!badges.length && !metrics.length && !items.length && !conclusion) {
    const body = plain(stripTagSpans(section.html)).slice(0, 1200)
    const item = body ? splitLead(body) : null
    if (item) items = [item]
  }
  const taken = takeConclusion(items, conclusion)
  return { title: section.title, badges, metrics, conclusion: taken.conclusion, items: taken.items }
}

function milestoneDone(milestone) {
  return isMilestoneDone(milestone)
}

function planBadge(project) {
  const source = project?.source && typeof project.source === 'object' ? project.source : {}
  const revision = source.plan_revision ?? project?.plan_revision
  if (revision === undefined || revision === null || revision === '' || revision === 0 || revision === '0') return null
  const state = source.plan_state ?? project?.plan_state
  if (state === 'APPROVED') return { tone: 'done', text: `規劃 v${revision} 已核准` }
  if (state) return { tone: 'you', text: `規劃 v${revision} 尚未核准` }
  return { tone: 'wait', text: `規劃 v${revision}` }
}

function openFollowUps(project) {
  if (!Array.isArray(project?.followUps)) return null
  return project.followUps.filter(item => item && !CLOSED_FOLLOW_UP.has(item.status)).length
}

function pendingDecisions(project) {
  if (Array.isArray(project?.decisions)) return project.decisions.length
  if (Array.isArray(project?.allDecisions)) return project.allDecisions.filter(item => item?.status === 'open').length
  return null
}

function milestoneBadge(rows) {
  if (!rows.length) return null
  const done = rows.filter(milestoneDone).length
  const total = rows.length
  if (done === total) return { tone: 'done', text: `里程碑 ${done}／${total} 完成` }
  const idle = rows.every(row => !milestoneDone(row) && NOT_STARTED.has(statusKey(row?.status)))
  if (idle) {
    const ids = rows.map(row => TEXT(row?.id)).filter(Boolean)
    if (ids.length >= 2) return { tone: 'wait', text: `${ids[0]}–${ids[ids.length - 1]} 尚未開工` }
    if (ids.length === 1) return { tone: 'wait', text: `${ids[0]} 尚未開工` }
    return { tone: 'wait', text: '里程碑尚未開工' }
  }
  return { tone: done ? 'ai' : 'wait', text: `里程碑 ${done}／${total}` }
}

export function projectSummaryChrome(project, milestones = []) {
  const rows = Array.isArray(milestones) ? milestones.filter(item => item && typeof item === 'object') : []
  const badges = []
  const plan = planBadge(project)
  if (plan) badges.push(plan)
  const follow = openFollowUps(project)
  if (follow > 0) badges.push({ tone: 'you', text: `執行前待辦 ${follow} 件` })
  const pending = pendingDecisions(project)
  if (pending > 0) badges.push({ tone: 'you', text: `待你決定 ${pending} 件` })
  const milestone = milestoneBadge(rows)
  if (milestone) badges.push(milestone)
  const stage = TEXT(project?.stageLabel)
  if (stage) badges.push({ tone: project?.tone || 'wait', text: `階段 ${stage}` })
  const metrics = []
  if (rows.length) metrics.push({ value: `${rows.filter(milestoneDone).length}／${rows.length}`, label: '里程碑完成' })
  if (pending > 0) metrics.push({ value: String(pending), label: '待你決定' })
  if (follow > 0) metrics.push({ value: String(follow), label: '執行前待辦未完成' })
  return { badges, metrics }
}

export function composeReportSummary({ html = '', lines = [], project = null, milestones = [] } = {}) {
  const parsed = parseReportSummary(html)
  const chrome = projectSummaryChrome(project, milestones)
  const hasHtml = typeof html === 'string' && html.trim()
  let items = parsed.items
  // lines 是同一份 HTML 抽出的純文字。有 HTML 時以解析結果為準，避免把徽章和數字再糊成一行。
  if (!hasHtml && !items.length && Array.isArray(lines)) items = lines.map(splitLead).filter(Boolean).slice(0, SUMMARY_ITEM_LIMIT)
  const taken = takeConclusion(items, parsed.conclusion)
  const narrative = Boolean(taken.conclusion) || taken.items.length > 0
  const reportChrome = parsed.badges.length > 0 || parsed.metrics.length > 0
  // 沒有摘要內文時不拿專案現況填徽章，空摘要文案才出得來。有內文但報告自己沒有徽章／數字，才回填。
  const live = narrative && !reportChrome ? chrome : { badges: [], metrics: [] }
  return {
    title: parsed.title || '一頁摘要：現在怎樣、你要做什麼',
    badges: parsed.badges.length ? parsed.badges : live.badges,
    metrics: parsed.metrics.length ? parsed.metrics : live.metrics,
    conclusion: taken.conclusion,
    items: taken.items,
  }
}

export function reportSummaryStatus(report) {
  if (!report || report.status === 'idle' || report.status === 'loading' || report.htmlStatus === 'loading') return 'loading'
  if (report.htmlError || report.status === 'error') return 'error'
  if (report.status === 'empty') return 'empty'
  if (report.status === 'ready') return 'ready'
  return 'empty'
}
