// Local-first 資料層：整份 state 存在本機 localStorage（單一 key），不連任何伺服器。
// 寫入一律「產生新 state → 一次存檔」，確保交易式（失敗就不改動）。
import { newId } from './inbody.js'
import { generateProgram, GOAL_RULES } from './programs.js'

export const STORAGE_KEY = 'hy-fitness-coach:v1'
export const SCHEMA_VERSION = 1
export const APP_ID = 'hy-fitness-coach'

export function createInitialState() {
  return {
    schema_version: SCHEMA_VERSION,
    profile: null, // { display_name, training_level, weekly_days, session_minutes, health_note, created_at, updated_at }
    goal: null, // { goal_type, effective_from, history:[{goal_type, effective_from}] }
    program: null,
    sessions: [],
    measurements: [],
    importBatches: [],
  }
}

/** schema 升級：之後版本變更在這裡補 migration */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return createInitialState()
  const v = Number(raw.schema_version) || 0
  if (v > SCHEMA_VERSION) throw new Error(`資料版本 ${v} 比 App 新，請更新 App 後再開啟。`)
  const base = createInitialState()
  return {
    ...base, ...raw, schema_version: SCHEMA_VERSION,
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    measurements: Array.isArray(raw.measurements) ? raw.measurements : [],
    importBatches: Array.isArray(raw.importBatches) ? raw.importBatches : [],
  }
}

export function load(storage) {
  try {
    const text = storage?.getItem(STORAGE_KEY)
    return text ? migrate(JSON.parse(text)) : createInitialState()
  } catch (e) {
    if (String(e.message).includes('版本')) throw e
    return createInitialState()
  }
}

export function save(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
  return state
}

// ── 設定與目標 ──
export function setupProfile(state, input, now = new Date()) {
  const at = now.toISOString()
  const profile = {
    display_name: String(input.display_name || 'HY').slice(0, 40),
    training_level: input.training_level || 'beginner',
    weekly_days: Math.min(6, Math.max(2, Number(input.weekly_days) || 3)),
    session_minutes: [30, 45, 60, 90].includes(Number(input.session_minutes)) ? Number(input.session_minutes) : 60,
    health_note: String(input.health_note || '').slice(0, 500),
    created_at: state.profile?.created_at || at, updated_at: at,
  }
  let next = { ...state, profile }
  next = setGoal(next, input.goal_type || state.goal?.goal_type || 'MUSCLE_GAIN', now, { force: true })
  return next
}

export function setGoal(state, goal_type, now = new Date(), { force = false } = {}) {
  if (!GOAL_RULES[goal_type]) throw new Error(`未知目標：${goal_type}`)
  const at = now.toISOString()
  const prev = state.goal
  let goal = prev
  if (!prev || prev.goal_type !== goal_type) {
    goal = { goal_type, effective_from: at, history: [...(prev?.history || []), { goal_type, effective_from: at }] }
  } else if (!force) return state
  const program = state.profile ? generateProgram({ ...state.profile, goal_type }) : null
  return { ...state, goal, program }
}

// ── 訓練紀錄 ──
export function activeSession(state) {
  return (state.sessions || []).find((s) => s.status === 'IN_PROGRESS') || null
}

export function startSession(state, day, now = new Date()) {
  if (activeSession(state)) throw new Error('已經有一場訓練進行中，請先完成或取消。')
  const s = {
    id: newId('s'), started_at: now.toISOString(), ended_at: null,
    program_id: day ? state.program?.id : null, day_no: day?.day_no ?? null, focus: day?.focus || '自由訓練',
    planned: day ? day.items.map((i) => i.exercise_id) : [],
    status: 'IN_PROGRESS', note: '', sets: [],
  }
  return { ...state, sessions: [...state.sessions, s] }
}

function updateSession(state, id, fn) {
  let found = false
  const sessions = state.sessions.map((s) => (s.id === id ? (found = true, fn(s)) : s))
  if (!found) throw new Error('找不到這場訓練')
  return { ...state, sessions }
}

export function validateSet(input) {
  const errors = []
  const w = input.weight_kg === '' || input.weight_kg == null ? 0 : Number(input.weight_kg)
  const r = Number(input.reps)
  if (!Number.isFinite(w) || w < 0 || w > 500) errors.push('重量需介於 0–500 kg')
  if (!Number.isInteger(r) || r < 1 || r > 300) errors.push('次數（或秒數）需為 1–300 的整數')
  const opt = (v, min, max, label) => {
    if (v === '' || v == null) return null
    const n = Number(v)
    if (!Number.isFinite(n) || n < min || n > max) { errors.push(`${label}需介於 ${min}–${max}`); return null }
    return n
  }
  const rpe = opt(input.rpe, 1, 10, 'RPE ')
  const rir = opt(input.rir, 0, 10, 'RIR ')
  const rest = opt(input.rest_seconds, 0, 1800, '休息秒數')
  return { errors, set: { weight_kg: w, reps: r, rpe, rir, rest_seconds: rest, is_warmup: !!input.is_warmup } }
}

export function addSet(state, sessionId, exercise_id, input) {
  const { errors, set } = validateSet(input)
  if (errors.length) return { state, errors }
  const next = updateSession(state, sessionId, (s) => {
    const n = s.sets.filter((x) => x.exercise_id === exercise_id).length + 1
    return { ...s, sets: [...s.sets, { id: newId('set'), session_id: s.id, exercise_id, set_no: n, ...set }] }
  })
  return { state: next, errors: [] }
}

export function removeSet(state, sessionId, setId) {
  return updateSession(state, sessionId, (s) => ({ ...s, sets: s.sets.filter((x) => x.id !== setId) }))
}

export function finishSession(state, sessionId, { note = '', now = new Date() } = {}) {
  return updateSession(state, sessionId, (s) => {
    if (!s.sets.length) throw new Error('還沒有記錄任何一組，無法完成。')
    return { ...s, status: 'COMPLETED', ended_at: now.toISOString(), note }
  })
}

export function cancelSession(state, sessionId) {
  return { ...state, sessions: state.sessions.filter((s) => s.id !== sessionId || s.status !== 'IN_PROGRESS') }
}

export function deleteSession(state, sessionId) {
  return { ...state, sessions: state.sessions.filter((s) => s.id !== sessionId) }
}

// ── 備份與還原 ──
export function exportBackup(state, now = new Date()) {
  return JSON.stringify({ app: APP_ID, schema_version: SCHEMA_VERSION, exported_at: now.toISOString(), data: state }, null, 2)
}

/** 解析備份檔：驗證格式後回傳 { state, summary }；不寫入 */
export function parseBackup(text) {
  let obj
  try { obj = JSON.parse(String(text).replace(/^﻿/, '')) } catch { throw new Error('備份檔不是有效的 JSON。') }
  if (!obj || obj.app !== APP_ID || !obj.data) throw new Error('這不是健身教練的備份檔。')
  const state = migrate(obj.data)
  return {
    state,
    summary: {
      exported_at: obj.exported_at || null,
      sessions: state.sessions.filter((s) => s.status === 'COMPLETED').length,
      sets: state.sessions.reduce((t, s) => t + (s.sets?.length || 0), 0),
      measurements: state.measurements.length,
      goal: state.goal?.goal_type || null,
    },
  }
}

/** CSV 匯出（訓練組次），方便用試算表查看 */
export function exportSetsCSV(state, exName = (id) => id) {
  const head = 'date,focus,exercise,set_no,weight_kg,reps,rpe,rir,rest_seconds,is_warmup'
  const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
  const rows = state.sessions.filter((s) => s.status === 'COMPLETED').flatMap((s) =>
    s.sets.map((x) => [s.started_at.slice(0, 10), s.focus, exName(x.exercise_id), x.set_no, x.weight_kg, x.reps, x.rpe, x.rir, x.rest_seconds, x.is_warmup ? 1 : 0].map(esc).join(',')))
  return [head, ...rows].join('\n') + '\n'
}
