// 川泱商店階段截圖。本機 Vite + 假的 /api，不打真後端。
// 用法：CHROME_BIN=/usr/bin/google-chrome node tests/island-buildings-ui.cjs
const fs = require('fs')
const path = require('path')
const { chromium: pw } = require('playwright')

const out = process.env.ISLAND_BUILDINGS_DIR || '/workspace/build-packets/island-buildings'
const base = process.env.ISLAND_BUILDINGS_URL || 'http://127.0.0.1:5173'
fs.mkdirSync(out, { recursive: true })

const TITLES = ['選址', '招牌', '貨架', '進貨', '上架', '試賣', '結帳', '開幕']
// 線上里程碑狀態是自由文字，不是 running／pending。
const LIVE_STATUS = ['未開始（需另行核准動工）', '閘門後', '需要你', '規劃中', '等材料', '可驗收', '收尾', '開幕前']

function miles(spec) {
  const done = spec.done || 0
  return Array.from({ length: 8 }, (_, i) => {
    const id = 'M' + (i + 1)
    const status = i < done ? '完成' : LIVE_STATUS[i]
    let due = i < done ? '2026-01-01' : '2026-12-01'
    if (spec.overdue && i === done) due = '2020-01-01'
    const row = { id, title: TITLES[i], status, due }
    if (spec.gates) {
      row.depends_on = i === 0 ? [] : ['M' + i]
      row.ready = i <= done
    }
    return row
  })
}

function officeState(spec) {
  const shell = {
    updated: '2026-10-31T09:00:00+08:00',
    islands: [{ id: 'side', name: '金融島' }],
    buildings: [],
    decisions: [],
  }
  if (spec.empty) return shell
  return {
    ...shell,
    buildings: [{
      id: 'p-002',
      title: '川泱購物',
      island: 'side',
      stage: spec.stage,
      owner_bot: 'sam',
      executor: 'grok-build',
      milestones: miles(spec),
    }],
    decisions: spec.decision
      ? [{ id: 'd1', project: 'p-002', status: 'open', title: spec.decision }]
      : [],
  }
}

function officeIndex(spec) {
  if (!spec.output) return { updated: '2026-10-31T09:00:00+08:00', cards: [] }
  return {
    updated: '2026-10-31T09:00:00+08:00',
    cards: [{
      id: 'out-p002',
      project: 'p-002',
      type: 'output',
      title: '招牌草案',
      summary: '主色用橘',
      date: '2026-10-20',
      created_at: '2026-10-20T08:00:00+08:00',
    }],
  }
}

const shots = [
  { name: 'stage-assigned', stage: 'assigned', done: 0, wait: '已派', width: 1280, height: 900 },
  { name: 'stage-running', stage: 'running', done: 0, wait: '執行中', width: 1280, height: 900 },
  { name: 'stage-running-3of8', stage: 'running', done: 3, wait: '3／8', width: 1280, height: 900 },
  { name: 'stage-review', stage: 'review', done: 4, wait: '待審', width: 1280, height: 900 },
  { name: 'stage-decision', stage: 'hy_decision', done: 2, decision: '招牌要不要改成橘色', wait: '待你決定', width: 1280, height: 900 },
  { name: 'stage-overdue', stage: 'running', done: 0, overdue: true, wait: '逾期', width: 1280, height: 900 },
  { name: 'stage-done', stage: 'done', done: 8, wait: '完成', width: 1280, height: 900 },
  { name: 'card-running', stage: 'running', done: 0, gates: true, decision: '招牌要不要改成橘色', output: true, click: true, wait: '執行中', width: 1280, height: 900 },
  { name: 'card-mobile', stage: 'running', done: 0, gates: true, decision: '招牌要不要改成橘色', output: true, click: true, wait: '執行中', width: 390, height: 844 },
]

// v2：進行中卡片、測試用完工紀念、專案從清單消失後回到原本的川泱。SUITE=v2 才跑。
const v2Dir = process.env.ISLAND_BUILDINGS_V2_DIR || '/workspace/build-packets/island-buildings/v2'
const v2Shots = [
  { name: 'card-running', stage: 'running', done: 0, gates: true, decision: '招牌要不要改成橘色', output: true, click: true, wait: '執行中', slot: 'live', width: 1280, height: 900 },
  { name: 'memorial-building', empty: true, fixture: 'memorial', slot: 'memorial', width: 1280, height: 900 },
  { name: 'memorial-card', empty: true, fixture: 'memorial', slot: 'memorial', click: 'memorial', width: 1280, height: 900 },
  { name: 'deleted-slot', stage: 'running', done: 0, drop: true, slot: 'absent', width: 1280, height: 900 },
  { name: 'deleted-card', stage: 'running', done: 0, drop: true, slot: 'absent', click: 'static', width: 1280, height: 900 },
]

const chromeArgs = ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']

async function shoot(browser, spec, dir) {
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1 })
  await context.addInitScript(() => {
    const payload = { exp: Math.floor(Date.now() / 1000) + 3600, sub: 'hy' }
    sessionStorage.setItem('hy_life_os_access_token', btoa(JSON.stringify(payload)) + '.test')
  })
  const state = officeState(spec)
  const index = officeIndex(spec)
  let dropped = false
  await context.route('**/api/**', async route => {
    const req = route.request()
    const u = new URL(req.url())
    const headers = { 'Content-Type': 'application/json', 'X-Brain-Updated': state.updated }
    let data = {}
    if (u.pathname.endsWith('/api/auth/session') || u.pathname.endsWith('/api/auth/refresh')) data = { ok: true }
    else if (u.pathname.endsWith('/api/office/state')) data = (spec.drop && dropped) ? { ...state, buildings: [], decisions: [] } : state
    else if (u.pathname.endsWith('/api/office/index')) data = index
    else if (u.pathname.includes('memory-health')) data = { bots: {} }
    else if (u.pathname.includes('today-schedule')) data = { events: [] }
    else if (u.pathname.includes('dispatch-sessions')) data = []
    else if (u.pathname.includes('family-progress') || u.pathname.includes('sam-progress')) data = { _kanban: { projects: [] } }
    else if (u.pathname.includes('progress')) data = { projects: [] }
    else data = {}
    await route.fulfill({ status: 200, headers, body: JSON.stringify(data) })
  })
  await context.route('https://api.open-meteo.com/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"current":{"temperature_2m":22,"weather_code":1,"cloud_cover":10}}' }))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const q = new URLSearchParams({ focus: 'chuan' })
  if (spec.fixture) q.set('fixture', spec.fixture)
  await page.goto(base + '/#/life-island?' + q.toString(), { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: `
    @font-face { font-family: "Noto Sans TC"; src: local("Noto Sans CJK TC"), local("Noto Sans CJK JP"); font-weight: 100 900; }
    .li-map, .li-map-mini, .li-hint, .li-hud, .li-m-hud, .li-sign { display: none !important; }
  ` })
  if (spec.drop) {
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-slot="live"]')
      return !!(el && el.textContent && el.textContent.includes('執行中'))
    }, null, { timeout: 25000 })
    if (spec.click === 'static') {
      await page.getByRole('button', { name: /川泱購物/ }).click()
      await page.getByRole('link', { name: '到 Bot Office 看完整專案' }).waitFor()
    }
    dropped = true
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
    })
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-slot="absent"]')
      return !!(el && !el.classList.contains('li-label-project') && el.textContent.includes('川泱') && !el.textContent.includes('執行中'))
    }, null, { timeout: 25000 })
    if (spec.click === 'static') {
      await page.waitForFunction(() => {
        const card = document.querySelector('.li-float')
        if (!card) return false
        const text = card.textContent || ''
        return text.includes('購物事業（建設中）') && !text.includes('到 Bot Office') && !card.querySelector('a')
      }, null, { timeout: 10000 })
    }
  } else if (spec.slot) {
    await page.waitForFunction(slot => {
      const el = document.querySelector(`[data-slot="${slot}"]`)
      return !!(el && el.textContent)
    }, spec.slot, { timeout: 25000 })
  } else {
    await page.waitForFunction(text => {
      const el = document.querySelector('.li-label-project')
      return !!(el && el.textContent && el.textContent.includes('川泱') && el.textContent.includes(text))
    }, spec.wait, { timeout: 25000 })
  }
  const canvas = await page.locator('canvas').count()
  if (!canvas) throw new Error(spec.name + ' 沒有 WebGL canvas\n' + errors.join('\n'))
  await page.waitForTimeout(700)
  if (spec.click === true) {
    await page.getByRole('button', { name: /川泱購物/ }).click()
    await page.getByRole('link', { name: '到 Bot Office 看完整專案' }).waitFor()
    if (spec.gates) await page.getByText('可開工').first().waitFor()
    await page.waitForTimeout(500)
  }
  if (spec.click === 'memorial') {
    await page.getByRole('button', { name: /示範完工店/ }).click()
    const card = page.locator('[data-card="memorial"]')
    await card.waitFor()
    await card.getByText('完成日').waitFor()
    await card.getByText('2026-10-01', { exact: true }).waitFor()
    await card.getByText('這是測試用的完工紀念，不是川泱的正式資料。').waitFor()
    if (await card.getByRole('link', { name: '到 Bot Office 看完整專案' }).count()) throw new Error(spec.name + ' 紀念卡不該有 Bot Office 按鈕')
    if (await card.locator('.li-live-badges').count()) throw new Error(spec.name + ' 紀念卡不該有即時徽章')
    await page.waitForTimeout(400)
  }
  if (errors.length) throw new Error(spec.name + ' pageerror\n' + errors.join('\n'))
  await page.screenshot({ path: path.join(dir, spec.name + '.png') })
  await context.close()
  console.log('saved', spec.name)
}

;(async () => {
  const suite = process.env.SUITE || 'v1'
  const dir = suite === 'v2' ? v2Dir : out
  fs.mkdirSync(dir, { recursive: true })
  const pool = suite === 'v2' ? v2Shots : shots
  const only = process.env.ONLY
  const list = only ? pool.filter(spec => only.split(',').includes(spec.name)) : pool
  if (!list.length) throw new Error('no shot named ' + only)
  const browser = await pw.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || undefined,
    args: chromeArgs,
  })
  try {
    for (const spec of list) await shoot(browser, spec, dir)
  } finally {
    await browser.close()
  }
})().catch(e => { console.error(e); process.exit(1) })
