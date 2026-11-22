// HY Obsidian：目錄、正文、待上架決定。
// 勾選會存到雲端 /api/brain/review-queue（只要登入 session，不送寫入鑰匙）。
// 本機清單是快取與離線後備。退回＝不要；這裡只記錄，不搬分類、不改 Drive。

export const CARD_ID = /^(life|person|event|know|dec|map|pref|asset)-[a-z0-9]+(-[a-z0-9]+)*$/
export const QUEUE_KEY = 'hy-obsidian-review-queue-v1'
export const REVIEW_QUEUE_PATH = '/api/brain/review-queue'
const ITEM_FIELDS = ['id', 'title', 'decision', 'decided_at', 'written_by', 'path', 'pending']

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

function cleanText(value, limit) {
  if (typeof value !== 'string') return null
  const text = value.replace(/[\u0000-\u001f]/g, '').trim()
  if (!text || text.length > limit) return null
  return text
}

function timeValue(value) {
  const ms = Date.parse(value || '')
  return Number.isFinite(ms) ? ms : 0
}

export function emptyQueue() {
  return { version: 1, items: [], clears: [] }
}

export function normalizeQueue(raw, { legacyPending = false } = {}) {
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
      written_by: cleanText(item.written_by, 200),
      path: cleanText(item.path, 300),
      pending: typeof item.pending === 'boolean' ? item.pending : legacyPending,
    })
  }
  return { version: 1, items }
}

export function normalizeClears(raw) {
  const clears = []
  const source = raw && Array.isArray(raw.clears) ? raw.clears : []
  for (const item of source) {
    if (!item || !CARD_ID.test(item.id)) continue
    clears.push({
      id: item.id,
      decided_at: typeof item.decided_at === 'string' ? item.decided_at : '',
      pending: item.pending !== false,
    })
  }
  return clears
}

export function loadQueue(storage) {
  try {
    const raw = JSON.parse(storage.getItem(QUEUE_KEY) || 'null')
    const queue = normalizeQueue(raw, { legacyPending: true })
    queue.clears = normalizeClears(raw)
    return queue
  } catch {
    return emptyQueue()
  }
}

export function saveQueue(storage, queue) {
  const normalized = normalizeQueue(queue)
  normalized.clears = normalizeClears(queue)
  storage.setItem(QUEUE_KEY, JSON.stringify(normalized))
}

function reusableItems(queue, normalized) {
  const source = queue && Array.isArray(queue.items) ? queue.items : null
  if (!source || source.length !== normalized.items.length) return null
  const same = source.every((item, index) => {
    const next = normalized.items[index]
    return !!item && Object.keys(item).length === ITEM_FIELDS.length
      && ITEM_FIELDS.every(key => item[key] === next[key])
  })
  return same ? source : null
}

// 只留目前待上架卡的決定。目錄還沒來、不是陣列、或是空的，就原樣留下，避免載入失敗時誤清。
// 修剪只影響這台裝置的顯示，不會產生取消勾選，也不會把雲端紀錄刪掉。
export function pruneQueueToPending(queue, cards) {
  const normalized = normalizeQueue(queue)
  const clears = normalizeClears(queue)
  const baseItems = reusableItems(queue, normalized) || normalized.items
  if (!Array.isArray(cards) || cards.length === 0) return { version: 1, items: baseItems, clears }
  const pendingIds = new Set()
  for (const card of cards) {
    if (isPending(card) && typeof card.id === 'string') pendingIds.add(card.id)
  }
  const items = baseItems.every(item => pendingIds.has(item.id)) ? baseItems : baseItems.filter(item => pendingIds.has(item.id))
  const nextClears = clears.every(item => pendingIds.has(item.id)) ? clears : clears.filter(item => pendingIds.has(item.id))
  return { version: 1, items, clears: nextClears }
}

export function applyDecision(queue, action) {
  const items = normalizeQueue(queue).items.filter(item => item.id !== action.id)
  const clears = normalizeClears(queue).filter(item => item.id !== action.id)
  if (action.decision === 'approve' || action.decision === 'reject') {
    if (!CARD_ID.test(action.id)) throw new Error('bad id')
    items.push({
      id: action.id,
      title: cleanText(action.title, 200) || String(action.id).slice(0, 200),
      decision: action.decision,
      decided_at: typeof action.now === 'string' ? action.now : '',
      written_by: cleanText(action.written_by, 200),
      path: cleanText(action.path, 300),
      pending: true,
    })
  } else if (action.decision === 'clear') {
    if (!CARD_ID.test(action.id)) throw new Error('bad id')
    clears.push({
      id: action.id,
      decided_at: typeof action.now === 'string' ? action.now : '',
      pending: true,
    })
  } else {
    throw new Error('bad decision')
  }
  return { version: 1, items, clears }
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

export function hasPendingSync(queue) {
  return normalizeQueue(queue).items.some(item => item.pending) || normalizeClears(queue).some(item => item.pending)
}

// 雲端是已存決定的來源。本機 pending（含舊版沒有 pending 欄的勾選）留著，避免載入時把既有勾選丟掉。
// 已確認存上、而且雲端這份更新時間已經涵蓋它、雲端卻沒有的，才視為在別處取消。
export function mergeQueues(local, remote) {
  const remoteUpdated = typeof remote?.updated === 'string' ? remote.updated : ''
  const remoteItems = normalizeQueue(remote).items.map(item => ({ ...item, pending: false }))
  const remoteById = new Map(remoteItems.map(item => [item.id, item]))
  const merged = new Map(remoteItems.map(item => [item.id, item]))
  for (const item of normalizeQueue(local, { legacyPending: true }).items) {
    const remoteItem = remoteById.get(item.id)
    if (!remoteItem) {
      const confirmed = item.pending === false
      const remoteKnows = !!remoteUpdated && timeValue(item.decided_at) <= timeValue(remoteUpdated)
      if (confirmed && remoteKnows) continue
      merged.set(item.id, { ...item, pending: !confirmed })
      continue
    }
    if (timeValue(item.decided_at) > timeValue(remoteItem.decided_at)) {
      merged.set(item.id, { ...item, pending: true })
      continue
    }
    if (timeValue(item.decided_at) === timeValue(remoteItem.decided_at) && item.decision === remoteItem.decision) {
      merged.set(item.id, {
        ...remoteItem,
        written_by: remoteItem.written_by || item.written_by || null,
        path: remoteItem.path || item.path || null,
        pending: false,
      })
      continue
    }
    if (item.pending && timeValue(item.decided_at) === timeValue(remoteItem.decided_at)) {
      merged.set(item.id, { ...item, pending: true })
      continue
    }
    merged.set(item.id, { ...remoteItem, pending: false })
  }
  const clears = []
  for (const clear of normalizeClears(local)) {
    const remoteItem = remoteById.get(clear.id)
    const localItem = merged.get(clear.id)
    const newerThanRemote = !remoteItem || timeValue(clear.decided_at) >= timeValue(remoteItem?.decided_at)
    const newerThanLocal = !localItem || timeValue(clear.decided_at) >= timeValue(localItem.decided_at)
    if (!(newerThanRemote && newerThanLocal)) continue
    merged.delete(clear.id)
    if (remoteItem) clears.push({ id: clear.id, decided_at: clear.decided_at, pending: true })
  }
  return { version: 1, items: [...merged.values()], clears }
}

export function decisionsPayload(queue) {
  const decisions = []
  for (const item of normalizeQueue(queue).items) {
    if (!item.pending || !item.decided_at) continue
    const body = { id: item.id, title: item.title, decision: item.decision, decided_at: item.decided_at }
    if (item.written_by) body.written_by = item.written_by
    if (item.path) body.path = item.path
    decisions.push(body)
  }
  for (const clear of normalizeClears(queue)) {
    if (!clear.pending || !clear.decided_at) continue
    decisions.push({ id: clear.id, decision: 'clear', decided_at: clear.decided_at })
  }
  return { decisions }
}

export function reviewErrorMessage(status, data) {
  const code = data && data.error
  if (status === 401) return '請重新登入。決定先留在這台裝置，可先複製清單。'
  if (status === 413) return '決定太多，還沒存上雲端，可先複製清單。'
  if (code === 'brain_stale_write') return '雲端有較新的決定。還沒存上的部分可先複製清單。'
  if (code === 'brain_conflict' || code === 'brain_data_unavailable') return '雲端暫時寫不進去。還沒存上雲端，可先複製清單。'
  return '還沒存上雲端，可先複製清單。'
}

export async function fetchReviewQueue({ base = '', headers = {}, fetcher = fetch, signal } = {}) {
  const response = await fetcher(`${base}${REVIEW_QUEUE_PATH}`, { headers, cache: 'no-store', signal })
  const data = await response.json().catch(() => ({}))
  if (response.status === 404) return { version: 1, updated: null, items: [], missing: true }
  if (!response.ok) {
    const error = new Error(reviewErrorMessage(response.status, data))
    error.status = response.status
    error.code = data.error || ''
    throw error
  }
  return data
}

export async function postReviewDecisions(queue, { base = '', headers = {}, fetcher = fetch, signal } = {}) {
  const body = decisionsPayload(queue)
  if (!body.decisions.length) return { skipped: true, items: normalizeQueue(queue).items, updated: null, ignored: [] }
  const response = await fetcher(`${base}${REVIEW_QUEUE_PATH}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(reviewErrorMessage(response.status, data))
    error.status = response.status
    error.code = data.error || ''
    error.payload = data
    throw error
  }
  return data
}

export function queueMarkdown(queue) {
  const items = sortedDecisions(queue)
  const lines = [
    '# 待上架決定',
    '',
    '這份清單只記錄決定，沒有搬移卡片，也沒有改正式分類。',
    '退回＝不要：Atlas 會從待上架拿掉，不會退給 HY 改。',
    '複製清單是後備。已存雲端的決定不必再貼上。',
    '',
  ]
  if (!items.length) lines.push('（目前沒有決定）')
  for (const item of items) {
    const label = item.decision === 'approve' ? '核准' : '退回'
    const extra = []
    if (item.written_by) extra.push(`作者：${item.written_by}`)
    if (item.path) extra.push(`位置：${item.path}`)
    if (item.pending) extra.push('尚未存上雲端')
    lines.push(`- ${label}｜${item.id}｜${item.title}｜${item.decided_at}${extra.length ? `｜${extra.join('｜')}` : ''}`)
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
