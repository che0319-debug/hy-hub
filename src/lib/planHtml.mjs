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
  if (raw.startsWith('本版不')) return `<div class="callout callout-amber">${body}</div>`
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

function renderSlateBlock(block, sectionTitle, tableIndex) {
  if (block.type === 'h') return `<h${block.level}>${slateInline(block.text)}</h${block.level}>`
  if (block.type === 'p') return paragraphHtml(block.text)
  if (block.type === 'list') return listHtml(block.items, block.ordered)
  if (block.type === 'pre') return `<pre class="source"><code>${escapeHtml(block.text)}</code></pre>`
  if (block.type === 'hr') return '<hr>'
  if (block.type === 'table') {
    const timeline = tableIndex === 0 && /里程碑/.test(sectionTitle || '') ? timelineHtml(block.rows) : ''
    return `${timeline}${slateTable(block.rows)}`
  }
  return ''
}

function renderLoose(blocks) {
  return blocks.map(block => renderSlateBlock(block, '', -1)).join('\n')
}

const SLATE_CSS = `
:root{--header-bg:#eef5fc;--header-text:#355575;--page-bg:#d8dee6;--card:#ffffff;--ink:#243040;--muted:#5b6b7c;--line:#d5e0ea;--green:#1b6b43;--green-bg:#e6f5ec;--amber:#8a5a10;--amber-bg:#f8eed8;--rose:#8a3040;--rose-bg:#f8e6e9}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{background:var(--page-bg);color:var(--ink);font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;line-height:1.7;font-size:16px}
.wrap{max-width:1080px;margin:0 auto;padding:20px 14px 72px}
header.hero{background:var(--header-bg);color:var(--header-text);border-radius:16px;padding:28px 28px 24px;margin-bottom:18px}
header.hero h1{margin:0 0 8px;font-size:1.7rem;line-height:1.35;font-weight:700;color:var(--header-text)}
header.hero .sub{margin:0 0 12px;color:var(--header-text)}
.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 20px;margin:0 0 12px}
.meta div{min-width:0}.meta dt{font-size:12px;letter-spacing:.04em;color:#5d7894;font-weight:600}.meta dd{margin:0;color:var(--header-text);overflow-wrap:anywhere}
.card{background:var(--card);border-radius:16px;padding:26px 28px;margin-bottom:16px;box-shadow:0 1px 2px rgba(36,48,64,.06);min-width:0}
.wrap,header.hero{min-width:0}
.card.summary{border-left:5px solid var(--header-text)}
h2{margin:0 0 14px;font-size:1.28rem;color:var(--header-text);line-height:1.4}
h3{margin:22px 0 10px;font-size:1.08rem;color:#3d5a75}h4{margin:18px 0 8px;font-size:1rem;color:#3d5a75}
p,ul,ol{margin:0 0 12px}ul,ol{padding-left:1.25em}li{margin:0 0 6px}
p,li,dd{overflow-wrap:break-word}a{color:var(--header-text)}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0}
.toc a{text-decoration:none;background:#fff;border:1px solid #c5d6e8;color:var(--header-text);border-radius:999px;padding:4px 10px;font-size:13px}
.tag{display:inline-block;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600}
.tag-green{background:var(--green-bg);color:var(--green)}.tag-amber{background:var(--amber-bg);color:var(--amber)}
.callout{border-radius:12px;padding:12px 14px;margin:12px 0}.callout p{margin:0}
.callout-green{background:var(--green-bg);color:#163d2a}.callout-amber{background:var(--amber-bg);color:#5c3d0c}.callout-rose{background:var(--rose-bg);color:#5c2230}
table{width:100%;border-collapse:collapse;font-size:.95rem;margin:0}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
th{background:var(--header-bg);color:var(--header-text);font-weight:600}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 12px}
.timeline{display:flex;gap:8px;margin:0 0 16px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px}
.tl{flex:1 0 92px;background:var(--header-bg);color:var(--header-text);border-radius:12px;padding:10px 8px;text-align:center;min-width:92px}
.tl .id{display:block;font-weight:800;font-size:1.05rem}.tl .date,.tl .name{display:block;font-size:12px;line-height:1.35}
pre.source{margin:0 0 12px;max-width:100%;overflow-x:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:#f6f9fc;border:1px solid var(--line);border-radius:12px;padding:12px 14px}
pre.source code{display:block;white-space:pre-wrap;overflow-wrap:anywhere;font-family:ui-monospace,monospace;font-size:13px;line-height:1.45}
hr{border:0;border-top:1px solid var(--line);margin:16px 0}
code{font-family:ui-monospace,monospace;font-size:.92em}
@media(max-width:820px){.meta{grid-template-columns:1fr}}
@media(max-width:640px){.wrap{padding:12px 10px 56px}header.hero,.card{padding:18px 16px}header.hero h1{font-size:1.35rem}h2{font-size:1.15rem}table{font-size:.86rem}th,td{padding:7px 8px}}
`

function slateDocumentHtml(markdown) {
  const parsed = structureSlate(parseSlateBlocks(markdown))
  const preamble = takePreamble(parsed.preamble)
  const summaries = parsed.sections.filter(section => /摘要/.test(section.title) && sectionVisible(section))
  const rest = parsed.sections.filter(section => !/摘要/.test(section.title) && sectionVisible(section))
  const ordered = [
    ...summaries.map(section => ({ ...section, summary: true })),
    ...preamble.cards.filter(sectionVisible).map(section => ({ ...section, summary: false })),
    ...rest.map(section => ({ ...section, summary: false })),
  ]
  let summaryUsed = false
  const placed = ordered.map((section, index) => {
    const id = section.summary && !summaryUsed ? 'summary' : `s${index}`
    if (section.summary && id === 'summary') summaryUsed = true
    return { ...section, id }
  })
  const looseParas = preamble.loose.filter(block => block.type === 'p')
  const looseOther = preamble.loose.filter(block => block.type !== 'p')
  const header = [
    '<header class="hero">',
    parsed.title ? `<h1>${slateInline(parsed.title)}</h1>` : '',
    looseParas.map(block => `<p class="sub">${slateInline(block.text)}</p>`).join(''),
    preamble.meta.length ? `<dl class="meta">${preamble.meta.map(item => `<div><dt>${slateInline(item.label)}</dt><dd>${slateInline(item.value)}</dd></div>`).join('')}</dl>` : '',
    renderLoose(looseOther),
    placed.length ? `<nav class="toc" aria-label="章節">${placed.map(section => `<a href="#${section.id}">${slateInline(section.title)}</a>`).join('')}</nav>` : '',
    '</header>',
  ].filter(Boolean).join('\n')
  const cards = placed.map(section => {
    let tableCount = 0
    const inner = section.blocks.map(block => {
      const tableIndex = block.type === 'table' ? tableCount++ : -1
      return renderSlateBlock(block, section.title, tableIndex)
    }).join('\n')
    return `<section class="${section.summary ? 'card summary' : 'card'}" id="${section.id}"><h2>${slateInline(section.title)}</h2>\n${inner}</section>`
  }).join('\n')
  const hasBody = Boolean(parsed.title || preamble.meta.length || preamble.loose.length || placed.length)
  const main = hasBody ? `${header}\n${cards}` : '<section class="card"><p>規劃書沒有可讀的正文。</p></section>'
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${SLATE_CSS}</style></head><body><div class="wrap">${main}</div></body></html>`
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
