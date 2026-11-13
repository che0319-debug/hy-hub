import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const files = {
  '950157': new URL('../public/950157-dashboard.html', import.meta.url),
  personal: new URL('../public/personal-dashboard.html', import.meta.url),
  family: new URL('../public/family-dashboard.html', import.meta.url),
  sam: new URL('../public/sam-dashboard.html', import.meta.url),
}

function html(name) {
  return readFileSync(files[name], 'utf8')
}

test('四個看板都拿掉標題完成勾選與切換狀態，指派列仍在', () => {
  for (const name of Object.keys(files)) {
    const src = html(name)
    assert.doesNotMatch(src, /切換狀態/)
    assert.doesNotMatch(src, /title=["']完成此任務["']/)
    assert.match(src, /\.due-chip\.due-today/)
    assert.match(src, /function toggleCardComplete/)
  }
  assert.match(html('950157'), /指派950157/)
  assert.match(html('950157'), /未執行/)
  assert.match(html('950157'), /新增里程碑/)
  assert.match(html('950157'), /function toggleExecute/)
  assert.match(html('personal'), /交給助理/)
  assert.match(html('personal'), /新增里程碑/)
  assert.match(html('family'), /交給小因/)
  assert.match(html('sam'), /交給助理/)
  assert.match(html('sam'), /新增里程碑/)
})

test('到期日：今天（Asia/Taipei）藍色、逾期紅色、未來維持原樣', () => {
  const today = '2026-11-13'
  function chip(due) {
    const cmp = String(due).replace(/\//g, '-')
    if (cmp < today) return 'overdue'
    if (cmp === today) return 'due-today'
    return ''
  }
  assert.equal(chip('2026/11/12'), 'overdue')
  assert.equal(chip('2026/11/13'), 'due-today')
  assert.equal(chip('2026/12/18'), '')

  const ctx = { today, todayTaipei: today, result: null }
  runInNewContext(
    `result = JSON.stringify((function(){
      function dueDisplay(d){
        if (!d) return null;
        var cmp=d.replace(/\\//g,'-'), p=d.split('/');
        if (p.length<3) return null;
        return { text: p[1]+'/'+p[2], over: cmp < today, today: cmp === today };
      }
      function isOverdue(due){ if (!due) return false; return due.replace(/\\//g,'-') < todayTaipei; }
      function isDueToday(due){ if (!due) return false; return due.replace(/\\//g,'-') === todayTaipei; }
      return {
        past: dueDisplay('2026/11/11'),
        now: dueDisplay('2026/11/13'),
        future: dueDisplay('2026/12/18'),
        samPast: { over: isOverdue('2026/11/11'), today: isDueToday('2026/11/11') },
        samNow: { over: isOverdue('2026/11/13'), today: isDueToday('2026/11/13') },
        samFuture: { over: isOverdue('2026/12/18'), today: isDueToday('2026/12/18') },
      };
    })())`,
    ctx,
  )
  const got = JSON.parse(ctx.result)
  assert.deepEqual(got.past, { text: '11/11', over: true, today: false })
  assert.deepEqual(got.now, { text: '11/13', over: false, today: true })
  assert.deepEqual(got.future, { text: '12/18', over: false, today: false })
  assert.deepEqual(got.samPast, { over: true, today: false })
  assert.deepEqual(got.samNow, { over: false, today: true })
  assert.deepEqual(got.samFuture, { over: false, today: false })

  for (const name of ['950157', 'personal', 'family']) {
    const src = html(name)
    assert.match(src, /today:\s*cmp === today/)
    assert.match(src, /dd\.today\?' due-today'/)
    assert.match(src, /timeZone:\s*'Asia\/Taipei'/)
  }
  assert.match(html('sam'), /function isDueToday/)
  assert.match(html('sam'), /dueToday\?' due-today'/)
  assert.match(html('sam'), /timeZone:\s*'Asia\/Taipei'/)
})

test('完成與切換狀態函式仍寫 completed / execute_status，不刪資料欄', () => {
  const src950 = html('950157')
  assert.match(src950, /m\.completed\s*=/)
  assert.match(src950, /m\.execute_status\s*=/)
  assert.match(src950, /m\.completed_at\s*=/)
  assert.match(html('personal'), /m\.completed\s*=/)
  assert.match(html('family'), /m\.completed\s*=/)
  assert.match(html('sam'), /m\.completed\s*=/)
})
