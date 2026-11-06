import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/pages/bot-office.css'
import { OfficeExecution, OfficeResults } from '../src/components/BotOfficePanels.jsx'
import { canonicalOfficeDocuments, presentOfficeDocuments } from '../src/lib/officeDocuments.mjs'

const PLAN = '14m8hE1stISKuqRXkn1XoeH057T6hS9jCkW2IUhFtGo8'
const EXEC = '1r1LjR6bmYlUkjzi2HOUuarYCuQMKmRPAWGAFrY_p6uQ'
const REV3 = '1n4ogXXv1jJvXI2hb-4s8B3qVTPqfzo9pP0Byw1iAGUg'
const REV2 = '1NJuEnzkQcOC7EWwKm_9tMiOwnqZ6W9JogF2TMCWJU4Q'
const doc = id => `https://docs.google.com/document/d/${id}/edit`

const building = {
  id: 'p-003',
  title: '七維推進系統 v1（七維 × Life 島）',
  project_file: doc(PLAN),
  milestones: [{ id: 'M0', name: '規劃書', kind: 'plan' }],
  plan: {
    version: 3,
    doc_url: doc(PLAN),
    drive_file_id: null,
    submitted_at: '2026-11-06T01:34:52.191Z',
    table: [{ id: 'M1', name: '資料與備份', due: '2026-11-06', output: '測試摘錄：備份與條件寫入。正式分數在合併前不可改。' }],
    history: [
      { version: 2, doc_url: doc(PLAN), submitted_at: '2026-11-05T01:25:31.000Z', table: [{ id: 'M6', name: '首評', output: '測試摘錄：v2 的 M6 仍寫到正式資料，和合併閘門衝突。' }] },
    ],
  },
  execution_plan: {
    version: 3,
    name: 'AI 執行規劃書',
    doc_url: doc(EXEC),
    drive_file_id: EXEC,
    submitted_at: '2026-11-06T01:34:52.191Z',
  },
  last_review: { target: 'plan-v3', verdict: 'PASS', verdict_text: 'PASS', must_fix: [], report_file_id: REV3, report_name: 'p-003_審查報告_plan-v3', at: '2026-11-06T05:17:04.867Z' },
  review_requests: [
    { request_id: `p-003-plan-v2-${REV2}`, report_file_id: REV2, result: { target: 'plan-v2', verdict: 'CONDITIONAL_PASS', verdict_text: '有條件 PASS', must_fix: ['M6 不能在合併前寫正式資料。'], updated: '2026-11-05T07:20:57.000Z' } },
    { request_id: `p-003-plan-v3-${REV3}`, report_file_id: REV3, result: { target: 'plan-v3', verdict: 'PASS', verdict_text: 'PASS', must_fix: [], updated: '2026-11-06T05:17:04.867Z' } },
  ],
}

const legacyBuilding = {
  id: 'p-002',
  plan_card: 'c-013',
  review_card: 'c-014',
  report_file_id: '1DcrwY2yVVWeGYZW3BlNdDn_hnYq__oKd',
  last_review: 'pass',
}

const texts = {
  [PLAN]: '## 測試摘錄\n\n這段是測試資料，不是正式專案原文。\n\n## 目標\n\n七維重新成為推進核心。人生目標頁、打分與島上燈號一起改。\n\n## 護欄\n\n測試全綠、審查通過，使用者說合併才上線。<script>alert(1)</script>',
  [EXEC]: '## 測試摘錄\n\n## 執行順序\n\n先做隔離測試。正式分數等合併之後才寫。',
  [REV3]: '## 測試摘錄\n\n## 結論\n\nPASS。規劃書 v3 與 AI 執行規劃書 v3 對得上，必改清單是空的。',
  [REV2]: '## 測試摘錄\n\n## 結論\n\n有條件 PASS。\n\n## 必改\n\nM6 不能在合併前寫正式資料。',
}

function bodiesFor(bundle, mode) {
  const view = presentOfficeDocuments(bundle, bundle.currentKey)
  const specs = [view.plan, view.execution, view.review, ...bundle.reviews, ...bundle.plans].filter(Boolean)
  const bodies = {}
  for (const item of specs) {
    if (!item.readKey) continue
    if (mode === 'error') {
      const reason = item.role === 'plan' ? '沒有讀取權限。' : item.role === 'execution_plan' ? '內文讀取介面尚未部署。' : '找不到這份文件。不在專案可讀清單。'
      bodies[item.readKey] = { status: 'error', markdown: '', error: `${item.title}：${reason}` }
    } else if (texts[item.fileId]) {
      bodies[item.readKey] = { status: 'ready', markdown: texts[item.fileId], truncated: false, error: '' }
    }
  }
  return bodies
}

function Preview() {
  const params = new URLSearchParams(location.search)
  const initial = params.get('case') || 'plan'
  const [name, setName] = useState(initial)
  const [selected, setSelected] = useState('')
  const bundle = useMemo(() => canonicalOfficeDocuments(name === 'legacy' ? legacyBuilding : building, name === 'legacy' ? { cards: [
    { id: 'c-013', project: 'p-002', type: 'plan', drive_url: doc(PLAN) },
    { id: 'c-014', project: 'p-002', type: 'note', title: 'p-002 審查', drive_url: `https://drive.google.com/file/d/${REV2}/view` },
  ] } : {}, []), [name])
  const key = selected && bundle.options.some(item => item.key === selected) ? selected : bundle.currentKey
  const view = presentOfficeDocuments(bundle, key)
  const bodies = bodiesFor(bundle, name === 'error' ? 'error' : 'ready')
  const documents = { bundle, view, bodies, setSelected }
  const project = {
    title: name === 'legacy' ? '川泱購物（PI 流程重跑）' : '七維推進系統 v1（七維 × Life 島）',
    stageLabel: name === 'legacy' ? '執行中' : '待你決定',
    ownerBot: name === 'legacy' ? 'sam' : 'hy',
    executor: 'grok-build',
    review: { verdict: name === 'legacy' ? 'pass' : 'PASS', requiredChanges: [], url: null },
    decisions: [],
    allDecisions: [],
    followUps: [],
    cards: { outputs: [], overview: [], meeting: [], execution: [], log: [] },
    source: { quality: {} },
    folderUrl: 'https://drive.google.com/drive/folders/1Jd5Jx7yxRrT6Dg0z06PwqztMPNYv4evb',
  }
  const report = name === 'legacy'
    ? { status: 'ready', error: '', htmlError: '', stale: false, modified: '2026-10-24T02:00:00.000Z', fileId: legacyBuilding.report_file_id, setFileId() {}, meta: { drive_url: `https://drive.google.com/file/d/${legacyBuilding.report_file_id}/view` }, versions: [{ file_id: legacyBuilding.report_file_id, current: true, version: null, modified_time: '2026-10-24T02:00:00.000Z' }], html: '<article><h2>一頁摘要：現在怎樣、你要做什麼</h2><ul><li>測試摘錄：這是 p-002 既有成果報告。</li><li>平台已改掛銀角。</li></ul></article>' }
    : { status: 'empty', error: '報告檔未找到', html: '', htmlError: '', stale: false, modified: '', fileId: '', setFileId() {}, meta: null, versions: [] }
  return <main className="ao" style={{ padding: 16, minHeight: '100vh' }}>
    <p className="ao-muted" role="status">測試資料，不是正式專案。沒有讀取正式 Drive。</p>
    <div className="ao-toolbar" role="group" aria-label="測試畫面">
      {[['plan', '執行計畫'], ['results', '成果與審查'], ['error', '讀取失敗'], ['legacy', '既有成果報告']].map(([id, label]) =>
        <button key={id} type="button" aria-pressed={name === id} onClick={() => { setName(id); setSelected('') }}>{label}</button>)}
    </div>
    <h1>{project.title}</h1>
    {name === 'plan'
      ? <OfficeExecution project={{ packages: [], _officeMilestones: [], _rounds: [], plan_revision: 3, plan_state: 'DRAFT' }} plan={{ milestones: [] }} selected={null} select={() => {}} planDocument={{ status: 'none' }} documents={documents} />
      : <OfficeResults project={project} report={report} documents={documents} milestones={[]} onOverview={() => {}} />}
  </main>
}

createRoot(document.getElementById('root')).render(<Preview />)
