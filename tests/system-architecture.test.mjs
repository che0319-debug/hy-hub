import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../src/pages/SystemArchitecture.jsx', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('../src/layout/Sidebar.jsx', import.meta.url), 'utf8')
const routes = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')

test('system architecture is an isolated top-level route', () => {
  assert.match(sidebar, /to: '\/system-architecture'/)
  assert.match(routes, /path="system-architecture" element=\{<SystemArchitecture \/>\}/)
})

test('all six proposed core modules are listed', () => {
  for (const name of ['PI Engine', 'Mission Engine', 'Quality Engine', 'Expert Service', 'Report Service', 'Resource Service']) {
    assert.ok(page.includes(name), name)
  }
})

test('planning UI is gray and dashed; no unverified READY status', () => {
  assert.match(page, /border-dashed border-slate-300/)
  assert.match(page, /待驗收/)
  assert.doesNotMatch(page, /setStatus|setReady|>READY<|>BUILDING</)
})

test('UI only calls the isolated PI Lab preparation API', () => {
  assert.match(page, /pi-lab\/prepare/)
  assert.match(page, /authHeaders\(\)/)
  assert.doesNotMatch(page, /axios|localStorage|\/pi-lab\/execute|\/package_submit|\/publish/)
  assert.match(page, /model_invoked|未執行模型/)
  assert.match(page, /基礎設施/)
  assert.match(page, /模組建設原則/)
})

test('PI Lab supports isolated job creation and readback without direct production dispatch', () => {
  assert.match(page, /pi-lab\/jobs/)
  assert.match(page, /createPiLabJob/)
  assert.match(page, /refreshPiLabJob/)
  assert.doesNotMatch(page, /package_chat_claim|package_submit|\/dispatch\/next/)
})
