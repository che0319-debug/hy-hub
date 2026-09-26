import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isolatedTestUrl } from '../src/aiWorkTestLink.mjs'
test('Test navigation requires separate HTTPS origin without credential forwarding', () => {
  const production = 'https://hy.example'
  for (const value of [undefined, '', '/ai-work-test', 'javascript:alert(1)',
    production + '/ai-work-test', 'http://test.example/ai-work-test',
    'https://user:secret@test.example/ai-work-test',
    'https://test.example/ai-work-test?token=production',
    'https://test.example/ai-work-test#token', 'https://test.example/wrong']) {
    assert.equal(isolatedTestUrl(value, production), null)
  }
  assert.equal(isolatedTestUrl('https://test.example/ai-work-test', production),
    'https://test.example/ai-work-test')
})
