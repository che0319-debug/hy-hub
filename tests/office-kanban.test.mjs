import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractKanbanMilestones, isOfficeHealthItem, kanbanSourceOf, kanbanTodosForOffice,
  linkedOfficeProjectId, officePendingItems, officeProjectIdOf,
} from '../src/lib/officeKanban.mjs'
import { mapOffice } from '../src/botOfficeData.js'
import { unownedProjects } from '../src/life-island/worldData.js'

test('看板 office_project_id 可選，沒寫就不連 Office', () => {
  const payload = { projects: [
    { id: 'APB', name: 'A+ BP', milestones: [
      { id: 'm1', title: '展開甘特圖', due: '2026/11/11' },
      { id: 'm2', title: '已完成', due: '2026/11/01', completed: true },
    ] },
  ] }
  const rows = extractKanbanMilestones(payload, v => v.projects, '950157')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].office_project_id, '')
  assert.equal(rows[0]._project, 'A+ BP')
  payload.projects[0].office_project_id = 'p-002'
  const linked = extractKanbanMilestones(payload, v => v.projects, '950157')
  assert.equal(linked[0].office_project_id, 'p-002')
  payload.projects[0].milestones[0].office_project_id = 'p-009'
  assert.equal(extractKanbanMilestones(payload, v => v.projects, '950157')[0].office_project_id, 'p-009')
  assert.equal(officeProjectIdOf({}), '')
  assert.equal(linkedOfficeProjectId({ title: '展開甘特圖', _source: '950157', _project: 'A+ BP' }, [{ id: 'p-002' }]), '')
})

test('Office 專案 kanban_source 也可連回看板，舊專案不補關聯', () => {
  const projects = [{
    id: 'p-002', title: '川泱購物（PI 流程重跑）', ownerBot: 'sam',
    kanbanSource: { bot: '950157', project_id: 'APB', project_name: 'A+ BP' },
  }]
  const todo = { title: '展開甘特圖', due: '2026-11-11', _source: '950157', _project: 'A+ BP', _projectId: 'APB' }
  assert.equal(linkedOfficeProjectId(todo, projects), 'p-002')
  assert.equal(linkedOfficeProjectId({ ...todo, _source: 'Sam' }, projects), '')
  assert.equal(kanbanSourceOf({ id: 'p-002' }), null)
  const under = kanbanTodosForOffice([todo], projects, '2026-11-12')
  assert.equal(under.length, 1)
  assert.equal(under[0].kind, 'overdue')
  assert.equal(under[0].projectId, 'p-002')
})

test('紅色健康問題不進 Office 專案列表，缺 owner 指向該專案本身', () => {
  const health = { id: 'pb:atlas:assign-owner', kind: 'problem', title: '專案歸屬：1 個專案沒有指定 owner_bot', assignOwner: true }
  const memory = { id: 'pb:hy:mem', kind: 'problem', title: '長期記憶 8 天沒更新' }
  const decide = { id: 'bo:d1', kind: 'decide', decisionId: 'd1', projectId: 'p-002', isItem: false, light: false }
  const light = { id: 'bo:d2', kind: 'decide', decisionId: 'd2', projectId: null, isItem: true, light: true }
  assert.equal(isOfficeHealthItem(health), true)
  assert.equal(isOfficeHealthItem(memory), true)
  assert.equal(isOfficeHealthItem(decide), false)
  assert.deepEqual(officePendingItems([health, memory, decide, light]).map(i => i.decisionId), ['d1'])
  const mapped = mapOffice({
    buildings: [
      { id: 'p-002', title: '川泱購物', owner_bot: 'sam', stage: 'running' },
      { id: 'p-empty', title: '還沒指定', owner_bot: '', stage: 'unassigned' },
    ],
    decisions: [],
  }, { cards: [] })
  assert.deepEqual(mapped.projects.map(p => p.id).sort(), ['p-002', 'p-empty'])
  assert.deepEqual(unownedProjects(mapped.projects).map(p => p.id), ['p-empty'])
  assert.equal(mapped.projects.some(p => /歸屬/.test(p.title)), false)
})
