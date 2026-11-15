import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isListedDone, listedPendingTotal, openApprovalCount, pendingLabel, sortByPending } from '../src/lib/officeHomeList.mjs'

const inbox = [
  { project_id: 'p-002', status: 'OPEN', assigned_to: 'HY', title: '新日期' },
  { project_id: 'p-002', status: 'RESOLVED', assigned_to: 'HY', title: '已答' },
  { project_id: 'p-clean', status: 'OPEN', assigned_to: 'bot', title: '不是給你的' },
  { project_id: null, status: 'OPEN', assigned_to: 'HY', title: '沒掛專案' },
]

test('待你核示只算該專案尚未結案、要你處理的核示', () => {
  assert.equal(openApprovalCount('p-002', inbox), 1)
  assert.equal(openApprovalCount('p-clean', inbox), 0)
  assert.equal(openApprovalCount(null, inbox), 0)
  assert.equal(pendingLabel(0), '')
  assert.equal(pendingLabel(1), '待你核示 1 則')
  assert.equal(pendingLabel(3), '待你核示 3 則')
})

test('有待決的專案排在前面，件數多的更前', () => {
  const projects = [{ id: 'p-clean' }, { id: 'p-002' }, { id: 'p-two' }]
  const counts = { 'p-clean': 0, 'p-002': 1, 'p-two': 2 }
  assert.deepEqual(sortByPending(projects, p => counts[p.id]).map(p => p.id), ['p-two', 'p-002', 'p-clean'])
})

test('完成的專案固定在最下面，未完成的仍依待核示數量', () => {
  const projects = [
    { id: 'p-done-hot', stage: 'done' },
    { id: 'p-clean', stage: 'assigned' },
    { id: 'p-two', stage: 'running' },
    { id: 'p-done-cold', stage: 'done' },
    { id: 'p-002', stage: 'hy_decision' },
  ]
  const counts = { 'p-done-hot': 9, 'p-clean': 0, 'p-two': 2, 'p-done-cold': 0, 'p-002': 1 }
  assert.deepEqual(
    sortByPending(projects, p => counts[p.id]).map(p => p.id),
    ['p-two', 'p-002', 'p-clean', 'p-done-hot', 'p-done-cold'],
  )
})

test('只看完成時維持穩定次序，件數多的完成案仍在完成組內較前', () => {
  const projects = [
    { id: 'p-011', stage: 'done' },
    { id: 'p-007', displayStage: 'done' },
    { id: 'p-008', stage: 'done' },
  ]
  const counts = { 'p-011': 0, 'p-007': 2, 'p-008': 0 }
  assert.deepEqual(
    sortByPending(projects, p => counts[p.id]).map(p => p.id),
    ['p-007', 'p-011', 'p-008'],
  )
  assert.equal(isListedDone({ stage: 'done' }), true)
  assert.equal(isListedDone({ displayStage: 'done', stage: 'running' }), true)
  assert.equal(isListedDone({ stage: 'running' }), false)
})

test('專案列在標題旁顯示編號', () => {
  const home = readFileSync(new URL('../src/pages/OfficeHome.jsx', import.meta.url), 'utf8')
  assert.match(home, /ao-project-id/)
  assert.match(home, /\{p\.id\}/)
  const css = readFileSync(new URL('../src/pages/ai-office-v1.css', import.meta.url), 'utf8')
  assert.match(css, /\.ao-project-id\{[^}]*var\(--hy-muted\)/)
  assert.match(css, /\.ao-project-id\{[^}]*var\(--hy-fs-tiny\)/)
})

test('首頁待你決定等於各專案待你核示的總和，沒掛專案的不計', () => {
  const projects = [{ id: 'p-clean' }, { id: 'p-002' }, { id: 'p-two' }]
  const total = listedPendingTotal(projects, inbox)
  assert.equal(openApprovalCount('p-two', [
    { project_id: 'p-two', status: 'OPEN', assigned_to: 'owner' },
    { project_id: 'p-two', status: 'OPEN', assigned_to: 'HY' },
  ]), 2)
  assert.equal(total, projects.reduce((sum, project) => sum + openApprovalCount(project.id, inbox), 0))
  assert.equal(total, 1)
  assert.equal(listedPendingTotal([{ id: 'p-two' }], [
    { project_id: 'p-two', status: 'OPEN', assigned_to: 'HY' },
    { project_id: 'gone', status: 'OPEN', assigned_to: 'HY' },
    { project_id: null, status: 'OPEN', assigned_to: 'HY' },
  ]), 1)
})
