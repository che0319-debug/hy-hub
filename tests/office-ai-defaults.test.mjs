import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { OFFICE_AI_CHOICES, OFFICE_AI_DEFAULTS, officeAiConflict, parseOfficeSettings, seedOfficeAi } from '../src/lib/officeAiDefaults.mjs'
import { mapOffice } from '../src/botOfficeData.js'

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

test('home has 設定 beside 重新整理; settings dialog and APIs exist', () => {
  const home = read('../src/pages/OfficeHome.jsx')
  assert.match(home, /重新整理<\/button><button className="ao-btn"[^>]*>設定<\/button>/)
  assert.match(home, /onSettings/)
  const office = read('../src/pages/BotOffice.jsx')
  assert.match(office, /onSettings=\{\(\)=>setSettingsOpen\(true\)\}/)
  assert.match(office, /備案 \{OFFICE_NAMES\[project\.executorBackup\]/)
  assert.match(office, /<OfficeSettings /)
  const settings = read('../src/components/OfficeSettings.jsx')
  assert.match(settings, /getOfficeSettings/)
  assert.match(settings, /saveOfficeSettings/)
  assert.match(settings, /設定已被更新，請重新整理/)
  assert.match(settings, /Escape/)
  assert.match(settings, /既有專案/)
  assert.match(settings, /每次通知你/)
  assert.doesNotMatch(settings, /套用到所有/)
  const api = read('../src/api.js')
  assert.match(api, /export async function getOfficeSettings/)
  assert.match(api, /export async function saveOfficeSettings/)
  assert.match(api, /\/api\/office\/settings/)
  const actions = read('../src/components/OfficeActions.jsx')
  assert.match(actions, /executor_backup/)
  assert.match(actions, /reviewer_backup/)
  assert.match(actions, /seedOfficeAi/)
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
