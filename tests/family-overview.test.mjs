import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../public/family-dashboard.html', import.meta.url), 'utf8')
const js = readFileSync(new URL('../public/family-overview-tab.js', import.meta.url), 'utf8')

test('家庭 Dashboard 有家庭總覽分頁，預設仍開任務清單', () => {
  assert.match(html, /data-tab="overview"/)
  assert.match(html, /id="tab-overview"/)
  assert.match(html, /🏠 家庭總覽/)
  assert.match(html, /src="\.\/family-overview-tab\.js"/)
  assert.match(html, /family=Noto\+Serif\+TC:wght@700/)
  // 預設 active 仍是任務清單
  assert.match(html, /<div class="tab active" data-tab="tasks">/)
  assert.doesNotMatch(html, /<div class="tab active" data-tab="overview">/)
  assert.match(html, /<div class="tab-content active" id="tab-tasks">/)
  assert.match(html, /<div class="tab-content" id="tab-overview">/)
})

test('支援 ?tab=overview，總覽分頁打開時隱藏儲存鈕', () => {
  assert.match(html, /get\('tab'\)/)
  assert.match(html, /tabName === 'overview'/)
  assert.match(html, /dataset\.tab === 'overview'/)
  assert.match(html, /save\.style\.display/)
  assert.match(html, /loadFamilyOverview/)
})

test('總覽腳本從 API 讀資料，未登入與讀不到有提示，不用寫死近況', () => {
  assert.match(js, /window\.renderFamilyOverview\s*=/)
  assert.match(js, /window\.showFamilyOverviewMessage\s*=/)
  assert.match(js, /window\.loadFamilyOverview\s*=/)
  assert.match(js, /\/api\/family-overview/)
  assert.match(js, /尚未登入，無法載入家庭總覽/)
  assert.match(js, /目前還沒有家庭總覽資料。/)
  assert.match(js, /現在讀不到家庭總覽，請稍後再試。/)
  assert.match(js, /reason==='not_found'|reason === 'not_found'/)
  assert.match(js, /function esc\s*=|const esc\s*=/)
  assert.doesNotMatch(js, /X-Read-Secret/)
  assert.doesNotMatch(js, /var ACCESS_TOKEN/)
  // 稱呼只允許這組，不寫死示意近況金句
  assert.match(js, /'大寶'/)
  assert.match(js, /'小寶'/)
  assert.match(js, /'EVA'/)
  assert.doesNotMatch(js, /這次 Costco 終於沒買太多/)
  assert.doesNotMatch(js, /段考考完想去吃燒肉/)
})

test('總覽腳本有來源標示與手機樣式', () => {
  assert.match(js, /class="ex"/)
  assert.match(js, /class="real"/)
  assert.match(js, /class="tbd"/)
  assert.match(js, /年齡？/)
  assert.match(js, /@media\(max-width:640px\)/)
  assert.match(js, /\.fo-root/)
  assert.doesNotMatch(js, /Noto Sans CJK/)
})

test('?tab=overview 會等總覽腳本載入後才標成已載入', () => {
  const src = html.indexOf('src="./family-overview-tab.js"')
  const flag = html.indexOf('var overviewLoaded')
  assert.ok(src >= 0 && flag >= 0 && src < flag, 'family-overview-tab.js 必須在分頁 IIFE 之前載入')
  assert.match(html, /!overviewLoaded && typeof loadFamilyOverview === 'function'/)
  assert.doesNotMatch(html, /overviewLoaded = true;\s*if \(typeof loadFamilyOverview/)
})

test('總覽桌機左右拉滿，內文與小註字級放大', () => {
  assert.match(js, /\.fo-root \.wrap\{[^}]*max-width:\s*none/)
  assert.doesNotMatch(js, /\.fo-root \.wrap\{[^}]*max-width:\s*1200px/)
  assert.match(js, /\.fo-root\{[^}]*font-size:\s*16px/)
  assert.match(js, /\.fo-root \.caption\{font-size:\s*13px/)
  assert.match(js, /\.fo-root \.ex\{[^}]*font-size:\s*13px/)
  assert.match(js, /\.fo-root \.life text\{[^}]*font-size:\s*14px/)
  assert.match(js, /\.fo-root \.life \.marker\{[^}]*font-size:\s*13px/)
  assert.match(js, /\.fo-root \.slot\{[^}]*font-size:\s*13px/)
  assert.match(js, /\.fo-root h1\{[^}]*font-size:\s*42px/)
  // 手機不把表格縮到 13px 以下
  assert.match(js, /table\.chk\{[^}]*min-width:\s*640px/)
  assert.doesNotMatch(js, /@media\(max-width:640px\)\{[^}]*ch-block table\{font-size:\s*11px/)
})
