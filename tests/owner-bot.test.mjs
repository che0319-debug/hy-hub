import test from 'node:test'
import assert from 'node:assert/strict'
import { assignProjectOwnerBot, mapOffice, ownerBotFailureMessage } from '../src/botOfficeData.js'
import { assignOwnerPanelId, buildInbox, isAssignOwnerAttention } from '../src/inbox/inboxData.js'
import { deriveAtlas, deriveOffice, ownerBotChoices, unownedProjects } from '../src/life-island/worldData.js'

const buildings = [
  { id: 'p-001', title: '川泱購物：電商平台建置與推廣專案', stage: 'done', revision: 4 },
  { id: 'p-002', title: '家庭週末安排', owner_bot: 'family', stage: 'review', revision: 2 },
  { id: 'p-003', title: '怪值歸屬', owner_bot: 'atlas', stage: 'returned', revision: 1 },
  { id: 'p-004', title: '空字串', owner_bot: '', stage: 'assigned' },
  { id: 'p-005', title: 'Sam 的案子', owner_bot: 'sam', stage: 'running', revision: 0 },
  { id: 'p/006', title: '缺 revision', owner_bot: null, stage: 'unassigned' },
]

test('mapOffice 保留 revision 與 ownerBot，缺的 revision 當 0', () => {
  const out = mapOffice({ buildings }, { cards: [] })
  const done = out.projects.find(p => p.id === 'p-001')
  assert.equal(done.revision, 4)
  assert.equal(done.ownerBot, '')
  assert.equal(done.stage, 'done')
  assert.equal(done.stageLabel, '完成')
  assert.equal(done.source.owner_bot, undefined)
  assert.equal(done.source.revision, 4)
  assert.equal(out.projects.find(p => p.id === 'p-005').ownerBot, 'sam')
  assert.equal(out.projects.find(p => p.id === 'p-005').revision, 0)
  assert.equal(out.projects.find(p => p.id === 'p/006').revision, 0)
  assert.equal(out.projects.find(p => p.id === 'p/006').source.owner_bot, null)
  assert.equal(out.projects.find(p => p.id === 'p-002').island, '未分區')
})

test('未指定 owner 的專案含 done，有效 owner 排除，怪值當成空', () => {
  const office = mapOffice({ buildings }, { cards: [] })
  const rows = unownedProjects(office.projects)
  assert.deepEqual(rows.map(r => r.id), ['p-001', 'p-003', 'p-004', 'p/006'])
  assert.equal(rows[0].title, '川泱購物：電商平台建置與推廣專案')
  assert.equal(rows[0].stage, 'done')
  assert.equal(rows[0].stageLabel, '完成')
  assert.equal(rows[0].ownerBot, '')
  assert.equal(rows[0].revision, 4)
  assert.equal(rows[1].ownerBot, '')
  assert.equal(rows[1].revision, 1)
  assert.equal(rows[2].revision, 0)
  assert.equal(rows[3].revision, 0)
  assert.equal(deriveOffice(office).unowned, rows.length)
  assert.deepEqual(ownerBotChoices(), [
    { value: 'sam', label: 'Sam' },
    { value: 'family', label: '小因' },
    { value: '950157', label: '950157' },
    { value: 'hy', label: 'HY' },
  ])
  assert.deepEqual(unownedProjects(null), [])
})

test('assignProjectOwnerBot 用登入 header 送出，不帶寫入權杖', async () => {
  let call
  const payload = { request_id: 'req-1', owner_bot: 'sam', expected_owner_bot: '', expected_revision: 4 }
  const result = await assignProjectOwnerBot('p-001', payload, {
    base: 'https://api.example/',
    headers: { Authorization: 'Bearer test-session' },
    fetcher: async (...args) => {
      call = args
      return new Response(JSON.stringify({ project: { id: 'p-001', owner_bot: 'sam', revision: 5 }, updated: '2026-10-28T00:00:00+08:00' }))
    },
  })
  assert.equal(call[0], 'https://api.example/api/office/hy/projects/p-001/owner-bot')
  assert.equal(call[1].method, 'POST')
  assert.equal(call[1].cache, 'no-store')
  assert.equal(call[1].headers.Authorization, 'Bearer test-session')
  assert.equal(call[1].headers['Content-Type'], 'application/json')
  assert.equal(call[1].headers['X-Brain-Write-Token'], undefined)
  assert.deepEqual(JSON.parse(call[1].body), payload)
  assert.deepEqual(Object.keys(JSON.parse(call[1].body)).sort(), ['expected_owner_bot', 'expected_revision', 'owner_bot', 'request_id'])
  assert.equal(result.project.revision, 5)
})

test('缺 expected 時送空字串與 revision 0，專案 id 會編碼', async () => {
  let call
  await assignProjectOwnerBot('p/006', { request_id: 'req-2', owner_bot: 'hy' }, {
    headers: { Authorization: 'Bearer hy' },
    fetcher: async (...args) => { call = args; return new Response('{"project":{}}') },
  })
  assert.equal(call[0], '/api/office/hy/projects/p%2F006/owner-bot')
  assert.deepEqual(JSON.parse(call[1].body), { request_id: 'req-2', owner_bot: 'hy', expected_owner_bot: '', expected_revision: 0 })
  assert.equal(call[1].headers['X-Brain-Write-Token'], undefined)
})

test('負責 Bot 的錯誤碼有白話訊息', async () => {
  const cases = [
    [401, { error: 'unauthorized' }, '登入已過期，請重新登入。', 'auth'],
    [409, { error: 'office_owner_changed' }, '資料已被更新，請重新讀取', 'conflict'],
    [409, { error: 'office_revision_conflict' }, '資料已被更新，請重新讀取', 'conflict'],
    [404, { error: 'office_project_not_found' }, '此功能尚未上線或專案不存在', 'error'],
    [405, { error: 'method_not_allowed' }, '此功能尚未上線或專案不存在', 'error'],
    [409, { error: 'office_request_conflict' }, '同一個要求編號已經寫入過，但這次內容不同，所以沒有再寫。請重新讀取。', 'conflict'],
    [400, { error: 'office_project_invalid' }, '內容不符合規定，沒有寫入。', 'error'],
    [400, { error: 'office_owner_bot_invalid' }, '負責 Bot 不在可選名單裡，沒有寫入。', 'error'],
    [502, { error: 'brain_data_invalid' }, '後端資料異常，沒有寫入。', 'error'],
    [502, { error: 'brain_write_failed' }, '儲存沒有完成確認，不確定有沒有寫入。請重新讀取確認。', 'conflict'],
  ]
  for (const [status, body, message, kind] of cases) {
    assert.equal(ownerBotFailureMessage(status, body), message)
    await assert.rejects(
      assignProjectOwnerBot('p-001', { request_id: 'r', owner_bot: 'sam', expected_owner_bot: '', expected_revision: 0 }, {
        fetcher: async () => new Response(JSON.stringify(body), { status }),
      }),
      error => error.message === message && error.kind === kind && error.code === body.error,
    )
  }
  assert.match(ownerBotFailureMessage(409, { error: 'office_project_deleting' }), /正在刪除中/)
  assert.doesNotMatch(ownerBotFailureMessage(409, { error: 'office_project_deleting' }), /資料已被更新/)
  assert.match(ownerBotFailureMessage(409, { error: 'office_request_conflict' }), /已經寫入過/)
  assert.match(ownerBotFailureMessage(409, { error: 'office_request_conflict' }), /沒有再寫/)
  assert.doesNotMatch(ownerBotFailureMessage(409, { error: 'office_request_conflict' }), /資料剛更新過/)
  assert.match(ownerBotFailureMessage(400, { error: 'office_project_invalid' }), /沒有寫入/)
  assert.match(ownerBotFailureMessage(502, { error: 'brain_data_invalid' }), /沒有寫入/)
  assert.match(ownerBotFailureMessage(502, { error: 'brain_write_failed' }), /不確定有沒有寫入/)
  assert.doesNotMatch(ownerBotFailureMessage(502, { error: 'brain_write_failed' }), /異常，沒有寫入/)
  assert.equal(ownerBotFailureMessage(0, {}), '無法連線，請稍後重試。')
  await assert.rejects(
    assignProjectOwnerBot('p-001', { request_id: 'r', owner_bot: 'sam' }, { fetcher: async () => { throw new Error('offline') } }),
    error => error.kind === 'network' && error.message === '無法連線，請稍後重試。',
  )
})

test('Inbox 專案歸屬卡可選擇負責 Bot，其他問題卡仍是連結', () => {
  const items = buildInbox({
    bots: {
      atlas: { attention: [
        { level: 'bad', text: '專案歸屬：1 個專案沒有指定 owner_bot', go: 'office', handle: 'assign-owner' },
        { level: 'bad', text: 'Bot Office 讀取：讀取失敗', go: 'office' },
      ] },
      xiaoyin: { attention: [{ level: 'bad', text: '專案被退回 1 件', go: 'office' }] },
    },
  })
  const owner = items.find(item => item.title.startsWith('專案歸屬'))
  assert.equal(owner.kind, 'problem')
  assert.equal(owner.source, 'Atlas')
  assert.equal(owner.assignOwner, true)
  assert.equal(owner.action, '處理')
  assert.equal(owner.to, null)
  assert.equal(owner.id, 'pb:atlas:assign-owner')
  const read = items.find(item => item.title.startsWith('Bot Office'))
  assert.equal(read.assignOwner, false)
  assert.equal(read.action, '處理')
  assert.equal(read.to, '/bot-office')
  const returned = items.find(item => item.title.startsWith('專案被退回'))
  assert.equal(returned.assignOwner, false)
  assert.equal(returned.to, '/bot-office')
  const fromText = buildInbox({ bots: { atlas: { attention: [{ level: 'bad', text: '專案歸屬：2 個專案沒有指定 owner_bot', go: 'office' }] } } })
  assert.equal(fromText[0].assignOwner, true)
  assert.equal(fromText[0].to, null)
  const otherTitle = buildInbox({ bots: { atlas: { attention: [{ level: 'bad', text: '專案歸屬：請到辦公室看', go: 'office' }] } } })
  assert.equal(otherTitle[0].assignOwner, false)
  assert.equal(otherTitle[0].to, '/bot-office')
  assert.equal(otherTitle[0].action, '處理')
  const byHandle = buildInbox({ bots: { atlas: { attention: [{ level: 'bad', text: '專案歸屬：其他說明', go: 'office', handle: 'assign-owner' }] } } })
  assert.equal(byHandle[0].assignOwner, true)
  assert.equal(byHandle[0].to, null)
  assert.equal(isAssignOwnerAttention({ text: '專案歸屬：1 個專案沒有指定 owner_bot。' }), false)
  assert.equal(assignOwnerPanelId('pb:atlas:assign-owner'), 'assign-owner-pb:atlas:assign-owner')
  assert.notEqual(assignOwnerPanelId('pb:atlas:assign-owner'), assignOwnerPanelId('pb:family:assign-owner'))
})

test('deriveAtlas 的專案歸屬異常帶 assign-owner', () => {
  const now = Date.parse('2026-10-28T04:00:00Z')
  const atlas = deriveAtlas({ office: { updatedAt: new Date(now - 2 * 3600e3).toISOString(), stale: false }, officeEmpty: false, failed: {}, todoFailed: false, unowned: 1, loaded: true }, now)
  const item = atlas.attention.find(entry => entry.text.startsWith('專案歸屬'))
  assert.equal(item.handle, 'assign-owner')
  assert.equal(item.go, 'office')
  assert.equal(item.level, 'bad')
})
