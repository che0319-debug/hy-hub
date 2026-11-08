import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { planDocumentHtml } from '../src/lib/planHtml.mjs'
import { safeMarkdown } from '../src/lib/officeDocuments.mjs'

export function extractLiterals(markdown) {
  const text = String(markdown ?? '').replace(/\r\n/g, '\n')
  const items = []
  let index = 0
  while (index < text.length) {
    if (text.startsWith('<!--', index)) {
      const end = text.indexOf('-->', index + 4)
      items.push({ kind: 'comment', text: end === -1 ? text.slice(index + 4) : text.slice(index + 4, end) })
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
          items.push({ kind: 'fence', text: '' })
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
          items.push({ kind: 'fence', text: text.slice(contentStart) })
          break
        }
        items.push({ kind: 'fence', text: text.slice(contentStart, closedAt) })
        const closeNl = text.indexOf('\n', closedAt)
        index = closeNl === -1 ? text.length : closeNl + 1
        continue
      }
    }
    index += 1
  }
  return items
}

function decode(value) {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
}

export function renderedLiterals(html) {
  const items = []
  const re = /<pre class="source"><code>([\s\S]*?)<\/code><\/pre>/g
  let match
  while ((match = re.exec(html))) items.push(decode(match[1]))
  return items
}

function assertLiteralSlices(source, literals) {
  const text = source.replace(/\r\n/g, '\n')
  let cursor = 0
  for (const item of literals) {
    const at = text.indexOf(item.text, cursor)
    assert.notEqual(at, -1, `missing ${item.kind} at ${cursor}`)
    if (item.kind === 'comment') {
      assert.equal(text.slice(at - 4, at), '<!--')
      assert.equal(text.slice(at + item.text.length, at + item.text.length + 3), '-->')
    } else {
      assert.match(text.slice(0, at), /(?:^|\n) {0,3}(?:`{3,}|~{3,})[^\n]*\n$/)
      assert.match(text.slice(at + item.text.length), /^ {0,3}(?:`{3,}|~{3,})[ \t]*(?:\n|$)/)
    }
    cursor = at + item.text.length
  }
}

function norm(value) {
  return String(value)
    .replace(/\\([\\`*_{}\[\]()#+.!|:=-])/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '$1 $2')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function withoutLiterals(markdown) {
  const text = String(markdown ?? '').replace(/\r\n/g, '\n')
  let out = ''
  let index = 0
  for (const item of extractLiterals(text)) {
    if (item.kind === 'comment') {
      const token = `<!--${item.text}-->`
      const at = text.indexOf(token, index)
      out += text.slice(index, at)
      index = at + token.length
      continue
    }
    const at = item.text ? text.indexOf(item.text, index) : text.indexOf('\n', index) + 1
    const openerBreak = text.lastIndexOf('\n', at - 1)
    const openerStart = openerBreak <= 0 ? 0 : text.lastIndexOf('\n', openerBreak - 1) + 1
    out += text.slice(index, openerStart)
    const closeNl = text.indexOf('\n', at + item.text.length)
    index = closeNl === -1 ? text.length : closeNl + 1
  }
  out += text.slice(index)
  return out
}

function sourceAtoms(markdown) {
  const lines = withoutLiterals(markdown).split('\n')
  const atoms = []
  let paragraph = []
  const flush = () => {
    const text = norm(paragraph.join(' '))
    paragraph = []
    if (text) atoms.push(text)
  }
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { flush(); index += 1; continue }
    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line)
    if (heading) { flush(); const text = norm(heading[2]); if (text) atoms.push(text); index += 1; continue }
    if (/\|/.test(line) && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] || '')) {
      flush()
      const row = value => value.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => norm(cell)).filter(Boolean)
      atoms.push(...row(line))
      index += 2
      while (index < lines.length && lines[index].trim() && /\|/.test(lines[index])) { atoms.push(...row(lines[index])); index += 1 }
      continue
    }
    if (/^(\s*)([-*]|\d+[.)])\s+/.test(line)) {
      flush()
      while (index < lines.length && /^(\s*)([-*]|\d+[.)])\s+/.test(lines[index])) {
        const text = norm(lines[index].replace(/^(\s*)([-*]|\d+[.)])\s+/, ''))
        if (text) atoms.push(text)
        index += 1
        while (index < lines.length && lines[index].trim() && !/^(\s*)([-*]|\d+[.)])\s+/.test(lines[index]) && !/^(#{1,6})\s+/.test(lines[index]) && !/^\s*([-*_]\s*){3,}$/.test(lines[index])) {
          const extra = norm(lines[index])
          if (extra && atoms.length) atoms[atoms.length - 1] = norm(`${atoms[atoms.length - 1]} ${extra}`)
          index += 1
        }
      }
      continue
    }
    if (/^\s*([-*_]\s*){3,}$/.test(line)) { flush(); index += 1; continue }
    paragraph.push(line)
    index += 1
  }
  flush()
  return atoms
}

function renderedAtoms(html) {
  let bare = html
    .replace(/<pre class="source"><code>[\s\S]*?<\/code><\/pre>/g, '')
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/g, '')
  const bag = new Map()
  const add = value => {
    const text = norm(String(value).replace(/<[^>]+>/g, ''))
    if (!text) return
    bag.set(text, (bag.get(text) || 0) + 1)
  }
  const re = /<(h[1-6]|p|td|th|dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/g
  let match
  while ((match = re.exec(bare))) add(match[2])
  const leaf = /<li\b[^>]*>((?:(?!<li\b)[\s\S])*?)<\/li>/g
  for (;;) {
    if (!leaf.test(bare)) break
    leaf.lastIndex = 0
    bare = bare.replace(leaf, (_, inner) => { add(inner); return '' })
  }
  return bag
}

export function uncoveredAtoms(markdown, html) {
  const bag = renderedAtoms(html)
  const missing = []
  for (const atom of sourceAtoms(markdown)) {
    if ((bag.get(atom) || 0) > 0) { bag.set(atom, bag.get(atom) - 1); continue }
    const pair = /^([^：:]{1,40})[：:]\s*(.*)$/.exec(atom)
    if (pair) {
      const label = norm(pair[1])
      const value = norm(pair[2])
      const labelOk = label && (bag.get(label) || 0) > 0
      const valueOk = !value || (bag.get(value) || 0) > 0
      if (labelOk && valueOk) {
        bag.set(label, bag.get(label) - 1)
        if (value) bag.set(value, bag.get(value) - 1)
        continue
      }
    }
    const labelOnly = /^(.{1,40})[：:]$/.exec(atom)
    if (labelOnly && (bag.get(norm(labelOnly[1])) || 0) > 0) {
      const label = norm(labelOnly[1])
      bag.set(label, bag.get(label) - 1)
      continue
    }
    missing.push(atom)
  }
  return missing
}

function assertSafeHtml(html) {
  let index = 0
  while (index < html.length) {
    const at = html.indexOf('<', index)
    if (at === -1) break
    const match = html.slice(at).match(/^<\/?[A-Za-z!][^<>]*>/)
    assert.ok(match, `raw < at ${at}: ${html.slice(at, at + 40)}`)
    assert.match(match[0], /^<\/?(?:html|head|meta|base|style|body|div|header|h[1-6]|p|dl|dt|dd|nav|a|section|ul|ol|li|table|thead|tbody|tr|th|td|pre|code|span|strong|hr|main|footer|details|summary)\b|^<!DOCTYPE html>$/i)
    index = at + match[0].length
  }
}

function assertComplete(markdown, html) {
  const expected = extractLiterals(markdown)
  const actual = renderedLiterals(html)
  assert.deepEqual(actual, expected.map(item => item.text))
  assertLiteralSlices(markdown, expected)
  const fenceMarks = markdown.replace(/\r\n/g, '\n').split('\n').filter(line => /^ {0,3}(`{3,}|~{3,})/.test(line)).length
  assert.equal(fenceMarks / 2, expected.filter(item => item.kind === 'fence').length)
  assert.equal((markdown.match(/<!--/g) || []).length, expected.filter(item => item.kind === 'comment').length)
  assertSafeHtml(html)
  const missing = uncoveredAtoms(markdown, html)
  assert.deepEqual(missing, [])
}

const attack = [
  '<!-- 註解要留 <script>alert(1)</script> -->',
  '# 閱讀樣本',
  '',
  '- 狀態：待審查',
  '',
  '依據：',
  '',
  '- 開案 & 說明',
  '',
  '## 一頁摘要',
  '',
  '禁止把 `<script>` 寫進正式檔。',
  '',
  '{"keep":true}',
  '',
  '## 里程碑',
  '',
  '| id | 名稱 |',
  '| --- | --- |',
  '| M1 | 備份存在 |',
  '| M2 | 手機可讀 |',
  '',
  '## 契約',
  '',
  '```json',
  '{',
  '  "freedomIndex": { "deprecated": true, "display": false }',
  '}',
  '```',
  '',
  '```python',
  'def keep(indent):',
  '    return "<script>alert(1)</script>"',
  '```',
  '',
  '```',
  'M1 ──► M2',
  '  indented',
  '```',
].join('\n')

test('slate keeps every fenced block, comment, and prose atom', () => {
  const html = planDocumentHtml(attack, { layout: 'slate' })
  assertComplete(attack, html)
  assert.match(html, /deprecated&quot;: true/)
  assert.match(html, /#162b4b/)
  assert.match(html, /linear-gradient/)
  assert.equal(planDocumentHtml(attack).includes('deprecated'), false)
  assert.equal(planDocumentHtml(attack).includes('<script'), false)
})

test('read-chain sanitizer keeps fenced code for the slate page and still escapes it', () => {
  const kept = safeMarkdown(attack)
  assert.equal(kept, attack)
  const html = planDocumentHtml(kept, { layout: 'slate' })
  assertComplete(attack, html)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(html, /&quot;deprecated&quot;: true/)
  assert.equal(html.includes('<script'), false)
  const prose = safeMarkdown(`${attack}\n<script>alert(2)</script>\n<style>bad{}</style>\n`)
  assert.equal(prose.includes('alert(2)'), false)
  assert.equal(prose.includes('bad{}'), false)
  const after = planDocumentHtml(prose, { layout: 'slate' })
  assertComplete(attack, after)
  assert.equal(after.includes('<script'), false)
  const plain = planDocumentHtml(prose)
  assert.equal(plain.includes('deprecated'), false)
  assert.equal(plain.includes('def keep'), false)
  assert.equal(plain.includes('<script'), false)
})

test('synthetic reading-draft fixture keeps appendix literals', async () => {
  const markdown = await readFile(new URL('./fixtures/plan-reading-synthetic.md', import.meta.url), 'utf8')
  const html = planDocumentHtml(markdown, { layout: 'slate' })
  const literals = extractLiterals(markdown)
  const rendered = renderedLiterals(html)
  assert.ok(literals.some(item => item.kind === 'comment' || item.kind === 'fence'))
  for (const item of literals) {
    assert.ok(rendered.some(text => text.includes(item.text.trim()) || text.includes(item.text)), `missing ${item.kind}`)
  }
  assert.match(html, /count_shelf/)
  assert.equal(html.includes('<script'), false)
})

test('english fixture keeps every literal and prose atom', async () => {
  const markdown = await readFile(new URL('./fixtures/plan-brief-en.md', import.meta.url), 'utf8')
  const html = planDocumentHtml(safeMarkdown(markdown), { layout: 'slate' })
  assertComplete(markdown, html)
  assert.equal(html.includes('七維'), false)
  assert.equal(html.includes('<script'), false)
})

test('slate source file keeps every literal and prose atom when PLAN_SOURCE is set', async () => {
  const file = process.env.PLAN_SOURCE
  if (!file) return
  const markdown = await readFile(file, 'utf8')
  const kept = safeMarkdown(markdown)
  assert.equal(kept, markdown)
  const html = planDocumentHtml(kept, { layout: 'slate' })
  assertComplete(markdown, html)
  assert.match(html, /&quot;deprecated&quot;: true/)
  assert.equal(html.includes('<script'), false)
  const reportPath = process.env.PLAN_REPORT
  if (!reportPath) return
  const literals = extractLiterals(markdown)
  const rendered = renderedLiterals(html)
  const report = {
    sourceBytes: Buffer.byteLength(markdown),
    sanitizerPreservesSource: kept === markdown,
    literalCount: literals.length,
    fenceCount: literals.filter(item => item.kind === 'fence').length,
    commentCount: literals.filter(item => item.kind === 'comment').length,
    renderedCodeCount: rendered.length,
    bodiesEqual: rendered.every((body, index) => body === literals[index]?.text),
    proseMissing: uncoveredAtoms(markdown, html),
    plainLayoutContainsDeprecated: planDocumentHtml(markdown).includes('deprecated'),
    literals: literals.map((item, index) => ({
      index,
      kind: item.kind,
      bytes: Buffer.byteLength(item.text),
      sha256: createHash('sha256').update(item.text).digest('hex'),
      head: item.text.slice(0, 80),
    })),
  }
  await writeFile(reportPath, JSON.stringify(report, null, 2))
})

async function sandboxedCodeText(html) {
  const require = createRequire(import.meta.url)
  const pkg = require(process.env.PLAYWRIGHT_CJS || 'playwright')
  const chromium = pkg.chromium
  if (!chromium) throw new Error('playwright did not export chromium')
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent('<!DOCTYPE html><meta charset="utf-8"><iframe id="f" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>', { waitUntil: 'load' })
    await page.locator('#f').evaluate((frame, doc) => { frame.srcdoc = doc }, html)
    const frame = page.frameLocator('#f')
    await frame.locator('pre.source code').first().waitFor({ state: 'attached' })
    const texts = await frame.locator('pre.source code').evaluateAll(nodes => nodes.map(node => node.textContent))
    const raw = await frame.locator('html').evaluate(node => node.outerHTML)
    return { texts, raw }
  } finally {
    await browser.close()
  }
}

test('sandboxed code textContent matches every literal when PLAN_DOM is set', async () => {
  if (process.env.PLAN_DOM !== '1') return
  const samples = [['attack', attack]]
  const file = process.env.PLAN_SOURCE
  if (file) samples.push(['source', await readFile(file, 'utf8')])
  const rows = []
  for (const [name, markdown] of samples) {
    const html = planDocumentHtml(safeMarkdown(markdown), { layout: 'slate' })
    const { texts, raw } = await sandboxedCodeText(html)
    const expected = extractLiterals(markdown).map(item => item.text)
    assert.equal(texts.length, expected.length, name)
    const mismatches = []
    texts.forEach((body, index) => {
      if (body !== expected[index]) mismatches.push({ index, actualBytes: Buffer.byteLength(body), expectedBytes: Buffer.byteLength(expected[index] || '') })
    })
    assert.deepEqual(mismatches, [], name)
    assert.equal(raw.includes('<script'), false, name)
    rows.push({
      name,
      count: texts.length,
      textContentEqual: mismatches.length === 0,
      rawScriptTag: raw.includes('<script'),
      sha256: texts.map(body => createHash('sha256').update(body).digest('hex')),
    })
  }
  const reportPath = process.env.PLAN_DOM_REPORT
  if (reportPath) await writeFile(reportPath, JSON.stringify({ samples: rows }, null, 2))
})
