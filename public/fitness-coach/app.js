// 我的健身教練 V1 — 介面層。資料只存在本機（localStorage），不呼叫任何後端或模型 API。
import * as Store from './lib/store.js'
import * as Inbody from './lib/inbody.js'
import * as Coach from './lib/coach.js'
import { GOALS, GOAL_TYPES, LEVELS, nextDay, DELOAD_RULE } from './lib/programs.js'
import { EXERCISES, EXERCISE_BY_ID, EQUIPMENT, MUSCLES, CONTENT_SOURCE, GENERAL_SAFETY, filterExercises } from './lib/exercises.js'

// ── 儲存 ──
const memory = { data: {}, getItem(k) { return this.data[k] ?? null }, setItem(k, v) { this.data[k] = String(v) } }
let storage = memory
let storageOk = false
try { localStorage.setItem('__fc_probe', '1'); localStorage.removeItem('__fc_probe'); storage = localStorage; storageOk = true } catch { /* 私密模式等 */ }

let state
let loadError = ''
try { state = Store.load(storage) } catch (e) { state = Store.createInitialState(); loadError = e.message }

const ui = {
  flash: null, // {tone, text}
  lib: { q: '', muscle: '', equipment: '', open: '' },
  imp: null, // { filename, source_type, parsed, mapping, preview, policy, error }
  restore: null, // { summary, state, error }
  manualDup: null,
  bodyErrors: [],
  setErrors: {},
  confirmReset: false,
}

function commit(next, msg) {
  try {
    Store.save(storage, next)
    state = next
    if (msg) ui.flash = { tone: 'done', text: msg }
    stamp()
  } catch (e) {
    ui.flash = { tone: 'bad', text: `儲存失敗，資料沒有變更：${e.message}` }
  }
  render()
}
function fail(text) { ui.flash = { tone: 'bad', text }; render() }
function stamp() {
  const el = document.getElementById('save-status')
  if (!el) return
  const t = new Date()
  el.textContent = storageOk ? `已存在本機 ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` : '未啟用本機儲存'
}

// ── 小工具 ──
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const exName = (id) => EXERCISE_BY_ID[id]?.name || id
const fmtDate = (s) => { const d = String(s || '').slice(0, 10); return d ? `${+d.slice(5, 7)}/${+d.slice(8, 10)}` : '' }
const fmtFull = (s) => String(s || '').replace('T', ' ').slice(0, 16)
const num = (n) => (n == null || n === '' ? '—' : String(n))
const pill = (s, t) => `<span class="hy-pill" data-s="${s}">${esc(t)}</span>`
const fieldLabel = (k) => Inbody.FIELDS.find((f) => f.key === k)?.label || k
function download(name, text, type) {
  const blob = new Blob([text], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 0)
}
function prescription(it) {
  if (it.unit === '輪') return `${it.sets} 輪｜${it.interval}`
  return `${it.sets} 組 × ${it.reps_min}–${it.reps_max} ${it.unit}｜休 ${it.rest_seconds} 秒｜RIR ${it.target_rir}`
}

function flashHtml() {
  if (!ui.flash) return ''
  const f = ui.flash // 保留到下一次操作才清除（換頁後仍看得到結果）
  if (f.tone === 'bad') return `<div class="hy-alert is-bad fc-gap" role="alert">${esc(f.text)}</div>`
  return `<div class="fc-flash fc-gap" role="status">${pill('done', '完成')} ${esc(f.text)}</div>`
}
function globalAlerts() {
  let h = ''
  if (loadError) h += `<div class="hy-alert is-bad fc-gap">${esc(loadError)}</div>`
  if (!storageOk) h += `<div class="hy-alert fc-gap">瀏覽器不允許本機儲存（可能是私密瀏覽）。關閉頁面後資料會消失，請改用一般模式開啟。</div>`
  return h
}

// ── 頁面：設定表單（首次與設定頁共用） ──
function profileForm(submitLabel) {
  const p = state.profile || {}
  const g = state.goal?.goal_type || 'MUSCLE_GAIN'
  return `<form id="profile-form" class="fc-form">
    <fieldset class="fc-field"><legend>主要目標</legend>
      <div class="fc-choices">${GOAL_TYPES.map((k) => `<label class="fc-choice"><input type="radio" name="goal_type" value="${k}" ${k === g ? 'checked' : ''}><span><b>${GOALS[k].label}</b><small>${esc(GOALS[k].short)}</small></span></label>`).join('')}</div>
    </fieldset>
    <div class="fc-grid">
      <label class="fc-field"><span>訓練程度</span><select name="training_level">${Object.entries(LEVELS).map(([k, v]) => `<option value="${k}" ${k === (p.training_level || 'beginner') ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="fc-field"><span>每週天數</span><select name="weekly_days">${[2, 3, 4, 5, 6].map((d) => `<option ${d === (p.weekly_days || 3) ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label class="fc-field"><span>單次時長（分鐘）</span><select name="session_minutes">${[30, 45, 60, 90].map((d) => `<option ${d === (p.session_minutes || 60) ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label class="fc-field"><span>稱呼</span><input name="display_name" maxlength="40" value="${esc(p.display_name || 'HY')}"></label>
    </div>
    <label class="fc-field"><span>身體備註（選填，只存在本機）</span><input name="health_note" maxlength="500" value="${esc(p.health_note || '')}" placeholder="例如：右肩偶爾緊"></label>
    <div class="fc-actions"><button class="hy-btn is-primary" type="submit">${submitLabel}</button></div>
  </form>`
}

// ── 今天 ──
function pageToday() {
  if (!state.profile) {
    return `<div class="hy-pagehead"><div><h1 class="hy-title">先設定你的目標</h1><p class="hy-lede">設定後會產生健身房菜單，之後隨時可在「設定」修改。</p></div></div>
      <article class="hy-card is-focus">${profileForm('建立我的菜單')}</article>`
  }
  const now = new Date()
  const recs = Coach.recommend(state, now)
  const you = recs.filter((r) => r.tone === 'you')
  const other = recs.filter((r) => r.tone !== 'you')
  const active = Store.activeSession(state)
  const day = nextDay(state.program, state.sessions)
  const cr = Coach.completionRate(state.sessions, state.profile.weekly_days, now, { windowDays: 7 })
  const streak = Coach.weekStreak(state.sessions, now)
  const done = Coach.completed(state.sessions)
  const last = done[done.length - 1]

  const focus = active
    ? `<article class="hy-card is-focus"><div class="hy-card-head"><h2 class="hy-card-title">訓練進行中：${esc(active.focus)}</h2>${pill('ai', '記錄中')}</div>
        <p class="fc-mt">已記錄 ${active.sets.length} 組，開始於 ${fmtFull(active.started_at).slice(11)}。</p>
        <div class="fc-actions"><a class="hy-btn is-primary fc-linkbtn" href="#log">繼續記錄</a></div></article>`
    : `<article class="hy-card is-focus"><div class="hy-card-head"><h2 class="hy-card-title">今天練：${esc(day.focus)}</h2>${pill('wait', `第 ${day.day_no}／${state.program.days.length} 天`)}</div>
        <ul class="fc-plan">${day.items.map((it) => `<li><b>${esc(exName(it.exercise_id))}</b><span class="hy-note">${esc(prescription(it))}</span></li>`).join('')}</ul>
        <div class="fc-actions"><button class="hy-btn is-primary" data-act="start-day">開始訓練</button><button class="hy-btn" data-act="start-free">自由訓練</button></div></article>`

  const recCard = (r) => `<article class="hy-card ${r.tone === 'you' ? 'needs-you' : ''}">
      <div class="hy-card-head"><h3 class="hy-card-title">${esc(r.title)}</h3>${pill(r.tone, r.tone === 'you' ? '建議調整' : r.tone === 'done' ? '照計畫' : '說明')}</div>
      <p class="fc-mt">${esc(r.message)}</p>
      <p class="hy-note fc-mt-s">依據：${esc(r.reasons.join('、'))}｜資料 ${esc(r.window.from === r.window.to ? r.window.to : `${r.window.from} ～ ${r.window.to}`)}｜<code>${esc(r.code)}</code></p></article>`

  return `<div class="hy-pagehead"><div><h1 class="hy-title">今天</h1><p class="hy-lede">${esc(state.program.name)}</p></div>
      <div class="hy-summary">${you.length ? pill('you', `建議調整 ${you.length}`) : pill('done', '沒有待調整')}</div></div>
    <div class="hy-split">
      <div class="hy-stack">${you.map(recCard).join('')}${focus}${other.map(recCard).join('')}</div>
      <div class="hy-stack">
        <article class="hy-card"><h2 class="hy-card-title">這週</h2>
          <dl class="fc-stats">
            <div><dt>完成</dt><dd>${cr.done}／${state.profile.weekly_days} 次</dd></div>
            <div><dt>連續週數</dt><dd>${streak} 週</dd></div>
            <div><dt>上次訓練</dt><dd>${last ? `${fmtDate(last.started_at)} ${esc(last.focus)}` : '還沒有'}</dd></div>
            <div><dt>上次訓練量</dt><dd>${last ? `${Coach.sessionVolume(last)} kg` : '—'}</dd></div>
          </dl></article>
        <p class="hy-note">${esc(GENERAL_SAFETY)}</p>
      </div>
    </div>`
}

// ── 訓練紀錄 ──
function setForm(sessionId, exId, last) {
  const errs = ui.setErrors[exId]
  return `<form class="fc-setform" data-form="set" data-session="${sessionId}" data-ex="${exId}">
    <label class="fc-field fc-sm"><span>重量 kg</span><input name="weight_kg" inputmode="decimal" value="${esc(last?.weight_kg ?? '')}"></label>
    <label class="fc-field fc-sm"><span>次數</span><input name="reps" inputmode="numeric" value="${esc(last?.reps ?? '')}" required></label>
    <label class="fc-field fc-sm"><span>RPE</span><input name="rpe" inputmode="decimal" value="${esc(last?.rpe ?? '')}" placeholder="1–10"></label>
    <label class="fc-field fc-sm"><span>RIR</span><input name="rir" inputmode="numeric" value="${esc(last?.rir ?? '')}" placeholder="0–10"></label>
    <label class="fc-field fc-sm"><span>休息秒</span><input name="rest_seconds" inputmode="numeric" value="${esc(last?.rest_seconds ?? '')}"></label>
    <label class="fc-check"><input type="checkbox" name="is_warmup"> 熱身組</label>
    <button class="hy-btn is-primary" type="submit">記錄這組</button>
    ${errs ? `<p class="fc-err">${esc(errs.join('；'))}</p>` : ''}
  </form>`
}

function pageLog() {
  const active = Store.activeSession(state)
  const done = Coach.completed(state.sessions).slice().reverse()
  const history = done.length
    ? `<article class="hy-card"><h2 class="hy-card-title">訓練紀錄</h2><ul class="hy-list">${done.map((s) => `<li><span><b>${fmtDate(s.started_at)}</b> ${esc(s.focus)}<br><span class="hy-note">${Coach.workingSets(s).length} 組｜訓練量 ${Coach.sessionVolume(s)} kg${s.note ? `｜${esc(s.note)}` : ''}</span></span><button class="hy-btn is-danger fc-xs" data-act="delete-session" data-id="${s.id}" aria-label="刪除 ${fmtDate(s.started_at)} 的訓練">刪除</button></li>`).join('')}</ul></article>`
    : `<div class="hy-empty">還沒有完成的訓練。完成後會出現在這裡。</div>`
  const prs = Coach.personalRecords(state.sessions)
  const prCard = prs.length
    ? `<article class="hy-card"><h2 class="hy-card-title">個人紀錄</h2><table class="fc-table"><thead><tr><th>動作</th><th>最大重量</th><th>估算 1RM</th></tr></thead><tbody>${prs.map((p) => `<tr><td>${esc(exName(p.exercise_id))}</td><td>${p.max_weight} kg<br><span class="hy-note">${fmtDate(p.max_weight_date)}</span></td><td>${p.best_e1rm ? `${p.best_e1rm} kg` : '—'}</td></tr>`).join('')}</tbody></table><p class="hy-note fc-mt-s">估算 1RM 用 Epley 公式，只計 12 下以內的工作組。</p></article>`
    : ''

  if (!active) {
    const can = !!state.profile
    return `<div class="hy-pagehead"><h1 class="hy-title">訓練</h1></div>${flashHtml()}
      <div class="hy-split"><div class="hy-stack">
        <div class="hy-empty">現在沒有進行中的訓練。${can ? '按「開始今天的訓練」照菜單記錄，或用自由訓練。' : '請先到「今天」完成設定。'}
          ${can ? `<div class="fc-actions"><button class="hy-btn is-primary" data-act="start-day">開始今天的訓練</button><button class="hy-btn" data-act="start-free">自由訓練</button></div>` : ''}</div>
        ${history}</div><div class="hy-stack">${prCard}</div></div>`
  }
  const dayItems = state.program?.days.find((d) => d.day_no === active.day_no && active.program_id === state.program.id)?.items || []
  const extra = [...new Set(active.sets.map((x) => x.exercise_id))].filter((id) => !active.planned.includes(id))
  const ids = [...active.planned, ...extra]
  const exCard = (id) => {
    const it = dayItems.find((i) => i.exercise_id === id)
    const sets = active.sets.filter((x) => x.exercise_id === id)
    const last = sets[sets.length - 1]
    return `<article class="hy-card" id="ex-${id}"><div class="hy-card-head"><h3 class="hy-card-title">${esc(exName(id))}</h3>${sets.length ? pill(it && Coach.workingSets({ sets }).length >= it.sets ? 'done' : 'ai', `${sets.length} 組`) : pill('wait', '未開始')}</div>
      ${it ? `<p class="hy-note">${esc(prescription(it))}</p>` : ''}
      ${sets.length ? `<table class="fc-table fc-mt-s"><thead><tr><th>#</th><th>重量</th><th>次數</th><th>RPE</th><th>RIR</th><th></th></tr></thead><tbody>${sets.map((x) => `<tr><td>${x.is_warmup ? '熱' : x.set_no}</td><td>${x.weight_kg}</td><td>${x.reps}</td><td>${num(x.rpe)}</td><td>${num(x.rir)}</td><td><button class="fc-del" data-act="remove-set" data-session="${active.id}" data-id="${x.id}" aria-label="刪除這組">×</button></td></tr>`).join('')}</tbody></table>` : ''}
      ${setForm(active.id, id, last)}</article>`
  }
  const others = EXERCISES.filter((e) => !ids.includes(e.id))
  return `<div class="hy-pagehead"><div><h1 class="hy-title">${esc(active.focus)}</h1><p class="hy-lede">開始於 ${fmtFull(active.started_at)}｜已記錄 ${active.sets.length} 組</p></div>${pill('ai', '記錄中')}</div>${flashHtml()}
    <div class="hy-stack">
      ${ids.length ? ids.map(exCard).join('') : '<div class="hy-empty">自由訓練：從下方選一個動作開始記錄。</div>'}
      <article class="hy-card"><form class="fc-inline" data-form="add-ex"><label class="fc-field"><span>加入其他動作</span><select name="ex">${others.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></label><button class="hy-btn" type="submit">加入</button></form></article>
      <article class="hy-card"><form data-form="finish" data-session="${active.id}" class="fc-form">
        <label class="fc-field"><span>備註（選填）</span><input name="note" maxlength="200" placeholder="例如：深蹲第 3 組膝蓋有點緊"></label>
        <div class="fc-actions"><button class="hy-btn is-primary" type="submit">完成訓練</button><button class="hy-btn is-danger" type="button" data-act="cancel-session" data-id="${active.id}">取消這場訓練</button></div>
      </form></article>
    </div>`
}

// ── 菜單 ──
function pagePlan() {
  if (!state.profile) return `<div class="hy-pagehead"><h1 class="hy-title">菜單</h1></div><div class="hy-empty">還沒有菜單。請先到「今天」設定目標與每週天數。</div>`
  const p = state.program
  return `<div class="hy-pagehead"><div><h1 class="hy-title">${esc(p.name)}</h1><p class="hy-lede">每 ${p.weeks} 週一個循環｜每週 ${p.days_per_week} 天</p></div>${pill('done', '使用中')}</div>
    <div class="hy-split"><div class="hy-stack">
      ${p.days.map((d) => `<article class="hy-card"><div class="hy-card-head"><h2 class="hy-card-title">第 ${d.day_no} 天｜${esc(d.focus)}</h2></div>
        <ul class="fc-plan">${d.items.map((it) => `<li><a href="#library/${it.exercise_id}"><b>${esc(exName(it.exercise_id))}</b></a><span class="hy-note">${esc(prescription(it))}</span></li>`).join('')}</ul></article>`).join('')}
    </div><div class="hy-stack">
      <article class="hy-card"><h2 class="hy-card-title">為什麼是這份菜單</h2>
        <dl class="hy-kv"><dt>規則</dt><dd><ul>${p.rule_source.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></dd>
          <dt>進步方式</dt><dd>${esc(p.progression_rule)}</dd><dt>減量</dt><dd>${esc(DELOAD_RULE)}</dd></dl></article>
      <article class="hy-card"><h2 class="hy-card-title">想換目標？</h2><p class="fc-mt">到「設定」切換目標或每週天數，菜單會依規則重新產生；過去的紀錄不會被刪。</p></article>
    </div></div>`
}

// ── 動作庫 ──
function pageLibrary(openId) {
  const f = ui.lib
  if (openId) f.open = openId
  const list = filterExercises(f)
  const card = (e) => `<details class="hy-card fc-ex" id="lib-${e.id}" ${f.open === e.id ? 'open' : ''}>
      <summary><span class="hy-card-title">${esc(e.name)}</span><span class="hy-note">${e.muscles.map((m) => MUSCLES[m]).join('・')}｜${EQUIPMENT[e.equipment]}</span></summary>
      <dl class="hy-kv"><dt>步驟</dt><dd><ol>${e.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></dd>
        <dt>常見錯誤</dt><dd><ul>${e.mistakes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></dd>
        <dt>安全提示</dt><dd>${esc(e.safety)}</dd></dl></details>`
  return `<div class="hy-pagehead"><div><h1 class="hy-title">動作庫</h1><p class="hy-lede">${EXERCISES.length} 個健身房常見動作</p></div></div>
    <form class="fc-filter" data-form="lib">
      <label class="fc-field"><span>搜尋</span><input name="q" value="${esc(f.q)}" placeholder="例如：深蹲"></label>
      <label class="fc-field"><span>部位</span><select name="muscle"><option value="">全部</option>${Object.entries(MUSCLES).map(([k, v]) => `<option value="${k}" ${k === f.muscle ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="fc-field"><span>器材</span><select name="equipment"><option value="">全部</option>${Object.entries(EQUIPMENT).map(([k, v]) => `<option value="${k}" ${k === f.equipment ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    </form>
    <div class="hy-stack fc-mt">${list.length ? list.map(card).join('') : '<div class="hy-empty">沒有符合的動作。換個關鍵字或把篩選改回「全部」。</div>'}</div>
    <p class="hy-note fc-mt">內容來源：${esc(CONTENT_SOURCE.label)}。${esc(CONTENT_SOURCE.detail)}</p>
    <p class="hy-note fc-mt-s">${esc(GENERAL_SAFETY)}</p>`
}

// ── 身體（InBody） ──
function chart(field, unit) {
  const pts = Inbody.trendSeries(state.measurements, field)
  if (pts.length < 2) return `<p class="hy-note">至少 2 筆才畫趨勢。</p>`
  const W = 260, H = 116, P = 24
  const vals = pts.map((p) => p.value)
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5 }
  const x = (i) => P + (i * (W - P * 2)) / (pts.length - 1)
  const y = (v) => H - 20 - ((v - lo) / (hi - lo)) * (H - 40)
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  return `<svg class="fc-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(fieldLabel(field))}趨勢">
    <line x1="${P}" x2="${W - P}" y1="${H - 20}" y2="${H - 20}" class="fc-axis"/>
    <polyline points="${line}" class="fc-line"/>
    ${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3.5" class="fc-dot"><title>${p.date} ${p.value}${unit}</title></circle>`).join('')}
    <text x="${x(0)}" y="${H - 4}" class="fc-tick" text-anchor="start">${fmtDate(pts[0].date)}</text>
    <text x="${x(pts.length - 1)}" y="${H - 4}" class="fc-tick" text-anchor="end">${fmtDate(pts[pts.length - 1].date)}</text>
    <text x="${x(0)}" y="${y(pts[0].value) - 8}" class="fc-tick" text-anchor="start">${pts[0].value}</text>
    <text x="${x(pts.length - 1)}" y="${y(pts[pts.length - 1].value) - 8}" class="fc-tick" text-anchor="end">${pts[pts.length - 1].value}</text>
  </svg>`
}

function importSection() {
  const s = ui.imp
  const batches = (state.importBatches || [])
  const batchList = batches.length
    ? `<ul class="hy-list">${batches.map((b) => `<li><span><b>${esc(b.filename)}</b>（${b.source_type}）<br><span class="hy-note">${fmtFull(b.imported_at)}｜新增 ${b.success_count}、略過 ${b.skipped_count}、覆寫 ${b.overwritten_count}、失敗 ${b.error_count}</span></span>${b.undone_at ? pill('wait', '已撤銷') : `<button class="hy-btn is-danger fc-xs" data-act="undo-batch" data-id="${b.id}">撤銷這批</button>`}</li>`).join('')}</ul>`
    : ''
  let body = `<form data-form="import-file" class="fc-form"><label class="fc-field"><span>選擇 CSV 或 JSON 檔（UTF-8）</span><input type="file" name="file" accept=".csv,.json,text/csv,application/json"></label></form>
    <p class="hy-note fc-mt-s">範本：<a href="inbody-template.csv" download>CSV 範本</a>・<a href="inbody-template.json" download>JSON 範本</a>。原始檔內容不會保存，只保存整理後的數值與檔名。</p>`
  if (s?.error) body += `<div class="hy-alert is-bad fc-mt">${esc(s.error)}</div>`
  if (s?.parsed) {
    const p = s.preview
    body += `<div class="fc-mt"><h3 class="fc-sub">1. 欄位對應｜${esc(s.filename)}</h3>
      <form data-form="mapping" class="fc-map">${s.parsed.headers.map((h) => `<label class="fc-field fc-sm"><span>${esc(h)}</span><select name="${esc(h)}"><option value="">不匯入</option>${Inbody.FIELDS.map((f) => `<option value="${f.key}" ${s.mapping[h] === f.key ? 'selected' : ''}>${f.label}${f.required ? '＊' : ''}</option>`).join('')}</select></label>`).join('')}</form>
      <h3 class="fc-sub fc-mt">2. 預覽</h3>
      <div class="hy-summary">${pill('done', `可新增 ${p.ready.length}`)}${p.conflicts.length ? pill('you', `與既有重複 ${p.conflicts.length}`) : ''}${p.errors.length ? pill('bad', `錯誤 ${p.errors.length}`) : ''}${pill('wait', `共 ${p.total} 筆`)}</div>
      ${p.errors.length ? `<table class="fc-table fc-mt-s"><thead><tr><th>${s.source_type === 'JSON' ? '第幾筆' : '列號'}</th><th>欄位</th><th>原值</th><th>原因</th></tr></thead><tbody>${p.errors.slice(0, 50).map((e) => `<tr><td>${e.row || '—'}</td><td>${esc(fieldLabel(e.field))}</td><td>${esc(e.value)}</td><td>${esc(e.reason)}</td></tr>`).join('')}</tbody></table>${p.errors.length > 50 ? `<p class="hy-note">只列前 50 筆錯誤。</p>` : ''}<p class="hy-note">有錯誤的列不會匯入。</p>` : ''}
      ${p.conflicts.length ? `<fieldset class="fc-field fc-mt-s"><legend>重複資料（日期＋體重＋體脂率相同）怎麼處理？</legend>
        <label class="fc-check"><input type="radio" name="policy" value="skip" ${s.policy === 'skip' ? 'checked' : ''} data-act="policy"> 略過，保留舊資料</label>
        <label class="fc-check"><input type="radio" name="policy" value="overwrite" ${s.policy === 'overwrite' ? 'checked' : ''} data-act="policy"> 覆寫成這次檔案的數值</label></fieldset>` : ''}
      <div class="fc-actions"><button class="hy-btn is-primary" data-act="confirm-import" ${p.ready.length + (s.policy === 'overwrite' ? p.conflicts.length : 0) ? '' : 'disabled'}>確認匯入</button><button class="hy-btn" data-act="cancel-import">取消</button></div></div>`
  }
  return `<details class="hy-card fc-ex" id="imp-details" ${s || ui.impOpen ? 'open' : ''}><summary><span class="hy-card-title">從檔案匯入（選用）</span><span class="hy-note">CSV／JSON，可整批撤銷</span></summary><div class="fc-mt">${body}</div>${batchList ? `<h3 class="fc-sub fc-mt">匯入紀錄</h3>${batchList}` : ''}</details>`
}

function pageBody() {
  const ms = Inbody.sortMeasurements(state.measurements).slice().reverse()
  const t = Coach.bodyTrend(state.measurements)
  const errs = ui.bodyErrors
  const dup = ui.manualDup
  const form = `<article class="hy-card is-focus"><div class="hy-card-head"><h2 class="hy-card-title">記錄這次 InBody</h2></div>
    <p class="hy-note">照 InBody 報告填，＊為必填。</p>
    <form data-form="manual" class="fc-form fc-mt-s"><div class="fc-grid">
      ${Inbody.FIELDS.map((f) => `<label class="fc-field"><span>${f.label}${f.unit ? `（${f.unit}）` : ''}${f.required ? '＊' : ''}</span><input name="${f.key}" ${f.type === 'date' ? `type="date" max="${Inbody.todayISO()}" value="${Inbody.todayISO()}"` : `inputmode="decimal" placeholder="${f.min}–${f.max}"`} ${f.required ? 'required' : ''}></label>`).join('')}
    </div>
    ${errs.length ? `<div class="hy-alert is-bad fc-mt-s">${errs.map((e) => esc(e.reason)).join('<br>')}</div>` : ''}
    ${dup ? `<div class="hy-alert fc-mt-s">${fmtDate(dup.measured_at)} 已有一筆相同的資料。<div class="fc-actions"><button class="hy-btn" type="button" data-act="manual-overwrite">覆寫舊資料</button><button class="hy-btn" type="button" data-act="manual-cancel">不要存</button></div></div>` : ''}
    <div class="fc-actions"><button class="hy-btn is-primary" type="submit">儲存這次量測</button></div></form></article>`
  const trendNote = t.ok
    ? `<p class="hy-note">${fmtDate(t.base.measured_at)} → ${fmtDate(t.latest.measured_at)}（${t.days} 天）：體重 ${t.weight_delta >= 0 ? '+' : ''}${t.weight_delta} kg、骨骼肌 ${t.smm_delta >= 0 ? '+' : ''}${t.smm_delta} kg、體脂率 ${t.fat_pct_delta >= 0 ? '+' : ''}${t.fat_pct_delta}%</p>`
    : `<p class="hy-note">至少 2 次、間隔 14 天以上才會產生體組成建議。</p>`
  const trends = `<article class="hy-card"><h2 class="hy-card-title">趨勢</h2>${trendNote}
      <div class="fc-charts">${[['weight_kg', 'kg'], ['skeletal_muscle_mass_kg', 'kg'], ['body_fat_percent', '%']].map(([k, u]) => `<figure><figcaption>${fieldLabel(k)}（${u}）</figcaption>${chart(k, u)}</figure>`).join('')}</div></article>`
  const table = ms.length
    ? `<article class="hy-card"><h2 class="hy-card-title">量測紀錄</h2><div class="fc-scroll"><table class="fc-table"><thead><tr><th>日期</th><th>體重</th><th>骨骼肌</th><th>體脂率</th><th>來源</th><th></th></tr></thead><tbody>${ms.map((m) => `<tr><td>${esc(String(m.measured_at).replace('T', ' '))}</td><td>${m.weight_kg}</td><td>${m.skeletal_muscle_mass_kg}</td><td>${m.body_fat_percent}</td><td>${m.source === 'MANUAL' ? '手動' : esc(m.source)}</td><td><button class="fc-del" data-act="delete-measurement" data-id="${m.id}" aria-label="刪除 ${esc(m.measured_at)}">×</button></td></tr>`).join('')}</tbody></table></div></article>`
    : `<div class="hy-empty">還沒有量測資料。量完 InBody 後在上面填寫第一筆。</div>`
  return `<div class="hy-pagehead"><div><h1 class="hy-title">身體數據</h1><p class="hy-lede">InBody 量測紀錄與趨勢</p></div>${pill('wait', `${ms.length} 筆`)}</div>${flashHtml()}
    <div class="hy-split"><div class="hy-stack">${form}${trends}</div><div class="hy-stack">${table}${importSection()}</div></div>`
}

// ── 設定 ──
function pageSettings() {
  const r = ui.restore
  const goalHist = state.goal?.history || []
  return `<div class="hy-pagehead"><h1 class="hy-title">設定</h1></div>${flashHtml()}
    <div class="hy-split"><div class="hy-stack">
      <article class="hy-card"><h2 class="hy-card-title">目標與菜單</h2><div class="fc-mt">${profileForm('儲存並更新菜單')}</div>
        ${goalHist.length ? `<p class="hy-note fc-mt">目標紀錄：${goalHist.map((g) => `${fmtDate(g.effective_from)} ${GOALS[g.goal_type].label}`).join(' → ')}</p>` : ''}</article>
    </div><div class="hy-stack">
      <article class="hy-card"><h2 class="hy-card-title">備份與還原</h2>
        <p class="fc-mt">資料只存在這台裝置的瀏覽器。換手機或清除瀏覽器資料前，先下載備份。</p>
        <div class="fc-actions"><button class="hy-btn is-primary" data-act="backup">下載備份</button><button class="hy-btn" data-act="export-csv">匯出訓練 CSV</button></div>
        <form data-form="restore-file" class="fc-form fc-mt"><label class="fc-field"><span>從備份還原（.json）</span><input type="file" name="file" accept=".json,application/json"></label></form>
        ${r?.error ? `<div class="hy-alert is-bad fc-mt-s">${esc(r.error)}</div>` : ''}
        ${r?.summary ? `<div class="hy-alert fc-mt-s">備份時間 ${esc(fmtFull(r.summary.exported_at))}：訓練 ${r.summary.sessions} 次、${r.summary.sets} 組、量測 ${r.summary.measurements} 筆。還原會<b>取代目前所有資料</b>。
          <div class="fc-actions"><button class="hy-btn is-primary" data-act="confirm-restore">確認還原</button><button class="hy-btn" data-act="cancel-restore">取消</button></div></div>` : ''}
      </article>
      <article class="hy-card"><h2 class="hy-card-title">資料與隱私</h2>
        <dl class="hy-kv"><dt>儲存位置</dt><dd>這台裝置的瀏覽器（localStorage）${storageOk ? '' : '：目前無法使用'}</dd>
          <dt>連線</dt><dd>不連 HY Life OS，也不呼叫任何 AI 模型 API。</dd>
          <dt>內容來源</dt><dd>${esc(CONTENT_SOURCE.label)}（${esc(CONTENT_SOURCE.license)}）</dd>
          <dt>資料版本</dt><dd>v${state.schema_version}</dd></dl>
        <div class="fc-actions">${ui.confirmReset ? `<button class="hy-btn is-danger" data-act="reset-confirm">確定清除所有資料</button><button class="hy-btn" data-act="reset-cancel">取消</button>` : `<button class="hy-btn is-danger" data-act="reset">清除所有資料</button>`}</div></article>
    </div></div>`
}

// ── Router ──
const PAGES = { today: pageToday, log: pageLog, plan: pagePlan, library: pageLibrary, body: pageBody, settings: pageSettings }
function route() {
  const [name, arg] = (location.hash.replace(/^#/, '') || 'today').split('/')
  return { name: PAGES[name] ? name : 'today', arg }
}
function render() {
  const { name, arg } = route()
  for (const a of document.querySelectorAll('#tabs .hy-tab')) {
    if (a.getAttribute('href') === `#${name}`) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  }
  const app = document.getElementById('app')
  const top = name === 'today' ? flashHtml() : ''
  app.innerHTML = globalAlerts() + top + PAGES[name](arg)
  if (name === 'library' && arg) document.getElementById(`lib-${arg}`)?.scrollIntoView({ block: 'start' })
}

// ── 事件 ──
const now = () => new Date()
function readForm(form) { return Object.fromEntries(new FormData(form).entries()) }
async function readFile(input) {
  const f = input.files?.[0]
  if (!f) return null
  const buf = await f.arrayBuffer()
  return { name: f.name, text: Inbody.decodeUtf8(buf) }
}
function refreshPreview() {
  const s = ui.imp
  s.preview = Inbody.previewImport(s.parsed, s.mapping, state.measurements)
}

document.addEventListener('submit', (ev) => {
  const form = ev.target
  ev.preventDefault()
  ui.flash = null
  try {
    if (form.id === 'profile-form') {
      const d = readForm(form)
      const first = !state.profile
      commit(Store.setupProfile(state, d, now()), first ? '菜單已建立' : '設定已儲存，菜單已依新設定更新')
      return
    }
    switch (form.dataset.form) {
      case 'set': {
        const { session, ex } = form.dataset
        const d = readForm(form)
        d.is_warmup = form.elements.is_warmup.checked
        const r = Store.addSet(state, session, ex, d)
        if (r.errors.length) { ui.setErrors[ex] = r.errors; render(); return }
        delete ui.setErrors[ex]
        commit(r.state)
        document.getElementById(`ex-${ex}`)?.scrollIntoView({ block: 'nearest' })
        return
      }
      case 'add-ex': {
        const id = readForm(form).ex
        const a = Store.activeSession(state)
        commit({ ...state, sessions: state.sessions.map((s) => (s.id === a.id ? { ...s, planned: [...s.planned, id] } : s)) })
        document.getElementById(`ex-${id}`)?.scrollIntoView({ block: 'start' })
        return
      }
      case 'finish': {
        commit(Store.finishSession(state, form.dataset.session, { note: readForm(form).note, now: now() }), '訓練已完成並儲存')
        location.hash = '#today'
        return
      }
      case 'manual': {
        const d = readForm(form)
        const r = Inbody.addManualMeasurement(state, d, { now: now() })
        ui.bodyErrors = r.errors
        ui.manualDup = null
        if (r.errors.length) { render(); return }
        if (r.duplicate) { ui.manualDup = r.duplicate; ui.pendingManual = d; render(); return }
        commit(r.state, `已儲存 ${fmtDate(r.measurement.measured_at)} 的量測`)
        return
      }
    }
  } catch (e) { fail(e.message) }
})

document.addEventListener('change', async (ev) => {
  const el = ev.target
  const form = el.form
  ui.flash = null
  try {
    if (form?.dataset.form === 'lib') {
      Object.assign(ui.lib, readForm(form))
      render()
      return
    }
    if (form?.dataset.form === 'import-file' && el.name === 'file') {
      ui.imp = null
      try {
        const f = await readFile(el)
        if (!f) return
        const parsed = Inbody.parseFile(f.name, f.text)
        ui.imp = { filename: f.name, source_type: parsed.source_type, parsed, mapping: Inbody.autoMap(parsed.headers), policy: 'skip' }
        refreshPreview()
      } catch (e) { ui.imp = { error: e.message } }
      render()
      return
    }
    if (form?.dataset.form === 'mapping') {
      ui.imp.mapping = { ...ui.imp.mapping, [el.name]: el.value }
      refreshPreview()
      render()
      return
    }
    if (el.dataset.act === 'policy') { ui.imp.policy = el.value; render(); return }
    if (form?.dataset.form === 'restore-file' && el.name === 'file') {
      try {
        const f = await readFile(el)
        if (!f) return
        ui.restore = Store.parseBackup(f.text)
      } catch (e) { ui.restore = { error: e.message } }
      render()
    }
  } catch (e) { fail(e.message) }
})

document.addEventListener('input', (ev) => {
  const form = ev.target.form
  if (form?.dataset.form === 'lib' && ev.target.name === 'q') {
    ui.lib.q = ev.target.value
    clearTimeout(ui._t)
    ui._t = setTimeout(() => {
      render()
      const q = document.querySelector('[data-form="lib"] input[name="q"]')
      if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length) }
    }, 250)
  }
})

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]')
  if (!el || el.tagName === 'INPUT') return
  const act = el.dataset.act
  ui.flash = null
  try {
    switch (act) {
      case 'start-day': commit(Store.startSession(state, nextDay(state.program, state.sessions), now())); location.hash = '#log'; break
      case 'start-free': commit(Store.startSession(state, null, now())); location.hash = '#log'; break
      case 'remove-set': commit(Store.removeSet(state, el.dataset.session, el.dataset.id)); break
      case 'cancel-session': if (confirm('取消後這場訓練的紀錄不會保存，確定嗎？')) commit(Store.cancelSession(state, el.dataset.id), '已取消這場訓練'); break
      case 'delete-session': if (confirm('確定刪除這場訓練紀錄？')) commit(Store.deleteSession(state, el.dataset.id), '已刪除訓練紀錄'); break
      case 'delete-measurement': if (confirm('確定刪除這筆量測？')) commit(Inbody.deleteMeasurement(state, el.dataset.id), '已刪除量測'); break
      case 'manual-overwrite': {
        const r = Inbody.addManualMeasurement(state, ui.pendingManual, { now: now(), overwrite: true })
        ui.manualDup = null
        commit(r.state, '已覆寫舊資料')
        break
      }
      case 'manual-cancel': ui.manualDup = null; render(); break
      case 'confirm-import': {
        const s = ui.imp
        const { state: next, batch } = Inbody.commitImport(state, s.preview, { filename: s.filename, source_type: s.source_type, conflictPolicy: s.policy, now: now() })
        ui.imp = null
        commit(next, `匯入完成：新增 ${batch.success_count} 筆、略過 ${batch.skipped_count}、失敗 ${batch.error_count}${batch.overwritten_count ? `（覆寫 ${batch.overwritten_count}）` : ''}`)
        break
      }
      case 'cancel-import': ui.imp = null; render(); break
      case 'undo-batch': if (confirm('撤銷後這批匯入的資料會全部移除，被覆寫的舊資料會還原。確定嗎？')) commit(Inbody.undoImport(state, el.dataset.id, { now: now() }), '已撤銷這批匯入'); break
      case 'backup': download(`fitness-coach-backup-${Inbody.todayISO()}.json`, Store.exportBackup(state), 'application/json'); ui.flash = { tone: 'done', text: '備份檔已下載' }; render(); break
      case 'export-csv': download(`fitness-coach-sets-${Inbody.todayISO()}.csv`, '﻿' + Store.exportSetsCSV(state, exName), 'text/csv'); break
      case 'confirm-restore': { const next = ui.restore.state; ui.restore = null; commit(next, '已從備份還原'); break }
      case 'cancel-restore': ui.restore = null; render(); break
      case 'reset': ui.confirmReset = true; render(); break
      case 'reset-cancel': ui.confirmReset = false; render(); break
      case 'reset-confirm': ui.confirmReset = false; commit(Store.createInitialState(), '所有資料已清除'); location.hash = '#today'; break
    }
  } catch (e) { fail(e.message) }
})

document.addEventListener('toggle', (ev) => { if (ev.target.id === 'imp-details') ui.impOpen = ev.target.open }, true)

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0) })
stamp()
render()

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* 離線快取失敗不影響使用 */ })
}
