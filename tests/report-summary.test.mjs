import test from 'node:test'
import assert from 'node:assert/strict'
import { reportSummaryLines } from '../src/lib/botOfficeView.mjs'
import { composeReportSummary, extractSummarySection, isMilestoneDone, parseReportSummary, projectSummaryChrome, reportSummaryStatus, SUMMARY_ITEM_LIMIT } from '../src/lib/reportSummary.mjs'
import { isMilestoneDone as viewMilestoneDone } from '../src/lib/botOfficeView.mjs'

const rich = `<h1>報告</h1><section class="focus"><h2>一頁摘要：現在怎樣、接下來做什麼</h2>
<p><span class="tag done">規劃 v1.2 已核准</span><span class="tag you">執行前待辦 4 件</span><span class="tag wait">M1–M3 尚未開工</span></p>
<div class="grid"><div class="metric"><b>10,080</b><span>第一年架站固定費（元），≤ 3 萬</span></div><div class="metric"><b>0</b><span>M1–M3 支出（元）</span></div></div>
<p><strong>結論：規劃已核准，可以開始文件工作。</strong></p>
<ul>
<li><strong>推薦路線</strong>：WACA 入門版。</li>
<li><strong>接下來</strong>：先做 M1。</li>
</ul></section><h2>其他</h2><ul><li>不要</li></ul><script>parent.__unsafe=true</script>`

const project = {
  stageLabel: '執行中', tone: 'ai', source: { plan_revision: '1.2', plan_state: 'APPROVED' },
  followUps: [{ status: 'open' }, { status: 'open' }, { status: 'done' }],
  decisions: [{ id: 'd1' }],
}
const milestones = [{ id: 'M1', status: 'open' }, { id: 'M2', status: '' }, { id: 'M3', status: '未開工' }]

test('rich report summary keeps tags, metrics, conclusion and bold leads', () => {
  const parsed = parseReportSummary(rich)
  assert.equal(parsed.title, '一頁摘要：現在怎樣、接下來做什麼')
  assert.deepEqual(parsed.badges.map(badge => badge.text), ['規劃 v1.2 已核准', '執行前待辦 4 件', 'M1–M3 尚未開工'])
  assert.deepEqual(parsed.badges.map(badge => badge.tone), ['done', 'you', 'wait'])
  assert.deepEqual(parsed.metrics, [
    { value: '10,080', label: '第一年架站固定費（元），≤ 3 萬' },
    { value: '0', label: 'M1–M3 支出（元）' },
  ])
  assert.equal(parsed.conclusion, '規劃已核准，可以開始文件工作。')
  assert.deepEqual(parsed.items, [
    { lead: '推薦路線', text: 'WACA 入門版。' },
    { lead: '接下來', text: '先做 M1。' },
  ])
  assert.equal(parsed.items.some(item => item.text.includes('不要')), false)
})

test('live badges replace frozen report badges and keep report numbers', () => {
  const running = [
    { id: 'M1', status: 'running' },
    ...Array.from({ length: 7 }, (_, index) => ({ id: `M${index + 2}`, status: 'open' })),
  ]
  const live = {
    stageLabel: '執行中', tone: 'ai', source: { plan_revision: '1.2', plan_state: 'APPROVED' },
    followUps: [{ status: 'open' }, { status: 'open' }, { status: 'open' }, { status: 'open' }],
    decisions: [{ id: 'a' }, { id: 'b' }],
    cards: { outputs: [
      { type: 'review', isReview: true, title: '審查不該當產出', createdAt: '2026-10-30' },
      { type: 'output', title: '平台選型複核', createdAt: '2026-10-20' },
    ] },
  }
  const view = composeReportSummary({ html: rich, project: live, milestones: running })
  assert.deepEqual(view.badges.map(badge => badge.text), [
    '階段 執行中', '里程碑 0／8', 'M1 執行中', '待你決定 2 件', '執行前待辦 4 件', '規劃 v1.2 已核准', '最新產出 平台選型複核',
  ])
  assert.equal(view.badges.some(badge => badge.text.includes('尚未開工')), false)
  assert.equal(view.metrics[0].value, '10,080')
  assert.equal(view.metrics.some(metric => metric.label === '里程碑完成'), false)
  assert.equal(view.conclusion, '規劃已核准，可以開始文件工作。')
  assert.equal(view.items[0].lead, '推薦路線')
})

test('plain summary lines use live badges, keep the list, and do not invent numbers or a conclusion', () => {
  const html = '<h2>一頁摘要：現在怎樣、你要做什麼</h2><ul><li>推薦路線：WACA 入門版。</li><li>這句沒有引導詞</li><li>七</li></ul>'
  const view = composeReportSummary({ html, project, milestones })
  assert.deepEqual(view.badges.map(badge => badge.text), ['階段 執行中', '里程碑 0／3', '待你決定 1 件', '執行前待辦 2 件', '規劃 v1.2 已核准'])
  assert.deepEqual(view.metrics, [])
  assert.equal(view.conclusion, '')
  assert.deepEqual(view.items[0], { lead: '推薦路線', text: 'WACA 入門版。' })
  assert.deepEqual(view.items[1], { lead: '', text: '這句沒有引導詞' })
  assert.equal(reportSummaryLines(html).length, 3)
})

test('missing project fields do not create empty cards', () => {
  const view = composeReportSummary({
    html: '<h2>一頁摘要</h2><p>只有一句話。</p>',
    project: { followUps: [], decisions: [], stageLabel: '', cards: { outputs: [] } },
    milestones: [],
  })
  assert.deepEqual(view.badges, [])
  assert.deepEqual(view.metrics, [])
  assert.equal(view.conclusion, '')
  assert.deepEqual(view.items, [{ lead: '', text: '只有一句話。' }])
  assert.deepEqual(projectSummaryChrome(null, []), { badges: [] })
  const counted = projectSummaryChrome(
    { followUps: [], decisions: [], cards: { outputs: [{ type: 'output', title: '' }] } },
    [{ id: 'M1', status: 'open' }],
  )
  assert.deepEqual(counted.badges.map(badge => badge.text), ['里程碑 0／1', '產出 1 件'])
})

test('a conclusion line is pulled out and a running milestone is named', () => {
  const view = composeReportSummary({
    lines: ['結論：先做文件。', '推薦路線：備案 ShopStore。'],
    project: { stageLabel: '執行中' },
    milestones: [{ id: 'M1', status: 'running' }, { id: 'M2', status: 'done' }],
  })
  assert.equal(view.conclusion, '先做文件。')
  assert.deepEqual(view.items, [{ lead: '推薦路線', text: '備案 ShopStore。' }])
  assert.deepEqual(view.metrics, [])
  assert.equal(view.badges.some(badge => badge.text.includes('尚未開工')), false)
  assert.equal(view.badges.some(badge => badge.text === '里程碑 1／2'), true)
  assert.equal(view.badges.some(badge => badge.text === 'M1 執行中'), true)
})

test('summary status keeps loading, error, empty and ready apart', () => {
  assert.equal(reportSummaryStatus(null), 'loading')
  assert.equal(reportSummaryStatus({ status: 'ready', htmlStatus: 'loading' }), 'loading')
  assert.equal(reportSummaryStatus({ status: 'ready', htmlError: '讀取失敗' }), 'error')
  assert.equal(reportSummaryStatus({ status: 'empty', error: '原因' }), 'empty')
  assert.equal(reportSummaryStatus({ status: 'ready', html: '<h2>一頁摘要</h2>', htmlStatus: 'ready' }), 'ready')
})

test('report summary lines and the card share one cap and ignore scripts', () => {
  const html = '<h1>報告</h1><section><h2>一頁摘要：現在怎樣、你要做什麼</h2><ul><li>第一件</li><li><b>第二件</b></li><li>三</li><li>四</li><li>五</li><li>六</li><li>七</li></ul><script>parent.__unsafe=true</script></section><h2>其他</h2><ul><li>不要</li></ul>'
  const lines = reportSummaryLines(html)
  const parsed = parseReportSummary(html)
  assert.deepEqual(lines, ['第一件', '第二件', '三', '四', '五', '六', '七'])
  assert.deepEqual(parsed.items.map(item => item.text), lines)
  assert.equal(parsed.items.some(item => /unsafe|不要/.test(item.text)), false)
  const extra = Array.from({ length: SUMMARY_ITEM_LIMIT + 2 }, (_, index) => `<li>項目${index + 1}</li>`).join('')
  const capped = `<h2>一頁摘要</h2><ul>${extra}</ul><h2>其他</h2><ul><li>不要</li></ul>`
  assert.equal(reportSummaryLines(capped).length, SUMMARY_ITEM_LIMIT)
  assert.equal(parseReportSummary(capped).items.length, SUMMARY_ITEM_LIMIT)
  assert.equal(reportSummaryLines(capped).includes('不要'), false)
  assert.equal(reportSummaryLines(capped).at(-1), `項目${SUMMARY_ITEM_LIMIT}`)
})

test('a report with no summary keeps live badges and does not invent number cards', () => {
  const busy = {
    stageLabel: '執行中', tone: 'ai', source: { plan_revision: '9.9', plan_state: 'APPROVED' },
    followUps: [{ status: 'open' }, { status: 'open' }, { status: 'open' }, { status: 'open' }],
    decisions: [{ id: 'd1' }],
  }
  const rows = [{ id: 'M1', status: 'OPEN' }, { id: 'M2', status: 'open' }, { id: 'M3', status: '' }]
  const missing = composeReportSummary({ html: '<h1>報告</h1><h2>其他</h2><p>這不是摘要。</p>', project: busy, milestones: rows })
  assert.equal(missing.badges.some(badge => badge.text === '階段 執行中'), true)
  assert.equal(missing.badges.some(badge => badge.text === '里程碑 0／3'), true)
  assert.equal(missing.badges.some(badge => badge.text.includes('尚未開工') || badge.text.includes('執行中') && badge.text.startsWith('M')), false)
  assert.deepEqual(missing.metrics, [])
  assert.equal(missing.conclusion, '')
  assert.deepEqual(missing.items, [])
  const blank = composeReportSummary({
    html: '<h2>一頁摘要：現在怎樣、你要做什麼</h2><p> </p><h2>里程碑</h2><p>M1 已開工</p>',
    lines: ['推薦路線：不該從純文字回填'],
    project: busy,
    milestones: rows,
  })
  assert.equal(blank.badges.some(badge => badge.text === '規劃 v9.9 已核准'), true)
  assert.deepEqual(blank.metrics, [])
  assert.equal(blank.conclusion, '')
  assert.deepEqual(blank.items, [])
  assert.equal(blank.metrics.length || blank.conclusion || blank.items.length, 0)
})

test('inline status tags are removed before a paragraph or item is kept', () => {
  const paragraph = `<h2>一頁摘要：現在怎樣、接下來做什麼</h2>
    <p><span class="tag done">M1 已核准</span><span class="tag info">M2 內部整理中</span>HY 已於 2026-10-23 正式覆核。</p>`
  const prose = parseReportSummary(paragraph)
  assert.deepEqual(prose.badges.map(badge => badge.text), ['M1 已核准', 'M2 內部整理中'])
  assert.deepEqual(prose.items, [{ lead: '', text: 'HY 已於 2026-10-23 正式覆核。' }])
  const list = `<h2>一頁摘要</h2><ul><li><span class="tag done">完成</span>  規劃已過 3 輪。</li><li>前 <span class="tag wait">待辦</span>  後</li></ul>`
  const items = parseReportSummary(list).items
  assert.deepEqual(items, [
    { lead: '', text: '規劃已過 3 輪。' },
    { lead: '', text: '前 後' },
  ])
})

test('summary headings are only h1 through h4', () => {
  assert.equal(extractSummarySection('<p><b>一頁摘要：現在怎樣、你要做什麼</b>這段不該被吃進來</p><h2>其他</h2><p>不要</p>'), null)
  assert.equal(extractSummarySection('<p><strong>一頁摘要</strong>整份報告</p>'), null)
  const section = extractSummarySection('<h3>一頁摘要</h3><p>要</p><h2>其他</h2><p>不要</p>')
  assert.match(section.html, /要/)
  assert.equal(/不要/.test(section.html), false)
})

test('OPEN counts as not started and done statuses ignore case', () => {
  assert.equal(isMilestoneDone, viewMilestoneDone)
  assert.equal(isMilestoneDone({ status: 'DONE' }), true)
  assert.equal(isMilestoneDone({ status: 'Done' }), true)
  const chrome = projectSummaryChrome(null, [{ id: 'M1', status: 'OPEN' }, { id: 'M3', status: 'Not_Started' }])
  assert.deepEqual(chrome.badges.map(badge => badge.text), ['里程碑 0／2'])
  assert.equal(chrome.badges.some(badge => /執行中|尚未開工/.test(badge.text)), false)
})
