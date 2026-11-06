import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  activeDocumentKey, bodyReads, canonicalOfficeDocuments, documentProblem, driveFileId,
  outcomeCopy, presentOfficeDocuments, safeMarkdown, snapshotLines,
} from '../src/lib/officeDocuments.mjs'
import { officeFailureMessage } from '../src/lib/botOfficeView.mjs'
import { loadOfficeDriveDocument } from '../src/botOfficeData.js'

const PLAN = '14m8hE1stISKuqRXkn1XoeH057T6hS9jCkW2IUhFtGo8'
const EXEC = '1r1LjR6bmYlUkjzi2HOUuarYCuQMKmRPAWGAFrY_p6uQ'
const REV3 = '1n4ogXXv1jJvXI2hb-4s8B3qVTPqfzo9pP0Byw1iAGUg'
const REV2 = '1NJuEnzkQcOC7EWwKm_9tMiOwnqZ6W9JogF2TMCWJU4Q'
const REV1 = '1q59MTi4axczx4KJl4N1V8id6IvcoYft4pht_RTquyts'
const doc = id => `https://docs.google.com/document/d/${id}/edit`

function p003(extra = {}) {
  return {
    id: 'p-003',
    project_file: doc(PLAN),
    milestones: [{ id: 'M0', name: '規劃書', kind: 'plan', step: 'hy_decision' }],
    plan: {
      version: 3,
      doc_url: doc(PLAN),
      drive_file_id: null,
      submitted_at: '2026-11-06T01:34:52.191259+00:00',
      table: [{ id: 'M1', name: 'A', output: '目前表' }],
      history: [
        { version: 1, doc_url: doc(PLAN), table: [{ id: 'M1', name: 'A', output: 'v1 表' }], submitted_at: '2026-11-04T01:32:37.000Z' },
        { version: 2, doc_url: doc(PLAN), table: [{ id: 'M1', name: 'A', output: 'v2 表' }], submitted_at: '2026-11-05T01:25:31.000Z' },
      ],
    },
    execution_plan: {
      version: 3,
      doc_url: doc(EXEC),
      drive_file_id: EXEC,
      name: 'AI 執行規劃書',
      submitted_at: '2026-11-06T01:34:52.191259+00:00',
    },
    last_review: {
      target: 'plan-v3', verdict: 'PASS', verdict_text: 'PASS', must_fix: [],
      report_file_id: REV3, report_name: 'p-003_審查報告_plan-v3', at: '2026-11-06T05:17:04.867Z',
    },
    review_requests: [
      { request_id: `p-003-plan-v1-${REV1}`, report_file_id: REV1, result: { target: 'plan-v1', verdict: 'CONDITIONAL_PASS', verdict_text: '有條件 PASS', must_fix: ['舊問題'], updated: '2026-11-04T12:13:21.000Z' } },
      { request_id: `p-003-plan-v2-${REV2}`, report_file_id: REV2, result: { target: 'plan-v2', verdict: 'CONDITIONAL_PASS', verdict_text: '有條件 PASS', must_fix: ['修正邊界'], updated: '2026-11-05T07:20:57.000Z' } },
      { request_id: `p-003-plan-v3-${REV3}`, report_file_id: REV3, result: { target: 'plan-v3', verdict: 'PASS', verdict_text: 'PASS', must_fix: [], updated: '2026-11-06T05:17:04.867Z' } },
    ],
    ...extra,
  }
}

const proseDecision = {
  id: 'd-note', project: 'p-003', answer: `另建 AI 執行規劃書 ${doc(EXEC)}`,
}

test('drive ids come from canonical urls and reject other links', () => {
  assert.equal(driveFileId(doc(PLAN)), PLAN)
  assert.equal(driveFileId(`https://drive.google.com/file/d/${REV2}/view`), REV2)
  assert.equal(driveFileId(null), '')
  assert.equal(driveFileId('https://evil.example/d/abcdefghij1234567890/edit'), '')
  assert.equal(driveFileId('http://docs.google.com/document/d/abcdefghij1234567890/edit'), '')
})

test('p-003 equivalent plan v3, execution plan and PASS review are the current shared sources', () => {
  const bundle = canonicalOfficeDocuments(p003(), { cards: [] }, [proseDecision, {
    id: 'd-95', project: 'p-003', flow: { target: 'plan-v3', kind: 'plan' },
    review: { verdict: 'PASS', report_file_id: REV3, report_url: doc(REV3) },
  }])
  assert.equal(bundle.currentKey, 'plan:3')
  assert.equal(bundle.plans.find(item => item.latest).fileId, PLAN)
  assert.equal(bundle.plans.find(item => item.latest).version, 3)
  assert.equal(bundle.executionPlans.length, 1)
  assert.equal(bundle.executionPlans[0].fileId, EXEC)
  assert.equal(bundle.executionGap, '')
  assert.equal(bundle.reviews.find(item => item.current).fileId, REV3)
  assert.equal(bundle.reviews.find(item => item.fileId === REV2).current, false)
  assert.equal(bundle.options.some(item => item.key === 'milestone:M0'), false)
  const current = presentOfficeDocuments(bundle, bundle.currentKey)
  const again = presentOfficeDocuments(bundle, activeDocumentKey(bundle, ''))
  assert.equal(current.plan.fileId, again.plan.fileId)
  assert.equal(current.execution.fileId, EXEC)
  assert.equal(current.review.fileId, REV3)
  assert.equal(current.review.current, true)
  assert.equal(current.showEmptyReport, false)
  const reads = bodyReads(current)
  assert.deepEqual(reads.map(item => item.fileId).sort(), [EXEC, PLAN, REV3].sort())
  assert.equal(reads.some(item => item.fileId === REV2), false)
  assert.match(snapshotLines(current).join('\n'), /專案規劃書 v3/)
  assert.match(snapshotLines(current).join('\n'), /AI 執行規劃書/)
  assert.match(snapshotLines(current).join('\n'), /plan-v3/)
  const older = presentOfficeDocuments(bundle, 'plan:2')
  assert.equal(older.plan.fetch, false)
  assert.equal(older.plan.table[0].output, 'v2 表')
  assert.match(older.sameFileNote, /v2/)
  assert.equal(older.review.fileId, REV2)
  assert.equal(older.review.current, false)
  assert.equal(older.execution, null)
  assert.match(older.executionNote, /v3/)
  assert.deepEqual(bodyReads(older).map(item => item.fileId), [REV2])
  assert.equal(outcomeCopy(current, '報告檔未找到').kind, 'not-created')
  assert.match(outcomeCopy(current, '報告檔未找到').text, /報告檔未找到/)
  assert.match(outcomeCopy(current, '報告檔未找到').text, /執行期成果報告還沒建立/)
})

test('next plan revision becomes current and the previous review stays selectable', () => {
  const current = canonicalOfficeDocuments(p003(), {}, [])
  assert.equal(activeDocumentKey(current, ''), 'plan:3')
  const previous = p003()
  const next = canonicalOfficeDocuments(p003({
    plan: {
      ...previous.plan,
      version: 4,
      table: [{ id: 'M1', name: 'A', output: 'v4 表' }],
      history: [...previous.plan.history, { version: 3, doc_url: doc(PLAN), table: previous.plan.table, submitted_at: previous.plan.submitted_at }],
    },
    last_review: { target: 'plan-v4', verdict: 'FAIL', verdict_text: '不通過', must_fix: ['再改'], report_file_id: 'rev4rev4rev4rev4', at: '2026-11-07T01:00:00.000Z' },
    review_requests: [...p003().review_requests, { request_id: 'p-003-plan-v4-rev4rev4rev4rev4', report_file_id: 'rev4rev4rev4rev4', result: { target: 'plan-v4', verdict: 'FAIL', updated: '2026-11-07T01:00:00.000Z' } }],
  }), {}, [])
  assert.equal(activeDocumentKey(next, ''), 'plan:4')
  assert.equal(activeDocumentKey(next, 'plan:3'), 'plan:3')
  const kept = presentOfficeDocuments(next, 'plan:3')
  assert.equal(kept.review.fileId, REV3)
  assert.equal(kept.review.current, false)
  const latest = presentOfficeDocuments(next, '')
  assert.equal(latest.plan.version, 4)
  assert.equal(latest.review.current, true)
  assert.equal(latest.review.verdict, 'FAIL')
})

test('a PASS on an older target is not the current review', () => {
  const bundle = canonicalOfficeDocuments(p003({
    last_review: { target: 'plan-v3', verdict: 'FAIL', verdict_text: '不通過', must_fix: ['再改'], report_file_id: REV3, at: '2026-11-06T08:00:00.000Z' },
    review_requests: [
      { request_id: `p-003-plan-v2-${REV2}`, report_file_id: REV2, result: { target: 'plan-v2', verdict: 'PASS', verdict_text: 'PASS', updated: '2026-11-05T07:20:57.000Z' } },
      { request_id: `p-003-plan-v3-${REV3}`, report_file_id: REV3, result: { target: 'plan-v3', verdict: 'FAIL', updated: '2026-11-06T08:00:00.000Z' } },
    ],
  }), {}, [])
  assert.equal(bundle.reviews.find(item => item.current).fileId, REV3)
  assert.equal(bundle.reviews.find(item => item.fileId === REV2).current, false)
  assert.equal(presentOfficeDocuments(bundle, 'plan:2').review.verdict, 'PASS')
  assert.equal(presentOfficeDocuments(bundle, 'plan:2').review.current, false)
})

test('concurrent milestone reviews stay attached to their own milestone', () => {
  const m1 = 'm1m1m1m1m1m1m1m1'
  const m2 = 'm2m2m2m2m2m2m2m2'
  const bundle = canonicalOfficeDocuments({
    id: 'p',
    plan: { version: 3, doc_url: doc(PLAN), table: [] },
    milestones: [{ id: 'M1', output_cards: [{ id: 'out-m1', title: 'M1 交付', drive_file_id: 'out1out1out1out1', drive_url: doc('out1out1out1out1') }] }, { id: 'M2', output_cards: [{ id: 'out-m2', title: 'M2 交付', drive_file_id: 'out2out2out2out2' }] }],
    last_review: { target: 'M1', verdict: 'PASS', report_file_id: m1, at: '2026-11-06T05:00:00.000Z' },
    review_requests: [
      { request_id: 'p-M1', report_file_id: m1, result: { target: 'M1', verdict: 'PASS', updated: '2026-11-06T05:00:00.000Z' } },
      { request_id: 'p-M2', report_file_id: m2, result: { target: 'M2', verdict: 'PASS', updated: '2026-11-06T04:00:00.000Z' } },
    ],
  }, {}, [])
  assert.equal(bundle.currentKey, 'milestone:M1')
  assert.equal(bundle.reviews.find(item => item.target === 'M2').current, false)
  const first = presentOfficeDocuments(bundle, 'milestone:M1')
  const second = presentOfficeDocuments(bundle, 'milestone:M2')
  assert.equal(first.review.fileId, m1)
  assert.equal(first.review.current, true)
  assert.equal(first.outputs[0].fileId, 'out1out1out1out1')
  assert.equal(second.review.fileId, m2)
  assert.equal(second.review.current, false)
  assert.equal(second.outputs[0].title, 'M2 交付')
  assert.equal(bodyReads(first).some(item => item.fileId === m2), false)
  assert.equal(bodyReads(second).some(item => item.fileId === m1), false)
})

test('execution plan url buried in prose is not a canonical reference', () => {
  const building = p003()
  delete building.execution_plan
  const bundle = canonicalOfficeDocuments(building, {}, [proseDecision])
  assert.equal(bundle.executionPlans.length, 0)
  assert.match(bundle.executionGap, /AI 執行規劃書尚未登錄/)
  const reads = bodyReads(presentOfficeDocuments(bundle, ''))
  assert.equal(reads.some(item => item.fileId === EXEC), false)
})

test('legacy outcome report stays available and does not pretend the plan is missing', () => {
  const legacy = '1DcrwY2yVVWeGYZW3BlNdDn_hnYq__oKd'
  const bundle = canonicalOfficeDocuments({
    id: 'p-002',
    plan_card: 'c-013',
    review_card: 'c-014',
    report_file_id: legacy,
    last_review: 'pass',
  }, { cards: [
    { id: 'c-013', project: 'p-002', type: 'plan', drive_url: doc(PLAN) },
    { id: 'c-014', project: 'p-002', type: 'note', drive_url: `https://drive.google.com/file/d/${REV2}/view` },
  ] }, [])
  assert.equal(bundle.outcomeFileId, legacy)
  assert.equal(bundle.hasPlanning, true)
  assert.equal(bundle.executionGap, '')
  const view = presentOfficeDocuments(bundle, '')
  assert.equal(view.plan.readKey, 'card:c-013')
  assert.equal(view.plan.fileId, PLAN)
  assert.equal(view.review.cardId, 'c-014')
  assert.equal(view.review.current, true)
  assert.equal(view.showEmptyReport, false)
  assert.equal(outcomeCopy(view).kind, 'legacy')
  assert.equal(outcomeCopy({ hasPlanning: false, outcomeFileId: '', review: null }).text, '這個專案還沒有專案報告')
})

test('duplicate reviews of one target keep a single current file', () => {
  const older = 'oldoldoldoldoldold'
  const bundle = canonicalOfficeDocuments(p003({
    review_requests: [
      { request_id: 'p-003-plan-v3-old', report_file_id: older, result: { target: 'plan-v3', verdict: 'CONDITIONAL_PASS', updated: '2026-11-06T02:00:00.000Z' } },
      { request_id: `p-003-plan-v3-${REV3}`, report_file_id: REV3, result: { target: 'plan-v3', verdict: 'PASS', updated: '2026-11-06T05:17:04.000Z' } },
    ],
  }), {}, [])
  assert.equal(bundle.reviews.filter(item => item.current).length, 1)
  assert.equal(bundle.reviews.find(item => item.current).fileId, REV3)
  assert.equal(bundle.reviews.find(item => item.fileId === older).current, false)
  const picked = presentOfficeDocuments(bundle, `review:${older}`)
  assert.equal(picked.review.fileId, older)
  assert.equal(picked.review.current, false)
  assert.equal(picked.plan.version, 3)
})

test('unreadable documents name the document and the reason', () => {
  assert.equal(officeFailureMessage(404, { detail: 'Not Found' }, 'drive-document'), '內文讀取介面尚未部署。')
  assert.equal(officeFailureMessage(404, { error: 'drive_document_unavailable' }, 'drive-document'), '內文讀取介面尚未部署。')
  assert.match(officeFailureMessage(404, { error: 'no_document', reason: '不在專案資料夾' }, 'drive-document'), /找不到這份文件/)
  assert.match(officeFailureMessage(403, { error: 'document_forbidden', reason: '沒有權限' }, 'drive-document'), /沒有讀取權限/)
  assert.match(officeFailureMessage(422, { error: 'report_unsafe', reason: 'script' }, 'drive-document'), /安全檢查/)
  assert.match(documentProblem('專案規劃書 v3', '沒有讀取權限。'), /專案規劃書 v3：沒有讀取權限/)
  assert.match(documentProblem('審查 plan-v3', '找不到這份文件。'), /審查 plan-v3/)
})

test('markdown rendering input drops active content', () => {
  const cleaned = safeMarkdown('<script>alert(1)</script>\n## 標題\n\n正文<iframe src="https://evil.example"></iframe>')
  assert.equal(cleaned.includes('<script'), false)
  assert.equal(cleaned.includes('alert(1)'), false)
  assert.equal(cleaned.includes('<iframe'), false)
  assert.match(cleaned, /標題/)
  assert.match(cleaned, /正文/)
})

test('drive document client stays on the office read route', async () => {
  let called = ''
  const fetcher = async url => {
    called = url
    return new Response(JSON.stringify({ markdown: '## 規劃\n\n全文', truncated: false }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const data = await loadOfficeDriveDocument('p-003', PLAN, { fetcher, base: 'https://example.test' })
  assert.equal(called, `https://example.test/api/office/projects/p-003/drive-document?file_id=${PLAN}`)
  assert.match(data.markdown, /全文/)
})

test('both tabs render the same official documents without an html frame', async () => {
  const panels = await readFile(new URL('../src/components/BotOfficePanels.jsx', import.meta.url), 'utf8')
  const view = await readFile(new URL('../src/components/OfficialDocuments.jsx', import.meta.url), 'utf8')
  assert.match(panels, /mode="plan"/)
  assert.match(panels, /mode="review"/)
  assert.match(panels, /useState\('document'\)/)
  assert.match(panels, /規劃書全文讀取未接上/)
  assert.match(view, /skipHtml/)
  assert.equal(view.includes('srcDoc'), false)
  assert.equal(view.includes('dangerouslySetInnerHTML'), false)
  assert.match(panels, /sandbox=\{REPORT_FRAME\.sandbox\}/)
})
