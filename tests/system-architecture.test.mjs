import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fetchModules, validateModules, safeGithubUrl } from '../src/lib/moduleRegistry.js'
const page = readFileSync(new URL('../src/pages/SystemArchitecture.jsx', import.meta.url), 'utf8')
const overview = readFileSync(new URL('../src/components/ModuleRegistryOverview.jsx', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('../src/layout/Sidebar.jsx', import.meta.url), 'utf8')
const routes = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const seed = JSON.parse(readFileSync(new URL('./fixtures/module-registry.json', import.meta.url), 'utf8'))
test('architecture keeps its top-level route; retired PI Lab is gone', () => {
  assert.match(sidebar, /to: '\/system-architecture'/)
  assert.match(routes, /path="system-architecture" element=\{<SystemArchitecture \/>\}/)
  assert.match(page, /ModuleRegistryOverview/)
  for(const name of ['pi-lab', 'PiLab', '引擎測試']) assert.ok(!page.includes(name))
  assert.doesNotMatch(page + overview, /moduleEvidence|package_chat_claim|package_submit|\/dispatch\/next|setReady/)
})
test('registry has all modules with independent construction and acceptance', () => {
  assert.equal(validateModules({modules: seed}).length, 18)
  assert.equal(seed.filter(m => m.acceptance_status === 'ACCEPTED').length, 0)
  assert.match(overview, /implementationLabels\[m.implementation_status\]/)
  assert.match(overview, /acceptanceLabels\[m.acceptance_status\]/)
  assert.match(overview, /setModules\(null\)/)
})
test('unverified or mismatched acceptance is rejected', () => {
  for(const change of [{acceptance_status:'ACCEPTED'}, {acceptance_status:'ACCEPTED',acceptance_record:{action_id:'x',actor:'owner',decision:'APPROVED',version:'old',commit:'old'}}]) {
    const modules = structuredClone(seed);Object.assign(modules[0],change)
    assert.throws(()=>validateModules({modules}),/驗收紀錄/)
  }
  assert.throws(()=>validateModules({modules:seed.slice(1)}),/不完整/)
})
test('API errors produce no fallback, including backend not yet deployed', async () => {
  for(const status of [404,401,403,500,503]) await assert.rejects(fetchModules({fetcher:async()=>({ok:false,status})}), /尚未部署|重新登入|讀取失敗/)
  await assert.rejects(fetchModules({fetcher:async()=>{throw new Error('network')}}), /network/)
  await assert.rejects(fetchModules({fetcher:async()=>({ok:true,json:async()=>({modules:[]})})}), /不完整/)
})
test('authenticated no-store read and safe evidence links', async () => {
  let options
  assert.equal((await fetchModules({headers:{Authorization:'Bearer fixture'},fetcher:async(url,o)=>{options=o;assert.equal(url,'/api/module-registry');return {ok:true,json:async()=>({modules:seed})}}})).length,18)
  assert.equal(options.cache,'no-store');assert.equal(options.headers.Authorization,'Bearer fixture')
  assert.equal(safeGithubUrl('javascript:alert(1)'),null)
  assert.equal(safeGithubUrl('https://github.com.evil.example/che0319-debug/hy-hub/a'),null)
  assert.ok(safeGithubUrl('https://github.com/che0319-debug/hy-hub/commit/abc'))
})
