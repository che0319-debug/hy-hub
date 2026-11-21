import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  applyDecision, brainErrorMessage, fetchBrainCard, fetchBrainIndex, filterCards,
  isPending, linkifyWikilinks, loadQueue, normalizeQueue, parseFrontmatter,
  pruneQueueToPending, queueMarkdown, splitPendingReview, wikiIdFromHref,
} from '../src/lib/obsidian.js'

const sample = `---
id: know-sample
type: know
title: "範例卡"
aliases: [代稱甲, 代稱乙]
tags: [測試]
date: 2026-11-14
confidence: high
written_by: HY Bot
people: ["[[person-eva]]"]
as_of: 2026-11-14
related: ["[[map-sample]]"]
---

正文 [[know-other]]
`

test('待上架只看路徑，核准不會改分類', () => {
  const card = { id: 'know-sample', path: '00_待上架/know-sample.md', title: '範例', aliases: ['代稱'] }
  assert.equal(isPending(card), true)
  assert.equal(isPending({ ...card, path: '40_知識/know-sample.md' }), false)
  const queue = applyDecision({ version: 1, items: [] }, { id: card.id, title: card.title, decision: 'approve', now: '2026-11-14T00:00:00.000Z' })
  assert.equal(queue.items[0].decision, 'approve')
  assert.equal(queue.items[0].body, undefined)
  assert.equal(isPending(card), true)
  const replaced = applyDecision(queue, { id: card.id, title: card.title, decision: 'reject', now: '2026-11-14T01:00:00.000Z' })
  assert.equal(replaced.items.length, 1)
  assert.equal(replaced.items[0].decision, 'reject')
  assert.deepEqual(applyDecision(replaced, { id: card.id, decision: 'clear' }).items, [])
})

test('清單正規化會丟掉正文與不合法編號', () => {
  const queue = normalizeQueue({ items: [
    { id: 'know-sample', title: '範例', decision: 'approve', decided_at: 't', body: '不要留下', content: '也不留' },
    { id: '../secret', title: '壞', decision: 'approve' },
  ] })
  assert.deepEqual(queue.items, [{ id: 'know-sample', title: '範例', decision: 'approve', decided_at: 't' }])
})

test('待上架分成未審與已審，數量不含清單外的決定', () => {
  const cards = [
    { id: 'know-a', title: '甲', path: '00_待上架/know-a.md' },
    { id: 'know-b', title: '乙', path: '00_待上架/know-b.md' },
    { id: 'know-c', title: '丙', path: '00_待上架/know-c.md' },
    { id: 'dec-d', title: '丁', path: '50_決策/dec-d.md' },
  ]
  const queue = { items: [
    { id: 'know-a', title: '甲', decision: 'approve', decided_at: 't1' },
    { id: 'know-c', title: '丙', decision: 'reject', decided_at: 't2' },
    { id: 'know-missing', title: '不在列表', decision: 'approve', decided_at: 't3' },
  ] }
  const split = splitPendingReview(cards, queue)
  assert.deepEqual(split.open.map(card => card.id), ['know-b'])
  assert.deepEqual(split.reviewed.map(card => card.id), ['know-a', 'know-c'])
  assert.equal(split.reviewedCount, 2)
  assert.equal(splitPendingReview(null, queue).reviewedCount, 0)
  const cleared = applyDecision(queue, { id: 'know-a', decision: 'clear' })
  const again = splitPendingReview(cards, cleared)
  assert.deepEqual(again.open.map(card => card.id), ['know-a', 'know-b'])
  assert.deepEqual(again.reviewed.map(card => card.id), ['know-c'])
  const allDone = splitPendingReview(
    [{ id: 'know-a', title: '甲', path: '00_待上架/know-a.md' }],
    { items: [{ id: 'know-a', title: '甲', decision: 'approve', decided_at: 't' }] },
  )
  assert.equal(allDone.open.length, 0)
  assert.equal(allDone.reviewedCount, 1)
  const text = queueMarkdown(queue)
  assert.match(text, /核准｜know-a｜甲/)
  assert.match(text, /退回｜know-c｜丙/)
  assert.match(text, /know-missing/)
})

test('已上架、已歸檔、目錄沒有的決定會被拿掉，留下的欄位不變', () => {
  const kept = { id: 'know-a', title: '甲', decision: 'reject', decided_at: 't1' }
  const queue = { items: [
    kept,
    { id: 'know-b', title: '乙', decision: 'approve', decided_at: 't2' },
    { id: 'know-c', title: '丙', decision: 'approve', decided_at: 't3' },
    { id: 'know-missing', title: '不見了', decision: 'approve', decided_at: 't4' },
  ] }
  const cards = [
    { id: 'know-a', title: '甲', path: '00_待上架/know-a.md', state: 'archived' },
    { id: 'know-b', title: '乙', path: '40_知識/know-b.md', state: 'candidate' },
    { id: 'know-c', title: '丙', path: '90_歸檔/know-c.md', state: 'archived' },
    { id: 'dec-d', title: '丁', path: '50_決策/dec-d.md' },
  ]
  const next = pruneQueueToPending(queue, cards)
  assert.equal(next.items.length, 1)
  assert.equal(next.items[0], kept)
  const text = queueMarkdown(next)
  assert.match(text, /退回｜know-a｜甲｜t1/)
  assert.doesNotMatch(text, /know-b|know-c|know-missing/)
})

test('目錄還沒來、不是陣列、或是空的，決定原樣留下', () => {
  const queue = { items: [
    { id: 'know-a', title: '甲', decision: 'approve', decided_at: 't', body: '不要留' },
  ] }
  const expected = [{ id: 'know-a', title: '甲', decision: 'approve', decided_at: 't' }]
  for (const cards of [null, undefined, { length: 3 }, '00_待上架', []]) {
    assert.deepEqual(pruneQueueToPending(queue, cards).items, expected)
  }
})

test('目錄有卡但沒有待上架時，舊決定全部清掉', () => {
  const queue = { items: [
    { id: 'know-b', title: '乙', decision: 'approve', decided_at: 't2' },
    { id: 'know-missing', title: '不見了', decision: 'reject', decided_at: 't4' },
  ] }
  const cards = [
    { id: 'know-b', title: '乙', path: '40_知識/know-b.md', state: 'candidate' },
    { id: 'dec-d', title: '丁', path: '50_決策/dec-d.md' },
  ]
  const next = pruneQueueToPending(queue, cards)
  assert.deepEqual(next.items, [])
  assert.match(queueMarkdown(next), /目前沒有決定/)
})

test('沒有需要移除時，items 與原來相同', () => {
  const queue = { version: 1, items: [
    { id: 'know-a', title: '甲', decision: 'approve', decided_at: 't1' },
    { id: 'know-b', title: '乙', decision: 'reject', decided_at: 't2' },
  ] }
  const cards = [
    { id: 'know-a', path: '00_待上架/know-a.md' },
    { id: 'know-b', path: '00_待上架/sub/know-b.md' },
    { id: 'know-z', path: '10_人生/know-z.md' },
  ]
  const next = pruneQueueToPending(queue, cards)
  assert.equal(next.items, queue.items)
})

test('待上架頁在目錄載入後會修剪清單', () => {
  const page = readFileSync(new URL('../src/pages/Obsidian.jsx', import.meta.url), 'utf8')
  assert.match(page, /pruneQueueToPending, queueMarkdown/)
  assert.match(page, /pruneQueueToPending\(queue, cards\)/)
  assert.match(page, /cards === null \|\| loadError \|\| cards\.length === 0/)
  assert.match(page, /saveQueue\(window\.localStorage, next\)/)
})

test('待處理清單是純文字，不含寫入指令', () => {
  const text = queueMarkdown({ items: [{ id: 'know-sample', title: '範例', decision: 'approve', decided_at: 't' }] })
  assert.match(text, /核准｜know-sample｜範例/)
  assert.match(text, /沒有搬移卡片/)
  assert.doesNotMatch(text, /X-Brain-Write-Key|alias-map/)
})

test('frontmatter 與雙向連結', () => {
  const parsed = parseFrontmatter(sample)
  assert.equal(parsed.data.id, 'know-sample')
  assert.deepEqual(parsed.data.aliases, ['代稱甲', '代稱乙'])
  assert.equal(parsed.data.people[0], '[[person-eva]]')
  assert.match(parsed.body, /正文/)
  const linked = linkifyWikilinks(parsed.body, new Map([['know-other', '另一張']]))
  assert.match(linked, /\[另一張\]\(#card-know-other\)/)
  assert.equal(wikiIdFromHref('#card-know-other'), 'know-other')
  assert.equal(wikiIdFromHref('#card-../x'), '')
})

test('搜尋用標題與代稱', () => {
  const cards = [
    { id: 'know-sample', title: '範例卡', aliases: ['代稱甲'], tags: [], path: '00_待上架/know-sample.md' },
    { id: 'dec-sample', title: '別的決定', aliases: [], tags: [], path: '50_決策/dec-sample.md' },
  ]
  assert.equal(filterCards(cards, { query: '代稱' }).length, 1)
  assert.equal(filterCards(cards, { folder: '50_決策' })[0].id, 'dec-sample')
})

test('未登入與尚未鏡像的錯誤文案', async () => {
  assert.match(brainErrorMessage(401, {}), /重新登入/)
  assert.match(brainErrorMessage(404, { error: 'brain_card_not_found' }), /還沒鏡像/)
  const seen = []
  await assert.rejects(fetchBrainCard('know-sample', {
    headers: { Authorization: 'Bearer test' },
    fetcher: async (url, options) => {
      seen.push([url, options.headers])
      return new Response(JSON.stringify({ error: 'brain_card_not_found' }), { status: 404 })
    },
  }))
  assert.equal(seen[0][0], '/api/brain/card?id=know-sample')
  assert.equal(seen[0][1].Authorization, 'Bearer test')
  assert.equal(seen[0][1]['X-Brain-Write-Key'], undefined)
  const cards = await fetchBrainIndex({
    fetcher: async () => new Response(JSON.stringify({ cards: [{ id: 'know-sample', title: '範例' }] }), { status: 200 }),
  })
  assert.equal(cards[0].id, 'know-sample')
})

test('畫面不送寫入金鑰，也不讀對照表', () => {
  const page = readFileSync(new URL('../src/pages/Obsidian.jsx', import.meta.url), 'utf8')
  const lib = readFileSync(new URL('../src/lib/obsidian.js', import.meta.url), 'utf8')
  for (const source of [page, lib]) {
    assert.doesNotMatch(source, /alias-map|X-Brain-Write-Key|HY_BRAIN_WRITE_KEY/)
    assert.doesNotMatch(source, /method:\s*['"]PUT['"]/)
  }
  assert.match(page, /核准/)
  assert.match(page, /退回/)
  assert.match(page, /顯示已審（\$\{reviewSplit\.reviewedCount\}）/)
  assert.match(page, /收起已審（\$\{reviewSplit\.reviewedCount\}）/)
  assert.match(page, /aria-pressed=\{showReviewed\}/)
  assert.match(page, /待上架的卡都審完了。/)
  assert.match(page, /審完請按『複製清單』，把內容貼給 Atlas，Atlas 才會搬卡。/)
  assert.match(page, /openListedCard/)
  assert.match(page, /prefers-reduced-motion: reduce/)
  const css = readFileSync(new URL('../src/pages/obsidian.css', import.meta.url), 'utf8')
  assert.match(css, /@media \(min-width: 641px\)[\s\S]*position:\s*sticky/)
  assert.match(css, /max-height:\s*calc\(100vh - 16px\)/)
  const storage = { value: '', getItem() { return this.value }, setItem(_key, value) { this.value = value } }
  storage.setItem('k', '{"items":[{"id":"know-sample","title":"範例","decision":"approve","decided_at":"t","body":"x"}]}')
  // loadQueue reads the fixed key; this only checks the helper drops body when the payload is stored there.
  storage.value = '{"items":[{"id":"know-sample","title":"範例","decision":"approve","decided_at":"t","body":"x"}]}'
  const loaded = loadQueue({ getItem: key => key.endsWith('v1') ? storage.value : null })
  assert.equal(loaded.items[0].body, undefined)
})
