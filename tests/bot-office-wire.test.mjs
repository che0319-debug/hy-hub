import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REPORT_FRAME, isHyOwnerSession, officeMilestones, currentMilestoneId, milestoneProgress,
  reportSummaryLines, reportIsStale, reportVersions, normalizeOfficeReport, normalizeOfficeDocument,
  normalizeOfficeFiles, deleteErrorMessage, officeDeleteOutcome, officeFailureMessage, reviewRounds, officeJournal, executionRounds,
} from '../src/lib/botOfficeView.mjs'
import { loadOfficeReport, loadOfficeReportHtml, loadOfficeDocument, loadOfficeFiles, deleteOfficeProject, uploadOfficeFile, importOfficeReference, mapOffice, officeDeleteHold } from '../src/botOfficeData.js'

const token = payload => `${btoa(JSON.stringify(payload))}.test`
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

test('report summary reads the one-page section and ignores scripts', () => {
  const html = '<h1>報告</h1><section><h2>一頁摘要：現在怎樣、你要做什麼</h2><ul><li>第一件</li><li><b>第二件</b></li><li>三</li><li>四</li><li>五</li><li>六</li><li>七</li></ul><script>parent.__unsafe=true</script></section><h2>其他</h2><ul><li>不要</li></ul>'
  assert.deepEqual(reportSummaryLines(html), ['第一件', '第二件', '三', '四', '五', '六'])
  assert.equal(reportSummaryLines('<p>PASS 這不是一頁摘要</p>').length, 0)
  assert.equal(reportSummaryLines('').length, 0)
})

test('report staleness compares state.updated with modified_time', () => {
  assert.equal(reportIsStale('2026-10-25T09:00:00+08:00', '2026-10-25T08:30:00+08:00'), true)
  assert.equal(reportIsStale('2026-10-25T08:30:00+08:00', '2026-10-25T09:00:00+08:00'), false)
  assert.equal(reportIsStale('不是時間', '2026-10-25T09:00:00+08:00'), false)
})

test('milestones use name, derive the first incomplete item, and count done over total', () => {
  const rows = officeMilestones({ milestones: [
    { id: 'M1', name: '研究', status: 'done', output: '筆記' },
    { id: 'M2', title: '只有標題', status: '完成' },
    { id: 'M3', name: '交付', status: 'open', deliverables: ['報告'], acceptance: ['HY 點頭'] },
  ] })
  assert.equal(rows[0].name, '研究')
  assert.deepEqual(rows[0].deliverables, ['筆記'])
  assert.equal(rows[1].name, '只有標題')
  assert.equal(rows[2].packages.length, 0)
  assert.deepEqual(rows[2].acceptance, ['HY 點頭'])
  assert.equal(currentMilestoneId(rows), 'M3')
  assert.deepEqual(milestoneProgress(rows), { done: 2, total: 3 })
  assert.equal(currentMilestoneId([]), '')
  assert.deepEqual(milestoneProgress([]), { done: 0, total: 0 })
})

test('review rounds follow output to review_card order and never guess a verdict from text', () => {
  const rounds = reviewRounds([
    { id: 'o2', type: 'output', reviewCard: 'r2', createdAt: '2026-10-02', title: '第二版' },
    { id: 'o1', type: 'output', reviewCard: 'r1', createdAt: '2026-10-01', title: '第一版' },
    { id: 'r1', type: 'note', title: '審一', summary: '結論 PASS，請修改', drive_created_at: '2026-10-01T00:00:00Z' },
    { id: 'r2', type: 'review', title: '審二', verdict: 'conditional_pass', round: 4, summary: '有條件', criteria: ['C1', { label: 'C2' }] },
    { id: 'note', type: 'note', summary: 'FAIL' },
  ])
  assert.deepEqual(rounds.map(round => round.outputId), ['o1', 'o2'])
  assert.equal(rounds[0].round, 1)
  assert.equal(rounds[0].hasVerdict, false)
  assert.equal(rounds[0].verdict, '')
  assert.equal(rounds[0].driveCreatedAt, '2026-10-01T00:00:00Z')
  assert.equal(rounds[1].round, 4)
  assert.equal(rounds[1].hasVerdict, true)
  assert.equal(rounds[1].verdict, 'conditional_pass')
  assert.deepEqual(rounds[1].criteria, ['C1', 'C2'])
  assert.equal(rounds[1].summary.includes('PASS') || rounds[0].summary.includes('PASS'), true)
})

test('officeJournal merges office records, keeps human system and artifact apart, and skips follow-ups without a time', () => {
  const state = {
    decisions: [{ id: 'd', project: 'p', title: '要不要做', status: 'answered', asked_at: '2026-10-01T00:00:00Z', answered_at: '2026-10-03T00:00:00Z', answer: '好', answered_by: 'hy', history: [{ at: '2026-10-02T00:00:00Z', actor: 'system', action: 'notify' }, { at: '2026-10-03T00:00:00Z', actor: 'hy', answer: '好' }] }],
    figures: [{ id: 'f', project: 'p', name: '執行者', started_at: '2026-10-04T00:00:00Z', finished_at: '2026-10-05T00:00:00Z', status: 'done' }],
    logs: [{ id: 'l', project: 'p', at: '2026-10-06T00:00:00Z', actor: 'sam', content: '補充' }, { id: 'ls', project: 'p', at: '2026-10-06T01:00:00Z', actor: 'system', content: '系統紀錄' }],
    requests: [{ id: 'r', project: 'p', created_at: '2026-10-07T00:00:00Z', created_by: 'hy', type: 'message', status: 'open', payload: { content: '意見' } }],
    buildings: [{ id: 'p', follow_ups: [{ id: 'fu', text: '沒有時間', status: 'open' }, { id: 'fu2', text: '有時間', status: 'open', at: '2026-10-08T00:00:00Z' }] }],
  }
  const index = { cards: [
    { id: 'c1', project: 'p', type: 'output', title: '成果一', created_at: '2026-10-09T00:00:00Z' },
    { id: 'c2', project: 'p', type: 'meeting', title: '會議', created_at: '2026-10-01T12:00:00Z' },
    { id: 'c3', project: 'p', type: 'execution', title: '派工', created_at: '2026-10-02T12:00:00Z' },
  ] }
  const events = officeJournal(state, index, 'p')
  const byId = Object.fromEntries(events.map(event => [event.id, event]))
  assert.equal(byId['ask:d'].kind, 'system')
  assert.equal(byId['d:0'].kind, 'system')
  assert.equal(byId['d:1'].kind, 'human')
  assert.equal(byId['answer:d'], undefined)
  assert.equal(byId['card:c1'].kind, 'artifact')
  assert.equal(byId['card:c2'].kind, 'human')
  assert.equal(byId['card:c3'].kind, 'system')
  assert.equal(byId['fig-start:f'].kind, 'system')
  assert.equal(byId['fig-end:f'].kind, 'system')
  assert.equal(byId.l.kind, 'human')
  assert.equal(byId.ls.kind, 'system')
  assert.equal(byId.r.kind, 'human')
  assert.equal(byId.r.detail, '已送出')
  assert.equal(byId['fu:fu2'].kind, 'system')
  assert.equal(events.some(event => event.id === 'fu:fu'), false)
  assert.deepEqual(events.map(event => event.at), [...events.map(event => event.at)].sort((a, b) => b - a))
})

test('execution rounds read executor figures and execution cards without inventing packages', () => {
  const rounds = executionRounds({ figures: [
    { id: 'gb-p-002-c-008', project: 'p', role: 'executor', status: 'running', started_at: '2026-10-01T00:00:00Z', look_as: 'grok-build' },
    { id: 'gb-p-002-c-011', project: 'p', role: 'executor', status: 'done', finished_at: '2026-10-02T00:00:00Z', look_as: 'gpt' },
    { id: 'pi', project: 'p', role: 'pi', status: 'running' },
  ] }, { cards: [{ id: 'c-008', project: 'p', type: 'execution', title: '做摘要' }, { id: 'c-011', project: 'p', type: 'execution', title: '修訂' }] }, 'p')
  assert.equal(rounds.length, 2)
  assert.equal(rounds[0].active, true)
  assert.equal(rounds[0].task, '做摘要')
  assert.equal(rounds[0].cardId, 'c-008')
  assert.equal(rounds[1].active, false)
  assert.equal(rounds[1].task, '修訂')
})

test('delete and office failures stay in Chinese and do not invent a success', () => {
  assert.match(deleteErrorMessage(503, { error: 'drive_write_unavailable', reason: 'scope' }), /沒有 Drive 寫入權/)
  assert.match(deleteErrorMessage(503, { error: 'drive_write_unavailable' }), /專案未刪除/)
  assert.match(deleteErrorMessage(503, { error: 'archive_folder_not_configured' }), /尚未設定/)
  assert.match(deleteErrorMessage(409, { error: 'project_running' }), /正在執行/)
  assert.match(deleteErrorMessage(409, { error: 'project_review' }), /審查中/)
  assert.match(deleteErrorMessage(409, { error: 'project_review' }), /專案未刪除/)
  assert.match(deleteErrorMessage(409, { error: 'state_conflict' }), /重新讀取/)
  const removed = deleteErrorMessage(502, { committed: true, error: 'index_write', step: 'index', backup_file_id: 'bak' })
  assert.match(removed, /專案已刪除（備份已保留）/)
  assert.match(removed, /再按一次刪除/)
  assert.doesNotMatch(removed, /專案未刪除/)
  const unknown = deleteErrorMessage(502, { committed: null, reason: '結果不明，備份已保留，請重新讀取確認' })
  assert.match(unknown, /結果不明，備份已保留，請重新讀取確認專案是否已刪除/)
  assert.doesNotMatch(unknown, /專案未刪除/)
  assert.doesNotMatch(unknown, /專案已刪除/)
  assert.match(deleteErrorMessage(502, { committed: false, step: 'backup', reason: '搬移失敗' }), /專案未刪除/)
  assert.match(deleteErrorMessage(502, { error: 'backup_failed', step: 'archive' }), /專案未刪除/)
  assert.match(deleteErrorMessage(502, { committed: true, error: 'drive_write_unavailable' }), /專案已刪除/)
  assert.doesNotMatch(deleteErrorMessage(502, { committed: true, error: 'drive_write_unavailable' }), /專案未刪除/)
  for (const status of [409, 500]) {
    const message = deleteErrorMessage(status, { committed: true, error: 'brain_write_conflict', step: 'index', backup_file_id: 'bak', archive_folder_id: 'arc' })
    assert.match(message, /專案已刪除（備份已保留）/)
    assert.match(message, /看板收尾未完成/)
    assert.doesNotMatch(message, /專案未刪除/)
    assert.doesNotMatch(message, /專案資料已更新/)
    const outcome = officeDeleteOutcome({ status, body: { committed: true, backup_file_id: 'bak' }, message })
    assert.equal(outcome.removed, true)
    assert.match(outcome.message, /看板收尾未完成/)
  }
  for (const status of [409, 500, 400]) {
    const message = deleteErrorMessage(status, { committed: null, error: 'state_unknown', reason: '結果不明，備份已保留，請重新讀取確認' })
    assert.match(message, /結果不明，備份已保留，請重新讀取確認專案是否已刪除/)
    assert.doesNotMatch(message, /專案未刪除/)
    assert.doesNotMatch(message, /專案已刪除/)
    assert.equal(officeDeleteOutcome({ status, body: { committed: null }, message }).removed, false)
  }
  assert.match(deleteErrorMessage(409, { committed: null, error: 'project_review' }), /結果不明/)
  assert.doesNotMatch(deleteErrorMessage(409, { committed: null, error: 'project_review' }), /審查中|專案未刪除/)
  assert.match(deleteErrorMessage(409, { committed: false, error: 'state_conflict' }), /專案資料已更新/)
  assert.match(deleteErrorMessage(400, { error: 'confirm_title' }), /名稱不一致/)
  assert.match(deleteErrorMessage(0, {}), /無法連線/)
  const removedOutcome = officeDeleteOutcome({ status: 502, body: { committed: true, backup_file_id: 'bak' }, message: removed })
  assert.equal(removedOutcome.removed, true)
  assert.match(removedOutcome.message, /看板收尾未完成/)
  const unknownOutcome = officeDeleteOutcome({ status: 502, body: { committed: null }, message: unknown })
  assert.equal(unknownOutcome.removed, false)
  assert.doesNotMatch(unknownOutcome.message, /專案未刪除|專案已刪除/)
  assert.equal(officeDeleteOutcome({ status: 502, body: { committed: false }, message: '備份或搬移失敗，專案未刪除。' }).removed, false)
  assert.equal(officeDeleteOutcome({ status: 409, body: { committed: false }, message: '專案資料已更新，請重新讀取後再刪除。專案未刪除。' }).removed, false)
  assert.equal(officeDeleteOutcome({ status: 409, body: { committed: true } }).removed, true)
  assert.match(officeDeleteOutcome({ status: 500, body: { committed: true } }).message, /看板收尾未完成/)
  assert.match(officeDeleteOutcome({ status: 409, body: { committed: null } }).message, /結果不明/)
  assert.equal(officeDeleteOutcome({ status: 500, body: { committed: null } }).removed, false)
  assert.match(officeFailureMessage(422, { error: 'report_unsafe', reason: 'script' }, 'report'), /安全檢查/)
  assert.match(officeFailureMessage(404, { error: 'no_document' }), /沒有可讀/)
  assert.match(officeFailureMessage(404, { error: 'missing' }, 'report'), /找不到專案或這份報告/)
  assert.match(officeFailureMessage(413, {}), /大小上限/)
  assert.match(officeFailureMessage(503, { error: 'drive_write_unavailable' }), /暫時無法使用|沒有 Drive 寫入權/)
  assert.match(officeFailureMessage(0, {}), /無法連線/)
})

test('HY owner session is only sub hy, and the report frame stays popup-only', () => {
  assert.equal(isHyOwnerSession(token({ sub: 'hy', exp: 1 })), true)
  assert.equal(isHyOwnerSession(token({ sub: 'owner-bot:grok', exp: 1 })), false)
  assert.equal(isHyOwnerSession(token({ exp: 1 })), false)
  assert.equal(isHyOwnerSession(''), false)
  assert.equal(REPORT_FRAME.sandbox, 'allow-popups allow-popups-to-escape-sandbox')
  assert.equal(REPORT_FRAME.sandbox.includes('allow-scripts'), false)
  assert.equal(REPORT_FRAME.sandbox.includes('allow-same-origin'), false)
  assert.equal(REPORT_FRAME.referrerPolicy, 'no-referrer')
})

test('new office reads reject the wrong shape and never describe it as a report', () => {
  assert.equal(normalizeOfficeReport({ cards: [] }), null)
  assert.equal(normalizeOfficeReport({ exists: false, reason: '專案資料夾未登錄' }).reason, '專案資料夾未登錄')
  assert.equal(normalizeOfficeDocument({ markdown: 1 }), null)
  assert.equal(normalizeOfficeFiles({ folder_id: null }), null)
  const versions = reportVersions({ exists: true, file_id: 'html2', modified_time: '2026-10-25T08:30:00+08:00', history: [{ file_id: 'html2', version: 2 }, { file_id: 'html1', version: 1 }] })
  assert.deepEqual(versions.map(item => item.file_id), ['html2', 'html1'])
})

test('new office client uses only /api/office and surfaces endpoint failures', async () => {
  const calls = []
  const fetcher = async (url, options = {}) => {
    calls.push([options.method || 'GET', url])
    if (url.endsWith('/report')) return json(200, { exists: true, file_id: 'f', modified_time: '2026-10-25T08:00:00+08:00', history: [] })
    if (url.includes('/report/html')) return new Response('<h2>一頁摘要</h2>', { status: 200, headers: { 'content-type': 'text/html' } })
    if (url.includes('/cards/') && url.endsWith('/document')) return json(404, { error: 'no_document' })
    if (url.endsWith('/files') && (options.method || 'GET') === 'GET') return json(503, { error: 'drive_write_unavailable', reason: 'no scope' })
    if (url.endsWith('/delete')) return json(409, { error: 'project_running' })
    if (url.endsWith('/drive-reference')) return json(503, { error: 'archive_folder_not_configured' })
    return json(500, { error: 'unexpected' })
  }
  const report = await loadOfficeReport('p/1', { fetcher, base: 'https://example.test' })
  assert.equal(report.exists, true)
  assert.match(await loadOfficeReportHtml('p/1', 'f', { fetcher, base: 'https://example.test' }), /一頁摘要/)
  await assert.rejects(loadOfficeDocument('card', { fetcher, base: 'https://example.test' }), error => /沒有可讀/.test(error.message))
  await assert.rejects(loadOfficeFiles('p/1', { fetcher, base: 'https://example.test' }), error => error.code === 'drive_write_unavailable' && /沒有 Drive 寫入權/.test(error.message))
  await assert.rejects(deleteOfficeProject('p/1', { confirm_title: '專案', expected_state_updated: '2026-10-25T09:00:00+08:00' }, { fetcher, base: 'https://example.test' }), error => /正在執行/.test(error.message) && /未刪除/.test(error.message))
  await assert.rejects(importOfficeReference('p/1', 'fileidfile', { fetcher, base: 'https://example.test' }), error => /尚未設定|暫時無法使用/.test(error.message))
  await assert.rejects(loadOfficeReport('p/1', { fetcher: async () => { throw new TypeError('offline') }, base: '' }), error => error.kind === 'network')
  const aborted = new Error('stopped'); aborted.name = 'AbortError'
  await assert.rejects(loadOfficeReport('p/1', { fetcher: async () => { throw aborted } }), error => error.name === 'AbortError')
  await uploadOfficeFile('p/1', new Blob(['hi'], { type: 'text/plain' }), { fetcher: async (url, options) => { calls.push([options.method, url, options.body instanceof FormData]); return json(200, { ok: true }) }, base: 'https://example.test' })
  assert.ok(calls.every(([, url]) => url.startsWith('https://example.test/api/office/') || url.startsWith('/api/office/')))
  assert.equal(calls.some(([, url]) => url.includes('/api/ai-office') || url.includes('/api/ai-work-packages')), false)
  assert.ok(calls.some(([method, url]) => method === 'POST' && url.endsWith('/api/office/projects/p%2F1/files')))
})

test('mapped office state keeps the raw updated time and optional review criteria', () => {
  const mapped = mapOffice(
    { updated: '2026-10-25T01:00:00+08:00', buildings: [{ id: 'p', title: '專案', milestones: [{ id: 'M1', name: '開始', status: 'open' }] }] },
    { cards: [{ id: 'r', project: 'p', type: 'review', verdict: 'pass', criteria: ['C1'], round: 2 }] },
  )
  assert.equal(mapped.updatedRaw, '2026-10-25T01:00:00+08:00')
  assert.equal(mapped.updatedAt, '2026-10-25T01:00:00+08:00')
  assert.deepEqual(mapped.projects[0].cards.outputs[0].criteria, ['C1'])
  assert.equal(mapped.projects[0].cards.outputs[0].verdict, 'pass')
})

test('review stage is the normalized stage value and blocks delete like running', () => {
  const review = mapOffice({ buildings: [{ id: 'r', title: '審查案', stage: 'review' }] }, {})
  assert.equal(review.projects[0].stage, 'review')
  assert.equal(review.projects[0].stageLabel, '待審')
  assert.equal(officeDeleteHold(review.projects[0]), '目前專案在審查中，需等審查結束後才能刪除。')
  assert.equal(officeDeleteHold({ ...review.projects[0], stage: review.projects[0].stageLabel }), '')
  const running = mapOffice({ buildings: [{ id: 'a', title: '執行案', stage: 'running' }] }, {})
  assert.equal(officeDeleteHold(running.projects[0]), '目前專案執行中，需等結束後才能刪除。')
  assert.equal(officeDeleteHold(mapOffice({ buildings: [{ id: 'd', title: '完成案', stage: 'done' }] }, {}).projects[0]), '')
})

test('delete client exposes status and committed body without calling the project deleted', async () => {
  const cases = [
    [409, { error: 'project_review' }, error => error.status === 409 && error.body.error === 'project_review' && /審查中/.test(error.message) && /專案未刪除/.test(error.message)],
    [502, { committed: true, error: 'index_write', step: 'index', backup_file_id: 'bak' }, error => error.status === 502 && error.body.committed === true && error.body.backup_file_id === 'bak' && /專案已刪除/.test(error.message) && !/專案未刪除/.test(error.message) && officeDeleteOutcome(error).removed === true],
    [502, { committed: null, error: 'state_unknown', reason: '結果不明' }, error => error.status === 502 && error.body.committed === null && /結果不明/.test(error.message) && !/專案未刪除/.test(error.message) && !/專案已刪除/.test(error.message) && officeDeleteOutcome(error).removed === false],
    [502, { committed: false, error: 'backup_failed', step: 'backup', reason: '搬移失敗' }, error => error.status === 502 && error.body.committed === false && /專案未刪除/.test(error.message) && officeDeleteOutcome(error).removed === false],
    [502, { error: 'backup_failed' }, error => error.status === 502 && error.body.committed === undefined && /專案未刪除/.test(error.message)],
    [409, { committed: true, error: 'brain_write_conflict', step: 'index', backup_file_id: 'bak' }, error => error.status === 409 && error.body.committed === true && error.body.backup_file_id === 'bak' && /專案已刪除（備份已保留）/.test(error.message) && /看板收尾未完成/.test(error.message) && !/專案未刪除/.test(error.message) && !/專案資料已更新/.test(error.message) && officeDeleteOutcome(error).removed === true],
    [500, { committed: true, error: 'index_write', step: 'index', backup_file_id: 'bak' }, error => error.status === 500 && error.body.committed === true && /專案已刪除（備份已保留）/.test(error.message) && !/專案未刪除/.test(error.message) && officeDeleteOutcome(error).removed === true],
    [409, { committed: null, error: 'state_unknown', reason: '結果不明' }, error => error.status === 409 && error.body.committed === null && /結果不明/.test(error.message) && !/專案未刪除/.test(error.message) && !/專案已刪除/.test(error.message) && !/專案資料已更新/.test(error.message) && officeDeleteOutcome(error).removed === false],
    [500, { committed: null, error: 'state_unknown', reason: '結果不明' }, error => error.status === 500 && error.body.committed === null && /結果不明/.test(error.message) && !/專案未刪除/.test(error.message) && !/專案已刪除/.test(error.message) && officeDeleteOutcome(error).removed === false],
  ]
  for (const [status, body, check] of cases) {
    await assert.rejects(deleteOfficeProject('p/1', { confirm_title: '專案', expected_state_updated: '2026-10-25T09:00:00+08:00' }, {
      fetcher: async () => json(status, body), base: 'https://example.test',
    }), check)
  }
})
