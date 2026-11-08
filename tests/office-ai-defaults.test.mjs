import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { OFFICE_AI_CHOICES, OFFICE_AI_DEFAULTS, officeAiConflict, parseOfficeSettings, seedOfficeAi } from '../src/lib/officeAiDefaults.mjs'
import { applyOfficeRequest, mapOffice, reassignApplyFailureMessage } from '../src/botOfficeData.js'

const read = rel => readFileSync(new URL(rel, import.meta.url), 'utf8')

test('system defaults are grok-build/claude executor and gpt/claude reviewer', () => {
  assert.deepEqual(OFFICE_AI_CHOICES, ['grok-build', 'gpt', 'claude'])
  assert.deepEqual(OFFICE_AI_DEFAULTS, {
    executor: { primary: 'grok-build', backup: 'claude' },
    reviewer: { primary: 'gpt', backup: 'claude' },
  })
  assert.deepEqual(officeAiConflict(OFFICE_AI_DEFAULTS), [])
})

test('primaries must differ and backup must differ from the same role primary', () => {
  assert.deepEqual(officeAiConflict({
    executor: { primary: 'gpt', backup: 'claude' },
    reviewer: { primary: 'gpt', backup: 'claude' },
  }), ['執行與審查主案必須不同'])
  assert.deepEqual(officeAiConflict({
    executor: { primary: 'grok-build', backup: 'grok-build' },
    reviewer: { primary: 'gpt', backup: 'claude' },
  }), ['備案必須與同一角色的主案不同'])
  assert.deepEqual(officeAiConflict({
    executor: { primary: 'claude', backup: 'gpt' },
    reviewer: { primary: 'claude', backup: 'claude' },
  }), ['執行與審查主案必須不同', '備案必須與同一角色的主案不同'])
})

test('parseOfficeSettings fills missing values from the decided defaults', () => {
  assert.deepEqual(parseOfficeSettings({}).ai_defaults, OFFICE_AI_DEFAULTS)
  const parsed = parseOfficeSettings({
    settings: { ai_defaults: { executor: { primary: 'gpt', backup: 'grok-build' }, reviewer: { primary: 'claude', backup: 'gpt' }, revision: 4 } },
  })
  assert.equal(parsed.revision, 4)
  assert.equal(parsed.ai_defaults.executor.primary, 'gpt')
  assert.equal(parsed.ai_defaults.reviewer.primary, 'claude')
})

test('seedOfficeAi prefers the project assignment then settings then defaults', () => {
  assert.deepEqual(seedOfficeAi(null, null), {
    executor: 'grok-build', reviewer: 'gpt', executor_backup: 'claude', reviewer_backup: 'claude',
  })
  assert.deepEqual(seedOfficeAi({
    executor: { primary: 'gpt', backup: 'grok-build' },
    reviewer: { primary: 'claude', backup: 'gpt' },
  }, { executor: 'claude', reviewer: 'gpt', executorBackup: 'gpt', reviewerBackup: 'grok-build' }), {
    executor: 'claude', reviewer: 'gpt', executor_backup: 'gpt', reviewer_backup: 'grok-build',
  })
})

test('seedOfficeAi does not open reassign with a default backup equal to the project primary', () => {
  const seeded = seedOfficeAi(null, { executor: 'grok-build', reviewer: 'claude' })
  assert.deepEqual(seeded, {
    executor: 'grok-build', reviewer: 'claude', executor_backup: 'claude', reviewer_backup: 'gpt',
  })
  assert.deepEqual(officeAiConflict({
    executor: { primary: seeded.executor, backup: seeded.executor_backup },
    reviewer: { primary: seeded.reviewer, backup: seeded.reviewer_backup },
  }), [])
  assert.equal(seedOfficeAi(null, {
    executor: 'grok-build', reviewer: 'claude', reviewerBackup: 'claude',
  }).reviewer_backup, 'claude')
})

test('mapOffice keeps backup fields and top-level settings', () => {
  const out = mapOffice({
    buildings: [{ id: 'p', title: '專案', executor: 'grok-build', reviewer: 'gpt', executor_backup: 'claude', reviewer_backup: 'claude' }],
    settings: { ai_defaults: OFFICE_AI_DEFAULTS, revision: 1 },
  }, { cards: [] })
  assert.equal(out.projects[0].executorBackup, 'claude')
  assert.equal(out.projects[0].reviewerBackup, 'claude')
  assert.equal(out.settings.revision, 1)
  assert.equal(out.settings.ai_defaults.executor.primary, 'grok-build')
})

test('Office removes the fixed executor configuration entry', () => {
  const home = read('../src/pages/OfficeHome.jsx')
  const office = read('../src/pages/BotOffice.jsx')
  assert.doesNotMatch(home, /全系統預設 AI 設定/)
  assert.doesNotMatch(office, /<OfficeSettings /)
  assert.doesNotMatch(office, /AI 執行配置/)
  assert.match(office, /OfficeUnifiedReport/)
})

test('applyOfficeRequest posts to the apply endpoint and speaks Traditional Chinese', async () => {
  assert.equal(reassignApplyFailureMessage(403, { error: 'office_owner_only' }), '只有你本人可以套用改派。')
  assert.equal(reassignApplyFailureMessage(409, { error: 'office_request_not_open' }), '這筆改派已經套用，或不是待套用狀態。')
  assert.equal(reassignApplyFailureMessage(409, { error: 'office_request_not_reassign' }), '這不是改派，不能套用。')
  assert.match(reassignApplyFailureMessage(400, { error: 'office_request_invalid' }), /沒有套用/)
  assert.doesNotMatch(reassignApplyFailureMessage(409, { error: 'office_request_not_open' }), /applied|request/i)
  let call
  const saved = await applyOfficeRequest('legacy/1', {
    headers: { Authorization: 'session' },
    base: 'http://hub.test',
    fetcher: async (...args) => {
      call = args
      return new Response(JSON.stringify({ request: { status: 'applied' }, project: { revision: 3 } }))
    },
  })
  assert.equal(call[0], 'http://hub.test/api/office/requests/legacy%2F1/apply')
  assert.equal(call[1].method, 'POST')
  assert.equal(call[1].headers.Authorization, 'session')
  assert.equal(call[1].headers['X-Brain-Write-Token'], undefined)
  assert.equal(call[1].body, '{}')
  assert.equal(saved.project.revision, 3)
  await assert.rejects(applyOfficeRequest('legacy-1', {
    fetcher: async () => new Response(JSON.stringify({ error: 'office_request_not_open' }), { status: 409 }),
  }), error => error.kind === 'conflict' && error.message === '這筆改派已經套用，或不是待套用狀態。')
})

test('selects declare a light color-scheme and explicit option colors', () => {
  const hy = read('../public/hy-ui/hy-ui.css')
  assert.match(hy, /:root\{[\s\S]*color-scheme:\s*light;/)
  assert.match(hy, /select, option, optgroup \{ color: var\(--hy-ink\); background-color: var\(--hy-surface\); \}/)
  const ao = read('../src/pages/ai-office-v1.css')
  assert.match(ao, /\.ao select option/)
  const rt = read('../src/components/router-controls.css')
  assert.match(rt, /\.rt-root select option/)
  const index = read('../src/index.css')
  assert.match(index, /color-scheme:\s*light/)
})
