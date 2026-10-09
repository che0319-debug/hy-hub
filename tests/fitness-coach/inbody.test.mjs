import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as I from '../../public/fitness-coach/lib/inbody.js'

const NOW = new Date('2026-10-09T12:00:00')
const base = () => ({ measurements: [], importBatches: [] })
const tpl = (f) => readFileSync(new URL(`../../public/fitness-coach/${f}`, import.meta.url), 'utf8')

function importText(state, name, text, policy = 'skip') {
  const parsed = I.parseFile(name, text)
  const mapping = I.autoMap(parsed.headers)
  const preview = I.previewImport(parsed, mapping, state.measurements, { now: NOW })
  return { preview, ...I.commitImport(state, preview, { filename: name, source_type: parsed.source_type, conflictPolicy: policy, now: NOW }) }
}

test('CSV 範本：3 筆完整資料成功匯入', () => {
  const { state, batch, preview } = importText(base(), 'inbody-template.csv', tpl('inbody-template.csv'))
  assert.equal(preview.errors.length, 0)
  assert.equal(batch.success_count, 3)
  assert.equal(state.measurements.length, 3)
  assert.equal(state.measurements[0].source, 'CSV')
  assert.equal(state.measurements[0].import_batch_id, batch.id)
  assert.equal(state.measurements[2].basal_metabolic_rate_kcal, 1634)
})

test('JSON：measurements 物件與陣列兩種根格式都可匯入', () => {
  const obj = importText(base(), 'a.json', tpl('inbody-template.json'))
  assert.equal(obj.batch.success_count, 3)
  const arr = JSON.stringify(JSON.parse(tpl('inbody-template.json')).measurements)
  const r = importText(base(), 'b.json', arr)
  assert.equal(r.batch.success_count, 3)
  assert.equal(r.state.measurements[1].skeletal_muscle_mass_kg, 32.5)
  assert.throws(() => I.parseJSON('{"x":1}'), /measurements/)
  assert.throws(() => I.parseJSON('{bad'), /JSON 格式錯誤/)
})

test('欄位別名：中英文欄名自動對應，含 BOM、引號與單位括號', () => {
  const csv = '﻿測量日期,"體重(kg)",骨骼肌量,體脂肪率,Body Fat Mass,BMI,內臟脂肪等級,基礎代謝率\n2026-09-01,70.1,31,"20.5",14.4,23,7,1580\n'
  const p = I.parseCSV(csv)
  const m = I.autoMap(p.headers)
  assert.deepEqual(Object.values(m), I.FIELD_KEYS)
  const en = I.autoMap(['Test Date', 'Weight', 'SMM', 'PBF', 'Note'])
  assert.deepEqual(Object.values(en), ['measured_at', 'weight_kg', 'skeletal_muscle_mass_kg', 'body_fat_percent', ''])
  const pv = I.previewImport(p, m, [], { now: NOW })
  assert.equal(pv.ready.length, 1)
  assert.equal(pv.ready[0].record.body_fat_percent, 20.5)
})

test('錯誤資料：缺欄、非數值、超界、未來日期逐列回報且不寫入', () => {
  const csv = [
    'measured_at,weight_kg,skeletal_muscle_mass_kg,body_fat_percent',
    '2026-09-01,70,31,20', // 第 2 列 OK
    '2026-09-02,,31,20', // 缺體重
    '2026-09-03,七十,31,20', // 非數值
    '2026-09-04,70,31,90', // 體脂率超界
    '2027-01-01,70,31,20', // 未來
    '2026-02-30,70,31,20', // 無效日期
  ].join('\n')
  const { preview, state, batch } = importText(base(), 'bad.csv', csv)
  assert.equal(preview.ready.length, 1)
  const byRow = Object.fromEntries(preview.errors.map((e) => [e.row, e]))
  assert.match(byRow[3].reason, /缺少必填/)
  assert.equal(byRow[3].field, 'weight_kg')
  assert.match(byRow[4].reason, /不是數字/)
  assert.equal(byRow[4].value, '七十')
  assert.match(byRow[5].reason, /超出合理範圍/)
  assert.match(byRow[6].reason, /未來/)
  assert.match(byRow[7].reason, /日期格式無效/)
  assert.equal(state.measurements.length, 1)
  assert.equal(batch.error_count, 5)
})

test('對應缺必填欄位時不匯入任何資料', () => {
  const p = I.parseCSV('date,weight\n2026-09-01,70\n')
  const pv = I.previewImport(p, I.autoMap(p.headers), [], { now: NOW })
  assert.equal(pv.ready.length, 0)
  assert.ok(pv.errors.some((e) => e.field === 'body_fat_percent'))
})

test('重複資料：略過與覆寫兩條路徑；檔案內重複也回報', () => {
  const first = importText(base(), 'a.csv', tpl('inbody-template.csv')).state
  const csv = 'measured_at,weight_kg,skeletal_muscle_mass_kg,body_fat_percent\n2026-08-01,72.4,33.0,18.5\n2026-09-20,73,33,17.5\n2026-09-20,73,33,17.5\n'
  const skip = importText(first, 'b.csv', csv, 'skip')
  assert.equal(skip.preview.conflicts.length, 1)
  assert.equal(skip.preview.errors.length, 1) // 檔案內重複
  assert.equal(skip.batch.success_count, 1)
  assert.equal(skip.batch.skipped_count, 1)
  assert.equal(skip.state.measurements.find((m) => m.measured_at === '2026-08-01').skeletal_muscle_mass_kg, 32.1)

  const over = importText(first, 'b.csv', csv, 'overwrite')
  assert.equal(over.batch.overwritten_count, 1)
  assert.equal(over.state.measurements.length, 4)
  assert.equal(over.state.measurements.find((m) => m.measured_at === '2026-08-01').skeletal_muscle_mass_kg, 33.0)

  // 撤銷覆寫批次 → 舊值還原
  const undone = I.undoImport(over.state, over.batch.id, { now: NOW })
  assert.deepEqual(undone.measurements.map((m) => [m.measured_at, m.skeletal_muscle_mass_kg]), first.measurements.map((m) => [m.measured_at, m.skeletal_muscle_mass_kg]))
  assert.throws(() => I.undoImport(undone, over.batch.id), /已經撤銷/)
})

test('原子性：預覽不改動 state；撤銷整批後恢復原狀', () => {
  const s0 = base()
  const parsed = I.parseFile('t.csv', tpl('inbody-template.csv'))
  I.previewImport(parsed, I.autoMap(parsed.headers), s0.measurements, { now: NOW })
  assert.equal(s0.measurements.length, 0)
  const { state, batch } = importText(s0, 't.csv', tpl('inbody-template.csv'))
  assert.equal(s0.measurements.length, 0) // 原 state 不被修改
  const back = I.undoImport(state, batch.id, { now: NOW })
  assert.equal(back.measurements.length, 0)
  assert.ok(back.importBatches[0].undone_at)
  assert.equal(JSON.stringify(state).includes('measured_at,weight_kg'), false) // 不保存原始檔內容
})

test('趨勢一致性：圖表值與匯入值逐筆一致且依日期排序', () => {
  const csv = 'measured_at,weight_kg,skeletal_muscle_mass_kg,body_fat_percent\n2026-09-12,73.3,32.9,17.9\n2026-08-01,72.4,32.1,18.5\n2026-08-22,72.9,32.5,18.2\n'
  const { state } = importText(base(), 'x.csv', csv)
  const src = I.parseCSV(csv).records.map((r) => r.values).sort((a, b) => a.measured_at.localeCompare(b.measured_at))
  for (const [field, col] of [['weight_kg', 'weight_kg'], ['skeletal_muscle_mass_kg', 'skeletal_muscle_mass_kg'], ['body_fat_percent', 'body_fat_percent']]) {
    const series = I.trendSeries(state.measurements, field)
    assert.deepEqual(series.map((p) => p.date), src.map((r) => r.measured_at))
    assert.deepEqual(series.map((p) => p.value), src.map((r) => Number(r[col])))
  }
})

test('手動輸入：驗證、重複提示與覆寫', () => {
  let r = I.addManualMeasurement(base(), { measured_at: '2026-10-01', weight_kg: '71.2', skeletal_muscle_mass_kg: '31.8', body_fat_percent: '19', basal_metabolic_rate_kcal: '' }, { now: NOW })
  assert.deepEqual(r.errors, [])
  assert.equal(r.state.measurements[0].source, 'MANUAL')
  assert.equal(r.state.measurements[0].weight_kg, 71.2)
  const dup = I.addManualMeasurement(r.state, { measured_at: '2026-10-01', weight_kg: '71.2', skeletal_muscle_mass_kg: '32', body_fat_percent: '19' }, { now: NOW })
  assert.ok(dup.duplicate)
  const ow = I.addManualMeasurement(r.state, { measured_at: '2026-10-01', weight_kg: '71.2', skeletal_muscle_mass_kg: '32', body_fat_percent: '19' }, { now: NOW, overwrite: true })
  assert.equal(ow.state.measurements.length, 1)
  assert.equal(ow.state.measurements[0].skeletal_muscle_mass_kg, 32)
  const bad = I.addManualMeasurement(base(), { measured_at: '2026-10-01', weight_kg: '500', skeletal_muscle_mass_kg: '', body_fat_percent: '19', basal_metabolic_rate_kcal: '1500.5' }, { now: NOW })
  assert.deepEqual(bad.errors.map((e) => e.field), ['weight_kg', 'skeletal_muscle_mass_kg', 'basal_metabolic_rate_kcal'])
})

test('非 UTF-8 與不支援格式給出明確錯誤', () => {
  const big5 = new Uint8Array([0xc5, 0xe9, 0xad, 0xab, 0x0a]) // Big5「體重」
  assert.throws(() => I.decodeUtf8(big5.buffer), /UTF-8/)
  assert.throws(() => I.parseFile('report.pdf', ''), /只支援/)
  assert.throws(() => I.parseCSV('a,"b\n1,2'), /引號/)
})
