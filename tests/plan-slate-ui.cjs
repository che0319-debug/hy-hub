// Isolated Bot Office plan-tab check. Mocks office reads. Does not call production.
const fs = require('fs')
const path = require('path')
const assert = require('assert')
const { pathToFileURL } = require('url')
const { chromium } = require('playwright')

const out = path.resolve(process.env.PLAN_SLATE_QA_DIR || path.join(__dirname, '../docs/quality/ui/plan-slate'))
fs.mkdirSync(out, { recursive: true })
const base = process.env.PLAN_SLATE_BASE || 'http://127.0.0.1:5176'
const shot = name => path.join(out, name)

const milestoneRows = Array.from({ length: 12 }, (_, index) => {
  const n = index + 1
  const day = String(6 + index).padStart(2, '0')
  return `| M${n} | 里程碑${n}名稱要換行 | 交付${n}需要橫向才看完的說明文字 | 2026-11-${day} | 執行者${n} | 驗收${n}：隔離測試全綠而且備份存在 | ${n === 1 ? '—' : `M${n - 1}`} | 備註${n}不改規劃版本 |`
})
const planMarkdown = [
  '# 閱讀樣本規劃書',
  '',
  '- 狀態：待審查',
  '- 期限：2026-12-01',
  '',
  '所有時間都是台北時間。',
  '',
  '依據：',
  '',
  '- 開案說明',
  '',
  '## 修訂說明',
  '',
  '先寫修訂，摘要在後面。',
  '',
  '## 一頁摘要',
  '',
  '- **要做什麼**：青石摘要句，把規劃書排成卡片。',
  '  - 子項保留',
  '',
  '## 里程碑',
  '',
  '| id | 名稱 | 產出 | 到期 | 執行者 | 驗收標準 | 前置 | 備註 |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...milestoneRows,
  '',
  '## 範圍',
  '',
  '| 做 | 不做 |',
  '| --- | --- |',
  '| 改呈現 | 改規劃版本 |',
  '',
  '**有示範**與**缺口**留在原文。',
  '',
  '## 契約樣本',
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
].join('\n')

const p003Path = process.env.PLAN_SOURCE || '/workspace/office-plan-html-build/source-p003-main-plan.md'
const p003Markdown = fs.existsSync(p003Path) ? fs.readFileSync(p003Path, 'utf8') : ''
const fixtureMarkdown = fs.readFileSync(path.join(__dirname, 'fixtures/plan-brief-en.md'), 'utf8')

const state = {
  updated: '2026-11-07T09:00:00+08:00',
  islands: [{ id: 'company', name: '公司' }],
  buildings: [
    { id: 'p-read', title: '閱讀樣本', island: 'company', stage: 'assigned', executor: 'grok-build', goal: '只改呈現。', plan: { version: 2, status: 'draft', doc_url: 'https://docs.google.com/document/d/PlanDocRead0001/edit' } },
    { id: 'p-miss', title: '缺文件', island: 'company', stage: 'assigned', executor: 'grok-build', goal: '沒有登錄文件。', plan: { version: 1, status: 'draft' } },
    { id: 'p-fail', title: '讀取失敗', island: 'company', stage: 'assigned', executor: 'grok-build', goal: '讀取會失敗。', plan: { version: 2, status: 'draft', doc_url: 'https://docs.google.com/document/d/FailDocRead0001/edit' } },
    { id: 'p-trunc', title: '截斷文件', island: 'company', stage: 'assigned', executor: 'grok-build', goal: '文件超過上限。', plan: { version: 2, status: 'draft', doc_url: 'https://docs.google.com/document/d/TruncDocRead001/edit' } },
    { id: 'p-p003', title: 'p003真來源', island: 'company', stage: 'assigned', executor: 'grok-build', goal: '真來源閱讀品質。', plan: { version: 3, status: 'draft', doc_url: 'https://docs.google.com/document/d/P003DocRead00001/edit' } },
    { id: 'p-en', title: '英文測試fixture', island: 'company', stage: 'assigned', executor: 'grok-build', goal: '結構不同的測試fixture。', plan: { version: 1, status: 'draft', doc_url: 'https://docs.google.com/document/d/EnFixDocRead0001/edit' } },
  ],
  decisions: [],
}
const index = { updated: state.updated, cards: [] }

function documentBody(fileId) {
  if (fileId === 'PlanDocRead0001') return { status: 200, body: { file_id: fileId, name: '閱讀樣本規劃書', markdown: planMarkdown, truncated: false } }
  if (fileId === 'TruncDocRead001') return { status: 200, body: { file_id: fileId, name: '截斷文件', markdown: planMarkdown, truncated: true } }
  if (fileId === 'FailDocRead0001') return { status: 403, body: { error: 'document_forbidden', reason: '測試用拒絕' } }
  if (fileId === 'P003DocRead00001' && p003Markdown) return { status: 200, body: { file_id: fileId, name: 'p003真來源', markdown: p003Markdown, truncated: false } }
  if (fileId === 'EnFixDocRead0001') return { status: 200, body: { file_id: fileId, name: '英文測試fixture', markdown: fixtureMarkdown, truncated: false } }
  return { status: 404, body: { error: 'no_document', reason: '沒有這份文件' } }
}

async function launch(width, height) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  const api = []
  const external = []
  await context.addInitScript(() => {
    if (window.top !== window.self) return
    const payload = { exp: Math.floor(Date.now() / 1000) + 3600, sub: 'hy' }
    sessionStorage.setItem('hy_life_os_access_token', `${btoa(JSON.stringify(payload))}.test`)
  })
  await context.route('**/api/**', async route => {
    const req = route.request()
    const url = new URL(req.url())
    api.push([req.method(), `${url.pathname}${url.search}`])
    if (req.method() !== 'GET') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'unexpected_write' }) })
      return
    }
    const headers = { 'Content-Type': 'application/json', 'X-Brain-Updated': state.updated }
    if (url.pathname === '/api/office/state') {
      await route.fulfill({ status: 200, headers, body: JSON.stringify(state) })
      return
    }
    if (url.pathname === '/api/office/index') {
      await route.fulfill({ status: 200, headers, body: JSON.stringify(index) })
      return
    }
    if (url.pathname.endsWith('/report')) {
      await route.fulfill({ status: 200, headers, body: JSON.stringify({ exists: false, reason: '' }) })
      return
    }
    if (url.pathname.endsWith('/drive-document')) {
      const doc = documentBody(url.searchParams.get('file_id'))
      await route.fulfill({ status: doc.status, headers, body: JSON.stringify(doc.body) })
      return
    }
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true }) })
      return
    }
    await route.fulfill({ status: 200, headers, body: JSON.stringify({}) })
  })
  await context.route('https://docs.google.com/**', route => route.abort())
  await context.route('https://drive.google.com/**', route => route.abort())
  const page = await context.newPage()
  page.on('request', req => {
    const host = new URL(req.url()).hostname
    if (host !== '127.0.0.1' && host !== 'localhost') external.push(req.url())
  })
  page.on('pageerror', error => { throw error })
  return { browser, page, api, external }
}

async function assertShellTabs(page, width, shotPath) {
  const nav = page.getByRole('navigation', { name: 'Bot Office 專案分頁' })
  const names = ['概況', '會議室', '專案規劃', '成果與審查', '工作日誌']
  const boxes = []
  for (const name of names) {
    const btn = nav.getByRole('button', { name, exact: true })
    await btn.scrollIntoViewIfNeeded()
    const box = await btn.boundingBox()
    assert.ok(box, `${width} missing tab ${name}`)
    assert.ok(box.width >= 36, `${width} ${name} too narrow ${JSON.stringify(box)}`)
    assert.ok(box.x >= -1, `${width} ${name} off left ${JSON.stringify(box)}`)
    assert.ok(box.x + box.width <= width + 2, `${width} ${name} clipped ${JSON.stringify(box)}`)
    boxes.push({ name, ...box })
  }
  await page.screenshot({ path: shotPath })
  await nav.getByRole('button', { name: '工作日誌', exact: true }).click()
  await page.getByRole('heading', { name: '工作日誌' }).waitFor()
  await page.screenshot({ path: shotPath.replace('.png', '-log.png') })
  await nav.getByRole('button', { name: '專案規劃', exact: true }).click()
  await page.frameLocator('iframe.ao-plan-slate').locator('nav.toc a').first().waitFor()
  return boxes
}

async function assertAnchors(page, label, shots) {
  const frame = page.frameLocator('iframe.ao-plan-slate')
  await frame.locator('nav.toc a').first().waitFor()
  const count = await frame.locator('nav.toc a').count()
  assert.ok(count > 0, `${label} no nav links`)
  const wrap = await frame.locator('.nav-inner').evaluate(el => {
    const style = getComputedStyle(el)
    return { wrap: style.flexWrap, white: style.whiteSpace, overflow: style.overflow }
  })
  assert.equal(wrap.wrap, 'wrap', `${label} nav ${JSON.stringify(wrap)}`)
  const seen = []
  for (let index = 0; index < count; index += 1) {
    const link = frame.locator('nav.toc a').nth(index)
    const text = (await link.textContent()).trim()
    assert.ok(text.length > 0, `${label} empty nav ${index}`)
    await link.evaluate(el => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
    const vis = await link.evaluate(el => {
      const r = el.getBoundingClientRect()
      const nav = el.closest('nav')
      const nr = nav.getBoundingClientRect()
      return {
        text: el.textContent.trim(),
        w: r.width,
        h: r.height,
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        navTop: nr.top,
        navBottom: nr.bottom,
        navLeft: nr.left,
        navRight: nr.right,
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
        overflow: getComputedStyle(el).textOverflow,
      }
    })
    assert.ok(vis.w > 8 && vis.h > 8, `${label} tiny ${JSON.stringify(vis)}`)
    assert.ok(vis.left >= vis.navLeft - 2, `${label} left-clip ${JSON.stringify(vis)}`)
    assert.ok(vis.right <= vis.navRight + 2, `${label} right-clip ${JSON.stringify(vis)}`)
    assert.ok(vis.top >= vis.navTop - 2, `${label} top-clip ${JSON.stringify(vis)}`)
    assert.ok(vis.bottom <= vis.navBottom + 2, `${label} bottom-clip ${JSON.stringify(vis)}`)
    assert.ok(vis.overflow !== 'ellipsis' || vis.scrollW <= vis.clientW + 1, `${label} ellipsis ${JSON.stringify(vis)}`)
    const id = await link.evaluate(el => (el.getAttribute('href') || '').split('#').pop())
    await link.click()
    assert.match(page.url(), /bot-office/)
    let placed
    for (let attempt = 0; attempt < 12; attempt += 1) {
      placed = await frame.locator('nav.toc').evaluate((nav, sectionId) => {
        const heading = nav.ownerDocument.getElementById(sectionId)?.querySelector('h2')
        if (!heading) return { ok: false, reason: 'missing', sectionId }
        const nr = nav.getBoundingClientRect()
        const hr = heading.getBoundingClientRect()
        return {
          ok: hr.top >= nr.bottom - 4 && hr.top < nr.bottom + 180,
          navBottom: nr.bottom,
          headingTop: hr.top,
          heading: heading.textContent,
          navH: nr.height,
          sectionId,
        }
      }, id)
      if (placed.ok) break
      await page.waitForTimeout(80)
    }
    assert.ok(placed.ok, `${label} heading under sticky ${JSON.stringify(placed)}`)
    seen.push({ text, heading: placed.heading, navH: placed.navH })
    if (shots && (index === 0 || index === Math.floor(count / 2) || index === count - 1)) {
      await page.screenshot({ path: shots(`${index}-${id || 'section'}.png`) })
    }
  }
  return seen
}

async function captureReading(page, title, prefix, heading) {
  await openPlan(page, title)
  const frame = page.frameLocator('iframe.ao-plan-slate')
  if (heading) await frame.getByRole('heading', { name: heading }).first().waitFor()
  else await frame.locator('header.hero').waitFor()
  await page.screenshot({ path: shot(`${prefix}-first.png`) })
  await frame.locator('header.hero').screenshot({ path: shot(`${prefix}-header.png`) })
  await frame.locator('nav.toc').screenshot({ path: shot(`${prefix}-nav.png`) })
  const summary = frame.locator('#summary')
  const summaryTarget = (await summary.count()) ? summary : frame.locator('main .card').first()
  await summaryTarget.scrollIntoViewIfNeeded()
  await page.screenshot({ path: shot(`${prefix}-summary.png`) })
  const table = frame.locator('.scroll').first()
  if (await table.count()) {
    await table.scrollIntoViewIfNeeded()
    await table.screenshot({ path: shot(`${prefix}-table.png`) })
  }
  const details = frame.locator('details')
  const count = await details.count()
  if (count) {
    const target = details.nth(count > 1 ? count - 1 : 0)
    await target.locator('summary').click()
    await target.scrollIntoViewIfNeeded()
    await target.screenshot({ path: shot(`${prefix}-appendix.png`) })
  }
  const hero = await frame.locator('header.hero').evaluate(el => {
    const view = el.ownerDocument.defaultView
    return { height: el.getBoundingClientRect().height, view: view.innerHeight }
  })
  assert.ok(hero.height < hero.view * 0.55, `${prefix} hero ${JSON.stringify(hero)}`)
}

async function openPlan(page, title) {
  const home = page.getByRole('heading', { name: 'Bot Office', exact: true })
  if (!page.url().includes('#/bot-office')) await page.goto(`${base}/#/bot-office`)
  if (!(await home.isVisible().catch(() => false))) {
    const back = page.getByRole('button', { name: '‹ Bot Office', exact: true })
    if (await back.count()) await back.click()
    else {
      await page.goto(`${base}/#/`)
      await page.goto(`${base}/#/bot-office`)
    }
  }
  await home.waitFor()
  await page.getByRole('button').filter({ hasText: title }).first().click()
  await page.getByRole('heading', { name: title, exact: true }).waitFor()
  await page.getByRole('navigation', { name: 'Bot Office 專案分頁' }).getByRole('button', { name: '專案規劃', exact: true }).click()
}

async function colorsOf(frame) {
  return frame.locator('header.hero').evaluate(el => {
    const hero = getComputedStyle(el)
    const page = getComputedStyle(el.ownerDocument.body)
    const card = getComputedStyle(el.ownerDocument.querySelector('.card.summary'))
    const th = getComputedStyle(el.ownerDocument.querySelector('th'))
    return {
      headerBg: hero.backgroundColor,
      headerColor: hero.color,
      pageBg: page.backgroundColor,
      cardBg: card.backgroundColor,
      thBg: th.backgroundColor,
      thColor: th.color,
    }
  })
}

;(async () => {
  const report = { scenarios: [], colors: null, scroll: null, writes: [], external: [] }
  const desktop = await launch(1280, 900)
  await openPlan(desktop.page, '閱讀樣本')
  const frame = desktop.page.frameLocator('iframe.ao-plan-slate')
  await frame.getByRole('heading', { name: '一頁摘要', exact: true }).waitFor()
  const order = await frame.locator('h2').evaluateAll(nodes => nodes.map(node => node.textContent))
  assert.equal(order[0], '一頁摘要')
  assert.ok(order.indexOf('一頁摘要') < order.indexOf('修訂說明'))
  assert.ok(order.includes('依據'))
  await frame.getByText('青石摘要句').first().waitFor()
  await frame.getByText('子項保留').first().waitFor()
  const codes = await frame.locator('pre.source code').evaluateAll(nodes => nodes.map(node => node.textContent))
  assert.deepEqual(codes, [
    '{\n  "freedomIndex": { "deprecated": true, "display": false }\n}\n',
    'def keep(indent):\n    return "<script>alert(1)</script>"\n',
  ])
  const frameHtml = await frame.locator('body').evaluate(el => el.ownerDocument.documentElement.outerHTML)
  assert.equal(frameHtml.includes('<script'), false)
  assert.equal(frameHtml.includes('onerror='), false)
  await frame.getByText('隔離測試全綠而且備份存在').first().waitFor()
  report.colors = await colorsOf(frame)
  assert.deepEqual(report.colors, {
    headerBg: 'rgb(22, 43, 75)',
    headerColor: 'rgb(255, 255, 255)',
    pageBg: 'rgb(242, 245, 249)',
    cardBg: 'rgb(255, 255, 255)',
    thBg: 'rgb(238, 243, 249)',
    thColor: 'rgb(53, 81, 113)',
  })
  report.scroll = await frame.locator('.scroll').first().evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
  assert.ok(report.scroll.scrollWidth > report.scroll.clientWidth, JSON.stringify(report.scroll))
  report.docScroll = await frame.locator('body').evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
  assert.ok(report.docScroll.scrollWidth <= report.docScroll.clientWidth + 1, JSON.stringify(report.docScroll))
  assert.equal(await frame.locator('select').count(), 0)
  assert.equal(await desktop.page.locator('.ao-plan-shell select').count(), 0)
  assert.equal(await desktop.page.locator('[aria-label="文件版本"]').count(), 0)
  const hostOverflow = await desktop.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  assert.equal(hostOverflow, true)
  report.hero = await frame.locator('header.hero').evaluate(el => {
    const view = el.ownerDocument.defaultView
    return { height: el.getBoundingClientRect().height, view: view.innerHeight }
  })
  await frame.getByText('文件記載／非即時').first().waitFor()
  await frame.getByText('規劃值').first().waitFor()
  assert.ok(report.hero.height < report.hero.view * 0.55, JSON.stringify(report.hero))
  report.hostScroll = await desktop.page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }))
  assert.ok(report.hostScroll.scrollHeight <= report.hostScroll.clientHeight + 24, JSON.stringify(report.hostScroll))
  await desktop.page.screenshot({ path: shot('desktop-plan-1280.png') })
  await frame.locator('header.hero').screenshot({ path: shot('desktop-plan-header.png') })
  await frame.locator('nav.toc').screenshot({ path: shot('desktop-plan-nav.png') })
  await frame.locator('#summary').screenshot({ path: shot('desktop-plan-summary.png') })
  await frame.locator('.scroll').first().screenshot({ path: shot('desktop-plan-table.png') })
  const appendix = frame.locator('details').first()
  if (await appendix.count()) {
    await appendix.locator('summary').click()
    await appendix.screenshot({ path: shot('desktop-plan-appendix.png') })
  }
  const codeFit = await frame.locator('pre.source').evaluateAll(nodes => nodes.map(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })))
  assert.ok(codeFit.every(item => item.scrollWidth <= item.clientWidth + 1), JSON.stringify(codeFit))
  await frame.locator('pre.source').first().scrollIntoViewIfNeeded()
  await desktop.page.screenshot({ path: shot('desktop-code-json-page.png') })
  await frame.locator('pre.source').first().screenshot({ path: shot('desktop-code-json.png') })
  await frame.locator('pre.source').nth(1).scrollIntoViewIfNeeded()
  await desktop.page.screenshot({ path: shot('desktop-code-python-page.png') })
  await frame.locator('pre.source').nth(1).screenshot({ path: shot('desktop-code-python.png') })
  await frame.locator('.page').screenshot({ path: shot('desktop-plan-full.png') })
  await desktop.page.getByRole('button', { name: '成果與審查', exact: true }).click()
  await desktop.page.getByText('執行成果報告還沒有').waitFor()
  const visibleSlate = await desktop.page.locator('iframe.ao-plan-slate').evaluateAll(nodes => nodes.filter(node => {
    let el = node
    while (el) {
      const style = getComputedStyle(el)
      if (el.hidden || style.display === 'none' || style.visibility === 'hidden') return false
      el = el.parentElement
    }
    return true
  }).length)
  assert.equal(visibleSlate, 0)
  assert.equal(await desktop.page.locator('.ao-results iframe.ao-plan-slate').count(), 0)
  assert.equal(await desktop.page.locator('.ao-results').getByText('青石摘要句').count(), 0)
  assert.equal(await desktop.page.locator('.ao-results').getByText('deprecated').count(), 0)
  assert.equal(await desktop.page.locator('.ao-results').getByText('def keep').count(), 0)
  await desktop.page.screenshot({ path: shot('desktop-results-not-plan.png') })

  await openPlan(desktop.page, '缺文件')
  await desktop.page.getByRole('status').getByText('專案規劃書沒有登錄 Drive 文件。').waitFor()
  assert.equal(await desktop.page.locator('iframe.ao-plan-slate').count(), 0)
  await desktop.page.screenshot({ path: shot('desktop-missing.png') })

  await openPlan(desktop.page, '讀取失敗')
  await desktop.page.getByRole('alert').getByText('沒有讀取權限').waitFor()
  assert.equal(await desktop.page.locator('iframe.ao-plan-slate').count(), 0)
  await desktop.page.screenshot({ path: shot('desktop-read-error.png') })

  await openPlan(desktop.page, '截斷文件')
  await desktop.page.getByText('文件超過上限，以下為截斷內容。').waitFor()
  await desktop.page.frameLocator('iframe.ao-plan-slate').getByRole('heading', { name: '一頁摘要', exact: true }).waitFor()
  await desktop.page.screenshot({ path: shot('desktop-truncated.png') })

  if (p003Markdown) await captureReading(desktop.page, 'p003真來源', 'desktop-p003', '一頁摘要')
  await captureReading(desktop.page, '英文測試fixture', 'desktop-fixture', 'Purpose')

  report.writes = desktop.api.filter(([method]) => method !== 'GET')
  report.external = desktop.external
  assert.deepEqual(report.writes, [])
  assert.deepEqual(report.external, [])
  assert.ok(desktop.api.some(([method, url]) => method === 'GET' && url.includes('/drive-document?file_id=PlanDocRead0001')))
  assert.ok(desktop.api.some(([method, url]) => method === 'GET' && url.includes('/drive-document?file_id=FailDocRead0001')))
  await desktop.browser.close()

  const mobile = await launch(390, 844)
  await openPlan(mobile.page, '閱讀樣本')
  const mobileFrame = mobile.page.frameLocator('iframe.ao-plan-slate')
  await mobileFrame.getByRole('heading', { name: '一頁摘要', exact: true }).waitFor()
  const mobileScroll = await mobileFrame.locator('.scroll').first().evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
  assert.ok(mobileScroll.scrollWidth > mobileScroll.clientWidth, JSON.stringify(mobileScroll))
  const mobileDoc = await mobileFrame.locator('body').evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
  assert.ok(mobileDoc.scrollWidth <= mobileDoc.clientWidth + 1, JSON.stringify(mobileDoc))
  const mobileOverflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  assert.equal(mobileOverflow, true)
  await mobile.page.screenshot({ path: shot('mobile-plan-390.png') })
  await mobileFrame.locator('header.hero').screenshot({ path: shot('mobile-plan-header.png') })
  await mobileFrame.locator('nav.toc').screenshot({ path: shot('mobile-plan-nav.png') })
  await mobileFrame.locator('#summary').screenshot({ path: shot('mobile-plan-summary.png') })
  await mobileFrame.locator('.scroll').first().screenshot({ path: shot('mobile-plan-table.png') })
  await mobileFrame.locator('.timeline').screenshot({ path: shot('mobile-plan-timeline.png') })
  const mobileAppendix = mobileFrame.locator('details').first()
  if (await mobileAppendix.count()) {
    await mobileAppendix.locator('summary').click()
    await mobileAppendix.screenshot({ path: shot('mobile-plan-appendix.png') })
  }
  const mobileCodeFit = await mobileFrame.locator('pre.source').evaluateAll(nodes => nodes.map(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })))
  assert.ok(mobileCodeFit.every(item => item.scrollWidth <= item.clientWidth + 1), JSON.stringify(mobileCodeFit))
  await mobileFrame.locator('pre.source').first().scrollIntoViewIfNeeded()
  await mobile.page.screenshot({ path: shot('mobile-code-json-page.png') })
  await mobileFrame.locator('pre.source').first().screenshot({ path: shot('mobile-code-json.png') })
  await mobileFrame.locator('pre.source').nth(1).scrollIntoViewIfNeeded()
  await mobile.page.screenshot({ path: shot('mobile-code-python-page.png') })
  await mobileFrame.locator('pre.source').nth(1).screenshot({ path: shot('mobile-code-python.png') })
  report.mobileScroll = mobileScroll
  report.mobileWrites = mobile.api.filter(([method]) => method !== 'GET')
  assert.deepEqual(report.mobileWrites, [])
  report.mobileTabs = await assertShellTabs(mobile.page, 390, shot('mobile-plan-390-tabs.png'))
  report.mobileAnchors = await assertAnchors(mobile.page, '390-sample', name => shot(`mobile-plan-390-anchor-${name}`))
  await mobileFrame.getByText('文件記載／非即時').first().waitFor()
  await mobileFrame.getByText('規劃值').first().waitFor()
  if (p003Markdown) {
    await captureReading(mobile.page, 'p003真來源', 'mobile-p003', '一頁摘要')
    report.p003Anchors390 = await assertAnchors(mobile.page, '390-p003', name => shot(`mobile-p003-390-anchor-${name}`))
    await mobile.page.screenshot({ path: shot('mobile-p003-390-status.png') })
  }
  await captureReading(mobile.page, '英文測試fixture', 'mobile-fixture', 'Purpose')
  await mobile.browser.close()

  const narrow = await launch(320, 720)
  await openPlan(narrow.page, '閱讀樣本')
  const narrowFrame = narrow.page.frameLocator('iframe.ao-plan-slate')
  await narrowFrame.getByRole('heading', { name: '一頁摘要', exact: true }).waitFor()
  const narrowOverflow = await narrow.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  assert.equal(narrowOverflow, true)
  await narrow.page.screenshot({ path: shot('mobile-plan-320.png') })
  await narrowFrame.locator('nav.toc').screenshot({ path: shot('mobile-plan-320-nav.png') })
  await narrowFrame.locator('header.hero').screenshot({ path: shot('mobile-plan-320-header.png') })
  report.narrowTabs = await assertShellTabs(narrow.page, 320, shot('mobile-plan-320-tabs.png'))
  report.narrowAnchors = await assertAnchors(narrow.page, '320-sample', name => shot(`mobile-plan-320-anchor-${name}`))
  if (p003Markdown) {
    await captureReading(narrow.page, 'p003真來源', 'mobile-p003-320', '一頁摘要')
    report.p003Anchors320 = await assertAnchors(narrow.page, '320-p003', name => shot(`mobile-p003-320-anchor-${name}`))
    await narrow.page.screenshot({ path: shot('mobile-p003-320-status.png') })
  }
  await captureReading(narrow.page, '英文測試fixture', 'mobile-fixture-320', 'Purpose')
  report.narrowWrites = narrow.api.filter(([method]) => method !== 'GET')
  assert.deepEqual(report.narrowWrites, [])
  await narrow.browser.close()

  fs.writeFileSync(shot('qa.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
})().catch(error => {
  console.error(error)
  process.exit(1)
})
