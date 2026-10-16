import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { readProjectSummary } from '../src/lib/projectSummary.mjs'

test('summary pages keep all packages for exact progress counts', async () => {
  const calls = []
  const read = async path => {
    calls.push(path)
    return calls.length === 1
      ? { packages: [{id:'a'}], pagination: {packages: {next_offset:100}} }
      : { packages: [{id:'b'}], pagination: {packages: {next_offset:null}} }
  }
  const result = await readProjectSummary(read, '/projects/p')
  assert.deepEqual(result.packages.map(p => p.id), ['a','b'])
  assert.equal(calls[0], '/projects/p?detail=summary&package_limit=100')
  assert.match(calls[1], /package_offset=100/)
})
test('old server without pagination stays compatible', async () => {
  const data = {packages:[{id:'legacy'}]}
  assert.equal(await readProjectSummary(async () => data, '/projects/p'), data)
})
test('reject non-advancing pages rather than loop forever', async () => {
  await assert.rejects(readProjectSummary(async () => ({packages:[],pagination:{packages:{next_offset:100}}}), '/projects/p'), /未前進/)
})
test('detail views request full and lists use summaries', () => {
  const office = fs.readFileSync(new URL('../src/pages/AIOfficeV1.jsx', import.meta.url), 'utf8')
  const control = fs.readFileSync(new URL('../src/pages/ControlCenterV5.jsx', import.meta.url), 'utf8')
  assert.match(office, /readProjectSummary\(office, ppath\(p.id\)\)/)
  assert.match(office, /ppath\(id\).*detail=full/)
  assert.match(control, /encodeURIComponent\(id\).*detail=full/)
})
