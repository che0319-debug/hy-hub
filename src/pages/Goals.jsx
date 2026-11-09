import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import '../../public/hy-ui/hy-ui.css'
import '../life-goals/goals.css'
import { fetchLifeGoalsHistory } from '../api'
import { useLifeGoals, useHumanGoalsMutation, useWeeklyGoalsControl } from '../life-goals/useLifeGoals'
import { DIMENSIONS, LAYERS, dimensionView, principlesText, dateText } from '../life-goals/model.mjs'
import { ScoreSummary, EvidenceStatus, GoalLines, HistoryRows } from '../life-goals/DimensionCard'

function HumanForm({ title, children, mutation, onCancel, onSubmit }) {
  return <form className="goals-editor" onSubmit={onSubmit}><h3>{title}</h3>{children}
    {mutation.error && <p className="goals-source-warning" role="alert">{mutation.error}</p>}
    <div className="goals-actions"><button className="hy-btn is-primary" disabled={mutation.saving}>{mutation.saving ? '儲存中…' : mutation.unconfirmed ? '重試儲存' : '確認儲存'}</button>
      <button type="button" className="hy-btn" onClick={onCancel} disabled={mutation.saving || mutation.unconfirmed}>取消</button></div>
  </form>
}
function VisionEditor({ dimension, onClose }) {
  const [value, setValue] = useState(dimension.vision.text)
  const base = useRef(dimension.vision.text)
  const mutation = useHumanGoalsMutation()
  return <HumanForm title="確認十年後的樣子" mutation={mutation} onCancel={onClose} onSubmit={async e => {
    e.preventDefault(); const r = await mutation.run([{ kind: 'vision', dim: dimension.id, text: value, expectedText: base.current }]); if (r) onClose()
  }}><label>你的方向<textarea value={value} onChange={e => setValue(e.target.value)} required maxLength={4000} rows={3} disabled={mutation.saving || mutation.unconfirmed} /></label></HumanForm>
}
function CorrectionEditor({ dimension, onClose, onRecorded }) {
  const [score, setScore] = useState(dimension.score ?? '')
  const [reason, setReason] = useState('')
  const sourceRef = useRef(null)
  const mutation = useHumanGoalsMutation()
  return <HumanForm title="告訴 Bot 如何校正" mutation={mutation} onCancel={onClose} onSubmit={async e => {
    e.preventDefault(); sourceRef.current ||= 'goals-ui:' + crypto.randomUUID()
    const r = await mutation.run([{ kind: 'authorize_correction', dim: dimension.id, score: Number(score), reason, sourceRef: sourceRef.current }]);
    if (r) { onRecorded(`校正要求已記錄，待 ${dimension.bot} 依你的指定留存校正紀錄。`); onClose() }
  }}><p className="goals-caption">由 {dimension.bot} 處理並保留紀錄；這裡不直接改寫分數。</p>
    <label>你指定的目標分<input type="number" min="0" max="100" step="1" required value={score} onChange={e => setScore(e.target.value)} disabled={mutation.saving || mutation.unconfirmed} /></label>
    <label>原因<textarea required maxLength={4000} rows={3} value={reason} onChange={e => setReason(e.target.value)} disabled={mutation.saving || mutation.unconfirmed} /></label>
  </HumanForm>
}
function Principles({ document, enabled }) {
  const text = principlesText(document)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const base = useRef('')
  const mutation = useHumanGoalsMutation()
  return <details className="hy-card goals-principles"><summary><span className="hy-card-title">人生準則</span><span className="goals-caption">整份收合 · 不計分</span></summary>
    {editing ? <HumanForm title="編輯整份人生準則" mutation={mutation} onCancel={() => setEditing(false)} onSubmit={async e => {
      e.preventDefault(); const r = await mutation.run([{ kind: 'principles', text: draft, expectedText: base.current }]); if (r) setEditing(false)
    }}><label>人生準則<textarea rows={10} maxLength={20000} value={draft} onChange={e => setDraft(e.target.value)} disabled={mutation.saving || mutation.unconfirmed} /></label></HumanForm>
      : <><p className="goals-principles-text">{text || '尚未提供人生準則。你可以一次貼上整份內容。'}</p><button type="button" className="hy-btn" disabled={!enabled} onClick={() => { base.current = text; setDraft(text); setEditing(true) }}>編輯整份準則</button></>}
  </details>
}
function Dimension({ dimension: d, enabled }) {
  const [editor, setEditor] = useState(null)
  const [notice, setNotice] = useState('')
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState('')
  const [loading, setLoading] = useState(false)
  return <article className="hy-card goals-dimension" id={d.id} aria-label={d.name}>
    <div className="hy-card-head"><h3 className="hy-card-title">{d.name}</h3><span className="goals-caption">{d.bot} 負責</span></div>
    <ScoreSummary dimension={d} /><p className="goals-caption">{d.scoreSourceText}</p><EvidenceStatus dimension={d} />
    <GoalLines dimension={d} />
    <div className="goals-actions"><button type="button" className="hy-btn" disabled={!enabled || !!editor} onClick={() => { setEditor('vision'); setNotice('') }}>確認／修改願景</button>
      <button type="button" className="hy-btn" disabled={!enabled || !!editor || d.score === null} onClick={() => { setEditor('correction'); setNotice('') }}>提出分數校正</button></div>
    {editor === 'vision' && <VisionEditor dimension={d} onClose={() => setEditor(null)} />}
    {editor === 'correction' && <CorrectionEditor dimension={d} onClose={() => setEditor(null)} onRecorded={setNotice} />}
    {notice && <p className="goals-notice" role="status">{notice}</p>}
    <div className="goals-record-head"><h4>最近三筆評分紀錄</h4><span className="goals-caption">{dateText(d.updatedAt)}</span></div>
    <HistoryRows entries={d.recent} />
    <details className="goals-full-history"><summary>完整紀錄{d.archives?.length ? '（含封存）' : ''}</summary>
      <button type="button" className="hy-btn" disabled={loading || !enabled} onClick={async () => {
        setLoading(true); setHistoryError('')
        try { const r = await fetchLifeGoalsHistory(d.id); setHistory([...r.history].reverse()) } catch { setHistoryError('完整紀錄暫時讀取失敗，請重試。') } finally { setLoading(false) }
      }}>{loading ? '讀取中…' : history ? '重新讀取完整紀錄' : '讀取完整紀錄'}</button>
      {historyError && <p role="alert" className="goals-source-warning">{historyError}</p>}{history && <HistoryRows entries={history} />}
    </details>
  </article>
}
function WeeklyControls({ status, enabled }) {
  const [editing, setEditing] = useState(null)
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')
  const source = useRef(null)
  const mutation = useWeeklyGoalsControl()
  if (!status?.paused && !status?.lastFinalCycle) return null
  const open = action => { source.current = 'goals-weekly-ui:' + crypto.randomUUID(); setReason(''); setNotice(''); setEditing({ action, cycle: status.lastFinalCycle }) }
  return <section className="hy-card" aria-label="週評分回饋">
    <h2 className="hy-card-title">週評分回饋</h2>
    {status.paused && <p className="goals-source-warning" role="status">自動評分已暫停，改由 HY 每週整理。修復後由你確認恢復。</p>}
    {status.lastFinalCycle && <p className="goals-caption">最近一期：{status.lastFinalCycle}。回饋會保留紀錄；個別分數可在各卡片提出校正。</p>}
    {!editing && <div className="goals-actions">
      {status.lastFinalCycle && <button type="button" className="hy-btn" disabled={!enabled} onClick={() => open('wrong_score_week')}>回報這週評分不準</button>}
      {status.paused && <button type="button" className="hy-btn" disabled={!enabled} onClick={() => open('resume')}>恢復自動評分</button>}
    </div>}
    {editing && <HumanForm title={editing.action === 'resume' ? '確認恢復自動評分' : '記錄這週的評分問題'} mutation={mutation} onCancel={() => setEditing(null)} onSubmit={async e => {
      e.preventDefault()
      const result = await mutation.run({ action: editing.action, reason, sourceRef: source.current, ...(editing.action === 'wrong_score_week' ? { cycle: editing.cycle } : {}) })
      if (result) { setNotice(editing.action === 'resume' ? '已記錄你的恢復確認。' : '已記錄評分問題，交由 HY 追蹤。'); setEditing(null) }
    }}><label>{editing.action === 'resume' ? '修復確認與恢復原因' : '哪些評分與實際情況不符？'}<textarea required rows={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} disabled={mutation.saving || mutation.unconfirmed} /></label></HumanForm>}
    {notice && <p className="goals-notice" role="status">{notice}</p>}
  </section>
}
export default function Goals() {
  const { document, status, error, refresh } = useLifeGoals()
  const dimensions = (document?.dimensions || []).filter(d => DIMENSIONS[d.id]).map(d => dimensionView(d))
  const drafts = dimensions.filter(d => !d.vision.confirmedByUser).length
  const enabled = status === 'loaded'
  return <div className="hy goals-page"><header className="hy-pagehead"><div><h1 className="hy-title">七維人生推進</h1><p className="hy-lede">看清方向，推進下一小步。</p></div><Link className="hy-btn" to="/life-island">回 Life 島</Link></header>
    <section className="goals-overview" aria-label="目前狀態"><div><strong>{status === 'pending' ? '正在讀取七維資料' : !document ? '七維資料暫時無法讀取' : drafts ? `${drafts} 份願景草稿，待你確認` : '七維方向已確認'}</strong><p className="goals-caption">推進分看長期累積；燈號看最近已知行動。證據不足不扣分。</p></div><button type="button" className="hy-btn" onClick={() => refresh()}>重新讀取</button></section>
    {status === 'failed' && <p className="goals-source-warning" role="alert">{error} {document ? '目前顯示上次紀錄，暫停編輯。' : '請重新讀取。'}</p>}
    <Principles document={document} enabled={enabled} />
    <WeeklyControls status={document?.routineStatus} enabled={enabled} />
    {!document && <div className="hy-empty">{status === 'pending' ? '資料載入中…' : '等資料恢復後，再顯示七維狀態。'}</div>}
    {document && <div className="goals-layers">{LAYERS.map(layer => <section className="goals-layer" key={layer.id} aria-label={layer.name}><div className="goals-layer-title"><h2>{layer.name}</h2><span className="goals-caption">{layer.note}</span></div><div className="goals-layer-cards">{dimensions.filter(d => d.layer === layer.id).map(d => <Dimension key={d.id} dimension={d} enabled={enabled} />)}</div></section>)}</div>}
  </div>
}
