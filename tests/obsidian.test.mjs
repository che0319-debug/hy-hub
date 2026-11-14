import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  applyDecision, brainErrorMessage, fetchBrainCard, fetchBrainIndex, filterCards,
  isPending, linkifyWikilinks, loadQueue, normalizeQueue, parseFrontmatter,
  queueMarkdown, wikiIdFromHref,
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
  const storage = { value: '', getItem() { return this.value }, setItem(_key, value) { this.value = value } }
  storage.setItem('k', '{"items":[{"id":"know-sample","title":"範例","decision":"approve","decided_at":"t","body":"x"}]}')
  // loadQueue reads the fixed key; this only checks the helper drops body when the payload is stored there.
  storage.value = '{"items":[{"id":"know-sample","title":"範例","decision":"approve","decided_at":"t","body":"x"}]}'
  const loaded = loadQueue({ getItem: key => key.endsWith('v1') ? storage.value : null })
  assert.equal(loaded.items[0].body, undefined)
})
