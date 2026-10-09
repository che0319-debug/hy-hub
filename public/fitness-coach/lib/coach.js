// 進度統計與規則式建議。每則建議都有 reason code、觸發原因與資料區間；不使用模型 API。
import { EXERCISE_BY_ID } from './exercises.js'
import { GOALS } from './programs.js'
import { sortMeasurements } from './inbody.js'

const DAY = 86400000
const LOWER = new Set(['squat', 'hinge', 'lunge'])
const d10 = (s) => String(s).slice(0, 10)
const daysBetween = (a, b) => Math.round((Date.parse(d10(b)) - Date.parse(d10(a))) / DAY)
const round1 = (n) => Math.round(n * 10) / 10

export function e1rm(weight, reps) {
  const w = Number(weight), r = Number(reps)
  if (!(w > 0) || !(r > 0) || r > 12) return null
  return r === 1 ? w : round1(w * (1 + r / 30)) // Epley
}

export const workingSets = (s) => (s.sets || []).filter((x) => !x.is_warmup)
export const completed = (sessions) => (sessions || []).filter((s) => s.status === 'COMPLETED').sort((a, b) => a.started_at.localeCompare(b.started_at))

export function sessionVolume(session) {
  return round1(workingSets(session).reduce((t, x) => t + (Number(x.weight_kg) || 0) * (Number(x.reps) || 0), 0))
}

export function personalRecords(sessions) {
  const pr = {}
  for (const s of completed(sessions)) {
    for (const x of workingSets(s)) {
      const cur = pr[x.exercise_id] || { exercise_id: x.exercise_id, max_weight: 0, max_weight_date: null, best_e1rm: 0, best_e1rm_date: null }
      if ((Number(x.weight_kg) || 0) > cur.max_weight) { cur.max_weight = Number(x.weight_kg); cur.max_weight_date = d10(s.started_at) }
      const e = e1rm(x.weight_kg, x.reps)
      if (e && e > cur.best_e1rm) { cur.best_e1rm = e; cur.best_e1rm_date = d10(s.started_at) }
      pr[x.exercise_id] = cur
    }
  }
  return Object.values(pr).filter((p) => p.max_weight > 0)
}

/** 完成率：視窗內完成次數 ÷ 預期次數（每週天數 × 週數），最多 100% */
export function completionRate(sessions, daysPerWeek, now = new Date(), { windowDays = 28, since = null } = {}) {
  const end = now.getTime()
  let start = end - windowDays * DAY
  if (since) start = Math.max(start, Date.parse(since))
  const span = (end - start) / DAY
  const expected = (Number(daysPerWeek) || 0) * span / 7
  const done = completed(sessions).filter((s) => Date.parse(s.started_at) >= start && Date.parse(s.started_at) <= end).length
  if (expected < 1) return { rate: null, done, expected: round1(expected), from: new Date(start).toISOString(), to: now.toISOString() }
  return { rate: Math.min(1, done / expected), done, expected: round1(expected), from: new Date(start).toISOString(), to: now.toISOString() }
}

function weekKey(ts) {
  const d = new Date(ts)
  const day = (d.getDay() + 6) % 7 // 週一 = 0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d.getTime()
}

/** 連續有訓練的週數（本週或上週起算） */
export function weekStreak(sessions, now = new Date()) {
  const weeks = new Set(completed(sessions).map((s) => weekKey(Date.parse(s.started_at))))
  let k = weekKey(now.getTime())
  if (!weeks.has(k)) k -= 7 * DAY
  let n = 0
  while (weeks.has(k)) { n++; k = weekKey(k - 3 * DAY) }
  return n
}

export function weeklyVolume(sessions, now = new Date(), weeks = 8) {
  const out = []
  let k = weekKey(now.getTime())
  for (let i = 0; i < weeks; i++) { out.unshift({ week: new Date(k).toISOString().slice(0, 10), volume: 0, sessions: 0 }); k = weekKey(k - 3 * DAY) }
  for (const s of completed(sessions)) {
    const wk = new Date(weekKey(Date.parse(s.started_at))).toISOString().slice(0, 10)
    const row = out.find((r) => r.week === wk)
    if (row) { row.volume = round1(row.volume + sessionVolume(s)); row.sessions++ }
  }
  return out
}

/** 體組成趨勢：取最新一筆，以及至少早 14 天的最近一筆當基準 */
export function bodyTrend(measurements, minDays = 14) {
  const list = sortMeasurements(measurements || [])
  if (list.length < 2) return { ok: false, reason: 'COUNT', count: list.length }
  const latest = list[list.length - 1]
  const base = [...list].reverse().find((m) => daysBetween(m.measured_at, latest.measured_at) >= minDays)
  if (!base) return { ok: false, reason: 'SPAN', count: list.length, span: daysBetween(list[0].measured_at, latest.measured_at) }
  const days = daysBetween(base.measured_at, latest.measured_at)
  const weeks = days / 7
  return {
    ok: true, base, latest, days,
    weight_delta: round1(latest.weight_kg - base.weight_kg),
    weight_pct_per_week: Math.round(((latest.weight_kg - base.weight_kg) / base.weight_kg) * 100 / weeks * 100) / 100,
    smm_delta: round1(latest.skeletal_muscle_mass_kg - base.skeletal_muscle_mass_kg),
    fat_pct_delta: round1(latest.body_fat_percent - base.body_fat_percent),
  }
}

const exName = (id) => EXERCISE_BY_ID[id]?.name || id
const win = (from, to) => ({ from: d10(from), to: d10(to) })

/**
 * 產生建議。tone：you＝建議你調整（琥珀）、done＝照計畫進行（綠）、wait＝資訊（灰）
 */
export function recommend(state, now = new Date()) {
  const recs = []
  const goal = state.goal?.goal_type
  const profile = state.profile || {}
  const sessions = state.sessions || []
  const done = completed(sessions)
  const program = state.program

  if (!done.length) {
    recs.push({ code: 'START_FIRST', tone: 'wait', title: '先完成第一次訓練', message: '還沒有訓練紀錄。完成第一次訓練後，才會依你的表現調整重量與菜單。', reasons: ['完成次數 0'], window: win(now.toISOString(), now.toISOString()) })
  }

  // 完成率
  const cr = completionRate(sessions, profile.weekly_days, now, { since: state.goal?.effective_from })
  if (cr.rate !== null && cr.expected >= 2 && cr.rate < 0.6) {
    recs.push({
      code: 'ADHERENCE_LOW', tone: 'you', title: '完成率偏低，建議減少每週天數',
      message: `近期完成 ${cr.done}／${Math.round(cr.expected)} 次（${Math.round(cr.rate * 100)}%）。可以把每週天數減 1 天，或把單次時間縮短，先讓計畫跟得上。`,
      reasons: [`完成率 ${Math.round(cr.rate * 100)}% < 60%`], window: win(cr.from, cr.to),
    })
  }

  // 疲勞：最近 3 次平均 RPE ≥ 9
  const last3 = done.slice(-3)
  const rpes = last3.flatMap((s) => workingSets(s).map((x) => Number(x.rpe)).filter((v) => v > 0))
  if (last3.length === 3 && rpes.length >= 3) {
    const avg = rpes.reduce((a, b) => a + b, 0) / rpes.length
    if (avg >= 9) {
      recs.push({
        code: 'FATIGUE_HIGH', tone: 'you', title: '連續高強度，建議安排減量週',
        message: `最近 3 次訓練平均 RPE ${round1(avg)}。建議這週組數減半、重量約 85%，讓身體恢復。`,
        reasons: [`平均 RPE ${round1(avg)} ≥ 9`], window: win(last3[0].started_at, last3[2].started_at),
      })
    }
  }

  // 加重：同一動作最近 2 次，工作組全部做到菜單次數上限且 RPE ≤ 8
  if (program) {
    const target = {}
    for (const d of program.days) for (const it of d.items) if (it.reps_max && it.unit === '下') target[it.exercise_id] = it
    for (const [id, it] of Object.entries(target)) {
      const hist = done.filter((s) => workingSets(s).some((x) => x.exercise_id === id)).slice(-2)
      if (hist.length < 2) continue
      const ok = hist.every((s) => {
        const xs = workingSets(s).filter((x) => x.exercise_id === id)
        return xs.length >= it.sets && xs.every((x) => Number(x.reps) >= it.reps_max && Number(x.rpe) > 0 && Number(x.rpe) <= 8)
      })
      if (!ok) continue
      const lastW = Math.max(...workingSets(hist[1]).filter((x) => x.exercise_id === id).map((x) => Number(x.weight_kg) || 0))
      const inc = LOWER.has(EXERCISE_BY_ID[id]?.pattern) ? 5 : 2.5
      recs.push({
        code: 'LOAD_UP', tone: 'you', exercise_id: id, title: `${exName(id)}：下次可以加重`,
        message: `連續 2 次每組都做到 ${it.reps_max} 下且 RPE ≤ 8。下次試 ${lastW + inc} kg（+${inc}），次數回到 ${it.reps_min} 下起算。`,
        reasons: [`2 次 × ${it.sets} 組 ≥ ${it.reps_max} 下`, 'RPE ≤ 8'], window: win(hist[0].started_at, hist[1].started_at),
      })
    }
  }

  // 體組成趨勢：至少 2 次且間隔 ≥ 14 天
  const t = bodyTrend(state.measurements)
  if (!t.ok) {
    const why = t.reason === 'COUNT' ? `目前 ${t.count} 筆，需要至少 2 筆` : `最早與最新只差 ${t.span} 天，需要 ≥ 14 天`
    recs.push({ code: 'BODY_INSUFFICIENT', tone: 'wait', title: '體組成資料還不夠，暫不給趨勢建議', message: `${why}。單次 InBody 會受水分、飲食影響，累積後才判斷。`, reasons: [why], window: win(now.toISOString(), now.toISOString()) })
  } else if (goal) {
    const w = win(t.base.measured_at, t.latest.measured_at)
    const facts = [`體重 ${t.weight_delta >= 0 ? '+' : ''}${t.weight_delta} kg`, `骨骼肌 ${t.smm_delta >= 0 ? '+' : ''}${t.smm_delta} kg`, `體脂率 ${t.fat_pct_delta >= 0 ? '+' : ''}${t.fat_pct_delta}%`, `${t.days} 天`]
    let r
    if (goal === 'MUSCLE_GAIN') {
      if (t.smm_delta > 0) r = { code: 'BODY_MG_ON_TRACK', tone: 'done', title: '骨骼肌量上升，照計畫進行', message: '增肌方向正確。維持主要動作漸進加重。' }
      else if (t.weight_delta > 0 && t.fat_pct_delta > 0) r = { code: 'BODY_MG_FAT_GAIN', tone: 'you', title: '體重上升主要是脂肪', message: '骨骼肌沒有增加、體脂率上升。確認主要動作有在加重，熱量盈餘可以小一點。' }
      else r = { code: 'BODY_MG_NO_GAIN', tone: 'you', title: '骨骼肌量沒有增加', message: '檢查主要動作是否持續進步、每週是否完成預定次數；飲食與睡眠也要跟上。' }
    } else if (goal === 'FAT_LOSS') {
      if (t.weight_pct_per_week < -1) r = { code: 'BODY_FL_TOO_FAST', tone: 'you', title: '體重下降太快', message: `每週約 ${t.weight_pct_per_week}%，超過 1%。留意力量是否下滑，避免流失肌肉。` }
      else if (t.smm_delta < 0 && Math.abs(t.smm_delta) / t.base.skeletal_muscle_mass_kg > 0.02) r = { code: 'BODY_FL_MUSCLE_DROP', tone: 'you', title: '骨骼肌量下降超過 2%', message: '減脂期間要保住力量：主要動作維持重量，不要同時大砍組數。' }
      else if (t.fat_pct_delta < 0) r = { code: 'BODY_FL_ON_TRACK', tone: 'done', title: '體脂率下降，照計畫進行', message: '減脂方向正確。維持完成率與主要動作重量。' }
      else r = { code: 'BODY_FL_STALL', tone: 'you', title: '體脂率沒有下降', message: '確認每週完成次數；可增加 1 輪體能收尾，或重新檢視飲食。' }
    } else {
      const pct = Math.abs(t.weight_delta / t.base.weight_kg) * 100
      if (pct > 3 || Math.abs(t.fat_pct_delta) > 2) r = { code: 'BODY_STABILITY_SHIFT', tone: 'you', title: '體組成變化超過維持範圍', message: `體重變化 ${round1(pct)}% 或體脂率變化超過 2 個百分點。檢查訓練頻率與飲食是否改變。` }
      else r = { code: 'BODY_STABLE', tone: 'done', title: '體組成穩定', message: `${GOALS[goal].label}目標下，體重與體脂率都在穩定範圍。` }
    }
    recs.push({ ...r, reasons: facts, window: w })
  }
  return recs
}
