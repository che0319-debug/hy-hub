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

const state = {
  updated: '2026-11-07T09:00:00+08:00',
  islands: [{ id: 'company', name: '公司' }],
  buildings: [
    { id: 'p-read', title: '閱讀樣本', island: 'company', stage: 'assigned', executor: 'grok-build', goal: '只改呈現。', plan: { version: 2, status: 'draft', doc_url: 'https://docs.google.com/document/d/PlanDocRead0001/edit' } },
    { id: 'p-miss', title: '缺文件', island: 'company', stage: 'assigned', executor: 'grok-build', goal: '沒有登錄文件。', plan: { version: 1, status: 'draft' } },
    { id: 'p-fail', title: '讀取失敗', island: 'company', stage: 'assigned', executor: 'grok-build', goal: '讀取會失敗。', plan: { version: 2, status: 'draft', doc_url: 'https://docs.google.com/document/d/FailDocRead0001/edit' } },
    { id: 'p-trunc', title: '截斷文件', island: 'company', stage: 'assigned', executor: 'grok-build', goal: '文件超過上限。', plan: { version: 2, status: 'draft', doc_url: 'https://docs.google.com/document/d/TruncDocRead001/edit' } },
  ],
  decisions: [],
}
const index = { updated: state.updated, cards: [] }

function documentBody(fileId) {
  if (fileId === 'PlanDocRead0001') return { status: 200, body: { file_id: fileId, name: '閱讀樣本規劃書', markdown: planMarkdown, truncated: false } }
  if (fileId === 'TruncDocRead001') return { status: 200, body: { file_id: fileId, name: '截斷文件', markdown: planMarkdown, truncated: true } }
  if (fileId === 'FailDocRead0001') return { status: 403, body: { error: 'document_forbidden', reason: '測試用拒絕' } }
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
  await frame.getByText('青石摘要句').waitFor()
  await frame.getByText('子項保留').waitFor()
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
    headerBg: 'rgb(238, 245, 252)',
    headerColor: 'rgb(53, 85, 117)',
    pageBg: 'rgb(216, 222, 230)',
    cardBg: 'rgb(255, 255, 255)',
    thBg: 'rgb(238, 245, 252)',
    thColor: 'rgb(53, 85, 117)',
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
  await desktop.page.screenshot({ path: shot('desktop-plan-1280.png') })
  await frame.locator('header.hero').screenshot({ path: shot('desktop-plan-header.png') })
  await frame.locator('#summary').screenshot({ path: shot('desktop-plan-summary.png') })
  await frame.locator('.scroll').first().screenshot({ path: shot('desktop-plan-table.png') })
  const codeFit = await frame.locator('pre.source').evaluateAll(nodes => nodes.map(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })))
  assert.ok(codeFit.every(item => item.scrollWidth <= item.clientWidth + 1), JSON.stringify(codeFit))
  await frame.locator('pre.source').first().scrollIntoViewIfNeeded()
  await desktop.page.screenshot({ path: shot('desktop-code-json-page.png') })
  await frame.locator('pre.source').first().screenshot({ path: shot('desktop-code-json.png') })
  await frame.locator('pre.source').nth(1).scrollIntoViewIfNeeded()
  await desktop.page.screenshot({ path: shot('desktop-code-python-page.png') })
  await frame.locator('pre.source').nth(1).screenshot({ path: shot('desktop-code-python.png') })
  await frame.locator('.wrap').screenshot({ path: shot('desktop-plan-full.png') })
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
  await mobileFrame.locator('#summary').screenshot({ path: shot('mobile-plan-summary.png') })
  await mobileFrame.locator('.scroll').first().screenshot({ path: shot('mobile-plan-table.png') })
  await mobileFrame.locator('.timeline').screenshot({ path: shot('mobile-plan-timeline.png') })
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
  await mobile.browser.close()

  fs.writeFileSync(shot('qa.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
})().catch(error => {
  console.error(error)
  process.exit(1)
})
