import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  RADIO_FIELDS,
  WEEKLY_FIELDS,
  acceptHeightMessage,
  acceptResponseMessage,
  applyFields,
  buildSrcdoc,
  collectFields,
  compactLatestLine,
  ensureWeeklyFields,
  taipeiISOWeek,
} from '../public/hy-ui/weekly-embed-bridge.js'

function control(spec) {
  return {
    name: spec.name,
    type: spec.type || 'text',
    tagName: spec.tag || 'INPUT',
    value: spec.value ?? '',
    checked: Boolean(spec.checked),
    multiple: Boolean(spec.multiple),
    options: spec.options || [],
    selectedOptions: spec.selected || [],
  }
}

function form(specs) {
  const elements = specs.map(control)
  return { querySelectorAll() { return elements }, elements }
}

test('Taipei ISO week rolls at local midnight', () => {
  assert.equal(taipeiISOWeek(new Date('2026-11-22T15:59:00Z')), '2026-W47')
  assert.equal(taipeiISOWeek(new Date('2026-11-22T16:00:00Z')), '2026-W48')
  assert.equal(taipeiISOWeek(new Date('2026-11-21T04:00:00Z')), '2026-W47')
})

test('collects all 52 W47 fields and leaves unselected radios null', () => {
  assert.equal(WEEKLY_FIELDS.length, 52)
  assert.equal(new Set(WEEKLY_FIELDS).size, 52)
  const specs = []
  for (const name of WEEKLY_FIELDS) {
    if (RADIO_FIELDS.includes(name)) {
      specs.push({ name, type: 'radio', value: '1' })
      specs.push({ name, type: 'radio', value: '2' })
    } else {
      specs.push({ name, type: 'textarea', tag: 'TEXTAREA', value: '' })
    }
  }
  const picked = form(specs)
  picked.elements.find((el) => el.name === 'D1' && el.value === '2').checked = true
  picked.elements.find((el) => el.name === 'P1' && el.value === '1').checked = true
  picked.elements.find((el) => el.name === 'D1_note').value = '先不要排'
  picked.elements.find((el) => el.name === 'Q1').value = '這季算去過了'
  const fields = collectFields(picked)
  assert.deepEqual(Object.keys(fields), WEEKLY_FIELDS)
  assert.equal(fields.D1, '2')
  assert.equal(fields.P1, '1')
  assert.equal(fields.D1_note, '先不要排')
  assert.equal(fields.Q1, '這季算去過了')
  for (const name of RADIO_FIELDS) {
    if (name === 'D1' || name === 'P1') continue
    assert.equal(fields[name], null, name)
  }
  for (const name of WEEKLY_FIELDS) {
    if (RADIO_FIELDS.includes(name) || name === 'D1_note' || name === 'Q1') continue
    assert.equal(fields[name], '')
  }
  const stored = ensureWeeklyFields(fields)
  assert.deepEqual(Object.keys(stored), WEEKLY_FIELDS)
  assert.equal(stored.D3, null)
  assert.equal(stored.D6_once, null)
  assert.equal(stored.D1, '2')
  assert.equal(ensureWeeklyFields({ D1: '2', extra: 'no' }).extra, undefined)
  assert.equal(ensureWeeklyFields({}).D12, null)
})

test('checkbox groups and refill round-trip', () => {
  const sample = form([
    { name: 'one', type: 'checkbox', value: 'on' },
    { name: 'many', type: 'checkbox', value: 'a' },
    { name: 'many', type: 'checkbox', value: 'b', checked: true },
    { name: 'choice', type: 'radio', value: '做' },
    { name: 'choice', type: 'radio', value: '不做', checked: true },
    { name: 'note', type: 'textarea', tag: 'TEXTAREA', value: '附註' },
  ])
  assert.deepEqual(collectFields(sample), { one: false, many: ['b'], choice: '不做', note: '附註' })
  applyFields(sample, { one: true, many: ['a'], choice: '做', note: null, missing: 'x' })
  assert.deepEqual(collectFields(sample), { one: true, many: ['a'], choice: '做', note: '' })
})

test('parent accepts only the iframe, the right type, and the selected week', () => {
  const frame = {}
  const other = {}
  const fields = { D1: '2' }
  const event = { source: frame, data: { type: 'hy-weekly-response', week: '2026-W47', owner: 'hy', fields } }
  assert.deepEqual(acceptResponseMessage(event, frame, { week: '2026-W47', owner: 'hy' }), {
    week: '2026-W47', owner: 'hy', fields,
  })
  assert.equal(acceptResponseMessage(event, other, { week: '2026-W47', owner: 'hy' }), null)
  assert.equal(acceptResponseMessage(event, frame, { week: '2026-W48', owner: 'hy' }), null)
  assert.equal(acceptResponseMessage({ source: frame, data: { type: 'other', week: '2026-W47', owner: 'hy', fields } }, frame, { week: '2026-W47', owner: 'hy' }), null)
})

test('srcdoc bridge is injected without giving the report the parent origin', () => {
  const page = fs.readFileSync(new URL('../public/hy-ui/weekly-embed-page.js', import.meta.url), 'utf8')
  const html = fs.readFileSync(new URL('../public/personal-dashboard.html', import.meta.url), 'utf8')
  assert.match(page, /allow-scripts allow-forms/)
  assert.equal(page.includes('allow-same-origin'), false)
  assert.equal(html.includes('allow-same-origin'), false)
  const srcdoc = buildSrcdoc('<!doctype html><html><head></head><body><form id="weekly-response"></form><script>var x="</script>";</script></body></html>')
  assert.match(srcdoc, /<base href="about:srcdoc">/)
  assert.match(srcdoc, /hy-weekly-response/)
  assert.match(srcdoc, /__weeklyResponseHandler/)
  const injected = srcdoc.slice(srcdoc.lastIndexOf('<script>'))
  assert.equal(injected.slice(0, injected.lastIndexOf('</script>')).includes('</script'), false)
})

test('parent accepts height only from the iframe and uses document scrollHeight', () => {
  const frame = {}
  const other = {}
  const event = { source: frame, data: { type: 'hy-weekly-height', height: 1840.4 } }
  assert.equal(acceptHeightMessage(event, frame), 1841)
  assert.equal(acceptHeightMessage({ source: frame, data: { type: 'hy-weekly-height', height: 52555 } }, frame), 52555)
  assert.equal(acceptHeightMessage(event, other), null)
  assert.equal(acceptHeightMessage({ source: frame, data: { type: 'hy-weekly-response', height: 900 } }, frame), null)
  assert.equal(acceptHeightMessage({ source: frame, data: { type: 'hy-weekly-height', height: 0 } }, frame), null)
  assert.equal(acceptHeightMessage({ source: frame, data: { type: 'hy-weekly-height', height: 'tall' } }, frame), null)
  const srcdoc = buildSrcdoc('<!doctype html><html><body><form id="weekly-response"></form></body></html>')
  assert.match(srcdoc, /hy-weekly-height/)
  assert.match(srcdoc, /ResizeObserver/)
  assert.match(srcdoc, /document\.documentElement/)
  assert.match(srcdoc, /scrollHeight/)
  assert.match(srcdoc, /addEventListener\('load'/)
  assert.match(srcdoc, /document\.images/)
})

test('compact latest line is one short Taipei summary', () => {
  const latest = {
    submitted_at_taipei: '2026-11-21T13:35:57+08:00',
    submitted_by: 'hy',
    fields: { D1: '2', D1_note: '先不要排', Q1: '這季算去過了', P1: '做', D3: null, Q2: '' },
  }
  assert.equal(compactLatestLine(latest), '最新回應 2026-11-21 13:35（台北）· 已填 4/6')
  assert.equal(
    compactLatestLine({ ...latest, fields: ensureWeeklyFields(latest.fields) }),
    '最新回應 2026-11-21 13:35（台北）· 已填 4/52',
  )
  assert.equal(compactLatestLine(null), '')
})

test('weekly tab drops the week picker and fills the page width', () => {
  const page = fs.readFileSync(new URL('../public/hy-ui/weekly-embed-page.js', import.meta.url), 'utf8')
  const html = fs.readFileSync(new URL('../public/personal-dashboard.html', import.meta.url), 'utf8')
  assert.equal(html.includes('id="weeklySelect"'), false)
  assert.equal(html.includes('週次：'), false)
  assert.match(html, /scrolling="no"/)
  assert.match(html, /overflow:\s*hidden/)
  assert.match(html, /\.weekly-wrap\s*\{[^}]*max-width:\s*none/)
  assert.equal(/min-height:\s*70vh/.test(html), false)
  assert.equal(/max-width:\s*900px/.test(html), false)
  assert.match(page, /current_week/)
  assert.equal(page.includes('weeklySelect'), false)
  assert.equal(page.includes('正在看'), false)
  assert.match(page, /compactLatestLine/)
  assert.match(page, /本週週報還沒放上來/)
})
