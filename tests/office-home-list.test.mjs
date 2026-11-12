import test from 'node:test'
import assert from 'node:assert/strict'
import { listedPendingTotal, openApprovalCount, pendingLabel, sortByPending } from '../src/lib/officeHomeList.mjs'

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
