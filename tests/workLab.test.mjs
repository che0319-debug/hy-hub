import test from 'node:test'
import assert from 'node:assert/strict'
import {
  groupTasks, progress, taskPill, taskLabel, healthPill, evidencePill, ratingPayload,
  filterLogs, isOverdue, shortTime, inboxCount, decisionTitle, TASK_COLUMNS,
} from '../src/lib/workLab.mjs'

test('groupTasks puts every task in its column and keeps all six columns', () => {
  const g = groupTasks([{ id: 1, status: '待辦' }, { id: 2, status: '完成' }, { id: 3, status: '完成' }])
  assert.deepEqual(Object.keys(g), TASK_COLUMNS)
  assert.equal(g.完成.length, 2)
  assert.equal(g.受阻.length, 0)
})

test('progress counts done and blocked', () => {
  assert.deepEqual(progress([{ status: '完成' }, { status: '受阻' }, { status: '待辦' }, { status: '完成' }]),
    { total: 4, done: 2, blocked: 1, pct: 50 })
  assert.deepEqual(progress([]), { total: 0, done: 0, blocked: 0, pct: 0 })
})

test('status colours stay within the five style-A states', () => {
  const allowed = new Set(['wait', 'ai', 'you', 'done', 'bad'])
  for (const s of [...TASK_COLUMNS, '未知']) assert.ok(allowed.has(taskPill(s)))
  for (const s of ['正常', '需關注', '卡住']) assert.ok(allowed.has(healthPill(s)))
  for (const s of ['假設', '外部資料', '實測']) assert.ok(allowed.has(evidencePill(s)))
  assert.equal(healthPill('需關注'), 'you')
  assert.equal(taskLabel('待審'), 'PI 審查中')
})

test('ratingPayload validates scores and usability', () => {
  assert.match(ratingPayload({ 正確性: 4, 完成度: 4 }, '小修').error, /一致性/)
  assert.match(ratingPayload({ 正確性: 4, 完成度: 4, 一致性: 6 }, '小修').error, /一致性/)
  assert.match(ratingPayload({ 正確性: 4, 完成度: 4, 一致性: 4 }, '').error, /可用度/)
  assert.deepEqual(ratingPayload({ 正確性: 4, 完成度: 3, 一致性: 5, extra: 1 }, '直接用', ' ok ').body,
    { scores: { 正確性: 4, 完成度: 3, 一致性: 5 }, usability: '直接用', comment: 'ok' })
})

test('filterLogs filters by actor and cred', () => {
  const logs = [{ actor: 'HY', cred: '決策' }, { actor: 'PI', cred: '審查' }, { actor: 'PI', cred: '決策' }]
  assert.equal(filterLogs(logs, { actor: 'PI' }).length, 2)
  assert.equal(filterLogs(logs, { actor: 'PI', cred: '決策' }).length, 1)
  assert.equal(filterLogs(logs).length, 3)
})

test('dates and counts', () => {
  assert.equal(isOverdue('2026-10-10', '2026-10-11'), true)
  assert.equal(isOverdue('2026-10-11', '2026-10-11'), false)
  assert.equal(isOverdue('', '2026-10-11'), false)
  assert.equal(shortTime('2026-10-11T09:15:00+08:00'), '10/11 09:15')
  assert.equal(shortTime('2026-10-05'), '10/5')
  assert.equal(inboxCount({ decisions: [1], feedback_to_accept: [1, 2], to_rate: [] }), 3)
  assert.equal(decisionTitle({ kind: 'plan_approval', title: 'x' }), '核准專案規劃')
})
