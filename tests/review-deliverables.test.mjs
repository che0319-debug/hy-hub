import test from 'node:test'
import assert from 'node:assert/strict'
import { reviewDeliverables } from '../src/lib/reviewDeliverables.js'

const project = {
  packages: [
    { id: 'wp-a', milestone_id: 'M3', type: 'TASK', task: 'A', result: { status: 'COMPLETED', summary: 'A 完成', outputs: ['o'], artifacts: [{ file_id: 'f1' }] } },
    { id: 'wp-b', milestone_id: 'M3', type: 'TASK', task: 'B', result: null },
    { id: 'wp-r', milestone_id: null, type: 'REVISION', task: '依 HY 建議處理', result: { status: 'COMPLETED', summary: '已採納', outputs: [], artifacts: [{ file_id: 'f2' }] } },
  ],
  files: [
    { file_id: 'f1', filename: 'a.md', work_package_id: 'wp-a' },
    { file_id: 'f2', filename: '總覽.md', work_package_id: 'wp-r' },
  ],
}

test('package-bound review shows that package and its files', () => {
  const [d] = reviewDeliverables(project, { action_type: 'MILESTONE_REVIEW', work_package_id: 'wp-r', title: '驗收建議處理成果' })
  assert.equal(d.summary, '已採納')
  assert.deepEqual(d.files.map(f => f.filename), ['總覽.md'])
})

test('milestone review shows completed packages of that milestone', () => {
  const list = reviewDeliverables(project, { action_type: 'MILESTONE_REVIEW', work_package_id: null, title: 'M3' })
  assert.deepEqual(list.map(d => d.id), ['wp-a'])
  assert.deepEqual(list[0].files.map(f => f.file_id), ['f1'])
})

test('artifact without a registered file still links by id; other actions show nothing', () => {
  const p = { packages: [{ id: 'x', type: 'TASK', result: { status: 'COMPLETED', artifacts: [{ file_id: 'z' }] } }], files: [] }
  assert.equal(reviewDeliverables(p, { work_package_id: 'x' })[0].files[0].file_id, 'z')
  assert.deepEqual(reviewDeliverables(project, { action_type: 'SUPPLEMENT', title: 'M3' }), [])
})
