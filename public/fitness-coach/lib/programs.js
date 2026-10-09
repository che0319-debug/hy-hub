// 四種目標的規則式菜單：模板 + 規則引擎，不使用任何模型 API。每份菜單都附「規則來源」說明。
import { EXERCISE_BY_ID } from './exercises.js'

export const GOALS = {
  MUSCLE_GAIN: { label: '增肌', short: '主要動作漸進加重，累積訓練量，看骨骼肌量與體重趨勢。' },
  FAT_LOSS: { label: '減脂', short: '保住力量、維持完成率，加體能收尾，看體重與體脂率趨勢。' },
  FITNESS: { label: '體能', short: '休息較短、加間歇訓練，提升工作容量與恢復能力。' },
  MAINTAIN: { label: '維持', short: '較少組數、維持頻率與關鍵動作表現，體組成保持穩定。' },
}
export const GOAL_TYPES = Object.keys(GOALS)
export const LEVELS = { beginner: '新手（未滿半年）', intermediate: '中階（半年–2 年）', advanced: '進階（2 年以上）' }

// 各目標的處方規則（rule id 會顯示在畫面上，方便追溯）
export const GOAL_RULES = {
  MUSCLE_GAIN: {
    compound: { sets: 4, reps: [6, 10], rest: 120, rir: '1–3' },
    accessory: { sets: 3, reps: [10, 15], rest: 75, rir: '1–2' },
    conditioning: null,
    progression: '雙重漸進：所有組都做到次數上限且 RPE ≤ 8，下次上肢 +2.5 kg、下肢 +5 kg，次數回到下限。',
    rule_id: 'G-MG-1',
  },
  FAT_LOSS: {
    compound: { sets: 3, reps: [6, 10], rest: 120, rir: '2–3' },
    accessory: { sets: 3, reps: [10, 15], rest: 60, rir: '1–3' },
    conditioning: { sets: 8, reps: '30 秒快／60 秒慢', rest: 0 },
    progression: '主要動作以維持重量為優先；能完成全部組次且 RPE ≤ 8 再小幅加重。收尾間歇每週可加 1 輪。',
    rule_id: 'G-FL-1',
  },
  FITNESS: {
    compound: { sets: 3, reps: [8, 12], rest: 75, rir: '2–3' },
    accessory: { sets: 3, reps: [12, 15], rest: 45, rir: '2–3' },
    conditioning: { sets: 10, reps: '40 秒快／50 秒慢', rest: 0 },
    progression: '先縮短休息（每週 −10 秒，最少 45 秒），再增加間歇輪數，最後才加重。',
    rule_id: 'G-FT-1',
  },
  MAINTAIN: {
    compound: { sets: 3, reps: [5, 8], rest: 150, rir: '2–3' },
    accessory: { sets: 2, reps: [8, 12], rest: 90, rir: '2–3' },
    conditioning: null,
    progression: '維持重量與頻率；同重量連續 3 次 RPE ≤ 7 時可小幅加重。',
    rule_id: 'G-MT-1',
  },
}

export const DELOAD_RULE = '每 6 週安排 1 週減量：組數減半、重量約 85%。若連續 3 次訓練平均 RPE ≥ 9，提前減量。'

const DAY_TEMPLATES = {
  FULL_A: { focus: '全身 A', items: ['back-squat', 'bench-press', 'barbell-row', 'romanian-deadlift', 'lateral-raise', 'plank'] },
  FULL_B: { focus: '全身 B', items: ['deadlift', 'overhead-press', 'lat-pulldown', 'walking-lunge', 'db-curl', 'dead-bug'] },
  FULL_C: { focus: '全身 C', items: ['leg-press', 'db-bench-press', 'one-arm-db-row', 'hip-thrust', 'triceps-pushdown', 'plank'] },
  UPPER_A: { focus: '上肢 A', items: ['bench-press', 'barbell-row', 'overhead-press', 'lat-pulldown', 'db-curl', 'triceps-pushdown'] },
  LOWER_A: { focus: '下肢 A', items: ['back-squat', 'romanian-deadlift', 'walking-lunge', 'leg-curl', 'calf-raise', 'plank'] },
  UPPER_B: { focus: '上肢 B', items: ['incline-db-press', 'pull-up', 'db-shoulder-press', 'seated-cable-row', 'lateral-raise', 'triceps-pushdown'] },
  LOWER_B: { focus: '下肢 B', items: ['deadlift', 'leg-press', 'hip-thrust', 'leg-curl', 'calf-raise', 'dead-bug'] },
  PUSH: { focus: '推（胸肩三頭）', items: ['bench-press', 'overhead-press', 'incline-db-press', 'lateral-raise', 'triceps-pushdown', 'push-up'] },
  PULL: { focus: '拉（背二頭）', items: ['barbell-row', 'lat-pulldown', 'seated-cable-row', 'one-arm-db-row', 'db-curl', 'dead-bug'] },
  LEGS: { focus: '腿', items: ['back-squat', 'romanian-deadlift', 'leg-press', 'leg-curl', 'calf-raise', 'plank'] },
}
const SPLITS = {
  2: { name: '全身 2 日', days: ['FULL_A', 'FULL_B'] },
  3: { name: '全身 3 日', days: ['FULL_A', 'FULL_B', 'FULL_C'] },
  4: { name: '上下分化 4 日', days: ['UPPER_A', 'LOWER_A', 'UPPER_B', 'LOWER_B'] },
  5: { name: '推拉腿＋上下 5 日', days: ['PUSH', 'PULL', 'LEGS', 'UPPER_A', 'LOWER_A'] },
  6: { name: '推拉腿 6 日', days: ['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'LEGS'] },
}
const SLOTS_BY_MINUTES = (min) => (min <= 30 ? 3 : min <= 45 ? 4 : min <= 60 ? 5 : 6)
const CONDITIONING = ['rower', 'bike-intervals', 'kb-swing']

export function clampDays(n) { return Math.min(6, Math.max(2, Math.round(Number(n) || 3))) }

/** 依目標、每週天數、程度、單次時長產生菜單 */
export function generateProgram({ goal_type = 'MUSCLE_GAIN', weekly_days = 3, training_level = 'beginner', session_minutes = 60 } = {}) {
  if (!GOAL_RULES[goal_type]) throw new Error(`未知目標：${goal_type}`)
  const rules = GOAL_RULES[goal_type]
  const days = clampDays(weekly_days)
  const split = SPLITS[days]
  const slots = SLOTS_BY_MINUTES(Number(session_minutes) || 60)
  const setAdj = training_level === 'beginner' ? -1 : 0
  const rule_source = [
    `${rules.rule_id}｜${GOALS[goal_type].label}處方：主項 ${rules.compound.sets + setAdj} 組 × ${rules.compound.reps.join('–')} 下、休息 ${rules.compound.rest} 秒；輔助 ${Math.max(2, rules.accessory.sets + setAdj)} 組 × ${rules.accessory.reps.join('–')} 下、休息 ${rules.accessory.rest} 秒。`,
    `S-${days}｜每週 ${days} 天 → ${split.name}。`,
    `T-${slots}｜單次 ${session_minutes} 分鐘 → 每次 ${slots} 個重量訓練動作${rules.conditioning ? ' ＋ 1 個體能收尾' : ''}。`,
    training_level === 'beginner' ? 'L-B｜新手：每個動作少 1 組，先把動作做穩。' : `L-${training_level === 'advanced' ? 'A' : 'I'}｜${LEVELS[training_level] || ''}：使用標準組數。`,
  ]
  const programDays = split.days.map((tpl, i) => {
    const t = DAY_TEMPLATES[tpl]
    const items = t.items.slice(0, slots).map((id) => {
      const ex = EXERCISE_BY_ID[id]
      const p = ex.kind === 'compound' ? rules.compound : rules.accessory
      const isCore = ex.pattern === 'core'
      return {
        exercise_id: id,
        sets: Math.max(2, p.sets + setAdj),
        reps_min: isCore ? 30 : p.reps[0],
        reps_max: isCore ? 45 : p.reps[1],
        unit: isCore && id === 'plank' ? '秒' : '下',
        rest_seconds: p.rest,
        target_rir: p.rir,
      }
    })
    if (rules.conditioning) {
      const id = CONDITIONING[i % CONDITIONING.length]
      items.push({ exercise_id: id, sets: rules.conditioning.sets + (training_level === 'beginner' ? -2 : 0), reps_min: null, reps_max: null, unit: '輪', interval: rules.conditioning.reps, rest_seconds: 0, target_rir: '—' })
    }
    return { day_no: i + 1, template: tpl, focus: t.focus, items }
  })
  return {
    id: `prog-${goal_type}-${days}-${training_level}-${session_minutes}`,
    goal_type, name: `${GOALS[goal_type].label}｜${split.name}`, weeks: 6, days_per_week: days,
    progression_rule: rules.progression, deload_rule: DELOAD_RULE, rule_source, days: programDays,
  }
}

/** 下一個要練的菜單日：依最後一次完成的同菜單訓練往後輪 */
export function nextDay(program, sessions = []) {
  const done = sessions.filter((s) => s.status === 'COMPLETED' && s.program_id === program.id)
  if (!done.length) return program.days[0]
  const last = done.reduce((a, b) => (a.started_at > b.started_at ? a : b))
  const idx = program.days.findIndex((d) => d.day_no === last.day_no)
  return program.days[(idx + 1) % program.days.length]
}
