/* Isolated browser QA: intercept every external request, never write production. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

const base = process.env.DASH_BASE_URL || 'http://127.0.0.1:5173'
const out = process.env.DASH_SHOT_DIR
  ? path.resolve(process.env.DASH_SHOT_DIR)
  : path.resolve(__dirname, '../docs/quality/ui/dashboard-cards')
fs.mkdirSync(out, { recursive: true })

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
const [ty, tm, td] = today.split('-')
const todaySlash = `${ty}/${tm}/${td}`
const yest = new Date(`${today}T00:00:00+08:00`)
yest.setDate(yest.getDate() - 2)
const yestSlash = yest.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }).replace(/-/g, '/')
const futureSlash = `${ty}/12/18`
const todayChip = `${tm}/${td}`

function card(id, title, due, extra) {
  return Object.assign({
    id, title, due, description: '隔離假資料，不會寫入正式 API',
    execute_status: '', completed: false, completed_at: null,
  }, extra)
}

const progress950 = {
  last_updated: `${today}T00:00:00+08:00`,
  projects: [
    { id: 'FY117', name: 'FY117 新期程計畫', color: '#0052cc', milestones: [
      card('FY-today', '(追蹤) 今天到期樣本', todaySlash, { delegated_to_950157: false }),
      card('FY-over', '(執行) 逾期樣本', yestSlash, { delegated_to_950157: false }),
    ] },
    { id: 'Haptic', name: 'Haptic 年度計畫', color: '#006644', milestones: [
      card('HA-future', '(追蹤) 12月報', futureSlash, { delegated_to_950157: true }),
    ] },
  ],
}
const progressPersonal = {
  last_updated: `${today}T00:00:00+08:00`,
  projects: [
    { id: 'P_life', name: '完成 Agent Team', color: '#16a34a', milestones: [
      card('HY-today', '今天到期樣本', todaySlash, { delegated_to_hy: false }),
      card('HY-over', '逾期樣本', yestSlash, { delegated_to_hy: false }),
    ] },
    { id: 'P_fun', name: '休閒/成長', color: '#974f0c', milestones: [
      card('HY-future', '去吃一家新餐廳', futureSlash, { delegated_to_hy: true }),
    ] },
  ],
}
const progressFamily = {
  summary: { last_updated: `${today}T00:00:00+08:00` },
  _kanban: { last_updated: `${today}T00:00:00+08:00`, projects: [
    { id: 'P_規劃', name: '規劃', color: '#5243aa', milestones: [
      card('FA-today', '今天到期樣本', todaySlash, { delegated_to_family: false }),
    ] },
    { id: 'P_成員', name: '成員', color: '#0052cc', milestones: [
      card('FA-over', '逾期樣本', yestSlash, { delegated_to_family: false }),
      card('FA-future', '未來樣本', futureSlash, { delegated_to_family: true }),
    ] },
  ] },
}
const progressSam = {
  summary: { last_updated: `${today}T00:00:00+08:00` },
  _kanban: { last_updated: `${today}T00:00:00+08:00`, projects: [
    { id: 'P_coast', name: '副業1. 北海岸', color: '#974f0c', milestones: [
      card('SA-today', '今天到期樣本', todaySlash, { delegated_to_sam: false }),
      card('SA-over', '逾期樣本', yestSlash, { delegated_to_sam: false }),
    ] },
    { id: 'P_push', name: '推動中', color: '#006644', milestones: [
      card('SA-future', '上淼', futureSlash, { delegated_to_sam: true }),
    ] },
  ] },
  business_ops: { businesses: [], last_updated: '' },
}

const pages = [
  { name: '950157', url: '/950157-dashboard.html', shot: 'dash-950157.png', card: '.card', assign: '指派950157' },
  { name: 'personal', url: '/personal-dashboard.html', shot: 'dash-personal.png', card: '.card', assign: '交給助理' },
  { name: 'family', url: '/family-dashboard.html', shot: 'dash-family.png', card: '.kanban-card', assign: '交給小因' },
  { name: 'sam', url: '/sam-dashboard.html', shot: 'dash-sam.png', card: '.card', assign: '交給助理' },
]

;(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
  const writes = []
  const unexpected = []
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.route('**/*', async route => {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue()
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      writes.push(`${method} ${url.pathname}`)
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    }
    if (url.pathname.startsWith('/api/950157-progress')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(progress950) })
    }
    if (url.pathname.startsWith('/api/personal-progress')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(progressPersonal) })
    }
    if (url.pathname.startsWith('/api/personal-data')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ summary: { last_updated: `${today}T00:00:00+08:00` } }) })
    }
    if (url.pathname.startsWith('/api/family-progress')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(progressFamily) })
    }
    if (url.pathname.startsWith('/api/sam-progress')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(progressSam) })
    }
    if (url.hostname === 'cdnjs.cloudflare.com') {
      return route.fulfill({
        contentType: 'application/javascript',
        body: 'function Sortable(){return {destroy:function(){}};} Sortable.create=function(){return {destroy:function(){}};}; window.Sortable=Sortable;',
      })
    }
    if (url.hostname === 'cdn.jsdelivr.net') {
      return route.fulfill({ contentType: 'application/javascript', body: 'window.Chart=function(){};' })
    }
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      return route.fulfill({ status: 200, body: '' })
    }
    unexpected.push(url.href)
    return route.fulfill({ contentType: 'application/json', body: '{"weeks":[],"projects":[],"items":[]}' })
  })

  let sawBlueToday = false
  for (const spec of pages) {
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', spec.name, e.message) })
    page.on('dialog', d => d.dismiss())
    await page.goto(base + spec.url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.locator(spec.card).first().waitFor({ timeout: 10000 })
    assert.equal(await page.locator('text=切換狀態').count(), 0)
    assert.equal(await page.locator('[title="完成此任務"]').count(), 0)
    assert.ok((await page.getByText(spec.assign).count()) > 0)
    const todayEl = page.locator('.due-chip.due-today').first()
    await todayEl.waitFor({ timeout: 5000 })
    assert.match(await todayEl.innerText(), new RegExp(todayChip.replace('/', '\\/')))
    const todayColor = await todayEl.evaluate(el => getComputedStyle(el).color)
    assert.equal(todayColor, 'rgb(0, 82, 204)')
    sawBlueToday = true
    const overdueEl = page.locator('.due-chip.overdue').first()
    await overdueEl.waitFor({ timeout: 5000 })
    assert.equal(await overdueEl.evaluate(el => getComputedStyle(el).color), 'rgb(222, 53, 11)')
    const dest = path.join(out, spec.shot)
    await page.screenshot({ path: dest, fullPage: true })
    console.log('shot', dest)
    assert.deepEqual(errors, [])
    await page.close()
  }

  await browser.close()
  assert.equal(writes.length, 0, 'isolated fake API must record 0 writes, got ' + JSON.stringify(writes))
  assert.ok(sawBlueToday, 'need at least one today-due blue chip')
  console.log('OK writes=0 pages=4 today=', today)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
