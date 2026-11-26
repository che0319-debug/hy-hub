import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const js = readFileSync(new URL('../public/radar-tab-950157.js', import.meta.url), 'utf8')
const css = readFileSync(new URL('../public/radar-tab-950157.css', import.meta.url), 'utf8')

function load(href = 'https://che0319-debug.github.io/hy-hub/950157-dashboard.html?tab=radar') {
  const url = new URL(href)
  const sessionStorage = {
    _d: {},
    getItem(k) { return this._d[k] || null },
    setItem(k, v) { this._d[k] = String(v) },
  }
  const document = {
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: () => {},
  }
  const window = { API: 'https://hy-agent-v2.onrender.com', GET_HEADERS: { Authorization: 'Bearer test-token' } }
  const location = { hostname: url.hostname, href, search: url.search, origin: url.origin }
  const ctx = {
    window,
    document,
    location,
    sessionStorage,
    history: { replaceState() {} },
    URL,
    URLSearchParams,
    Set,
    Map,
    Object,
    Array,
    JSON,
    String,
    Boolean,
    Number,
    encodeURIComponent,
    decodeURIComponent,
    console,
    fetch: async () => ({ ok: false, json: async () => null }),
  }
  ctx.window.location = location
  ctx.window.document = document
  ctx.window.sessionStorage = sessionStorage
  ctx.window.history = ctx.history
  ctx.globalThis = ctx
  vm.createContext(ctx)
  try {
    vm.runInContext(js, ctx)
  } catch (err) {
    err.message = 'radar-tab.js failed to load: ' + err.message
    throw err
  }
  return ctx.window
}

function tactileAxis(extra = {}) {
  const pending = []
  for (let i = 1; i <= 19; i++) {
    pending.push({
      id: `kc-tactile-${String(i).padStart(2, '0')}`,
      axis_id: 'ax-tactile',
      text: i === 19 ? '專利分類 / CPC G06F3/016' : `候選 ${i}`,
      decision: 'pending',
      proposed_by: 'Tiffany',
      scan_hold: i === 19,
      scan_hold_reason: i === 19 ? '待核對、暫不掃' : '',
    })
  }
  return {
    id: 'ax-tactile',
    name: '觸覺回饋（含體感服飾 A+）',
    display_name: '觸覺回饋（含體感服飾 A+）',
    owner_bot: 'Tiffany',
    office_project: null,
    office_project_note: 'Office id ??',
    keywords: [],
    keyword_candidates: pending,
    candidate_pending: 19,
    candidate_adopted: 0,
    candidate_hold: 1,
    candidate_total: 19,
    scan_keyword_count: 0,
    weekly_item_limit: '??',
    scan_display: '每週二 10:00',
    open_signals: 0,
    new_news: 0,
    ...extra,
  }
}

test('正式頁採用網址走後端 API，並帶登入標頭', () => {
  const ctx = load()
  assert.equal(ctx.RadarTab.isLocalPreview(), false)
  assert.equal(ctx.RadarTab.adoptApiUrl(), 'https://hy-agent-v2.onrender.com/api/radar/keywords/adopt')
  assert.equal(ctx.RadarTab.radarApiUrl(), 'https://hy-agent-v2.onrender.com/api/radar/feed')
  const headers = ctx.RadarTab.radarAuthHeaders({ 'Content-Type': 'application/json', 'X-Radar-Actor': 'Tiffany' })
  assert.equal(headers.Authorization, 'Bearer test-token')
  assert.equal(headers['X-Radar-Actor'], 'Tiffany')
  assert.match(js, /\/api\/radar\/keywords\/adopt/)
  assert.doesNotMatch(js, /isLocalPreview\(\) && !hold/)
})

test('每組候選在正式頁也有採用／取消採用，暫不掃有標示', () => {
  const ctx = load()
  const ax = tactileAxis()
  const pending = ctx.RadarTab.candidateCard(ax.keyword_candidates[0], ax)
  assert.match(pending, /採用/)
  assert.match(pending, /由 HY 採用/)
  assert.match(pending, /data-actor="Tiffany"/)
  assert.doesNotMatch(pending, /取消採用/)
  const held = ctx.RadarTab.candidateCard(ax.keyword_candidates[18], ax)
  assert.match(held, /待核對、暫不掃/)
  assert.match(held, /is-hold/)
  assert.match(held, /採用/)
  const adopted = ctx.RadarTab.candidateCard({
    ...ax.keyword_candidates[0],
    decision: 'adopted',
    adopted_by: 'Tiffany',
    adopted_at: '2026-11-25T07:00:00+08:00',
  }, ax)
  assert.match(adopted, /取消採用/)
  assert.match(adopted, /已採用/)
  assert.doesNotMatch(adopted, />採用</)
})

test('還有 N 組可展開與收合，並顯示將掃描組數', () => {
  const ctx = load()
  const ax = tactileAxis()
  const data = { axes: [ax], news: [], radar: [], alerts: [], deadlines: [], counts: { news: 0, radar: 0, alerts: 0, deadlines: 0 }, message: '', schedule_note: '每週二 10:00 只掃已採用的關鍵字' }
  const collapsed = ctx.RadarTab.renderAxis(ax, data, { axis: 'all', rel: 'mid', kind: 'all' })
  assert.match(collapsed, /將掃描 0 組/)
  assert.match(collapsed, /還有 14 組待採用候選/)
  assert.match(collapsed, /data-expand-cands="ax-tactile"/)
  assert.equal((collapsed.match(/class="radar-cand/g) || []).length, 5) // 1 hold + 4 pending
  ctx.RadarTab.expandedAxes.add('ax-tactile')
  const opened = ctx.RadarTab.renderAxis(ax, data, { axis: 'all', rel: 'mid', kind: 'all' })
  assert.match(opened, /收合候選/)
  assert.doesNotMatch(opened, /還有 14 組/)
  assert.equal((opened.match(/class="radar-cand/g) || []).length, 19)
  const after = tactileAxis({
    keywords: ['候選 1'],
    scan_keyword_count: 1,
    candidate_adopted: 1,
    candidate_pending: 18,
    keyword_candidates: tactileAxis().keyword_candidates.map((c, i) => i === 0 ? { ...c, decision: 'adopted', adopted_by: 'Tiffany' } : c),
  })
  const adoptedHtml = ctx.RadarTab.renderAxis(after, { ...data, axes: [after] }, { axis: 'all', rel: 'mid', kind: 'all' })
  assert.match(adoptedHtml, /將掃描 1 組/)
  assert.match(adoptedHtml, /已採用 1 組/)
  assert.match(adoptedHtml, /取消採用/)
})

test('本機預覽採用網址維持相對路徑', () => {
  const ctx = load('http://127.0.0.1:8765/950157-dashboard.html?tab=radar')
  assert.equal(ctx.RadarTab.isLocalPreview(), true)
  assert.equal(ctx.RadarTab.adoptApiUrl(), '/api/radar/keywords/adopt')
})

test('樣式有暫不掃與將掃描標記', () => {
  assert.match(css, /\.radar-cand\.is-hold/)
  assert.match(css, /\.radar-scan-count/)
})
