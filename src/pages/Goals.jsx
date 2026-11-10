import WeeklyDirection, { refreshWeeklyDirection } from '../life-goals/WeeklyDirection'
import { goalPageSummary } from '../life-goals/summary.mjs'
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../../public/hy-ui/hy-ui.css'
import '../life-goals/goals.css'
import { fetchLifeGoalsHistory } from '../api'
import { useLifeGoals, useHumanGoalsMutation } from '../life-goals/useLifeGoals'
import { LAYERS, principlesText, dateText } from '../life-goals/model.mjs'
import { EvidenceStatus, GoalLines, HistoryRows } from '../life-goals/DimensionCard'

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
  return <details className="hy-card goals-principles"><summary><span className="hy-card-title">人生準則</span></summary>
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
  return <article className="hy-card goals-dimension" data-scored={d.score !== null} id={d.id} aria-label={d.name}>
    <div className="goals-summary-head"><h2>{d.name}</h2><span className="goals-layer-tag">{LAYERS.find(l => l.id === d.layer)?.name}</span></div>
    <dl className="goals-four-lines">
      <div><dt>十年大目標</dt><dd title={d.vision.text}>{d.vision.text || '待確認'}</dd></div>
      <div><dt>現在在哪</dt><dd title={d.nowSummary}>{d.nowSummary}</dd></div>
      <div><dt>分數</dt><dd className={d.score === null ? 'is-unscored' : 'is-scored'}>{d.score === null ? '未評分' : d.score}</dd></div>
      <div><dt>下一步</dt><dd title={d.nextStep}>{d.nextStep}</dd></div>
    </dl>
    <details className="goals-card-details"><summary>細節</summary>
    <GoalLines dimension={d} /><EvidenceStatus dimension={d} />
    <div className="goals-actions"><button type="button" className="hy-btn" disabled={!enabled || !!editor} onClick={() => { setEditor('vision'); setNotice('') }}>確認／修改願景</button>
      <button type="button" className="hy-btn" disabled={!enabled || !!editor || d.score === null} onClick={() => { setEditor('correction'); setNotice('') }}>提出分數校正</button></div>
    {editor === 'vision' && <VisionEditor dimension={d} onClose={() => setEditor(null)} />}
    {editor === 'correction' && <CorrectionEditor dimension={d} onClose={() => setEditor(null)} onRecorded={setNotice} />}
    {notice && <p className="goals-notice" role="status">{notice}</p>}
    <details className="goals-recent-history"><summary>最近三筆評分紀錄 <span>{dateText(d.updatedAt)}</span></summary><HistoryRows entries={d.recent} /></details>
    <details className="goals-full-history"><summary>完整紀錄{d.archives?.length ? '（含封存）' : ''}</summary>
      <button type="button" className="hy-btn" disabled={loading || !enabled} onClick={async () => {
        setLoading(true); setHistoryError('')
        try { const r = await fetchLifeGoalsHistory(d.id); setHistory([...r.history].reverse()) } catch { setHistoryError('完整紀錄暫時讀取失敗，請重試。') } finally { setLoading(false) }
      }}>{loading ? '讀取中…' : history ? '重新讀取完整紀錄' : '讀取完整紀錄'}</button>
      {historyError && <p role="alert" className="goals-source-warning">{historyError}</p>}{history && <HistoryRows entries={history} />}
    </details>
    </details>
  </article>
}
export function GoalsContent({ document, status, error, refresh = () => {}, weekly = null }) {
  const { dimensions, assessed } = goalPageSummary(document)
  const enabled = status === 'loaded'
  return <div className="hy goals-page"><header className="goals-pagehead"><div><h1>人生目標</h1><p>十年方向，今天的一小步。</p></div><div className="goals-header-actions"><strong className="goals-assessed">{document ? `已評分 ${assessed}/7 維` : '讀取中'}</strong><Link className="hy-btn" to="/life-island">前往 Life 島</Link><button type="button" className="hy-btn" onClick={() => refresh()}>重新讀取</button></div></header>
    {status === 'failed' && <p className="goals-source-warning" role="alert">{error} {document ? '目前顯示上次紀錄，暫停編輯。' : '請重新讀取。'}</p>}
    {weekly || <WeeklyDirection />}
    <Principles document={document} enabled={enabled} />
    {!document && <div className="hy-empty">{status === 'pending' ? '資料載入中…' : '等資料恢復後，再顯示七維狀態。'}</div>}
    {document && <div className="goals-summary-grid">{dimensions.map(d => <Dimension key={d.id} dimension={d} enabled={enabled} />)}</div>}
  </div>
}
export default function Goals() {
  const snapshot = useLifeGoals()
  const refresh = () => Promise.all([snapshot.refresh(),refreshWeeklyDirection()])
  useEffect(() => {
    snapshot.refresh()
    const onFocus = () => { if (window.document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus',onFocus)
    return () => window.removeEventListener('focus',onFocus)
  },[snapshot.refresh])
  return <GoalsContent {...snapshot} refresh={refresh} />
}
