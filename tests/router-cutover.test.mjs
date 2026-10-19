import test from 'node:test'
import assert from 'node:assert/strict'
import { registerRouterCutoverTools } from '../src/lib/routerCutoverTools.mjs'

function setup(request) {
  const tools = new Map()
  const signals = []
  const close = registerRouterCutoverTools({ registerTool(tool, { signal }) {
    tools.set(tool.name, tool); signals.push(signal)
  } }, request)
  return { close, signals, preview: tools.get('hy_router_cutover_preview').execute,
    apply: tools.get('hy_router_cutover_apply').execute }
}
const authorization = { confirmed: true, authority_ref: 'owner-chat-20261019-router-cutover' }
const report = { expected_projects: [{ project_id: 'p', package_ids: ['wp'] }], blocked: [] }

test('preview is read-only; apply requires explicit authorization and the exact latest manifest', async () => {
  const calls = []
  const t = setup(async (path, options) => { calls.push({ path, options }); return path.endsWith('preview') ? structuredClone(report) : { finalized: true } })
  await assert.rejects(t.apply(authorization), /PREVIEW_REQUIRED/)
  assert.equal(calls.length, 0)
  assert.deepEqual(JSON.parse(await t.preview()), report)
  assert.equal(calls[0].path, '/cutover/preview')
  assert.equal(calls[0].options.method, undefined)
  for (const bad of [{}, { confirmed: false, authority_ref: 'x' }, { confirmed: true, authority_ref: ' ' }]) await assert.rejects(t.apply(bad), /CONFIRMATION_REQUIRED/)
  assert.equal(calls.length, 1)
  assert.deepEqual(JSON.parse(await t.apply({ ...authorization, expected_projects: [{ project_id: 'evil' }] })), { finalized: true })
  assert.equal(calls[1].path, '/cutover/apply')
  assert.equal(calls[1].options.method, 'POST')
  assert.deepEqual(calls[1].options.body, { ...authorization, expected_projects: report.expected_projects })
  await assert.rejects(t.apply(authorization), /PREVIEW_REQUIRED/)
})

test('server refusal propagates; no implicit retry or stale preview reuse', async () => {
  let writes = 0
  const t = setup(async path => {
    if (path.endsWith('preview')) return report
    writes++; throw new Error('ROUTER_MIGRATION_ACTIVE_LEASE')
  })
  await t.preview()
  await assert.rejects(t.apply(authorization), /ACTIVE_LEASE/)
  await assert.rejects(t.apply(authorization), /PREVIEW_REQUIRED/)
  assert.equal(writes, 1)
})

test('concurrent writes blocked; cleanup aborts execution and invalidates tools', async () => {
  let release
  let signal
  const t = setup(async (path, options) => {
    if (path.endsWith('preview')) return report
    signal = options.signal
    return new Promise(resolve => { release = resolve })
  })
  await t.preview()
  const write = t.apply(authorization, { signal: new AbortController().signal })
  await assert.rejects(t.apply(authorization), /BUSY/)
  t.close()
  assert.equal(signal.aborted, true)
  assert(t.signals.every(s => s.aborted))
  release({ finalized: true }); await write
  await assert.rejects(t.preview(), /TOOLS_CLOSED/)
})

test('unsupported browsers and registration rejection cannot break the page', async () => {
  assert.doesNotThrow(() => registerRouterCutoverTools(undefined, () => {})())
  let signal
  registerRouterCutoverTools({ registerTool(_, options) { signal = options.signal; throw new Error('unsupported') } }, () => {})
  assert.equal(signal.aborted, true)
})
