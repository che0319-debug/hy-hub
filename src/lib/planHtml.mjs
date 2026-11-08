// 規劃書轉成可讀 HTML。成果審查用的預設版仍略過程式碼區塊。
// 專案規劃分頁的淺灰藍版保留原文，包含程式碼與 JSON，只做 HTML 跳脫，不執行。
// 產出放進沙盒 iframe，不在宿主頁插入未消毒的 HTML。

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

export function stripImplementationBlocks(markdown) {
  const source = typeof markdown === 'string' ? markdown : ''
  return source.replace(/```[\s\S]*?(?:```|$)/g, '\n')
}

function unescapeMarkdown(value) {
  return value.replace(/\\([\\`*_{}\[\]()#+.!|-])/g, '$1')
}

function isJsonDump(value) {
  const text = value.trim()
  if (text.length < 2) return false
  if (!((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']')))) return false
  try { JSON.parse(text); return true } catch { return false }
}

function inline(value) {
  let text = escapeHtml(unescapeMarkdown(value))
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
  return text
}

function isTableStart(lines, index) {
  return /\|/.test(lines[index] || '') && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] || '')
}

function splitRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map(cell => cell.trim())
}

function tableHtml(rows) {
  const [head, ...body] = rows
  const headHtml = `<tr>${head.map(cell => `<th>${inline(cell)}</th>`).join('')}</tr>`
  const bodyHtml = body.map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')
  return `<div class="table-wrap"><table><thead>${headHtml}</thead><tbody>${bodyHtml}</tbody></table></div>`
}

function renderBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let index = 0
  let paragraph = []
  const flushParagraph = () => {
    const text = paragraph.join(' ').trim()
    paragraph = []
    if (!text || isJsonDump(text)) return
    blocks.push(`<p>${inline(text)}</p>`)
  }
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { flushParagraph(); index += 1; continue }
    const heading = /^(#{1,4})\s+(.+?)\s*#*$/.exec(line)
    if (heading) {
      flushParagraph()
      const level = heading[1].length
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      index += 1
      continue
    }
    if (isTableStart(lines, index)) {
      flushParagraph()
      const rows = [splitRow(line)]
      index += 2
      while (index < lines.length && /\|/.test(lines[index])) { rows.push(splitRow(lines[index])); index += 1 }
      blocks.push(tableHtml(rows))
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph()
      const items = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ''))
        index += 1
      }
      blocks.push(`<ul>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`)
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushParagraph()
      const items = []
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ''))
        index += 1
      }
      blocks.push(`<ol>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ol>`)
      continue
    }
    if (/^\s*([-*_]\s*){3,}$/.test(line)) { flushParagraph(); index += 1; continue }
    paragraph.push(line.trim())
    index += 1
  }
  flushParagraph()
  let html = blocks.join('\n')
  let previous = ''
  while (html !== previous) {
    previous = html
    html = html.replace(/<h[1-4]>[^<]*<\/h[1-4]>\s*(?=<h[1-4]>|$)/g, '')
  }
  return html
}

const PLAN_CSS = `
body{margin:0;padding:24px 22px 48px;color:#13213a;background:#fff;font-family:"Noto Sans TC",system-ui,sans-serif;font-size:16px;line-height:1.7}
h1{font-size:22px;line-height:1.35;margin:0 0 16px}
h2{font-size:18px;line-height:1.4;margin:28px 0 8px}
h3,h4{font-size:16px;line-height:1.45;margin:18px 0 6px}
p,li{overflow-wrap:anywhere}
p{margin:8px 0}
ul,ol{margin:8px 0;padding-left:1.3em}
li{margin:4px 0}
.table-wrap{overflow-x:auto;margin:12px 0}
table{border-collapse:collapse;width:100%;min-width:320px}
th,td{border:1px solid #e2e6ee;padding:8px 10px;text-align:left;vertical-align:top}
th{background:#f2f4f8;font-weight:700}
code{font-family:ui-monospace,monospace;font-size:.92em}
a{color:#1d4ed8}
@media(max-width:640px){body{padding:16px 12px 32px;font-size:15px}}
`

export function planDocumentHtml(markdown, options = {}) {
  if (options && options.layout === 'slate') return slateDocumentHtml(markdown)
  const body = renderBlocks(stripImplementationBlocks(markdown))
  const content = body || '<p>規劃書沒有可讀的正文。</p>'
  return `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${PLAN_CSS}</style></head><body>${content}</body></html>`
}

// 專案規劃分頁的閱讀版。只重排既有 Markdown：摘要章節放最前、其餘章節維持原順序。
// 不寫入版本、核定或專案資料。圍欄與 HTML 註解的內文原樣保留，只跳脫後放進 code。
function unescapeSlate(value) {
  return String(value).replace(/\\([\\`*_{}\[\]()#+.!|:=-])/g, '$1')
}

function spliceLiterals(markdown) {
  const text = String(markdown ?? '').replace(/\r\n/g, '\n')
  const pres = []
  let out = ''
  let index = 0
  const pushPre = body => {
    const id = pres.length
    pres.push(body)
    return `\n\u0000PRE${id}\u0000\n`
  }
  while (index < text.length) {
    if (text.startsWith('<!--', index)) {
      const end = text.indexOf('-->', index + 4)
      const inner = end === -1 ? text.slice(index + 4) : text.slice(index + 4, end)
      out += pushPre(inner)
      index = end === -1 ? text.length : end + 3
      continue
    }
    const lineStart = index === 0 || text[index - 1] === '\n'
    if (lineStart) {
      const nl = text.indexOf('\n', index)
      const lineEnd = nl === -1 ? text.length : nl
      const line = text.slice(index, lineEnd)
      const open = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line)
      if (open) {
        const marker = open[2]
        const char = marker[0] === '`' ? '`' : '~'
        const min = marker.length
        if (nl === -1) {
          out += pushPre('')
          break
        }
        const contentStart = nl + 1
        let scan = contentStart
        let closedAt = -1
        const closeRe = new RegExp(`^ {0,3}\\${char}{${min},}[ \\t]*$`)
        while (scan <= text.length) {
          const next = text.indexOf('\n', scan)
          const end = next === -1 ? text.length : next
          if (closeRe.test(text.slice(scan, end))) { closedAt = scan; break }
          if (next === -1) break
          scan = next + 1
        }
        if (closedAt === -1) {
          out += pushPre(text.slice(contentStart))
          break
        }
        out += pushPre(text.slice(contentStart, closedAt))
        const closeNl = text.indexOf('\n', closedAt)
        index = closeNl === -1 ? text.length : closeNl + 1
        continue
      }
    }
    out += text[index]
    index += 1
  }
  return { text: out, pres }
}

function slateInline(value) {
  let text = escapeHtml(unescapeSlate(value))
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  text = text.replace(/\*\*([^*]+)\*\*/g, (_all, inner) => {
    const label = inner.trim()
    if (/^(有示範|已核准|已通過|通過)$/.test(label)) return `<span class="tag tag-green">${label}</span>`
    if (/^(缺口(?:＋未核准)?|待審查|未核准|待測|尚未實作|待使用者核准)$/.test(label)) return `<span class="tag tag-amber">${label}</span>`
    return `<strong>${label}</strong>`
  })
  text = text.replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
  text = text.replace(/(^|[^"'>=])(https:\/\/[^\s<)]+)/g, '$1<a href="$2">$2</a>')
  return text
}

function listLevel(line) {
  const match = /^(\s*)([-*]|\d+[.)])\s+(.*)$/.exec(line)
  if (!match) return null
  return { level: Math.floor(match[1].replace(/\t/g, '    ').length / 2), ordered: /\d/.test(match[2]), text: match[3] }
}

function parseList(lines, start) {
  const root = listLevel(lines[start]).level
  const items = []
  let index = start
  while (index < lines.length) {
    if (!lines[index].trim()) break
    const info = listLevel(lines[index])
    if (!info || info.level < root) break
    if (info.level > root) {
      const child = parseList(lines, index)
      const host = items[items.length - 1]
      if (host) host.children = host.children.concat(child.items)
      else items.push(...child.items)
      index = child.index
      continue
    }
    const item = { text: info.text, ordered: info.ordered, children: [] }
    index += 1
    while (index < lines.length && lines[index].trim() && !listLevel(lines[index]) && !/^(#{1,4})\s+/.test(lines[index]) && !isTableStart(lines, index) && !/^\s*```/.test(lines[index]) && !/^\s*([-*_]\s*){3,}$/.test(lines[index])) {
      item.text += ` ${lines[index].trim()}`
      index += 1
    }
    items.push(item)
  }
  return { items, index, ordered: items.length > 0 && items.every(item => item.ordered) }
}

function parseSlateBlocks(markdown) {
  const lifted = spliceLiterals(markdown)
  const lines = lifted.text.split('\n')
  const blocks = []
  let index = 0
  let paragraph = []
  const flush = () => {
    if (!paragraph.length) return
    const collapsed = paragraph.join('\n').replace(/\s+/g, ' ').trim()
    paragraph = []
    if (!collapsed) return
    blocks.push({ type: 'p', text: collapsed })
  }
  while (index < lines.length) {
    const line = lines[index]
    const preLine = /^\u0000PRE(\d+)\u0000$/.exec(line)
    if (preLine) {
      flush()
      blocks.push({ type: 'pre', text: lifted.pres[Number(preLine[1])] ?? '' })
      index += 1
      continue
    }
    if (!line.trim()) { flush(); index += 1; continue }
    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ type: 'h', level: heading[1].length, text: heading[2].trim() })
      index += 1
      continue
    }
    if (isTableStart(lines, index)) {
      flush()
      const rows = [splitRow(line)]
      index += 2
      while (index < lines.length && lines[index].trim() && /\|/.test(lines[index])) { rows.push(splitRow(lines[index])); index += 1 }
      blocks.push({ type: 'table', rows })
      continue
    }
    if (listLevel(line)) {
      flush()
      const parsed = parseList(lines, index)
      if (parsed.items.length) blocks.push({ type: 'list', ordered: parsed.ordered, items: parsed.items })
      index = parsed.index
      continue
    }
    if (/^\s*([-*_]\s*){3,}$/.test(line)) { flush(); blocks.push({ type: 'hr' }); index += 1; continue }
    paragraph.push(line)
    index += 1
  }
  flush()
  return blocks
}

function metaFromItem(text) {
  const match = /^([^：:]{1,24})[：:]\s*(.+)$/.exec(String(text || '').trim())
  if (!match) return null
  const label = match[1].trim()
  if (!label || /[。！？]/.test(label)) return null
  return { label, value: match[2].trim() }
}

function isMetaList(block) {
  if (block?.type !== 'list' || !block.items.length) return false
  const hits = block.items.filter(item => metaFromItem(item.text) && !item.children.length)
  return hits.length >= Math.ceil(block.items.length / 2)
}

function sectionVisible(section) {
  if (section.title && section.title.trim()) return true
  return section.blocks.some(block => {
    if (block.type === 'pre') return true
    if (block.type === 'p' || block.type === 'h') return Boolean(block.text.trim())
    if (block.type === 'table') return block.rows.some(row => row.some(cell => cell.trim()))
    if (block.type === 'list') return block.items.length > 0
    return false
  })
}

function takePreamble(blocks) {
  const meta = []
  const cards = []
  const loose = []
  let index = 0
  let started = false
  while (index < blocks.length) {
    const block = blocks[index]
    if (block.type === 'pre' || block.type === 'hr') {
      loose.push(block)
      index += 1
      continue
    }
    if (!started && isMetaList(block)) {
      for (const item of block.items) {
        const metaItem = metaFromItem(item.text)
        if (metaItem && !item.children.length) meta.push(metaItem)
        else loose.push({ type: 'list', ordered: false, items: [item] })
      }
      index += 1
      continue
    }
    if (block.type === 'p') {
      const label = /^(.{1,20})[：:]$/.exec(block.text.trim())
      if (label && blocks[index + 1]?.type === 'list') {
        cards.push({ title: label[1].trim(), blocks: [blocks[index + 1]] })
        index += 2
        continue
      }
      if (!started) {
        const metaItem = metaFromItem(block.text)
        if (metaItem && block.text.length <= 120) { meta.push(metaItem); index += 1; continue }
      }
    }
    if (!started && block.type !== 'p') started = true
    if (block.type === 'p' && !/^(.{1,20})[：:]$/.test(block.text.trim())) started = true
    loose.push(block)
    index += 1
  }
  return { meta, cards, loose }
}

function structureSlate(blocks) {
  let title = ''
  const preamble = []
  const sections = []
  let current = null
  for (const block of blocks) {
    if (block.type === 'h' && block.level === 1 && !title && !current) { title = block.text; continue }
    if (block.type === 'h' && block.level <= 2) {
      current = { title: block.text, blocks: [] }
      sections.push(current)
      continue
    }
    ;(current ? current.blocks : preamble).push(block)
  }
  return { title, preamble, sections }
}

function listHtml(items, ordered) {
  const tag = ordered ? 'ol' : 'ul'
  return `<${tag}>${items.map(item => `<li>${slateInline(item.text)}${item.children.length ? listHtml(item.children, item.children.length > 0 && item.children.every(child => child.ordered)) : ''}</li>`).join('')}</${tag}>`
}

function paragraphHtml(text) {
  const raw = text.trim()
  const body = `<p>${slateInline(raw)}</p>`
  if (raw.startsWith('禁止')) return `<div class="callout callout-rose">${body}</div>`
  if (raw.startsWith('共同護欄')) return `<div class="callout callout-green">${body}</div>`
  if (/^(本版不|閱讀基準|停工|答覆前)/.test(raw)) return `<div class="callout callout-amber">${body}</div>`
  return body
}

function slateTable(rows) {
  const [head, ...body] = rows
  if (!head?.length) return ''
  const min = Math.max(320, head.length * 140)
  const cells = (row, tag) => head.map((_cell, index) => `<${tag}>${slateInline(row[index] || '')}</${tag}>`).join('')
  return `<div class="scroll"><table style="min-width:${min}px"><thead><tr>${cells(head, 'th')}</tr></thead><tbody>${body.map(row => `<tr>${cells(row, 'td')}</tr>`).join('')}</tbody></table></div>`
}

function chipDate(value) {
  const match = /(\d{4})-(\d{2})-(\d{2})/.exec(value || '')
  return match ? `${match[2]}/${match[3]}` : ''
}

function timelineHtml(rows) {
  const head = (rows[0] || []).map(cell => cell.trim())
  const idIdx = head.findIndex(cell => /^(id|代號|編號)$/i.test(cell))
  const nameIdx = head.findIndex(cell => /名稱/.test(cell))
  const dateIdx = head.findIndex(cell => /到期|日期|期限/.test(cell))
  if (idIdx < 0 || nameIdx < 0) return ''
  const items = rows.slice(1).map(row => ({
    id: (row[idIdx] || '').replace(/\*/g, '').trim(),
    name: (row[nameIdx] || '').replace(/\*\*/g, '').trim(),
    date: dateIdx >= 0 ? row[dateIdx] || '' : '',
  })).filter(item => /^[MG]\d+$/i.test(item.id))
  if (items.length < 2) return ''
  const chips = items.map(item => {
    const date = chipDate(item.date)
    return `<div class="tl"><span class="id">${escapeHtml(item.id)}</span>${date ? `<span class="date">${date}</span>` : ''}<span class="name">${escapeHtml(item.name)}</span></div>`
  }).join('')
  return `<div class="timeline" aria-label="里程碑時間軸">${chips}</div>`
}

function preHtml(text) {
  return `<pre class="source"><code>${escapeHtml(text)}</code></pre>`
}

function doDontCards(rows) {
  const head = (rows[0] || []).map(cell => cell.trim())
  if (head.length !== 2) return ''
  const left = /^(做|範圍內|in|include)/i.test(head[0])
  const right = /^(不做|範圍外|out|exclude)/i.test(head[1])
  if (!left || !right) return ''
  const card = (title, cells) => `<div class="cardlet"><h3>${slateInline(title)}</h3><ul>${cells.filter(Boolean).map(cell => `<li>${slateInline(cell)}</li>`).join('')}</ul></div>`
  return `<div class="grid">${card(head[0], rows.slice(1).map(row => row[0] || ''))}${card(head[1], rows.slice(1).map(row => row[1] || ''))}</div>`
}

function renderSlateBlock(block, sectionTitle, tableIndex) {
  if (block.type === 'h') return `<h${block.level}>${slateInline(block.text)}</h${block.level}>`
  if (block.type === 'p') return paragraphHtml(block.text)
  if (block.type === 'list') return listHtml(block.items, block.ordered)
  if (block.type === 'pre') return preHtml(block.text)
  if (block.type === 'hr') return '<hr>'
  if (block.type === 'table') {
    const timeline = tableIndex === 0 && /里程碑|時程|排程/.test(sectionTitle || '') ? timelineHtml(block.rows) : ''
    const split = tableIndex === 0 ? doDontCards(block.rows) : ''
    return `${timeline}${split}${slateTable(block.rows)}`
  }
  return ''
}

function renderLoose(blocks) {
  return blocks.map(block => renderSlateBlock(block, '', -1)).join('\n')
}

function classifySection(title, blocks = []) {
  const text = title || ''
  if (/摘要|總覽|overview|summary/i.test(text)) return 'summary'
  if (/待決|待釐清|待答|待補|請.{0,12}補充|open questions?/i.test(text)) return 'pending'
  if (/附錄|appendix|原文留存|修訂對照/i.test(text)) return 'appendix'
  if (/資料結構|契約|API|schema|\bJSON\b|寫入接口|實作附錄|技術規格|payload/i.test(text)) return 'technical'
  if (/里程碑|時程|排程|timeline/i.test(text)) return 'milestone'
  if (/範圍|目標與終點|交付|不做|purpose|scope/i.test(text)) return 'scope'
  if (/分工|負責|角色/i.test(text)) return 'roles'
  if (/評分|計分/i.test(text)) return 'scoring'
  if (/驗收|交件/i.test(text)) return 'accept'
  if (/例行|週期/i.test(text)) return 'routine'
  if (/風險/i.test(text)) return 'risk'
  if (/護欄|原則/i.test(text)) return 'guard'
  if (/拍板|決策|已決定/i.test(text)) return 'decision'
  if (/修訂/i.test(text)) return 'revision'
  const pres = blocks.filter(block => block.type === 'pre').length
  if (pres >= 3) return 'technical'
  return 'body'
}

function isFoldedKind(kind) {
  return kind === 'technical' || kind === 'appendix'
}

const KIND_EYEBROW = {
  summary: '一頁摘要',
  scope: '範圍',
  roles: '分工',
  scoring: '評分',
  milestone: '里程碑',
  accept: '驗收',
  routine: '例行',
  pending: '待決',
  decision: '決策',
  guard: '護欄',
  risk: '風險',
  technical: '技術原文',
  appendix: '附錄',
  revision: '修訂',
  body: '章節',
}

function splitTitle(title) {
  const text = String(title || '').trim()
  const parts = text.split('｜').map(part => part.trim()).filter(Boolean)
  return { heading: text, rest: parts.length >= 2 ? parts.slice(1).join('｜') : '' }
}

function labeledItem(text) {
  const raw = String(text || '').trim()
  const bold = /^\*\*([^*]+)\*\*[：:]\s*(.*)$/.exec(raw)
  if (bold) return { title: bold[1].trim(), body: bold[2].trim() }
  const plain = /^([^：:]{1,24})[：:]\s+(.+)$/.exec(raw)
  if (plain && !/[。！？]/.test(plain[1])) return { title: plain[1].trim(), body: plain[2].trim() }
  return null
}

function summaryView(section) {
  const highlights = []
  const rest = []
  let lead = ''
  for (const block of section.blocks) {
    if (block.type === 'list') {
      const rows = block.items.map(item => ({ item, label: labeledItem(item.text) }))
      const hits = rows.filter(row => row.label).length
      if (hits && hits >= Math.ceil(rows.length / 2)) {
        for (const row of rows) {
          if (!row.label) {
            rest.push({ type: 'list', ordered: false, items: [row.item] })
            continue
          }
          if (!lead && row.label.body) lead = row.label.body
          highlights.push({
            title: row.label.title,
            html: `${row.label.body ? `<p>${slateInline(row.label.body)}</p>` : ''}${row.item.children.length ? listHtml(row.item.children, row.item.children.every(child => child.ordered)) : ''}`,
          })
        }
        continue
      }
    }
    if (block.type === 'p' && !lead) lead = block.text
    rest.push(block)
  }
  return { lead, highlights, rest }
}

function statusTags(meta) {
  const tags = []
  for (const item of meta) {
    if (!/^(狀態|status)$/i.test(item.label.trim())) continue
    const value = item.value.replace(/\*\*/g, '').trim()
    if (!value) continue
    const tone = /(PASS|通過|已核准|已通過)/i.test(value) ? 'green' : /(待|缺口|未|RETURN|退回|草稿)/i.test(value) ? 'amber' : 'blue'
    const short = value.length > 42 ? `${value.slice(0, 42)}…` : value
    tags.push({ tone, text: `${item.label}：${short}` })
  }
  return tags
}

function splitMeta(meta) {
  const preferred = []
  const rest = []
  for (const item of meta) {
    if (preferred.length < 4 && /^(狀態|status|日期|date|Owner|PI|期限|到期|due)/i.test(item.label.trim())) preferred.push(item)
    else rest.push(item)
  }
  while (preferred.length < 4 && rest.length) preferred.push(rest.shift())
  return { heroMeta: preferred, extraMeta: rest }
}

function metaHtml(items) {
  if (!items.length) return ''
  return `<dl class="meta">${items.map(item => `<div><dt>${slateInline(item.label)}</dt><dd title="${escapeHtml(item.value)}">${slateInline(item.value)}</dd></div>`).join('')}</dl>`
}

function sourceStats(parsed, meta) {
  const stats = []
  let milestones = 0
  for (const section of parsed.sections) {
    if (!/里程碑|時程|排程/.test(section.title || '')) continue
    for (const block of section.blocks) {
      if (block.type !== 'table') continue
      milestones += block.rows.slice(1).filter(row => /^[MG]\d+/i.test(String(row[0] || '').replace(/\*/g, '').trim())).length
    }
  }
  if (milestones) stats.push({ value: String(milestones), label: '來源列明的里程碑' })
  const due = meta.find(item => /期限|到期|due/i.test(item.label))
  if (due) {
    const date = chipDate(due.value)
    stats.push({ value: date || due.value.slice(0, 16), label: `規劃${due.label}（未當成已完成）` })
  }
  const owner = meta.find(item => /Owner|PI|負責/i.test(item.label))
  if (owner) stats.push({ value: owner.value.replace(/\*\*/g, '').slice(0, 18), label: owner.label })
  return stats.slice(0, 4)
}

function navLabel(title) {
  const text = String(title || '章節').replace(/\s+/g, ' ').trim()
  const numbered = /^([一二三四五六七八九十]+、[^（(]{1,10})/.exec(text)
  if (numbered) return numbered[1].trim()
  return text.slice(0, 12)
}

const SLATE_CSS = `
:root{--navy:#172e50;--blue:#294f85;--ink:#17263b;--muted:#63748c;--line:#dce3ed;--bg:#f2f5f9;--card:#fff;--green:#329b61;--amber:#d38a21;--rose:#a33b4a}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:56px}html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;font-size:16px;line-height:1.8}
a{color:#285b9a;text-underline-offset:3px}
.page{min-width:0}
header.hero{background-color:#162b4b;background-image:linear-gradient(115deg,#162b4b,#285288);color:#fff;padding:16px 22px 14px}
header.hero .inner,main,.nav-inner{max-width:1100px;margin:0 auto;min-width:0}
.overline{font-size:12px;letter-spacing:.14em;color:#b9cce6;font-weight:700;margin:0 0 4px}
header.hero h1{margin:2px 0 4px;font-size:clamp(20px,3vw,30px);line-height:1.28;font-weight:700;color:#fff}
header.hero .sub{margin:0 0 6px;font-size:15px;color:#e0e9f7;line-height:1.45}
.meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px 16px;margin:8px 0 0}
.meta div{min-width:0}.meta dt{font-size:11px;letter-spacing:.04em;color:var(--muted);font-weight:650}.meta dd{margin:0;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
header.hero .meta{color:#cbd9ec}header.hero .meta dt{color:#9fb4d0}header.hero .meta dd{color:#eef3fb}
nav.toc{position:sticky;top:0;z-index:5;background:#fffffff2;backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.nav-inner{display:flex;gap:16px;padding:10px 24px;overflow:auto;white-space:nowrap}
nav.toc a{color:var(--muted);text-decoration:none;font-size:14px}
nav.toc a:hover{color:var(--blue)}
main{padding:18px 24px 48px;display:flex;flex-direction:column}
details.source-notes{order:99}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin:0 0 16px;box-shadow:0 3px 12px #192f4e08;min-width:0}
.card.summary{border-left:7px solid var(--green)}
.card.kind-pending{border-left:7px solid var(--amber)}
.card.kind-guard,.card.kind-decision{border-left:7px solid var(--blue)}
.card.kind-milestone{border-top:4px solid #6c8fbb}
.card.kind-technical,.card.kind-appendix{background:#f7f9fc}
.eyebrow{font-size:11px;letter-spacing:.16em;color:#7c8da5;font-weight:700;margin:0 0 4px}
h2{margin:0 0 14px;font-size:1.35rem;line-height:1.4;color:var(--navy)}
h3{margin:20px 0 8px;font-size:1.08rem;color:#294e7b}
h4{margin:16px 0 8px;font-size:1rem;color:#294e7b}
p,ul,ol{margin:0 0 12px}ul,ol{padding-left:1.3em}li{margin:0 0 6px}
p,li,dd{overflow-wrap:break-word}
.lead{font-size:18px;font-weight:650;line-height:1.75;margin:0 0 14px}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.tag{display:inline-block;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:650;color:#fff;background:#7d8999}
.tag-green{background:var(--green)}.tag-amber{background:var(--amber)}.tag-blue{background:var(--blue)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:0 0 16px}
.stat{border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.stat strong{display:block;font-size:28px;line-height:1.25;color:var(--navy)}
.stat span{font-size:13px;color:var(--muted)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 14px}
.cardlet{border:1px solid var(--line);border-radius:10px;padding:14px 16px;background:#fbfcfe}
.cardlet h3{margin:0 0 8px}
.callout{border-radius:10px;padding:12px 16px;margin:12px 0;border-left:4px solid #4878b3;background:#edf4fc}
.callout p{margin:0}.callout-green{background:#edf7f1;border-color:var(--green);color:#163d2a}
.callout-amber{background:#fcf3e2;border-color:var(--amber);color:#5c3d0c}
.callout-rose{background:#f8e6e9;border-color:var(--rose);color:#5c2230}
table{width:100%;border-collapse:collapse;font-size:14px;margin:0}
th,td{padding:11px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
th{background:#eef3f9;color:#355171;font-weight:700}
td:first-child{font-weight:650}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 12px}
.timeline{display:flex;gap:8px;margin:0 0 16px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px}
.tl{flex:1 0 88px;background:#eef3f9;color:var(--navy);border-radius:10px;padding:10px 8px;text-align:center;min-width:88px;border-top:3px solid #6c8fbb}
.tl .id{display:block;font-weight:800}.tl .date,.tl .name{display:block;font-size:12px;line-height:1.35;color:var(--muted)}
pre.source{margin:0 0 12px;max-width:100%;overflow-x:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:#172b46;color:#dce7f8;border-radius:10px;padding:16px}
pre.source code{display:block;white-space:pre-wrap;overflow-wrap:anywhere;font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.55;color:inherit;background:none}
code{font-family:ui-monospace,Consolas,monospace;font-size:.88em;background:#eef2f7;color:#36587d;padding:1px 5px;border-radius:4px}
pre.source code,pre.source code *{background:none;padding:0;color:inherit}
hr{border:0;border-top:1px solid var(--line);margin:16px 0}
details{border:1px solid var(--line);border-radius:10px;background:#fff;margin:8px 0 0}
details.source-notes{margin:0 0 16px}
summary{cursor:pointer;padding:14px 16px;font-weight:700;color:#294e7b}
.detail-body{padding:0 16px 16px}
footer.note{max-width:1100px;margin:0 auto;padding:0 24px 28px;color:var(--muted);font-size:13px}
@media(max-width:820px){.meta,.stats{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}}
@media(max-width:640px){
  body{font-size:15px}
  header.hero{padding:12px 16px 10px}
  header.hero h1{font-size:1.2rem}
  header.hero .sub{font-size:14px}
  .nav-inner{gap:14px;padding:8px 16px}
  main{padding:12px 12px 36px}
  .card{padding:16px}
  h2{font-size:1.15rem}
  .lead{font-size:16px}
  .stat strong{font-size:22px}
  th,td{padding:8px 9px;min-width:92px}
  footer.note{padding:0 12px 24px}
}
`

function slateDocumentHtml(markdown) {
  const parsed = structureSlate(parseSlateBlocks(markdown))
  const preamble = takePreamble(parsed.preamble)
  const summaries = parsed.sections.filter(section => /摘要|總覽|overview|summary/i.test(section.title) && sectionVisible(section))
  const rest = parsed.sections.filter(section => !/摘要|總覽|overview|summary/i.test(section.title) && sectionVisible(section))
  const sourceNotes = preamble.loose.filter(block => block.type === 'pre')
  const ordered = [
    ...summaries.map(section => ({ ...section, summary: true })),
    ...preamble.cards.filter(sectionVisible).map(section => ({ ...section, summary: false })),
    ...rest.map(section => ({ ...section, summary: false })),
  ]
  let summaryUsed = false
  const placed = ordered.map((section, index) => {
    const kind = section.summary ? 'summary' : classifySection(section.title, section.blocks)
    const id = section.summary && !summaryUsed ? 'summary' : `s${index}`
    if (section.summary && id === 'summary') summaryUsed = true
    return { ...section, id, kind }
  })
  const leftoverParas = preamble.loose.filter(block => block.type === 'p')
  const looseOther = preamble.loose.filter(block => block.type !== 'p' && block.type !== 'pre')
  const titleParts = splitTitle(parsed.title)
  const { heroMeta, extraMeta } = splitMeta(preamble.meta)
  const tags = statusTags(preamble.meta)
  const stats = sourceStats(parsed, preamble.meta)
  const header = [
    '<header class="hero"><div class="inner">',
    '<p class="overline">專案規劃書</p>',
    titleParts.heading ? `<h1>${slateInline(titleParts.heading)}</h1>` : '',
    metaHtml(heroMeta),
    '</div></header>',
    placed.length ? `<nav class="toc" aria-label="章節導覽"><div class="nav-inner">${placed.map(section => `<a href="#${section.id}">${slateInline(navLabel(section.title))}</a>`).join('')}</div></nav>` : '',
  ].filter(Boolean).join('\n')
  let leftoverHtml = [
    extraMeta.length ? metaHtml(extraMeta) : '',
    leftoverParas.length || looseOther.length ? renderLoose([...leftoverParas, ...looseOther]) : '',
  ].filter(Boolean).join('\n')
  const cards = placed.map((section, index) => {
    const kind = section.kind || 'body'
    const classes = ['card', section.summary ? 'summary' : '', `kind-${kind}`].filter(Boolean).join(' ')
    const eyebrow = `<p class="eyebrow">${String(index + 1).padStart(2, '0')} · ${KIND_EYEBROW[kind] || '章節'}</p>`
    let inner = ''
    if (section.summary) {
      const view = summaryView(section)
      inner += tags.length ? `<div class="tags">${tags.map(tag => `<span class="tag tag-${tag.tone}">${slateInline(tag.text)}</span>`).join('')}</div>` : ''
      inner += stats.length ? `<div class="stats">${stats.map(stat => `<div class="stat"><strong>${slateInline(stat.value)}</strong><span>${slateInline(stat.label)}</span></div>`).join('')}</div>` : ''
      if (view.lead) inner += `<p class="lead">${slateInline(view.lead)}</p>`
      if (view.highlights.length) {
        inner += `<div class="grid">${view.highlights.map(item => `<div class="cardlet"><h3>${slateInline(item.title)}</h3>${item.html}</div>`).join('')}</div>`
      }
      inner += view.rest.map(block => renderSlateBlock(block, section.title, -1)).join('\n')
      inner += '<div class="callout callout-amber"><p>閱讀基準：日期、狀態與期限依規劃書原文列出，未查核即時專案狀態；規劃日期不視為已完成。</p></div>'
      if (leftoverHtml) { inner += leftoverHtml; leftoverHtml = '' }
    } else {
      let tableCount = 0
      inner += section.blocks.map(block => {
        const tableIndex = block.type === 'table' ? tableCount++ : -1
        return renderSlateBlock(block, section.title, tableIndex)
      }).join('\n')
    }
    if (leftoverHtml && section.id === placed.find(item => !item.summary)?.id) {
      inner += leftoverHtml
      leftoverHtml = ''
    }
    const heading = `<h2>${slateInline(section.title)}</h2>`
    if (isFoldedKind(kind)) {
      const label = kind === 'appendix'
        ? '展開附錄原文，內容與來源一致、僅跳脫不執行'
        : '展開技術原文，內容與來源一致、僅跳脫不執行'
      return `<section class="${classes}" id="${section.id}">${eyebrow}${heading}<details><summary>${label}</summary><div class="detail-body">${inner}</div></details></section>`
    }
    return `<section class="${classes}" id="${section.id}">${eyebrow}${heading}\n${inner}</section>`
  }).join('\n')
  const notesHtml = sourceNotes.length
    ? `<details class="source-notes"><summary>來源註記（與來源一致、僅跳脫不執行）</summary><div class="detail-body">${sourceNotes.map(block => preHtml(block.text)).join('\n')}</div></details>`
    : ''
  const hasBody = Boolean(parsed.title || preamble.meta.length || preamble.loose.length || placed.length)
  const main = hasBody
    ? `${header}<main>${notesHtml}${cards}</main><footer class="note">本章節導覽來自文件標題；技術區塊折疊後仍保留原文，可核對來源。</footer>`
    : '<main><section class="card"><p>規劃書沒有可讀的正文。</p></section></main>'
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${SLATE_CSS}</style></head><body><div class="page">${main}</div></body></html>`
}

export function executionReportReviews(reviews = []) {
  const latest = new Map()
  for (const review of reviews) {
    const target = review?.milestoneId || (/^(M\d+|G\d+)$/.test(review?.target || '') ? review.target : '')
    if (!target) continue
    const previous = latest.get(target)
    if (!previous || String(review.at || '') > String(previous.at || '')) latest.set(target, review)
  }
  return [...latest.values()]
}
