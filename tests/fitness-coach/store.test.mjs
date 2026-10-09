import test from 'node:test'
import assert from 'node:assert/strict'
import * as S from '../../public/fitness-coach/lib/store.js'
import * as I from '../../public/fitness-coach/lib/inbody.js'

const NOW = new Date('2026-10-09T12:00:00')
const mem = () => ({ d: {}, getItem(k) { return this.d[k] ?? null }, setItem(k, v) { this.d[k] = String(v) } })

function sample() {
  let st = S.setupProfile(S.createInitialState(), { goal_type: 'FITNESS', weekly_days: 4, training_level: 'beginner', session_minutes: 45 }, NOW)
  st = S.startSession(st, st.program.days[0], NOW)
  const id = S.activeSession(st).id
  st = S.addSet(st, id, 'back-squat', { weight_kg: '60', reps: '10', rpe: '7', rir: '3', rest_seconds: '90' }).state
  st = S.addSet(st, id, 'back-squat', { weight_kg: '60', reps: '10', rpe: '8' }).state
  st = S.finishSession(st, id, { note: '順', now: NOW })
  st = I.addManualMeasurement(st, { measured_at: '2026-10-01', weight_kg: 70, skeletal_muscle_mass_kg: 31, body_fat_percent: 20 }, { now: NOW }).state
  return st
}

test('存檔後重新載入資料一致（模擬重新啟動）', () => {
  const storage = mem()
  const st = sample()
  S.save(storage, st)
  assert.deepEqual(S.load(storage), st)
  assert.deepEqual(S.load(mem()), S.createInitialState())
})

test('備份 → 還原後資料完全一致', () => {
  const st = sample()
  const text = S.exportBackup(st, NOW)
  const { state, summary } = S.parseBackup(text)
  assert.deepEqual(state, st)
  assert.deepEqual(summary, { exported_at: NOW.toISOString(), sessions: 1, sets: 2, measurements: 1, goal: 'FITNESS' })
  assert.throws(() => S.parseBackup('{"app":"other","data":{}}'), /不是健身教練的備份/)
  assert.throws(() => S.parseBackup('nope'), /不是有效的 JSON/)
  assert.throws(() => S.parseBackup(JSON.stringify({ app: S.APP_ID, data: { schema_version: 99 } })), /比 App 新/)
})

test('匯出訓練 CSV 只含完成的訓練，熱身標記正確', () => {
  const csv = S.exportSetsCSV(sample(), (id) => (id === 'back-squat' ? '槓鈴背蹲舉' : id))
  const lines = csv.trim().split('\n')
  assert.equal(lines.length, 3)
  assert.match(lines[1], /^2026-10-09,上肢 A,槓鈴背蹲舉,1,60,10,7,3,90,0$/)
})

test('完成訓練需至少一組；取消只移除進行中的訓練', () => {
  let st = S.setupProfile(S.createInitialState(), { goal_type: 'MAINTAIN' }, NOW)
  st = S.startSession(st, null, NOW)
  const id = S.activeSession(st).id
  assert.throws(() => S.finishSession(st, id), /還沒有記錄/)
  st = S.cancelSession(st, id)
  assert.equal(st.sessions.length, 0)
})
