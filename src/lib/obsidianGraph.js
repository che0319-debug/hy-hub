// 關係圖只讀目錄 index：related 的 [[id]]／[[id|別名]]，加上 backlinks。
// 指向不存在的 id 記入 broken，不畫成節點，也不逐張抓正文。

const WIKI = /^\[\[\s*([^\]|#]+?)\s*(?:\|[^\]]*)?\]\]$/

export const GRAPH_TYPES = [
  { id: 'person', label: '人物' },
  { id: 'event', label: '時間軸' },
  { id: 'know', label: '知識' },
  { id: 'dec', label: '決策' },
  { id: 'map', label: '地圖' },
]

export const INDEX_CARD_ID = 'map-second-brain-v1-index'

export const LIFE_DIMENSIONS = [
  { id: '事業', label: '事業' },
  { id: '財務', label: '財務' },
  { id: '健康', label: '健康' },
  { id: '家庭', label: '家庭' },
  { id: '本業', label: '本業' },
  { id: '休閒', label: '休閒' },
  { id: '成長', label: '成長' },
]

export const UNLABELED_DIMENSION = '未標七維'

export const DIMENSION_FIELDS = ['七維', 'dimensions', 'dimension', 'category']

export const DIMENSION_TAG_MAP = {
  職涯: '事業',
  職涯年表: '事業',
  新創: '事業',
  商業規劃: '事業',
  績效: '事業',
  升等: '事業',
  主管: '事業',
  履歷: '事業',
  理財: '財務',
  購屋: '財務',
  不動產: '財務',
  健康: '健康',
  家庭: '家庭',
  子女: '家庭',
  工研院: '本業',
  生活: '休閒',
  旅行: '休閒',
  求學: '成長',
  台大: '成長',
  寫作方法: '成長',
  人生規劃: '成長',
  人生地圖: '成長',
  人生大事: '成長',
}

export const MAJOR_LABEL_LIMIT = 12
export const LABEL_ALL_WHEN_AT_MOST = 18

const TYPE_RANK = Object.fromEntries(GRAPH_TYPES.map((item, index) => [item.id, index]))
const LIFE_DIMENSION_IDS = new Set(LIFE_DIMENSIONS.map(item => item.id))
const DIMENSION_ORDER = [...LIFE_DIMENSIONS.map(item => item.id), UNLABELED_DIMENSION]

export function typeLabel(type) {
  return GRAPH_TYPES.find(item => item.id === type)?.label || '其他'
}

export function normalizeDimensionName(value) {
  if (typeof value !== 'string') return ''
  const name = value.trim()
  return LIFE_DIMENSION_IDS.has(name) ? name : ''
}

export function dimensionsOf(card) {
  if (!card || typeof card !== 'object') return [UNLABELED_DIMENSION]
  for (const key of DIMENSION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(card, key)) continue
    const value = card[key]
    if (value == null) continue
    const names = sortDimensions(unique(flattenDimensionValues(value).map(normalizeDimensionName).filter(Boolean)))
    return names.length ? names : [UNLABELED_DIMENSION]
  }
  const fromTags = sortDimensions(unique(
    (Array.isArray(card.tags) ? card.tags : [])
      .map(tag => (typeof tag === 'string' ? DIMENSION_TAG_MAP[tag.trim()] : ''))
      .filter(Boolean),
  ))
  return fromTags.length ? fromTags : [UNLABELED_DIMENSION]
}

export function shortTitle(title, max = 8) {
  const chars = [...String(title || '')]
  const limit = Math.max(1, Number(max) || 8)
  return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : chars.join('')
}

export function majorLabelIds(nodes, options = {}) {
  const list = Array.isArray(nodes) ? nodes : []
  const limit = options.limit ?? MAJOR_LABEL_LIMIT
  const alwaysWhenAtMost = options.alwaysWhenAtMost ?? LABEL_ALL_WHEN_AT_MOST
  if (!list.length) return []
  if (list.length <= alwaysWhenAtMost) return list.map(node => node.id).sort()
  const ranked = [...list].sort((a, b) => (b.degree || 0) - (a.degree || 0) || a.id.localeCompare(b.id))
  const ids = []
  const seen = new Set()
  const center = list.find(node => node.center)?.id
  if (center) {
    ids.push(center)
    seen.add(center)
  }
  for (const node of ranked) {
    if (ids.length >= limit) break
    if (seen.has(node.id)) continue
    ids.push(node.id)
    seen.add(node.id)
  }
  return ids.sort()
}

export function parseWikiTarget(value) {
  if (typeof value !== 'string') return ''
  const match = value.trim().match(WIKI)
  if (!match) return ''
  return match[1].trim()
}

export function nodeRadius(degree, maxDegree) {
  const max = Math.max(1, Number(maxDegree) || 0)
  const span = Math.sqrt(Math.max(0, Number(degree) || 0) / max)
  return 8 + span * 12
}

export function displayRadius(degree, maxDegree, isCenter, isCandidate = false) {
  const base = nodeRadius(degree, maxDegree)
  let radius = isCenter ? Math.max(base + 4, 16) : base
  if (isCandidate) radius += 4
  return radius
}

export function buildGraph(cards) {
  const list = []
  const ids = new Set()
  for (const card of Array.isArray(cards) ? cards : []) {
    if (!card || typeof card.id !== 'string' || !card.id || ids.has(card.id)) continue
    ids.add(card.id)
    list.push(card)
  }
  const raw = []
  let broken = 0
  const brokenIds = new Set()
  const consider = (source, target) => {
    if (!target || target === source) return
    if (!ids.has(target)) { broken += 1; brokenIds.add(target); return }
    raw.push({ source, target })
  }
  for (const card of list) {
    for (const item of Array.isArray(card.related) ? card.related : []) {
      if (typeof item !== 'string' || !item.trim()) continue
      const target = parseWikiTarget(item)
      if (!target) broken += 1
      else consider(card.id, target)
    }
    for (const item of Array.isArray(card.backlinks) ? card.backlinks : []) {
      if (typeof item !== 'string' || !item.trim()) continue
      const trimmed = item.trim()
      const target = trimmed.startsWith('[[') ? parseWikiTarget(trimmed) : trimmed
      if (!target) broken += 1
      else consider(card.id, target)
    }
  }
  const nodes = list.map(card => ({
    id: card.id,
    type: typeof card.type === 'string' ? card.type : '',
    title: typeof card.title === 'string' && card.title.trim() ? card.title.trim() : card.id,
    state: typeof card.state === 'string' ? card.state : '',
    candidate: card.state === 'candidate',
    dimensions: dimensionsOf(card),
    degree: 0,
    center: false,
  }))
  return pack(nodes, raw, broken, [...brokenIds])
}

export function filterGraph(graph, types) {
  const allow = new Set(Array.isArray(types) ? types : [])
  const nodes = (graph?.nodes || []).filter(node => allow.has(node.type)).map(node => ({ ...node, center: false }))
  return pack(nodes, graph?.edges || [], graph?.broken || 0, graph?.brokenIds || [])
}

export function filterByDimensions(graph, selected) {
  const allow = new Set(Array.isArray(selected) ? selected : [])
  const nodes = (graph?.nodes || [])
    .filter(node => (node.dimensions || []).some(dim => allow.has(dim)))
    .map(node => ({ ...node, center: false }))
  return pack(nodes, graph?.edges || [], graph?.broken || 0, graph?.brokenIds || [])
}

export function applyIndexVisibility(graph, options = {}) {
  const showIndex = !!options.showIndex
  const centerId = typeof options.centerId === 'string' ? options.centerId : ''
  if (showIndex || centerId === INDEX_CARD_ID) {
    return pack(graph?.nodes || [], graph?.edges || [], graph?.broken || 0, graph?.brokenIds || [])
  }
  const nodes = (graph?.nodes || []).filter(node => node.id !== INDEX_CARD_ID)
  return pack(nodes, graph?.edges || [], graph?.broken || 0, graph?.brokenIds || [])
}

export function localGraph(graph, centerId) {
  const broken = graph?.broken || 0
  const brokenIds = [...(graph?.brokenIds || [])]
  const id = typeof centerId === 'string' ? centerId : ''
  const known = new Set((graph?.nodes || []).map(node => node.id))
  if (!id || !known.has(id)) return { nodes: [], edges: [], broken, brokenIds, centerId: id, missingCenter: true }
  const keep = new Set([id])
  for (const edge of graph?.edges || []) {
    if (edge.source === id) keep.add(edge.target)
    else if (edge.target === id) keep.add(edge.source)
  }
  const nodes = (graph.nodes || []).filter(node => keep.has(node.id))
  const edges = (graph.edges || []).filter(edge => keep.has(edge.source) && keep.has(edge.target))
  const packed = pack(nodes, edges, broken, brokenIds)
  return {
    ...packed,
    nodes: packed.nodes.map(node => ({ ...node, center: node.id === id })),
    centerId: id,
    missingCenter: false,
  }
}

export function simulateLayout(nodes, edges, options = {}) {
  const width = options.width || 1000
  const height = options.height || 720
  const iterations = options.iterations ?? 160
  const list = Array.isArray(nodes) ? nodes : []
  if (!list.length) return []
  const cx = width / 2
  const cy = height / 2
  const maxDegree = Math.max(1, ...list.map(node => node.degree || 0))
  const preferred = options.centerId || list.find(node => node.center)?.id || ''
  const hub = list.find(node => node.id === preferred)
    || [...list].sort((a, b) => (b.degree || 0) - (a.degree || 0) || a.id.localeCompare(b.id))[0]
  const others = list
    .filter(node => node.id !== hub.id)
    .sort((a, b) => (TYPE_RANK[a.type] ?? 9) - (TYPE_RANK[b.type] ?? 9) || a.id.localeCompare(b.id))
  const ring = Math.min(width, height) * 0.34
  const points = new Map()
  const place = (node, x, y) => {
    points.set(node.id, {
      id: node.id,
      x, y, vx: 0, vy: 0,
      r: nodeRadius(node.degree || 0, maxDegree),
    })
  }
  place(hub, cx, cy)
  others.forEach((node, index) => {
    const angle = -Math.PI / 2 + (others.length ? (index / others.length) * Math.PI * 2 : 0)
    const spin = hash(node.id)
    const radial = ring * (0.9 + (spin % 13) / 80)
    place(
      node,
      cx + Math.cos(angle) * radial + ((spin % 9) - 4),
      cy + Math.sin(angle) * radial + (((spin >> 4) % 9) - 4),
    )
  })
  const links = []
  for (const edge of edges || []) {
    const a = points.get(edge.source)
    const b = points.get(edge.target)
    if (a && b && a !== b) links.push([a, b])
  }
  const pinned = points.get(hub.id)
  const maxR = Math.min(width, height) * 0.46
  for (let iter = 0; iter < iterations; iter += 1) {
    const cool = 1 - iter / Math.max(1, iterations)
    const listPoints = [...points.values()]
    for (let i = 0; i < listPoints.length; i += 1) {
      for (let j = i + 1; j < listPoints.length; j += 1) {
        const left = listPoints[i]
        const right = listPoints[j]
        let dx = right.x - left.x
        let dy = right.y - left.y
        const dist = Math.hypot(dx, dy) || 0.01
        const min = left.r + right.r + 12
        const mag = ((min * min) / dist) * (0.04 + cool * 0.08)
        const ux = dx / dist
        const uy = dy / dist
        if (left !== pinned) { left.vx -= ux * mag; left.vy -= uy * mag }
        if (right !== pinned) { right.vx += ux * mag; right.vy += uy * mag }
      }
    }
    for (const [a, b] of links) {
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy) || 0.01
      const rest = a === pinned || b === pinned ? ring * 0.95 : ring * 0.62
      const mag = (dist - rest) * (0.015 + cool * 0.03)
      const ux = dx / dist
      const uy = dy / dist
      if (a !== pinned) { a.vx += ux * mag; a.vy += uy * mag }
      if (b !== pinned) { b.vx -= ux * mag; b.vy -= uy * mag }
    }
    for (const point of listPoints) {
      if (point === pinned) { point.x = cx; point.y = cy; point.vx = 0; point.vy = 0; continue }
      point.vx += (cx - point.x) * 0.01
      point.vy += (cy - point.y) * 0.01
      point.vx *= 0.55
      point.vy *= 0.55
      const speed = Math.hypot(point.vx, point.vy)
      const limit = 16 * (0.35 + cool)
      if (speed > limit) { point.vx = point.vx / speed * limit; point.vy = point.vy / speed * limit }
      point.x += point.vx
      point.y += point.vy
      const dx = point.x - cx
      const dy = point.y - cy
      const dist = Math.hypot(dx, dy)
      if (dist > maxR) { point.x = cx + dx / dist * maxR; point.y = cy + dy / dist * maxR }
    }
  }
  separate(points, pinned, cx, cy)
  return [...points.values()]
    .map(point => ({ id: point.id, x: round(point.x), y: round(point.y) }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function fitTransform(points, radii, width, height, padding = 36) {
  const list = Array.isArray(points) ? points : []
  if (!list.length || !(width > 0) || !(height > 0)) return { x: 0, y: 0, k: 1 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of list) {
    const radius = typeof radii?.get === 'function' ? (radii.get(point.id) || 8) : 8
    minX = Math.min(minX, point.x - radius)
    minY = Math.min(minY, point.y - radius)
    maxX = Math.max(maxX, point.x + radius)
    maxY = Math.max(maxY, point.y + radius)
  }
  const boxW = Math.max(1, maxX - minX)
  const boxH = Math.max(1, maxY - minY)
  const k = Math.min(Math.max(1, width - padding * 2) / boxW, Math.max(1, height - padding * 2) / boxH)
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  return {
    k: round(k),
    x: round(width / 2 - midX * k),
    y: round(height / 2 - midY * k),
  }
}

function pack(nodes, edges, broken, brokenIds) {
  const degree = new Map(nodes.map(node => [node.id, 0]))
  const seen = new Set()
  const clean = []
  for (const edge of edges) {
    const a = edge.source
    const b = edge.target
    if (!degree.has(a) || !degree.has(b) || a === b) continue
    const source = a < b ? a : b
    const target = a < b ? b : a
    const key = `${source}\0${target}`
    if (seen.has(key)) continue
    seen.add(key)
    clean.push({ source, target })
    degree.set(source, degree.get(source) + 1)
    degree.set(target, degree.get(target) + 1)
  }
  clean.sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target))
  const out = nodes.map(node => ({ ...node, degree: degree.get(node.id) || 0 }))
  out.sort((a, b) => a.id.localeCompare(b.id))
  const ids = unique((Array.isArray(brokenIds) ? brokenIds : []).filter(id => typeof id === 'string' && id))
  ids.sort((a, b) => a.localeCompare(b))
  return { nodes: out, edges: clean, broken, brokenIds: ids }
}

function flattenDimensionValues(value) {
  if (Array.isArray(value)) return value.flatMap(flattenDimensionValues)
  if (typeof value === 'string') return value.split(/[,，、/;|]+/).map(item => item.trim()).filter(Boolean)
  return []
}

function sortDimensions(list) {
  return [...list].sort((a, b) => DIMENSION_ORDER.indexOf(a) - DIMENSION_ORDER.indexOf(b) || a.localeCompare(b))
}

function unique(list) {
  const seen = new Set()
  const out = []
  for (const item of list) {
    if (seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

function separate(points, pinned, cx, cy) {
  const list = [...points.values()]
  for (let pass = 0; pass < 48; pass += 1) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const left = list[i]
        const right = list[j]
        const dx = right.x - left.x
        const dy = right.y - left.y
        const dist = Math.hypot(dx, dy) || 0.01
        const min = left.r + right.r + 8
        if (dist >= min) continue
        const ux = dx / dist
        const uy = dy / dist
        if (left === pinned) {
          right.x += ux * (min - dist)
          right.y += uy * (min - dist)
        } else if (right === pinned) {
          left.x -= ux * (min - dist)
          left.y -= uy * (min - dist)
        } else {
          const push = (min - dist) / 2
          left.x -= ux * push
          left.y -= uy * push
          right.x += ux * push
          right.y += uy * push
        }
      }
    }
    if (pinned) { pinned.x = cx; pinned.y = cy }
  }
}

function hash(id) {
  let value = 2166136261
  for (const char of String(id)) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  return value >>> 0
}

function round(value) {
  return Math.round(value * 100) / 100
}
