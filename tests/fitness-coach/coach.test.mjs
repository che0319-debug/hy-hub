import test from 'node:test'
import assert from 'node:assert/strict'
import { generateProgram, nextDay, GOAL_TYPES } from '../../public/fitness-coach/lib/programs.js'
import { EXERCISE_BY_ID, EXERCISES } from '../../public/fitness-coach/lib/exercises.js'
import * as C from '../../public/fitness-coach/lib/coach.js'
import * as S from '../../public/fitness-coach/lib/store.js'
import * as I from '../../public/fitness-coach/lib/inbody.js'

const NOW = new Date('2026-10-09T12:00:00')

test('四種目標 × 2–6 天都產生菜單，動作皆存在且附規則來源', () => {
  for (const goal_type of GOAL_TYPES) for (const d of [2, 3, 4, 5, 6]) for (const min of [30, 60, 90]) {
    const p = generateProgram({ goal_type, weekly_days: d, training_level: 'intermediate', session_minutes: min })
    assert.equal(p.days.length, d)
    assert.ok(p.rule_source.length >= 3)
    assert.ok(p.progression_rule && p.deload_rule)
    for (const day of p.days) for (const it of day.items) assert.ok(EXERCISE_BY_ID[it.exercise_id], it.exercise_id)
  }
})

test('目標不同 → 處方不同（可解釋的差異）', () => {
  const opts = { weekly_days: 3, training_level: 'intermediate', session_minutes: 60 }
  const mg = generateProgram({ ...opts, goal_type: 'MUSCLE_GAIN' })
  const fl = generateProgram({ ...opts, goal_type: 'FAT_LOSS' })
  const ft = generateProgram({ ...opts, goal_type: 'FITNESS' })
  const mt = generateProgram({ ...opts, goal_type: 'MAINTAIN' })
  assert.equal(mg.days[0].items[0].sets, 4)
  assert.equal(mt.days[0].items[0].sets, 3)
  assert.ok(fl.days[0].items.some((i) => i.unit === '輪'))
  assert.ok(ft.days[0].items.some((i) => i.unit === '輪'))
  assert.ok(!mg.days[0].items.some((i) => i.unit === '輪'))
  assert.ok(ft.days[0].items[1].rest_seconds < mg.days[0].items[1].rest_seconds)
  assert.match(mg.rule_source[0], /G-MG-1/)
  const beginner = generateProgram({ ...opts, goal_type: 'MUSCLE_GAIN', training_level: 'beginner' })
  assert.equal(beginner.days[0].items[0].sets, 3)
})

test('動作庫每個動作都有步驟、常見錯誤與安全提示', () => {
  assert.ok(EXERCISES.length >= 20)
  for (const e of EXERCISES) {
    assert.ok(e.steps.length >= 2 && e.mistakes.length >= 1 && e.safety, e.id)
  }
})

function withSession(state, day, sets, at) {
  let s = S.startSession(state, day, new Date(at))
  const id = S.activeSession(s).id
  for (const x of sets) s = S.addSet(s, id, x.ex, x).state
  return S.finishSession(s, id, { now: new Date(at) })
}

test('目標切換：菜單重新產生並保留目標紀錄', () => {
  let st = S.setupProfile(S.createInitialState(), { goal_type: 'MUSCLE_GAIN', weekly_days: 4, training_level: 'intermediate', session_minutes: 60 }, NOW)
  assert.equal(st.program.goal_type, 'MUSCLE_GAIN')
  st = S.setGoal(st, 'FAT_LOSS', new Date('2026-10-10T08:00:00'))
  assert.equal(st.program.goal_type, 'FAT_LOSS')
  assert.deepEqual(st.goal.history.map((h) => h.goal_type), ['MUSCLE_GAIN', 'FAT_LOSS'])
  assert.equal(S.setGoal(st, 'FAT_LOSS'), st) // 相同目標不重建
})

test('訓練紀錄：下一天輪替、e1RM、訓練量、個人紀錄', () => {
  let st = S.setupProfile(S.createInitialState(), { goal_type: 'MUSCLE_GAIN', weekly_days: 3, training_level: 'intermediate', session_minutes: 60 }, NOW)
  const d1 = nextDay(st.program, st.sessions)
  assert.equal(d1.day_no, 1)
  st = withSession(st, d1, [{ ex: 'back-squat', weight_kg: 20, reps: 10, is_warmup: true }, { ex: 'back-squat', weight_kg: 100, reps: 5, rpe: 8 }], '2026-10-06T19:00:00')
  assert.equal(nextDay(st.program, st.sessions).day_no, 2)
  const done = C.completed(st.sessions)
  assert.equal(C.sessionVolume(done[0]), 500) // 熱身組不計
  assert.equal(C.e1rm(100, 5), 116.7)
  assert.equal(C.e1rm(100, 15), null)
  const pr = C.personalRecords(st.sessions)
  assert.equal(pr[0].max_weight, 100)
  assert.equal(pr[0].best_e1rm, 116.7)
  assert.throws(() => S.startSession(S.startSession(st, null, NOW), null, NOW), /進行中/)
  assert.deepEqual(S.validateSet({ weight_kg: 'x', reps: 0 }).errors.length, 2)
})

test('建議：加重、疲勞、完成率低都附 reason code 與資料區間', () => {
  let st = S.setupProfile(S.createInitialState(), { goal_type: 'MUSCLE_GAIN', weekly_days: 3, training_level: 'intermediate', session_minutes: 60 }, new Date('2026-09-01T08:00:00'))
  const day = st.program.days[0]
  const squat = day.items.find((i) => i.exercise_id === 'back-squat')
  const top = (rpe) => Array.from({ length: squat.sets }, () => ({ ex: 'back-squat', weight_kg: 100, reps: squat.reps_max, rpe }))
  st = withSession(st, day, top(8), '2026-10-01T19:00:00')
  st = withSession(st, day, top(8), '2026-10-04T19:00:00')
  let recs = C.recommend(st, NOW)
  const up = recs.find((r) => r.code === 'LOAD_UP')
  assert.ok(up)
  assert.match(up.message, /105 kg/)
  assert.deepEqual(up.window, { from: '2026-10-01', to: '2026-10-04' })
  assert.ok(recs.find((r) => r.code === 'ADHERENCE_LOW'))

  st = withSession(st, day, top(9.5), '2026-10-06T19:00:00')
  st = withSession(st, day, top(9.5), '2026-10-07T19:00:00')
  st = withSession(st, day, top(9.5), '2026-10-08T19:00:00')
  recs = C.recommend(st, NOW)
  assert.ok(recs.find((r) => r.code === 'FATIGUE_HIGH'))
  assert.ok(!recs.find((r) => r.code === 'LOAD_UP'))
  for (const r of recs) assert.ok(r.code && r.reasons.length && r.window.from && r.window.to)
})

function addM(st, rows) {
  for (const [d, w, smm, bf] of rows) st = I.addManualMeasurement(st, { measured_at: d, weight_kg: w, skeletal_muscle_mass_kg: smm, body_fat_percent: bf }, { now: NOW }).state
  return st
}

test('體組成建議門檻：不足 2 次或間隔 < 14 天不產生趨勢建議', () => {
  const st0 = S.setupProfile(S.createInitialState(), { goal_type: 'MUSCLE_GAIN', weekly_days: 3 }, NOW)
  const one = addM(st0, [['2026-10-01', 70, 31, 20]])
  assert.equal(C.recommend(one, NOW).find((r) => r.code.startsWith('BODY')).code, 'BODY_INSUFFICIENT')
  const close = addM(st0, [['2026-09-28', 70, 31, 20], ['2026-10-08', 71, 31.5, 20]])
  const b = C.recommend(close, NOW).filter((r) => r.code.startsWith('BODY'))
  assert.deepEqual(b.map((r) => r.code), ['BODY_INSUFFICIENT'])
  assert.match(b[0].message, /10 天/)
})

test('體組成建議依目標判斷，撤銷匯入後同步更新', () => {
  let st = S.setupProfile(S.createInitialState(), { goal_type: 'MUSCLE_GAIN', weekly_days: 3 }, NOW)
  st = addM(st, [['2026-09-01', 70, 31, 20]])
  const csv = 'measured_at,weight_kg,skeletal_muscle_mass_kg,body_fat_percent\n2026-09-25,71,31.6,19.8\n'
  const parsed = I.parseFile('n.csv', csv)
  const pv = I.previewImport(parsed, I.autoMap(parsed.headers), st.measurements, { now: NOW })
  const { state: imported, batch } = I.commitImport(st, pv, { filename: 'n.csv', source_type: 'CSV', now: NOW })
  const r = C.recommend(imported, NOW).find((x) => x.code.startsWith('BODY'))
  assert.equal(r.code, 'BODY_MG_ON_TRACK')
  assert.deepEqual(r.window, { from: '2026-09-01', to: '2026-09-25' })
  const undone = I.undoImport(imported, batch.id, { now: NOW })
  assert.equal(C.recommend(undone, NOW).find((x) => x.code.startsWith('BODY')).code, 'BODY_INSUFFICIENT')

  const fl = S.setGoal(imported, 'FAT_LOSS', NOW)
  const fast = addM(fl, [['2026-10-09', 66, 31.4, 18]])
  assert.equal(C.recommend(fast, NOW).find((x) => x.code.startsWith('BODY')).code, 'BODY_FL_TOO_FAST')
  const mt = S.setGoal(imported, 'MAINTAIN', NOW)
  assert.equal(C.recommend(mt, NOW).find((x) => x.code.startsWith('BODY')).code, 'BODY_STABLE')
})
