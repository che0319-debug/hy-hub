import test from 'node:test'
import assert from 'node:assert/strict'
import { answerOfficeDecision, writeOffice } from '../src/botOfficeData.js'
test('answers patch one decision, using owner session and explicit revision', async () => {
  let call
  const payload = { action: 'answer', question_no: 1, expected_revision: 2, answer: 'A' }
  const result = await answerOfficeDecision('d/1', payload, { headers: { Authorization: 'test-session' }, fetcher: async (...args) => {
    call = args; return new Response('{"decision":{"revision":3}}')
  } })
  assert.equal(call[0], '/api/office/decisions/d%2F1/answer')
  assert.equal(call[1].method, 'POST')
  assert.equal(call[1].headers.Authorization, 'test-session')
  assert.equal(call[1].headers['X-Brain-Write-Token'], undefined)
  assert.deepEqual(JSON.parse(call[1].body), payload)
  assert.equal(result.decision.revision, 3)
})
for (const [status,kind] of [[401,'auth'],[409,'conflict'],[413,'error'],[502,'error']]) {
  test(`write ${status} remains explicit without retry or fake success`, async () => {
    let calls = 0
    await assert.rejects(answerOfficeDecision('d', {}, { fetcher: async () => { calls++; return new Response('{}', { status }) } }), e => e.kind === kind)
    assert.equal(calls, 1)
  })
}


test('office requests and logs use human session and one POST without snapshot key', async () => {
  for (const path of ['requests','log']) {
    let call
    await writeOffice(path,{request_id:'once',project:'p',content:'留言'},{headers:{Authorization:'session'},fetcher:async (...args)=>{call=args;return new Response('{}')}})
    assert.equal(call[0],'/api/office/'+path);assert.equal(call[1].method,'POST')
    assert.equal(call[1].headers.Authorization,'session');assert.equal(call[1].headers['X-Brain-Write-Token'],undefined)
  }
})
