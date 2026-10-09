// InBody 體組成資料：欄位規格、手動輸入驗證、CSV／JSON 解析、欄位對應、去重、交易式匯入與整批撤銷。
// 純函式，不碰 DOM、不連網；瀏覽器與 node --test 共用。

export const FIELDS = [
  { key: 'measured_at', label: '測量日期', unit: '', type: 'date', required: true },
  { key: 'weight_kg', label: '體重', unit: 'kg', type: 'decimal', required: true, min: 20, max: 350 },
  { key: 'skeletal_muscle_mass_kg', label: '骨骼肌量', unit: 'kg', type: 'decimal', required: true, min: 5, max: 100 },
  { key: 'body_fat_percent', label: '體脂率', unit: '%', type: 'decimal', required: true, min: 1, max: 75 },
  { key: 'body_fat_mass_kg', label: '體脂肪量', unit: 'kg', type: 'decimal', required: false, min: 0, max: 250 },
  { key: 'bmi', label: 'BMI', unit: '', type: 'decimal', required: false, min: 5, max: 80 },
  { key: 'visceral_fat_level', label: '內臟脂肪等級', unit: '', type: 'decimal', required: false, min: 0, max: 50 },
  { key: 'basal_metabolic_rate_kcal', label: '基礎代謝率', unit: 'kcal', type: 'integer', required: false, min: 500, max: 5000 },
]
export const FIELD_KEYS = FIELDS.map((f) => f.key)
const FIELD_BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f]))

// 欄名別名（比對時忽略大小寫、空白、底線、括號單位）
const ALIASES = {
  measured_at: ['measured_at', 'date', 'test date', 'testdate', 'datetime', 'measured', '日期', '測量日期', '量測日期', '測定日期', '檢測日期', '時間'],
  weight_kg: ['weight_kg', 'weight', 'body weight', '體重', '体重'],
  skeletal_muscle_mass_kg: ['skeletal_muscle_mass_kg', 'skeletal muscle mass', 'smm', 'skeletal muscle', '骨骼肌量', '骨骼肌重', '骨骼肌', '骨骼肌肉量'],
  body_fat_percent: ['body_fat_percent', 'percent body fat', 'pbf', 'body fat %', 'body fat percent', 'body fat percentage', '體脂率', '體脂肪率', '体脂率', '體脂百分比'],
  body_fat_mass_kg: ['body_fat_mass_kg', 'body fat mass', 'bfm', '體脂肪量', '體脂肪', '脂肪量', '体脂肪量'],
  bmi: ['bmi', 'body mass index', '身體質量指數'],
  visceral_fat_level: ['visceral_fat_level', 'visceral fat level', 'vfl', 'visceral fat', '內臟脂肪等級', '內臟脂肪', '内脏脂肪等级'],
  basal_metabolic_rate_kcal: ['basal_metabolic_rate_kcal', 'basal metabolic rate', 'bmr', '基礎代謝率', '基礎代謝', '基础代谢率'],
}

export function normalizeHeader(h) {
  return String(h ?? '')
    .replace(/^﻿/, '')
    .toLowerCase()
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[_\s]+/g, ' ')
    .trim()
}
const ALIAS_INDEX = (() => {
  const idx = {}
  for (const [key, list] of Object.entries(ALIASES)) for (const a of list) idx[normalizeHeader(a)] = key
  return idx
})()

/** 依欄名自動對應標準欄位；回傳 { 原欄名: 標準欄位 | '' } */
export function autoMap(headers) {
  const used = new Set()
  const mapping = {}
  for (const h of headers) {
    const key = ALIAS_INDEX[normalizeHeader(h)] || ''
    if (key && !used.has(key)) { mapping[h] = key; used.add(key) } else mapping[h] = ''
  }
  return mapping
}

/** 對應後缺哪些必填欄位 */
export function missingRequired(mapping) {
  const mapped = new Set(Object.values(mapping).filter(Boolean))
  return FIELDS.filter((f) => f.required && !mapped.has(f.key)).map((f) => f.key)
}

/** 以 UTF-8 嚴格解碼；非 UTF-8 拋出中文錯誤 */
export function decodeUtf8(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '')
  } catch {
    throw new Error('檔案不是 UTF-8 編碼。請用試算表另存為「CSV UTF-8」後再匯入。')
  }
}

/** RFC 4180 風格 CSV 解析（支援引號、逗號、換行與 BOM） */
export function parseCSV(text) {
  const src = String(text).replace(/^﻿/, '')
  const rows = []
  let row = []
  let cell = ''
  let q = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++ } else q = false }
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (q) throw new Error('CSV 格式錯誤：有未關閉的引號。')
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ''))
  if (!nonEmpty.length) throw new Error('檔案是空的。')
  const headers = nonEmpty[0].map((h) => h.trim())
  if (headers.length < 2) throw new Error('找不到逗號分隔的欄名列。第一列應為欄名，例如 measured_at,weight_kg,…')
  const records = nonEmpty.slice(1).map((r, i) => {
    const obj = {}
    headers.forEach((h, j) => { obj[h] = (r[j] ?? '').trim() })
    return { row: i + 2, values: obj } // row = 檔案中的列號（含欄名列）
  })
  return { headers, records }
}

/** JSON：根為陣列，或含 measurements 陣列的物件 */
export function parseJSON(text) {
  let data
  try { data = JSON.parse(String(text).replace(/^﻿/, '')) } catch (e) {
    throw new Error(`JSON 格式錯誤：${e.message}`)
  }
  const list = Array.isArray(data) ? data : (data && Array.isArray(data.measurements) ? data.measurements : null)
  if (!list) throw new Error('JSON 根節點必須是陣列，或含有 measurements 陣列的物件。')
  const headers = []
  for (const item of list) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const k of Object.keys(item)) if (!headers.includes(k)) headers.push(k)
    }
  }
  const records = list.map((item, i) => ({
    row: i + 1, // JSON 以第幾筆計
    values: item && typeof item === 'object' && !Array.isArray(item) ? item : { __invalid__: true },
  }))
  return { headers, records }
}

export function parseFile(name, text) {
  const lower = String(name || '').toLowerCase()
  if (lower.endsWith('.json')) return { source_type: 'JSON', ...parseJSON(text) }
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) return { source_type: 'CSV', ...parseCSV(text) }
  throw new Error('只支援 .csv 與 .json 檔。PDF、圖片與 InBody 原廠格式不在 V1 範圍，請改用手動輸入。')
}

function pad(n) { return String(n).padStart(2, '0') }
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** 解析 ISO 8601 日期／時間（亦接受 2026/10/09）。回傳正規化字串或 null */
export function parseDate(raw) {
  const s = String(raw ?? '').trim().replace(/\//g, '-')
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/)
  if (!m) return null
  const [, y, mo, d, hh, mi] = m
  const Y = +y, M = +mo, D = +d
  const dt = new Date(Date.UTC(Y, M - 1, D))
  if (dt.getUTCFullYear() !== Y || dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== D) return null
  if (hh !== undefined) {
    if (+hh > 23 || +mi > 59) return null
    return `${Y}-${pad(M)}-${pad(D)}T${pad(+hh)}:${mi}`
  }
  return `${Y}-${pad(M)}-${pad(D)}`
}

function toNumber(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN
  const s = String(raw ?? '').trim().replace(/,/g, '')
  if (s === '') return null
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN
  return Number(s)
}

/**
 * 驗證一筆標準欄位物件（手動輸入與匯入共用）。
 * 回傳 { record, errors:[{field, value, reason}] }
 */
export function validateMeasurement(input, { now = new Date() } = {}) {
  const errors = []
  const record = {}
  for (const f of FIELDS) {
    const raw = input[f.key]
    const empty = raw === undefined || raw === null || String(raw).trim() === ''
    if (empty) {
      if (f.required) errors.push({ field: f.key, value: '', reason: `缺少必填欄位「${f.label}」` })
      continue
    }
    if (f.type === 'date') {
      const d = parseDate(raw)
      if (!d) { errors.push({ field: f.key, value: String(raw), reason: '日期格式無效，請用 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm' }); continue }
      if (d.slice(0, 10) > todayISO(now)) { errors.push({ field: f.key, value: String(raw), reason: '測量日期不能是未來' }); continue }
      record[f.key] = d
      continue
    }
    const n = toNumber(raw)
    if (n === null) { if (f.required) errors.push({ field: f.key, value: '', reason: `缺少必填欄位「${f.label}」` }); continue }
    if (Number.isNaN(n)) { errors.push({ field: f.key, value: String(raw), reason: `「${f.label}」不是數字` }); continue }
    if (f.type === 'integer' && !Number.isInteger(n)) { errors.push({ field: f.key, value: String(raw), reason: `「${f.label}」需為整數` }); continue }
    if (n < f.min || n > f.max) { errors.push({ field: f.key, value: String(raw), reason: `「${f.label}」超出合理範圍 ${f.min}–${f.max}${f.unit ? ' ' + f.unit : ''}` }); continue }
    record[f.key] = n
  }
  return { record, errors }
}

export function dedupeKey(m) {
  return `${String(m.measured_at)}|${Number(m.weight_kg).toFixed(2)}|${Number(m.body_fat_percent).toFixed(2)}`
}

/**
 * 逐列驗證匯入資料（套用欄位對應），並與既有資料比對去重。不寫入任何東西。
 * 回傳 { ready:[{row, record}], conflicts:[{row, record, existing}], errors:[{row, field, value, reason}], total }
 */
export function previewImport(parsed, mapping, existing = [], { now = new Date() } = {}) {
  const errors = []
  const ready = []
  const conflicts = []
  const missing = missingRequired(mapping)
  if (missing.length) {
    return {
      ready, conflicts, total: parsed.records.length,
      errors: missing.map((k) => ({ row: 0, field: k, value: '', reason: `欄位對應缺少必填「${FIELD_BY_KEY[k].label}」，請在上方指定` })),
    }
  }
  const byKey = new Map(existing.map((m) => [dedupeKey(m), m]))
  const seen = new Map()
  for (const { row, values } of parsed.records) {
    if (values.__invalid__) { errors.push({ row, field: '', value: '', reason: '這一筆不是物件' }); continue }
    const std = {}
    for (const [src, key] of Object.entries(mapping)) if (key) std[key] = values[src]
    const { record, errors: errs } = validateMeasurement(std, { now })
    if (errs.length) { for (const e of errs) errors.push({ row, ...e }); continue }
    const key = dedupeKey(record)
    if (seen.has(key)) { errors.push({ row, field: 'measured_at', value: record.measured_at, reason: `與檔案第 ${seen.get(key)} 列重複` }); continue }
    seen.set(key, row)
    if (byKey.has(key)) conflicts.push({ row, record, existing: byKey.get(key) })
    else ready.push({ row, record })
  }
  return { ready, conflicts, errors, total: parsed.records.length }
}

let _seq = 0
export function newId(prefix) {
  _seq = (_seq + 1) % 1e6
  return `${prefix}-${Date.now().toString(36)}-${_seq.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * 交易式寫入：回傳新的 state（不改動原 state）。conflictPolicy = 'skip' | 'overwrite'。
 * 原始檔內容不保存，只保存正規化資料與來源中繼資料。
 */
export function commitImport(state, preview, { filename, source_type, conflictPolicy = 'skip', now = new Date() }) {
  const batchId = newId('batch')
  const at = now.toISOString()
  const mk = (record) => ({
    id: newId('m'), ...record, source: source_type, source_file_name: filename, import_batch_id: batchId, created_at: at,
  })
  let measurements = [...(state.measurements || [])]
  const added = preview.ready.map(({ record }) => mk(record))
  const replaced = []
  let skipped = 0
  if (conflictPolicy === 'overwrite') {
    for (const c of preview.conflicts) {
      const idx = measurements.findIndex((m) => m.id === c.existing.id)
      if (idx >= 0) { replaced.push(measurements[idx]); measurements.splice(idx, 1) }
      added.push(mk(c.record))
    }
  } else skipped = preview.conflicts.length
  measurements = sortMeasurements([...measurements, ...added])
  const batch = {
    id: batchId, source_type, filename, imported_at: at,
    row_count: preview.total, success_count: added.length, skipped_count: skipped, error_count: preview.errors.length,
    overwritten_count: replaced.length, errors: preview.errors.slice(0, 200), conflict_policy: conflictPolicy,
    replaced, // 覆寫前的舊資料，撤銷時還原
    undone_at: null,
  }
  return { state: { ...state, measurements, importBatches: [batch, ...(state.importBatches || [])] }, batch }
}

/** 整批撤銷：移除該批新增的資料並還原被覆寫的舊資料 */
export function undoImport(state, batchId, { now = new Date() } = {}) {
  const batch = (state.importBatches || []).find((b) => b.id === batchId)
  if (!batch) throw new Error('找不到這個匯入批次')
  if (batch.undone_at) throw new Error('這個批次已經撤銷過了')
  const kept = (state.measurements || []).filter((m) => m.import_batch_id !== batchId)
  const restoreIds = new Set(kept.map((m) => m.id))
  const restored = (batch.replaced || []).filter((m) => !restoreIds.has(m.id))
  const measurements = sortMeasurements([...kept, ...restored])
  const importBatches = state.importBatches.map((b) => (b.id === batchId ? { ...b, undone_at: now.toISOString() } : b))
  return { ...state, measurements, importBatches }
}

/** 手動新增一筆（HY 量測後自行填寫） */
export function addManualMeasurement(state, input, { now = new Date(), overwrite = false } = {}) {
  const { record, errors } = validateMeasurement(input, { now })
  if (errors.length) return { state, errors }
  const key = dedupeKey(record)
  const dup = (state.measurements || []).find((m) => dedupeKey(m) === key)
  if (dup && !overwrite) return { state, errors: [], duplicate: dup }
  const rest = (state.measurements || []).filter((m) => !dup || m.id !== dup.id)
  const m = { id: newId('m'), ...record, source: 'MANUAL', source_file_name: null, import_batch_id: null, created_at: now.toISOString() }
  return { state: { ...state, measurements: sortMeasurements([...rest, m]) }, errors: [], measurement: m }
}

export function deleteMeasurement(state, id) {
  return { ...state, measurements: (state.measurements || []).filter((m) => m.id !== id) }
}

export function sortMeasurements(list) {
  return [...list].sort((a, b) => String(a.measured_at).localeCompare(String(b.measured_at)))
}

/** 趨勢序列：直接取用已存的值（不平滑、不四捨五入），依日期排序 */
export function trendSeries(measurements, field) {
  return sortMeasurements(measurements)
    .filter((m) => typeof m[field] === 'number')
    .map((m) => ({ date: m.measured_at, value: m[field], id: m.id }))
}

export const TEMPLATE_CSV =
  'measured_at,weight_kg,skeletal_muscle_mass_kg,body_fat_percent,body_fat_mass_kg,bmi,visceral_fat_level,basal_metabolic_rate_kcal\n'
