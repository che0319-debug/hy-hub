import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../public/family-dashboard.html', import.meta.url), 'utf8')

test('家庭看板不再把空 Bearer 寫死，會先嘗試 refresh，401/403 顯示尚未登入而不是離線', () => {
  assert.doesNotMatch(src, /var ACCESS_TOKEN/)
  assert.doesNotMatch(src, /Authorization':'Bearer '\+ACCESS_TOKEN/)
  assert.match(src, /function getAccessToken\(/)
  assert.match(src, /function getHeaders\(/)
  assert.match(src, /if \(tok\) h\['Authorization'\] = 'Bearer ' \+ tok/)
  assert.match(src, /\/api\/auth\/refresh/)
  assert.match(src, /credentials:'include'/)
  assert.match(src, /尚未登入，無法載入看板/)
  assert.match(src, /離線模式（禁止儲存）/)
  assert.match(src, /isAuthStatus/)
  assert.match(src, /href="\.\/#\/line\/family"/)
  assert.match(src, /target="_top"/)
  assert.match(src, /id="loginHint"/)
  assert.match(src, /last-updated\.is-alert/)
})
