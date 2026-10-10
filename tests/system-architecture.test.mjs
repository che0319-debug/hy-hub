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
  assert.doesNotMatch(page, /READY|BUILDING|setStatus|setReady/)
})

test('UI remains read-only without network writes or existing feature changes', () => {
  assert.doesNotMatch(page, /fetch\(|axios|localStorage|POST|PUT|DELETE/)
  assert.match(page, /基礎設施/)
  assert.match(page, /模組建設原則/)
})
