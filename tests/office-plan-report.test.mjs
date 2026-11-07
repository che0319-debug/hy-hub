import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { OFFICE_TABS, TAB_NOTES } from '../src/lib/aiOffice.mjs'
import { planDocumentHtml, stripImplementationBlocks, executionReportReviews } from '../src/lib/planHtml.mjs'
import { meetingConversationOrder } from '../src/lib/meetingThread.mjs'
import { latestPlanDocument, canonicalOfficeDocuments } from '../src/lib/officeDocuments.mjs'
import { REPORT_FRAME } from '../src/lib/botOfficeView.mjs'

const doc = id => `https://docs.google.com/document/d/${id}/edit`

test('top tab is 專案規劃 and the other four project tabs stay', () => {
  assert.deepEqual(OFFICE_TABS.map(item => item[1]), ['概況', '會議室', '專案規劃', '成果與審查', '工作日誌'])
  assert.match(TAB_NOTES.execution, /完整規劃書/)
  assert.match(TAB_NOTES.outputs, /執行成果/)
  assert.match(TAB_NOTES.meeting, /最新/)
})

test('planning HTML keeps the milestone table and drops implementation code', () => {
  const markdown = [
    '# 專案規劃書',
    '',
    '合併前先備份。使用者說合併才上線。',
    '',
    '<script>alert(1)</script>',
    '',
    '## 里程碑',
    '',
    '| 代號 | 驗收 |',
    '| --- | --- |',
    '| M1 | 隔離測試全綠 |',
    '',
    '## 實作附錄',
    '',
    '```python',
    'def write_production():',
    '    return "do-not-show"',
    '```',
    '',
    '```json',
    '{"secret":"token"}',
    '```',
  ].join('\n')
  const html = planDocumentHtml(markdown)
  assert.match(html, /<h1>專案規劃書<\/h1>/)
  assert.match(html, /<h2>里程碑<\/h2>/)
  assert.match(html, /<td>隔離測試全綠<\/td>/)
  assert.match(html, /合併前先備份/)
  assert.equal(html.includes('實作附錄'), false)
  assert.equal(html.includes('write_production'), false)
  assert.equal(html.includes('do-not-show'), false)
  assert.equal(html.includes('"secret"'), false)
  assert.equal(html.includes('<script'), false)
  assert.match(html, /&lt;script&gt;/)
  assert.equal(stripImplementationBlocks(markdown).includes('write_production'), false)
})

test('results only keep execution reviews, not a plan-v review', () => {
  const bundle = canonicalOfficeDocuments({
    id: 'p',
    plan: { version: 3, doc_url: doc('PlanDoc000000001') },
    last_review: { target: 'plan-v3', verdict: 'PASS', report_file_id: 'ReviewPlan000001', at: '2026-11-06T05:00:00Z' },
    review_requests: [
      { report_file_id: 'ReviewPlan000001', result: { target: 'plan-v3', verdict: 'PASS', updated: '2026-11-06T05:00:00Z' } },
      { report_file_id: 'ReviewMile000001', result: { target: 'M1', verdict: 'PASS', must_fix: [], updated: '2026-11-07T01:00:00Z' } },
      { report_file_id: 'ReviewMileOld0001', result: { target: 'M1', verdict: 'FAIL', updated: '2026-11-06T01:00:00Z' } },
    ],
  }, {}, [])
  const shown = executionReportReviews(bundle.reviews)
  assert.deepEqual(shown.map(item => item.fileId), ['ReviewMile000001'])
  assert.equal(shown.some(item => item.target === 'plan-v3'), false)
  assert.equal(latestPlanDocument(bundle).version, 3)
  const empty = executionReportReviews(canonicalOfficeDocuments({
    id: 'q',
    plan: { version: 1, doc_url: doc('OnlyPlan00000001') },
    last_review: { target: 'plan-v1', verdict: 'PASS', report_file_id: 'OnlyReview000001', at: '2026-11-01T00:00:00Z' },
  }, {}, []).reviews)
  assert.deepEqual(empty, [])
})

test('meeting conversation is newest first and stable when timestamps tie', () => {
  const events = [
    { id: 'old', at: 10, text: '舊' },
    { id: 'same-a', at: 30, text: '先' },
    { id: 'new', at: 40, text: '新' },
    { id: 'same-b', at: 30, text: '後' },
    { id: 'none', text: '沒時間' },
  ]
  assert.deepEqual(meetingConversationOrder(events).map(item => item.id), ['new', 'same-a', 'same-b', 'old', 'none'])
  const reversed = [...events].reverse()
  const ordered = meetingConversationOrder(reversed)
  assert.equal(ordered[0].id, 'new')
  assert.deepEqual(ordered.filter(item => item.at === 30).map(item => item.id), ['same-b', 'same-a'])
})

test('planning and results panels have no version picker or internal document tabs', async () => {
  const panels = await readFile(new URL('../src/components/BotOfficePanels.jsx', import.meta.url), 'utf8')
  const tabs = await readFile(new URL('../src/lib/aiOffice.mjs', import.meta.url), 'utf8')
  assert.match(tabs, /專案規劃/)
  assert.equal(panels.includes('aria-label="文件版本"'), false)
  assert.equal(panels.includes('aria-label="成果報告版本"'), false)
  assert.equal(panels.includes('規劃摘要'), false)
  assert.equal(panels.includes('時程＋文件'), false)
  assert.equal(panels.includes('時程與執行'), false)
  assert.match(panels, /sandbox=\{REPORT_FRAME\.sandbox\}/)
  assert.equal(REPORT_FRAME.sandbox.includes('allow-scripts'), false)
  assert.equal(REPORT_FRAME.sandbox.includes('allow-same-origin'), false)
})
