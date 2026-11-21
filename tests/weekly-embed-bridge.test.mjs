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
  localApiBase,
  officeStatusLine,
  resolveOwner,
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
  assert.equal(ensureWeeklyFields({ D1: '2', X1: '加一題' }).X1, '加一題')
  assert.equal('D12' in ensureWeeklyFields({}), false)
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
    '最新回應 2026-11-21 13:35（台北）· 已填 4/6',
  )
  assert.equal(compactLatestLine(null), '')
})

test('office line follows the submit result and stays blank without it', () => {
  assert.equal(officeStatusLine(undefined), '')
  assert.equal(officeStatusLine(null), '')
  assert.equal(officeStatusLine({}), '')
  assert.equal(officeStatusLine({ ok: true, project_id: 'p-014', action: 'opened' }), '已在 Office 開案 p-014')
  assert.equal(officeStatusLine({ ok: true, project_id: 'p-021', action: 'followup' }), '已在 Office 開案 p-021')
  assert.equal(officeStatusLine({ ok: true, project_id: 'p-014', action: 'logged' }), '已記到 Office p-014')
  assert.equal(officeStatusLine({ ok: false, reason: 'brain_write_failed' }), '回應已存，Office 開案失敗')
  assert.equal(officeStatusLine({ ok: true, project_id: '先不要排的秘密' }), '')
  const page = fs.readFileSync(new URL('../public/hy-ui/weekly-embed-page.js', import.meta.url), 'utf8')
  const html = fs.readFileSync(new URL('../public/personal-dashboard.html', import.meta.url), 'utf8')
  assert.match(page, /officeStatusLine/)
  assert.match(page, /renderOffice\(data\.office\)/)
  assert.match(html, /id="weeklyOffice"/)
})

test('a form with its own fields collects, refills, and counts those fields', () => {
  const sample = form([
    { name: 'A1', type: 'radio', value: '做' },
    { name: 'A1', type: 'radio', value: '不做' },
    { name: 'note', type: 'textarea', tag: 'TEXTAREA', value: '' },
    { name: 'X1', type: 'textarea', tag: 'TEXTAREA', value: '加一題' },
  ])
  const fields = collectFields(sample)
  assert.deepEqual(fields, { A1: null, note: '', X1: '加一題' })
  assert.equal('D1' in fields, false)
  applyFields(sample, { A1: '做', note: '小因', X1: null, D12: '不該出現' })
  assert.deepEqual(collectFields(sample), { A1: '做', note: '小因', X1: '' })
  const stored = ensureWeeklyFields(fields)
  assert.deepEqual(Object.keys(stored), ['A1', 'note', 'X1'])
  assert.equal(
    compactLatestLine({ submitted_at_taipei: '2026-11-21T13:35:57+08:00', submitted_by: 'hy', fields: stored }),
    '最新回應 2026-11-21 13:35（台北）· 已填 1/3',
  )
})

test('page owner is a parameter and a mismatched form owner is refused', () => {
  assert.equal(resolveOwner('950157'), '950157')
  assert.equal(resolveOwner('family'), 'family')
  assert.equal(resolveOwner('sam'), 'sam')
  assert.equal(resolveOwner('hy'), 'hy')
  assert.equal(resolveOwner('nana'), 'hy')
  assert.equal(resolveOwner(undefined), 'hy')
  assert.equal(localApiBase('https://hy-agent-v2.onrender.com', '?api=http://127.0.0.1:8765', ''), 'http://127.0.0.1:8765')
  assert.equal(localApiBase('https://hy-agent-v2.onrender.com', '?api=https://evil.example', ''), 'https://hy-agent-v2.onrender.com')
  assert.equal(localApiBase('https://hy-agent-v2.onrender.com', '', 'http://localhost:9'), 'http://localhost:9')
  const frame = {}
  const fields = { X1: '加一題', A1: null }
  assert.deepEqual(acceptResponseMessage(
    { source: frame, data: { type: 'hy-weekly-response', week: '2026-W47', owner: 'family', fields } },
    frame,
    { week: '2026-W47', owner: 'family' },
  ), { week: '2026-W47', owner: 'family', fields })
  assert.deepEqual(acceptResponseMessage(
    { source: frame, data: { type: 'hy-weekly-response', week: '2026-W47', owner: 'hy', fields } },
    frame,
    { week: '2026-W47', owner: '950157' },
  ), { rejected: 'owner_mismatch' })
  const page = fs.readFileSync(new URL('../public/hy-ui/weekly-embed-page.js', import.meta.url), 'utf8')
  assert.match(page, /resolveOwner\(window\.WEEKLY_EMBED_OWNER\)/)
  assert.match(page, /owner_mismatch/)
  assert.match(page, /這份週報的 owner 和這個頁面不符，沒有送出/)
  assert.match(page, /encodeURIComponent\(state\.owner\)/)
  assert.equal(page.includes('已填 52'), false)
  assert.equal(page.includes('/52'), false)
  const embedCss = /#tab-weekly \.weekly-wrap \{[^}]*max-width:\s*none/
  for (const [file, owner] of [
    ['950157-dashboard.html', '950157'],
    ['family-dashboard.html', 'family'],
    ['sam-dashboard.html', 'sam'],
  ]) {
    const html = fs.readFileSync(new URL('../public/' + file, import.meta.url), 'utf8')
    assert.match(html, new RegExp("WEEKLY_EMBED_OWNER = '" + owner + "'"))
    assert.match(html, /hy-ui\/weekly-embed-page\.js/)
    assert.match(html, /id="weeklyFrame"/)
    assert.match(html, /id="weeklyOffice"/)
    assert.match(html, /id="weeklyLatest"/)
    assert.match(html, /sandbox="allow-scripts allow-forms"/)
    assert.equal(html.includes('allow-same-origin'), false)
    assert.equal(html.includes('id="weeklySelect"'), false)
    assert.equal(html.includes('id="weekSelect"'), false)
    assert.match(html, embedCss)
    assert.match(html, /本週週報還沒放上來|weeklyEmptyTitle/)
  }
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
