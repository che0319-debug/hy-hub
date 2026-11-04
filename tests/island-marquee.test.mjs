import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deriveAttention, todoMarker } from '../src/life-island/worldData.js'
import { MARQUEE_INTERVAL_MS, advanceMarquee, buildMarqueeItems, marqueeCaption, runningStageText } from '../src/life-island/marquee.js'
import { PROJECT_STAGES } from '../src/lib/projectStages.mjs'

const miles = rows => rows.map(row => ({ id: row[0], name: row[0], status: row[1], ...(row[2] ? { step: row[2] } : {}) }))

test('跑馬燈：執行中取最前面的里程碑，完成排最後，沒有專案就是空', () => {
  assert.deepEqual(buildMarqueeItems(null), [])
  assert.deepEqual(buildMarqueeItems([]), [])
  const items = buildMarqueeItems([
    { id: 'done-1', title: '月報', stage: 'done', milestones: miles([['M1', '完成'], ['M2', '完成']]) },
    {
      id: 'run-1', title: '手套簡報', stage: 'running',
      milestones: miles([['M1', '完成'], ['M2', '完成'], ['M3', '完成'], ['M4', '執行中'], ['M5', '未開始'], ['M6', '執行中'], ['M7', '未開始'], ['M8', '未開始']]),
    },
    { id: 'ask-1', title: '補件卡', stage: 'hy_decision', milestones: miles([['M1', '完成'], ['M2', '未開始']]) },
    { id: 'plan-1', title: '新案子', stage: 'assigned' },
    { id: 'rev-1', title: '週報', stage: 'review', milestones: miles([['M1', '完成'], ['M2', '完成'], ['M3', '未開始'], ['M4', '未開始']]) },
    { title: '沒有編號', stage: 'running' },
  ])
  assert.deepEqual(items.map(item => item.id), ['run-1', 'ask-1', 'plan-1', 'rev-1', '', 'done-1'])
  assert.equal(items[0].line, '手套簡報 · M6 執行中 · 3/8')
  assert.equal(items[0].href, '/bot-office?project=run-1')
  assert.equal(items[1].stageText, '待你決定')
  assert.equal(items[1].progress, '1/2')
  assert.equal(items[2].line, '新案子 · 規劃中 · 0/0')
  assert.equal(items[3].stageText, '待審')
  assert.equal(items[3].progress, '2/4')
  assert.equal(items[4].href, '/bot-office')
  assert.equal(items[4].stageText, '執行中')
  assert.equal(items[5].stageText, '完成')
  assert.equal(items[5].line, '月報 · 完成 · 2/2')
})

test('跑馬燈：沒標執行中時用第一個未完成里程碑，並跳過規劃里程碑', () => {
  assert.equal(runningStageText([
    { id: 'M1', status: '完成' },
    { id: 'M2', status: '未開始' },
    { id: 'M5', status: '未開始' },
  ]), 'M2 執行中')
  assert.equal(runningStageText([{ id: 'M4', status: '執行中' }, { id: 'M9', status: '未開始' }]), 'M4 執行中')
  const items = buildMarqueeItems([{
    id: 'p/2',
    title: '川泱',
    stage: 'running',
    source: { milestones: [{ id: 'M0', kind: 'plan', status: '完成' }, { id: 'M1', status: '完成' }, { id: 'M2', status: '未開始' }, { id: 'M3', status: '未開始' }] },
  }])
  assert.equal(items[0].line, '川泱 · M2 執行中 · 1/3')
  assert.equal(items[0].href, '/bot-office?project=p%2F2')
})

test('個人待辦標記：只有待辦是藍點，和待你確認同時有則橘驚嘆號加小藍點', () => {
  const today = deriveAttention({ status: 'wait', todos: { overdue: 0, today: 1 } })
  assert.equal(today.level, 'todo')
  assert.equal(today.items[0].text, '今日待辦 1 件')
  assert.deepEqual(todoMarker(today), { alert: 'todo', todoDot: false })

  const overdue = deriveAttention({ status: 'wait', todos: { overdue: 2, today: 1 } })
  assert.equal(overdue.level, 'todo')
  assert.deepEqual(overdue.items.map(item => item.level), ['todo', 'todo'])
  assert.deepEqual(todoMarker(overdue), { alert: 'todo', todoDot: false })

  const office = deriveAttention({ status: 'you', office: { asks: 1 }, todos: { overdue: 0, today: 0 } })
  assert.deepEqual(todoMarker(office), { alert: 'you', todoDot: false })

  const both = deriveAttention({ status: 'you', office: { asks: 1, hyDecision: 0 }, todos: { overdue: 0, today: 1 } })
  assert.equal(both.level, 'you')
  assert.deepEqual(todoMarker(both), { alert: 'you', todoDot: true })

  const red = deriveAttention({ status: 'bad', todos: { overdue: 0, today: 1 } })
  assert.equal(red.level, 'bad')
  assert.deepEqual(todoMarker(red), { alert: 'bad', todoDot: true })
})

test('Bot Office 用現成的 ?project= 深連結，沒有 id 就回列表', () => {
  const page = readFileSync(new URL('../src/pages/BotOffice.jsx', import.meta.url), 'utf8')
  assert.match(page, /useSearchParams\(/)
  assert.match(page, /searchParams\.get\('project'\)/)
  const island = readFileSync(new URL('../src/pages/LifeIsland.jsx', import.meta.url), 'utf8')
  assert.match(island, /todoMarker/)
  assert.match(island, /ProjectMarquee/)
})

test('跑馬燈一次只秀一則，每 4 秒換下一個，暫停就停住', () => {
  assert.equal(MARQUEE_INTERVAL_MS, 4000)
  assert.equal(advanceMarquee(0, 3, false), 1)
  assert.equal(advanceMarquee(2, 3, false), 0)
  assert.equal(advanceMarquee(1, 3, true), 1)
  assert.equal(advanceMarquee(4, 3, true), 1)
  assert.equal(advanceMarquee(0, 1, false), 0)
  assert.equal(advanceMarquee(5, 0, false), 0)
  const items = buildMarqueeItems([
    { id: 'run-1', title: '手套簡報', stage: 'running', milestones: miles([['M4', '執行中']]) },
    { id: 'ask-1', title: '補件卡', stage: 'hy_decision', milestones: miles([['M1', '完成'], ['M2', '未開始']]) },
  ])
  assert.equal(items.length, 2)
  assert.equal(marqueeCaption(items[0]), '▶\uFE0E 手套簡報 M4 執行中 0/1')
  assert.equal(marqueeCaption(items[advanceMarquee(0, items.length, false)]), '▶\uFE0E 補件卡 待你決定 1/2')
  assert.doesNotMatch(marqueeCaption(items[0]), /補件卡/)
})

test('頂欄沒有今日待辦晶片，圖例與跑馬燈在同一列', () => {
  const island = readFileSync(new URL('../src/pages/LifeIsland.jsx', import.meta.url), 'utf8')
  const marquee = readFileSync(new URL('../src/life-island/ProjectMarquee.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/life-island/life-island.css', import.meta.url), 'utf8')
  const status = island.slice(island.indexOf('function StatusBar'), island.indexOf('function InfoPanel'))
  assert.doesNotMatch(island, /li-chip-today/)
  assert.doesNotMatch(status, /今日待辦\s*<b>/)
  assert.doesNotMatch(island, /<details[^>]*li-legend/)
  assert.match(status, /待你確認/)
  assert.match(status, /<Legend \/>/)
  assert.match(status, /<ProjectMarquee/)
  assert.equal((island.match(/<ProjectMarquee/g) || []).length, 1)
  assert.match(island, /\['assigned', 'running', 'review', 'hy_decision', 'done'\]/)
  assert.deepEqual(
    ['assigned', 'running', 'review', 'hy_decision', 'done'].map(key => PROJECT_STAGES.find(stage => stage.key === key).label),
    ['規劃中', '執行中', '待審', '待你決定', '完成'],
  )
  assert.match(island, /useMaxWidth\(480\)/)
  assert.equal((marquee.match(/<Link/g) || []).length, 1)
  assert.doesNotMatch(marquee, /\.map\(/)
  assert.doesNotMatch(marquee, /li-marquee-track/)
  assert.match(marquee, /MARQUEE_INTERVAL_MS/)
  assert.match(marquee, /advanceMarquee/)
  assert.match(marquee, /marqueeCaption/)
  assert.match(marquee, /onMouseEnter/)
  assert.match(marquee, /onFocus/)
  assert.match(css, /\.li-marquee\s*\{[^}]*flex:\s*1\s+1\s+auto/)
  assert.match(css, /\.li-marquee\s*\{[^}]*min-width:\s*0/)
  assert.match(css, /\.li-marquee\s*\{[^}]*overflow:\s*hidden/)
  assert.match(css, /\.li-marquee\s*\{[^}]*white-space:\s*nowrap/)
  assert.match(css, /\.li-marquee\s*\{[^}]*text-overflow:\s*ellipsis/)
  assert.match(css, /max-width:\s*480px/)
  assert.doesNotMatch(css, /li-marquee-scroll/)
  assert.match(readFileSync(new URL('../src/life-island/worldData.js', import.meta.url), 'utf8'), /今日待辦/)
})
