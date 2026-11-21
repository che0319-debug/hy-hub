// HY Obsidian P1：目錄、正文、待上架決定。決定只留在這台裝置，不寫大腦、不搬分類。

export const CARD_ID = /^(life|person|event|know|dec|map|pref|asset)-[a-z0-9]+(-[a-z0-9]+)*$/
export const QUEUE_KEY = 'hy-obsidian-review-queue-v1'

export const FOLDERS = [
  ['00_待上架', '待上架'],
  ['10_人生', '人生'],
  ['20_人物', '人物'],
  ['30_時間軸', '時間軸'],
  ['40_知識', '知識'],
  ['50_決策', '決策'],
  ['60_地圖', '地圖'],
  ['70_偏好', '偏好'],
  ['80_來源', '來源'],
  ['90_歸檔', '歸檔'],
]

const FOLDER_IDS = new Set(FOLDERS.map(([id]) => id))

export function folderOf(card) {
  const path = typeof card?.path === 'string' ? card.path : ''
  const first = path.split('/')[0]
  return FOLDER_IDS.has(first) ? first : ''
}

export function isPending(card) {
  return folderOf(card) === '00_待上架'
}

export function folderLabel(id) {
  return FOLDERS.find(([key]) => key === id)?.[1] || '未分類'
}

export function cardTitle(card) {
  const title = typeof card?.title === 'string' ? card.title.trim() : ''
  return title || card?.id || '未命名'
}

export function aliasesOf(card) {
  return Array.isArray(card?.aliases) ? card.aliases.filter(item => typeof item === 'string' && item.trim()) : []
}

export function filterCards(cards, { folder = '', query = '' } = {}) {
  const needle = query.trim().toLowerCase()
  return (Array.isArray(cards) ? cards : []).filter(card => {
    if (folder && folderOf(card) !== folder) return false
    if (!needle) return true
    const hay = [card?.id, cardTitle(card), ...aliasesOf(card), ...(Array.isArray(card?.tags) ? card.tags : [])]
      .filter(Boolean).join('\n').toLowerCase()
    return hay.includes(needle)
  })
}

export function parseFrontmatter(markdown) {
  const text = typeof markdown === 'string' ? markdown : ''
  const lines = text.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return { data: null, body: text }
  let end = -1
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') { end = i; break }
  }
  if (end < 0) return { data: null, body: text }
  const data = {}
  for (let i = 1; i < end; i += 1) {
    const line = lines[i]
    if (!line.trim() || line[0] === ' ' || line[0] === '\t' || line[0] === '-' || !line.includes(':')) continue
    const cut = line.indexOf(':')
    const key = line.slice(0, cut).trim()
    const raw = line.slice(cut + 1).trim()
    if (!key) continue
    if (raw.startsWith('[') && raw.endsWith(']')) data[key] = splitList(raw.slice(1, -1)).map(unquote)
    else data[key] = unquote(raw)
  }
  return { data, body: lines.slice(end + 1).join('\n') }
}

export function linkifyWikilinks(markdown, titles = new Map()) {
  return String(markdown || '').replace(/\[\[([A-Za-z0-9_-]+)\]\]/g, (full, id) => {
    if (!CARD_ID.test(id)) return full
    const label = String(titles.get(id) || id).replace(/[\[\]]/g, '')
    return `[${label}](#card-${id})`
  })
}

export function wikiIdFromHref(href) {
  if (typeof href !== 'string' || !href.startsWith('#card-')) return ''
  const id = decodeURIComponent(href.slice(6))
  return CARD_ID.test(id) ? id : ''
}

export function brainErrorMessage(status, data) {
  const code = data && data.error
  if (status === 401) return '請重新登入後再看卡片。'
  if (code === 'brain_data_not_ready') return '目錄還沒準備好。'
  if (code === 'brain_card_not_found') return '這張卡的正文還沒鏡像過來。正本仍在雲端硬碟。'
  if (code === 'brain_data_unavailable') return '暫時讀不到第二大腦，請稍後再試。'
  if (code === 'brain_data_invalid') return '目錄格式異常，請稍後再試。'
  return '讀取失敗，請稍後再試。'
}

export async function fetchBrainIndex({ base = '', headers = {}, fetcher = fetch, signal } = {}) {
  const response = await fetcher(`${base}/api/brain/index`, { headers, cache: 'no-store', signal })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(brainErrorMessage(response.status, data))
    error.status = response.status
    error.code = data.error || ''
    throw error
  }
  return Array.isArray(data.cards) ? data.cards.filter(card => card && typeof card.id === 'string') : []
}

export async function fetchBrainCard(id, { base = '', headers = {}, fetcher = fetch, signal } = {}) {
  const response = await fetcher(`${base}/api/brain/card?id=${encodeURIComponent(id)}`, { headers, cache: 'no-store', signal })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(brainErrorMessage(response.status, data))
    error.status = response.status
    error.code = data.error || ''
    throw error
  }
  return { markdown: await response.text(), updated: response.headers.get('X-Brain-Updated') || '' }
}

export function emptyQueue() {
  return { version: 1, items: [] }
}

export function normalizeQueue(raw) {
  const items = []
  const source = raw && Array.isArray(raw.items) ? raw.items : []
  for (const item of source) {
    if (!item || !CARD_ID.test(item.id)) continue
    if (item.decision !== 'approve' && item.decision !== 'reject') continue
    items.push({
      id: item.id,
      title: String(item.title || item.id).slice(0, 200),
      decision: item.decision,
      decided_at: typeof item.decided_at === 'string' ? item.decided_at : '',
    })
  }
  return { version: 1, items }
}

export function loadQueue(storage) {
  try {
    return normalizeQueue(JSON.parse(storage.getItem(QUEUE_KEY) || 'null'))
  } catch {
    return emptyQueue()
  }
}

export function saveQueue(storage, queue) {
  storage.setItem(QUEUE_KEY, JSON.stringify(normalizeQueue(queue)))
}

// 只留目前待上架卡的決定。目錄還沒來、不是陣列、或是空的，就原樣留下，避免載入失敗時誤清。
export function pruneQueueToPending(queue, cards) {
  const normalized = normalizeQueue(queue)
  const source = queue && Array.isArray(queue.items) ? queue.items : null
  const reusable = !!source && source.length === normalized.items.length && source.every((item, index) => {
    const next = normalized.items[index]
    return !!item && Object.keys(item).length === 4
      && item.id === next.id && item.title === next.title
      && item.decision === next.decision && item.decided_at === next.decided_at
  })
  const baseItems = reusable ? source : normalized.items
  if (!Array.isArray(cards) || cards.length === 0) return { version: 1, items: baseItems }
  const pendingIds = new Set()
  for (const card of cards) {
    if (isPending(card) && typeof card.id === 'string') pendingIds.add(card.id)
  }
  if (baseItems.every(item => pendingIds.has(item.id))) return { version: 1, items: baseItems }
  return { version: 1, items: baseItems.filter(item => pendingIds.has(item.id)) }
}

export function applyDecision(queue, action) {
  const items = normalizeQueue(queue).items.filter(item => item.id !== action.id)
  if (action.decision === 'approve' || action.decision === 'reject') {
    if (!CARD_ID.test(action.id)) throw new Error('bad id')
    items.push({
      id: action.id,
      title: String(action.title || action.id).slice(0, 200),
      decision: action.decision,
      decided_at: typeof action.now === 'string' ? action.now : '',
    })
  } else if (action.decision !== 'clear') {
    throw new Error('bad decision')
  }
  return { version: 1, items }
}

export function decisionFor(queue, id) {
  return normalizeQueue(queue).items.find(item => item.id === id) || null
}

// 待上架列表分成還沒審、已有決定。只算這份列表裡的待上架卡；清單外的決定不計入。
export function splitPendingReview(cards, queue) {
  const open = []
  const reviewed = []
  for (const card of Array.isArray(cards) ? cards : []) {
    if (!isPending(card)) continue
    if (decisionFor(queue, card.id)) reviewed.push(card)
    else open.push(card)
  }
  return { open, reviewed, reviewedCount: reviewed.length }
}

export function sortedDecisions(queue) {
  return [...normalizeQueue(queue).items].sort((a, b) => String(b.decided_at).localeCompare(String(a.decided_at)) || a.id.localeCompare(b.id))
}

export function queueMarkdown(queue) {
  const items = sortedDecisions(queue)
  const lines = [
    '# 待上架決定',
    '',
    '這份清單只記錄決定，沒有搬移卡片，也沒有改正式分類。',
    '',
  ]
  if (!items.length) lines.push('（目前沒有決定）')
  for (const item of items) {
    const label = item.decision === 'approve' ? '核准' : '退回'
    lines.push(`- ${label}｜${item.id}｜${item.title}｜${item.decided_at}`)
  }
  return lines.join('\n')
}

function splitList(inner) {
  const items = []
  let buf = ''
  let quote = ''
  for (const char of inner) {
    if (quote) {
      if (char === quote) quote = ''
      else buf += char
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === ',') { items.push(buf); buf = '' }
    else buf += char
  }
  items.push(buf)
  return items.map(item => item.trim()).filter(Boolean)
}

function unquote(value) {
  if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value[0] === value.at(-1)) return value.slice(1, -1)
  return value
}
