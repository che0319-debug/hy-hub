// 量測事業版圖「⋯」與狀態標的畫面間距，並重截 B1 驗收圖。
// 不打 hy-agent-v2.onrender.com。npm test 不跑這支（檔名不是 *.test.mjs）。
// 用法：node tests/menu-pill-gap.mjs
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const pwRequire = createRequire(process.env.PLAYWRIGHT_CJS || '/workspace/atlas/pending-ux-20261119/pw/package.json')
const { chromium } = process.env.PLAYWRIGHT_CJS ? pwRequire(process.env.PLAYWRIGHT_CJS) : pwRequire('playwright')

const root = '/workspace/atlas/sam-b1-20261121'
const shots = root + '/shots'
const hub = root + '/hy-hub'
mkdirSync(shots, { recursive: true })
const snap = readFileSync(root + '/ref/live-readonly-20261121.json')
let htmlRoot = hub + '/public'

const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1')
  const rel = u.pathname === '/' ? '/sam-dashboard.html' : decodeURIComponent(u.pathname)
  try {
    const buf = readFileSync(htmlRoot + rel)
    const type = rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.css') ? 'text/css' : 'text/html'
    res.writeHead(200, { 'content-type': type })
    res.end(buf)
  } catch {
    res.writeHead(404)
    res.end('missing')
  }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const port = server.address().port

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const apiHits = []
await page.route('**/*', async route => {
  const url = route.request().url()
  if (/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(url)) {
    await route.continue()
    return
  }
  if (url.includes('hy-agent-v2.onrender.com')) {
    apiHits.push(route.request().method() + ' ' + url.split('?')[0])
    if (route.request().method() === 'POST') {
      const body = route.request().postData() || ''
      writeFileSync('/tmp/b1-v4-post-body.json', body)
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: snap.toString('utf8') })
    return
  }
  await route.continue()
})
page.on('pageerror', e => console.log('PAGEERROR', e.message))
await page.addInitScript(() => {
  try { sessionStorage.setItem('hy_life_os_access_token', 'shot') } catch (e) {}
})

async function boot() {
  await page.goto('http://127.0.0.1:' + port + '/sam-dashboard.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const b = document.getElementById('saveBtn')
    return b && !b.disabled
  }, null, { timeout: 20000 })
  await page.click('button.tab[onclick*="map"]')
  await page.waitForSelector('#bmWorld .bm-node.is-hy')
}

async function settle() {
  await page.evaluate(async () => {
    const specs = [
      ['600 23px "Noto Serif TC"', '樂川上淼'],
      ['600 30px "Newsreader"', '事業版圖'],
      ['400 14px "Inter"', 'HY'],
      ['500 14px "Noto Sans TC"', '年月公司'],
    ]
    for (const [spec, text] of specs) {
      try { await document.fonts.load(spec, text) } catch (e) {}
    }
    await document.fonts.ready
  })
  await page.waitForTimeout(400)
}

async function viewport(w, h) {
  await page.setViewportSize({ width: w, height: h })
  await settle()
}
async function setView(mode) {
  await page.evaluate(mode => {
    document.getElementById(mode === 'graph' ? 'bmViewGraph' : 'bmViewList').click()
  }, mode)
  await settle()
}
async function closePanel() {
  const open = await page.evaluate(() => document.getElementById('bmPanel').classList.contains('is-open'))
  if (!open) return
  await page.keyboard.press('Escape')
  await settle()
}
async function openCard(name) {
  const inList = await page.evaluate(() => document.getElementById('bmBody').classList.contains('is-list'))
  const loc = page.locator((inList ? '#bmList' : '#bmWorld') + ' .bm-node').filter({ hasText: name }).first()
  await loc.click()
  await settle()
}
async function mouseAway() {
  await page.mouse.move(4, 4)
  await page.evaluate(() => {
    const a = document.activeElement
    if (a && a !== document.body && a.blur) a.blur()
  })
  await page.waitForTimeout(40)
}

async function measure() {
  return page.evaluate(() => {
    const list = document.getElementById('bmBody').classList.contains('is-list')
    const root = document.querySelector(list ? '#bmList' : '#bmWorld')
    function gapOf(a, b) {
      const dx = Math.max(a.left - b.right, b.left - a.right)
      const dy = Math.max(a.top - b.bottom, b.top - a.bottom)
      const gap = dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy)
      return { gap, overlap: dx < -0.5 && dy < -0.5 }
    }
    const round = n => Math.round(n * 10) / 10
    const cards = []
    root.querySelectorAll('.bm-node').forEach(node => {
      const more = node.querySelector('.bm-more')
      const pill = node.querySelector('.bm-st')
      if (!more || !pill) return
      if (more.getClientRects().length === 0 || pill.getClientRects().length === 0) return
      const a = more.getBoundingClientRect()
      const b = pill.getBoundingClientRect()
      const g = gapOf(a, b)
      const nm = node.querySelector('.bm-nm')
      cards.push({
        id: node.dataset.id,
        name: nm ? nm.textContent : '',
        status: pill.textContent,
        selected: node.classList.contains('is-selected'),
        gap: round(g.gap),
        overlap: g.overlap,
        more: { w: round(a.width), h: round(a.height), layoutW: more.offsetWidth, layoutH: more.offsetHeight },
        pill: { w: round(b.width), h: round(b.height) },
        nameClip: nm ? nm.scrollWidth > nm.clientWidth + 1 : false,
      })
    })
    const gaps = cards.map(c => c.gap)
    const hy = document.querySelector('#bmWorld .bm-node.is-hy .bm-shape')
    const scale = hy && hy.getBoundingClientRect().width ? Math.round((hy.getBoundingClientRect().width / 128) * 1000) / 1000 : 1
    return {
      mode: list ? 'list' : 'graph',
      vw: innerWidth,
      vh: innerHeight,
      scrollW: document.documentElement.scrollWidth,
      scale: list ? 1 : scale,
      minGap: gaps.length ? round(Math.min(...gaps)) : null,
      cards,
    }
  })
}

const rows = []
function record(state, m) {
  const row = { width: m.vw, height: m.vh, mode: m.mode, state, scale: m.scale, minGap: m.minGap, scrollW: m.scrollW, cards: m.cards }
  if (m.note) row.note = m.note
  rows.push(row)
  const clip = (m.cards || []).filter(c => c.nameClip).map(c => c.name).join(',')
  console.log(m.vw, m.mode, state, 'gap', m.minGap, 'scale', m.scale, 'scroll', m.scrollW, clip ? 'CLIP ' + clip : '')
  return row
}

async function measureState(state) {
  await settle()
  record(state, await measure())
}

await boot()
await settle()

const sizes = [[1440, 900], [1280, 720], [1024, 1180], [820, 1180], [390, 844]]
for (const [w, h] of sizes) {
  await viewport(w, h)
  for (const mode of ['graph', 'list']) {
    await setView(mode)
    await closePanel()
    await mouseAway()
    await measureState('unselected')

    const rootSel = mode === 'list' ? '#bmList' : '#bmWorld'
    const node = page.locator(rootSel + ' .bm-node[data-id="shangmiao"]')
    await node.hover()
    await measureState('hover')

    await mouseAway()
    await node.focus()
    await measureState('focus')

    await page.locator(rootSel + ' .bm-node[data-id="shangmiao"] .bm-more').focus()
    await measureState('focus-button')

    await mouseAway()
    await openCard('上淼')
    await mouseAway()
    await measureState('selected')

    const hovered = await node.hover({ timeout: 1500 }).then(() => true).catch(() => false)
    if (hovered) await measureState('selected-hover')
    else {
      const m = await measure()
      m.note = '底部詳情蓋住卡片，滑鼠到不了「⋯」。幾何與選取相同。'
      record('selected-hover', m)
    }
    await closePanel()
    await mouseAway()
  }
}

async function shot(name) {
  await settle()
  const m = await measure()
  await page.screenshot({ path: shots + '/' + name + '.png' })
  console.log('SHOT', name, m.mode, 'gap', m.minGap, 'scale', m.scale)
  return m
}

await viewport(1440, 900)
await setView('graph')
await closePanel()
await mouseAway()
await shot('b1-1440x900-full')
await openCard('上淼')
await shot('b1-1440x900-detail')
const zoom = await page.evaluate(() => {
  const node = document.querySelector('#bmWorld .bm-node.is-selected')
  const more = node.querySelector('.bm-more').getBoundingClientRect()
  const pill = node.querySelector('.bm-st').getBoundingClientRect()
  const name = node.querySelector('.bm-nm').getBoundingClientRect()
  const left = Math.max(0, Math.min(more.left, pill.left, name.left) - 24)
  const top = Math.max(0, Math.min(more.top, pill.top, name.top) - 20)
  const right = Math.min(innerWidth, Math.max(more.right, pill.right, name.right) + 28)
  const bottom = Math.min(innerHeight, Math.max(more.bottom, pill.bottom, name.bottom) + 16)
  return { x: left, y: top, width: right - left, height: bottom - top }
})
await page.screenshot({ path: '/tmp/menu-pill-1440-crop.png', clip: zoom })
console.log('ZOOM clip', JSON.stringify(zoom))
execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open('/tmp/menu-pill-1440-crop.png').convert('RGB')
z = im.resize((im.width * 3, im.height * 3), Image.Resampling.LANCZOS)
z.save('${shots}/menu-pill-1440-zoom.png')
print('zoom', z.size)
`])

await viewport(1280, 720)
await setView('graph')
await closePanel()
await mouseAway()
await shot('b1-1280x720-full')
await openCard('上淼')
await shot('b1-1280x720-detail')

await viewport(1024, 1180)
await setView('graph')
await closePanel()
await mouseAway()
await shot('b1-1024-full')
await openCard('上淼')
await shot('b1-1024-detail')

await viewport(820, 1180)
await setView('graph')
await closePanel()
await mouseAway()
await shot('b1-820-full')
await openCard('上淼')
await shot('b1-820-detail')

await viewport(390, 844)
await setView('list')
await closePanel()
await mouseAway()
await shot('b1-390x844-list')
await openCard('上淼')
await shot('b1-390x844-sheet')
await closePanel()
await setView('graph')
await mouseAway()
await shot('b1-390x844-graph')

const summaryMap = new Map()
for (const row of rows) {
  const key = row.width + ' ' + row.mode
  if (!summaryMap.has(key)) summaryMap.set(key, { width: row.width, height: row.height, mode: row.mode })
  summaryMap.get(key)[row.state] = row.minGap
}
const summary = [...summaryMap.values()]
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: hub, encoding: 'utf8' }).trim()
const out = {
  thresholdPx: 4,
  targetPx: 6,
  formula: 'layoutGap = max(8, 6/scale); screenGap = layoutGap * scale = max(8*scale, 6)',
  head,
  note: '快照裡只有上淼的狀態是「平」，其餘公司是「未知」，卡面不畫賺／平／虧膠囊。每一列是該寬度、該模式、該狀態下，所有同時有「⋯」與狀態標的卡的最小間距（px）。',
  summary,
  rows,
}
writeFileSync(shots + '/menu-pill-gap.json', JSON.stringify(out, null, 2))
console.log('SUMMARY')
for (const s of summary) console.log(JSON.stringify(s))

let fail = 0
for (const row of rows) {
  if (row.minGap == null) { console.log('NO_PILL', row.width, row.mode, row.state); fail++ ; continue }
  if (row.minGap < 4 || row.cards.some(c => c.overlap)) {
    console.log('GAP_FAIL', row.width, row.mode, row.state, row.minGap)
    fail++
  }
  for (const c of row.cards) {
    const min = row.width <= 767 && row.mode === 'list' ? 44 : 28
    if (c.more.layoutW < min - 0.5 || c.more.layoutH < min - 0.5) {
      console.log('HIT_FAIL', row.width, row.mode, c.more.layoutW, c.more.layoutH, 'need', min)
      fail++
    }
  }
  if (row.scrollW > row.width + 1) { console.log('OVERFLOW', row.width, row.mode, row.state); fail++ }
}

await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => {
  const b = document.getElementById('saveBtn')
  return b && !b.disabled
}, null, { timeout: 20000 })
await page.click('#saveBtn')
await page.waitForTimeout(500)
const afterBody = readFileSync('/tmp/b1-v4-post-body.json')
const afterHash = createHash('sha256').update(afterBody).digest('hex')
console.log('AFTER', afterHash, afterBody.length, 'api', apiHits.length)
console.log('intercepted', apiHits.length, 'post', apiHits.filter(h => h.startsWith('POST')).length)

mkdirSync('/tmp/b1-before-page', { recursive: true })
writeFileSync('/tmp/b1-before-page/sam-dashboard.html', execFileSync('git', ['show', 'd4fe330:public/sam-dashboard.html'], { cwd: hub }))
writeFileSync('/tmp/b1-before-page/sam-business-map.js', execFileSync('git', ['show', 'd4fe330:public/sam-business-map.js'], { cwd: hub }))
htmlRoot = '/tmp/b1-before-page'
const beforeHits = apiHits.length
await page.goto('http://127.0.0.1:' + port + '/sam-dashboard.html', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => {
  const b = document.getElementById('saveBtn')
  return b && !b.disabled
}, null, { timeout: 20000 })
await page.click('#saveBtn')
await page.waitForTimeout(500)
const beforeBody = readFileSync('/tmp/b1-v4-post-body.json')
const beforeHash = createHash('sha256').update(beforeBody).digest('hex')
console.log('BEFORE', beforeHash, beforeBody.length, 'same', beforeHash === afterHash, 'newHits', apiHits.length - beforeHits)
writeFileSync(shots + '/payload-before.json', beforeBody)
writeFileSync(shots + '/payload-after.json', afterBody)
const headNow = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: hub, encoding: 'utf8' }).trim()
writeFileSync(shots + '/payload-diff.txt', [
  '做法：headless 分別開 d4fe330 的 sam-dashboard.html／sam-business-map.js 與目前工作樹。攔截 GET /api/sam-progress 回 ref/live-readonly-20261121.json，攔截 POST 回假成功。載入後不改直接按儲存。沒有打 hy-agent-v2.onrender.com。',
  'HEAD ' + headNow,
  '快照：ref/live-readonly-20261121.json',
  '情境一 載入後不動直接儲存：' + (beforeBody.equals(afterBody) ? '逐字相同' : '不相同'),
  'sha256 before ' + beforeHash,
  'sha256 after  ' + afterHash,
  'bytes ' + beforeBody.length + ' / ' + afterBody.length,
  '',
].join('\n'))

await browser.close()
server.close()
if (fail) {
  console.log('FAILS', fail)
  process.exitCode = 2
}
