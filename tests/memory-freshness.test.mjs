import test from 'node:test'
import assert from 'node:assert/strict'
import { freshness } from '../src/lib/memoryFreshness.js'

// 2026-10-04 10:00 台北
const now = Date.parse('2026-10-04T02:00:00Z')

test('今天、昨天為綠', () => {
  assert.equal(freshness('2026-10-04T01:30:00Z', now).level, 'fresh')
  assert.match(freshness('2026-10-04T01:30:00Z', now).label, /^今天 09:30$/)
  const y = freshness('2026-10-03T04:03:27Z', now)
  assert.deepEqual([y.level, y.label], ['fresh', '昨天'])
})

test('台北跨日：UTC 前一天 16:30 已是台北今天', () => {
  assert.equal(freshness('2026-10-03T16:30:00Z', now).days, 0)
})

test('2–7 天為黑，超過 7 天為紅', () => {
  assert.deepEqual([freshness('2026-09-30T00:13:11Z', now).level, freshness('2026-09-30T00:13:11Z', now).label], ['aging', '4 天前'])
  assert.equal(freshness('2026-09-27T01:00:00Z', now).level, 'aging')   // 7 天
  assert.equal(freshness('2026-09-26T01:00:00Z', now).level, 'stale')   // 8 天
})

test('沒有時間為無資料', () => {
  assert.equal(freshness(null, now).level, 'none')
  assert.equal(freshness('not-a-date', now).level, 'none')
})
