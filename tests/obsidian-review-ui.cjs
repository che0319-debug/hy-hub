// 待上架審卡：假資料、不打正式 API。確認核准／退回看得到、點得到，而且勾選會送出。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const base = process.env.OBSIDIAN_QA_BASE_URL || 'http://127.0.0.1:5174'
const shots = process.env.OB_REVIEW_QA_DIR || ''
if (shots) fs.mkdirSync(shots, { recursive: true })

const longBody = Array.from({ length: 24 }, (_, index) => (
  `第 ${index + 1} 段。這段是故意寫長的正文，用來確認卡片再高，上方與下方的核准、退回也不會被頁首、側欄或捲動區裁掉。使用者必須看得到，也點得到。`
)).join('\n\n')

function card(id, title, folder, state) {
  return {
    id,
    type: 'know',
    title,
    aliases: [],
    tags: ['審卡'],
    path: `${folder}/${id}.md`,
    state,
    written_by: 'HY Bot',
    confidence: 'high',
  }
}

const index = {
  updated: '2026-11-22T01:00:00+00:00',
  cards: [
    card('know-long', '長文待審', '00_待上架', 'candidate'),
    card('know-short', '短文待審', '00_待上架', 'candidate'),
    card('know-filed', '已上架的卡', '40_知識', 'current'),
  ],
}

function markdown(id) {
  if (id === 'know-long') {
    return `---\nid: ${id}\ntitle: 長文待審\nwritten_by: HY Bot\n---\n\n${longBody}\n`
  }
  return `---\nid: ${id}\ntitle: 短文待審\nwritten_by: HY Bot\n---\n\n短正文。\n`
}

async function launch(width, height) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  const posts = []
  const external = []
  let failNext = false
  let serverItems = []
  await context.addInitScript(() => {
    const payload = { exp: Math.floor(Date.now() / 1000) + 3600, sub: 'hy' }
    sessionStorage.setItem('hy_life_os_access_token', `${btoa(JSON.stringify(payload))}.test`)
  })
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      external.push(url.href)
      await route.abort()
      return
    }
    if (!url.pathname.startsWith('/api/')) {
      await route.continue()
      return
    }
    const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true }) })
      return
    }
    if (url.pathname === '/api/dispatch-sessions') {
      await route.fulfill({ status: 200, headers, body: '[]' })
      return
    }
    if (url.pathname === '/api/brain/index') {
      await route.fulfill({ status: 200, headers, body: JSON.stringify(index) })
      return
    }
    if (url.pathname === '/api/brain/card') {
      await route.fulfill({
        status: 200,
        headers: { ...headers, 'content-type': 'text/markdown; charset=utf-8' },
        body: markdown(url.searchParams.get('id')),
      })
      return
    }
    if (url.pathname === '/api/brain/review-queue' && request.method() === 'GET') {
      await route.fulfill({ status: 200, headers, body: JSON.stringify({ version: 1, updated: null, items: serverItems }) })
      return
    }
    if (url.pathname === '/api/brain/review-queue' && request.method() === 'POST') {
      const body = request.postDataJSON()
      posts.push({ body, writeKey: request.headers()['x-brain-write-key'] || '' })
      assert.equal(posts.at(-1).writeKey, '')
      if (failNext) {
        failNext = false
        await route.fulfill({ status: 503, headers, body: JSON.stringify({ error: 'brain_data_unavailable' }) })
        return
      }
      for (const decision of body.decisions || []) {
        serverItems = serverItems.filter(item => item.id !== decision.id)
        if (decision.decision === 'approve' || decision.decision === 'reject') {
          serverItems.push({
            id: decision.id,
            title: decision.title,
            decision: decision.decision,
            decided_at: decision.decided_at,
            written_by: decision.written_by || null,
            path: decision.path || null,
          })
        }
      }
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          version: 1,
          updated: body.decisions[0].decided_at,
          items: serverItems,
          ignored: [],
        }),
      })
      return
    }
    await route.fulfill({ status: 200, headers, body: JSON.stringify({}) })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  return { browser, page, posts, external, errors, armFailure() { failNext = true } }
}

async function assertReachable(page, locator, label) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  assert.ok(box, `${label} 沒有位置`)
  assert.ok(box.width >= 44 && box.height >= 44, `${label} 太小 ${Math.round(box.width)}x${Math.round(box.height)}`)
  const viewport = page.viewportSize()
  assert.ok(box.x >= -1 && box.y >= -1, `${label} 在視窗外`)
  assert.ok(box.x + box.width <= viewport.width + 1, `${label} 右邊被切掉`)
  assert.ok(box.y + box.height <= viewport.height + 1, `${label} 下邊被切掉`)
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    const button = el && el.closest ? el.closest('button') : null
    return button ? button.textContent.trim() : ''
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
  assert.equal(hit, label, `${label} 被擋住，點到「${hit}」`)
  const blocked = await locator.evaluate(button => {
    const br = button.getBoundingClientRect()
    return [...document.querySelectorAll('aside, .bn, .hy-header')].filter(node => {
      const style = getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      const rect = node.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return false
      const ix = Math.min(br.right, rect.right) - Math.max(br.left, rect.left)
      const iy = Math.min(br.bottom, rect.bottom) - Math.max(br.top, rect.top)
      return ix > 1 && iy > 1
    }).map(node => node.className)
  })
  assert.deepEqual(blocked, [], `${label} 和側欄或導覽重疊`)
}

async function shot(page, name) {
  if (!shots) return
  await page.screenshot({ path: path.join(shots, name) })
}

async function runWidth(width, height) {
  const session = await launch(width, height)
  try {
    await session.page.goto(`${base}/#/obsidian?tab=pending&card=know-long`, { waitUntil: 'domcontentloaded' })
    await session.page.getByRole('heading', { name: 'HY Obsidian' }).waitFor()
    const topApprove = session.page.locator('.ob-actions-top').getByRole('button', { name: '核准', exact: true })
    const topReject = session.page.locator('.ob-actions-top').getByRole('button', { name: '退回', exact: true })
    await topApprove.waitFor()
    await assertReachable(session.page, topApprove, '核准')
    await assertReachable(session.page, topReject, '退回')
    if (width >= 641) {
      const scrolls = await session.page.locator('.ob-reader-body').evaluate(node => node.scrollHeight > node.clientHeight + 20)
      assert.equal(scrolls, true, '長正文沒有把閱讀區撐出捲軸，內容可能被裁掉')
    }
    const bottom = session.page.locator('article .ob-actions').last()
    await assertReachable(session.page, bottom.getByRole('button', { name: '核准', exact: true }), '核准')
    await assertReachable(session.page, bottom.getByRole('button', { name: '退回', exact: true }), '退回')
    await assertReachable(session.page, topApprove, '核准')
    const overflow = await session.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    assert.equal(overflow, false)
    await shot(session.page, `review-buttons-${width}.png`)

    await topApprove.click()
    await session.page.getByText('已勾核准', { exact: true }).waitFor()
    assert.equal(session.posts.length, 1)
    assert.equal(session.posts[0].body.decisions[0].id, 'know-long')
    assert.equal(session.posts[0].body.decisions[0].decision, 'approve')
    assert.equal(session.posts[0].body.decisions[0].written_by, 'HY Bot')
    assert.equal(session.posts[0].body.decisions[0].path, '00_待上架/know-long.md')
    assert.equal(session.posts[0].writeKey, '')
    await session.page.getByRole('button', { name: /短文待審/ }).click()
    await session.page.getByRole('heading', { name: '短文待審', exact: true }).waitFor()
    const shortReject = session.page.locator('.ob-actions-top').getByRole('button', { name: '退回', exact: true })
    await assertReachable(session.page, shortReject, '退回')
    await shortReject.click()
    await session.page.getByText('已勾退回', { exact: true }).waitFor()
    assert.equal(session.posts.at(-1).body.decisions[0].decision, 'reject')
    assert.equal(session.posts.at(-1).body.decisions[0].id, 'know-short')
    await session.page.getByRole('heading', { name: '待處理清單' }).scrollIntoViewIfNeeded()
    await session.page.getByRole('button', { name: '複製清單', exact: true }).waitFor()
    await shot(session.page, `review-decisions-${width}.png`)

    if (width === 1440) {
      session.armFailure()
      await session.page.locator('.ob-actions-top').getByRole('button', { name: '核准', exact: true }).click()
      await session.page.getByRole('status').getByText(/還沒存上雲端，可先複製清單/).waitFor()
      await session.page.getByText('尚未存上雲端', { exact: true }).waitFor()
      await shot(session.page, 'review-unsaved-1440.png')
    }
    assert.deepEqual(session.external, [])
    assert.deepEqual(session.errors, [])
    console.log(`review ui ${width}: buttons reachable, posts ${session.posts.length}`)
  } finally {
    await session.browser.close()
  }
}

;(async () => {
  for (const [width, height] of [[1440, 900], [1024, 800], [390, 844]]) {
    await runWidth(width, height)
  }
})().catch(error => {
  console.error(error)
  process.exit(1)
})
