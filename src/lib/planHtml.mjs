// 規劃書轉成可讀 HTML。去掉程式碼區塊與純 JSON，保留標題、段落、清單、表格與決策文字。
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

export function planDocumentHtml(markdown) {
  const body = renderBlocks(stripImplementationBlocks(markdown))
  const content = body || '<p>規劃書沒有可讀的正文。</p>'
  return `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${PLAN_CSS}</style></head><body>${content}</body></html>`
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
