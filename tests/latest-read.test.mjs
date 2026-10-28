import test from 'node:test'
import assert from 'node:assert/strict'
import { createLatestRead, officeReadDecision, readOfficeLatest } from '../src/lib/latestRead.js'
import { OWNER_REREAD_FAILED, OWNER_SAVED_REREAD_FAILED, feedbackAfterReread, feedbackAfterSave } from '../src/lib/ownerBotUi.js'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const fail = message => Object.assign(new Error(message), { kind: 'error' })

test('讀取結果：empty 落地，失敗留下舊資料，過期與中止不落地', () => {
  assert.equal(officeReadDecision({ current: true, error: null }), 'apply')
  assert.equal(officeReadDecision({ current: true, error: Object.assign(new Error('尚無資料'), { kind: 'empty' }) }), 'apply-empty')
  assert.equal(officeReadDecision({ current: true, error: fail('down') }), 'fail')
  assert.equal(officeReadDecision({ current: false, error: fail('down') }), 'stale')
  assert.equal(officeReadDecision({ current: true, error: Object.assign(new Error('aborted'), { name: 'AbortError' }) }), 'stale')
  assert.equal(officeReadDecision({ current: false, error: null }), 'stale')
})

test('儲存後的重新讀取失敗時列上的 revision 不變，而且可以再試', async () => {
  const gate = createLatestRead()
  let projects = [{ id: 'p-001', ownerBot: '', revision: 4 }]
  const applied = []
  let release
  const saved = readOfficeLatest(gate, {
    load: () => new Promise((resolve, reject) => { release = { resolve, reject } }),
    onApply(data) { projects = data.projects; applied.push(data) },
    onFail() {},
  })
  release.reject(fail('get failed'))
  await assert.rejects(saved, error => error.message === 'get failed')
  assert.equal(projects[0].revision, 4)
  assert.equal(projects[0].ownerBot, '')
  assert.deepEqual(applied, [])
  const feedback = feedbackAfterSave(false, 'Sam')
  assert.equal(feedback.notice, '')
  assert.equal(feedback.error, OWNER_SAVED_REREAD_FAILED)
  assert.equal(feedback.kind, 'conflict')
  const again = feedbackAfterReread(false, feedback)
  assert.equal(again.kind, 'conflict')
  assert.equal(again.error, OWNER_SAVED_REREAD_FAILED)
  assert.equal(projects[0].revision, 4)
})

test('重新讀取成功之後才清錯誤，並列上新的 revision', async () => {
  const gate = createLatestRead()
  let projects = [{ id: 'p-001', ownerBot: '', revision: 4 }]
  let feedback = feedbackAfterSave(false, 'Sam')
  let release
  const reread = readOfficeLatest(gate, {
    load: () => new Promise(resolve => { release = resolve }),
    onApply(data) { projects = data.projects },
  })
  let settled = false
  reread.then(() => { settled = true })
  await flush()
  assert.equal(settled, false)
  assert.equal(feedback.error, OWNER_SAVED_REREAD_FAILED)
  release({ projects: [{ id: 'p-001', ownerBot: 'sam', revision: 5 }] })
  await reread
  feedback = feedbackAfterReread(true, feedback)
  assert.equal(projects[0].revision, 5)
  assert.equal(projects[0].ownerBot, 'sam')
  assert.equal(feedback.error, '')
  assert.equal(feedback.kind, '')
  assert.equal(feedback.notice, '已把負責 Bot 設為 Sam。')
})

test('被輪詢換掉的讀取不會先成功；最新一次失敗時選擇器也失敗', async () => {
  const gate = createLatestRead()
  let projects = [{ id: 'p-001', ownerBot: '', revision: 4 }]
  const applied = []
  let releaseSave, releasePoll
  const save = readOfficeLatest(gate, {
    load: () => new Promise(resolve => { releaseSave = resolve }),
    onApply(data) { projects = data.projects; applied.push('save') },
  })
  const poll = readOfficeLatest(gate, {
    load: () => new Promise((resolve, reject) => { releasePoll = { resolve, reject } }),
    onApply(data) { projects = data.projects; applied.push('poll') },
  })
  const swallowed = poll.catch(() => 'swallowed')
  let saveState = 'pending'
  save.then(() => { saveState = 'ok' }, () => { saveState = 'bad' })
  releaseSave({ projects: [{ id: 'p-001', ownerBot: 'sam', revision: 5 }] })
  await flush()
  assert.equal(saveState, 'pending')
  assert.deepEqual(applied, [])
  assert.equal(projects[0].revision, 4)
  releasePoll.reject(fail('poll failed'))
  await assert.rejects(save, error => error.message === 'poll failed')
  assert.equal(await swallowed, 'swallowed')
  assert.deepEqual(applied, [])
  assert.equal(projects[0].revision, 4)
  assert.equal(feedbackAfterSave(false, 'Sam').kind, 'conflict')
})

test('最新一次成功落地後，較早的讀取才 resolve，而且不用舊資料', async () => {
  const gate = createLatestRead()
  let projects = [{ id: 'p-001', revision: 4 }]
  let releaseSave, releasePoll
  const save = readOfficeLatest(gate, {
    load: () => new Promise(resolve => { releaseSave = resolve }),
    onApply(data) { projects = data.projects },
  })
  const poll = readOfficeLatest(gate, {
    load: () => new Promise(resolve => { releasePoll = resolve }),
    onApply(data) { projects = data.projects },
  })
  releaseSave({ projects: [{ id: 'p-001', revision: 5 }] })
  await flush()
  assert.equal(projects[0].revision, 4)
  releasePoll({ projects: [{ id: 'p-001', revision: 6 }] })
  assert.equal((await save).projects[0].revision, 6)
  assert.equal((await poll).projects[0].revision, 6)
  assert.equal(projects[0].revision, 6)
  assert.equal(feedbackAfterSave(true, '小因').notice, '已把負責 Bot 設為 小因。')
})

test('較早的失敗不會擋住最新一次成功', async () => {
  const gate = createLatestRead()
  const applied = []
  let releaseSave, releasePoll
  const poll = readOfficeLatest(gate, {
    load: () => new Promise((resolve, reject) => { releasePoll = reject }),
    onApply(data) { applied.push(data) },
    onFail(error) { applied.push(error) },
  })
  const save = readOfficeLatest(gate, {
    load: () => new Promise(resolve => { releaseSave = resolve }),
    onApply(data) { applied.push(data) },
  })
  releasePoll(fail('old'))
  await flush()
  assert.deepEqual(applied, [])
  releaseSave({ projects: [{ revision: 9 }] })
  assert.equal((await save).projects[0].revision, 9)
  assert.equal((await poll).projects[0].revision, 9)
  assert.equal(applied.length, 1)
  assert.equal(applied[0].projects[0].revision, 9)
})

test('過期的成功在最新一次已經失敗後仍不落地', async () => {
  const gate = createLatestRead()
  let projects = [{ id: 'p-001', revision: 4 }]
  const applied = []
  let releaseSave, releasePoll
  const save = readOfficeLatest(gate, {
    load: () => new Promise(resolve => { releaseSave = resolve }),
    onApply(data) { projects = data.projects; applied.push(data) },
  })
  const poll = readOfficeLatest(gate, {
    load: () => new Promise((resolve, reject) => { releasePoll = { resolve, reject } }),
    onApply(data) { projects = data.projects; applied.push(data) },
  })
  const saveDone = assert.rejects(save, error => error.message === 'poll failed')
  const pollDone = assert.rejects(poll, error => error.message === 'poll failed')
  releasePoll.reject(fail('poll failed'))
  await flush()
  releaseSave({ projects: [{ id: 'p-001', revision: 8 }] })
  await saveDone
  await pollDone
  assert.deepEqual(applied, [])
  assert.equal(projects[0].revision, 4)
})

test('empty 已寫入就 resolve，不當成重新讀取失敗', async () => {
  const gate = createLatestRead()
  let state = { office: { projects: [{ revision: 4 }] }, empty: false, failed: false }
  const empty = Object.assign(new Error('尚無資料'), { kind: 'empty' })
  const read = readOfficeLatest(gate, {
    load: () => Promise.reject(empty),
    onApply() { throw new Error('不該當成一般成功') },
    onEmpty() { state = { office: null, empty: true, failed: false } },
    onFail() { state = { ...state, failed: true } },
  })
  assert.equal(await read, null)
  assert.deepEqual(state, { office: null, empty: true, failed: false })
  assert.equal(feedbackAfterSave(true, 'Sam').error, '')
})

test('中止與卸載不更新畫面，也不把過期讀取當成成功', async () => {
  const gate = createLatestRead()
  const applied = []
  const failed = []
  let release
  const read = readOfficeLatest(gate, {
    load: () => new Promise(resolve => { release = resolve }),
    onApply(data) { applied.push(data) },
    onFail(error) { failed.push(error) },
  })
  gate.bump()
  release({ projects: [{ revision: 8 }] })
  await assert.rejects(read, error => error.name === 'StaleRead')
  assert.deepEqual(applied, [])
  assert.deepEqual(failed, [])

  const aborted = readOfficeLatest(createLatestRead(), {
    load: () => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
    onApply(data) { applied.push(data) },
    onFail(error) { failed.push(error) },
  })
  await assert.rejects(aborted, error => error.name === 'StaleRead')
  assert.deepEqual(applied, [])
  assert.deepEqual(failed, [])
})

test('不是儲存後的重新讀取失敗仍保留重試，文案不說成已儲存', () => {
  const feedback = feedbackAfterReread(false, { error: '資料已被更新，請重新讀取', kind: 'conflict' })
  assert.equal(feedback.kind, 'conflict')
  assert.equal(feedback.error, OWNER_REREAD_FAILED)
  assert.equal(feedback.notice, '')
})
