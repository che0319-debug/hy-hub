import { useState } from 'react'
import { answerOfficeDecision } from '../botOfficeData'
import { authHeaders, expireSession } from '../auth'
const NAMES = { sam: 'Sam', family: '小因', '950157': '950157', hy: 'HY Bot' }
const CONFIDENCE = { high: '高', medium: '中', low: '低' }

function Attribution({ item }) {
  if (!item.answer) return null
  const proxy = item.answerSource === 'proxy'
  return <div className="bo-answer">
    <span className="hy-pill" data-s={proxy && !item.confirmed ? 'you' : 'done'}>
      {proxy ? `${NAMES[item.answeredBy] || 'Bot'} 代答・把握度 ${CONFIDENCE[item.confidence] || '未提供'}` : item.answerSource === 'hy' ? 'HY 已作答' : '既有回答・來源待確認'}
      {item.confirmed ? '・HY 已確認' : ''}
    </span>
    <p className="bo-summary">{typeof item.answer === 'string' ? item.answer : item.answer?.feedback || ''}</p>
    {item.basis && <p className="ao-muted">根據：{item.basis}</p>}
  </div>
}

function Decision({ item, readOnly, reload }) {
  const [drafts, setDrafts] = useState({}), [feedback, setFeedback] = useState(''), [draftRevision, setDraftRevision] = useState(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [notice, setNotice] = useState('')
  async function submit(action, question, answer) {
    setBusy(true); setError(null); setNotice('')
    try {
      const saved = await answerOfficeDecision(item.id, {
        action, expected_revision: draftRevision ?? item.revision,
        ...(question ? { question_no: question.no } : {}),
        ...(action === 'answer' ? { answer } : {}), ...(action === 'return' ? { feedback } : {}),
      }, { headers: authHeaders() })
      const otherDrafts = Object.entries(drafts).some(([no, value]) => !(question && action === 'answer' && no === String(question.no)) && value.trim()) || feedback.trim()
      setDraftRevision(otherDrafts ? saved.decision.revision : null)
      if (question && action === 'answer') setDrafts(old => { const next = { ...old }; delete next[question.no]; return next })
      setNotice(action === 'defer' ? '已記錄先不決定，題目保持開放。' : '已儲存，等待 Atlas 巡視處理。')
      await reload()
    } catch (e) {
      setError(e)
      if (e.kind === 'conflict') await reload()
    } finally { setBusy(false) }
  }
  const disabled = busy || readOnly
  return <article className="ao-decision bo-decision-form" aria-label={item.title}>
    <h3>{item.title}</h3>{item.suggestion && <p>{item.suggestion}</p>}
    {readOnly && <p className="ao-muted">示範檢視不提供寫入。</p>}
    {item.questions.map(question => <section key={question.no} className="bo-question" aria-label={`第 ${question.no} 題`}>
      <h3>{question.no}. {question.q}</h3>
      {question.why && <p className="ao-muted">為什麼要問：{question.why}</p>}
      {question.recommend && <p>建議：{question.recommend}</p>}
      <Attribution item={question} />
      {question.confirmed && <p className="ao-muted">已確認；仍可填入新回答修改。</p>}
      {question.options.length > 0 && <div className="ao-toolbar" aria-label={`第 ${question.no} 題選項`}>
        {question.options.map(option => <button key={option} disabled={disabled} aria-pressed={drafts[question.no] === option}
          onClick={() => { setDraftRevision(old => old ?? item.revision); setDrafts(old => ({ ...old, [question.no]: option })) }}>{option}</button>)}
      </div>}
      <form onSubmit={e => { e.preventDefault(); submit('answer', question, drafts[question.no]) }}>
        <label>你的回答<textarea aria-label={`第 ${question.no} 題回答`} disabled={disabled} value={drafts[question.no] ?? ''}
          onChange={e => { setDraftRevision(old => old ?? item.revision); setDrafts(old => ({ ...old, [question.no]: e.target.value })) }} /></label>
        <div className="ao-toolbar">
          <button type="submit" disabled={disabled || !drafts[question.no]?.trim()}>{question.answer ? '改答' : '送出回答'}</button>
          {question.answerSource === 'proxy' && question.answer && !question.confirmed && <button type="button" disabled={disabled} onClick={() => submit('confirm', question)}>確認代答</button>}
          <button type="button" disabled={disabled} onClick={() => submit('defer', question)}>先不決定</button>
        </div>
      </form>
    </section>)}
    {!item.questions.length && item.kind === 'approval' && <>
      <Attribution item={item} />
      <label>修改意見（退回時必填）<textarea aria-label="退回意見" value={feedback} disabled={disabled} onChange={e => { setDraftRevision(old => old ?? item.revision); setFeedback(e.target.value) }} /></label>
      <div className="ao-toolbar"><button disabled={disabled} onClick={() => submit('approve')}>核准</button>
        <button disabled={disabled || !feedback.trim()} onClick={() => submit('return')}>退回修改</button>
        {item.answerSource === 'proxy' && item.answer && <button disabled={disabled} onClick={() => submit('confirm')}>確認代答</button>}
        <button disabled={disabled} onClick={() => submit('defer')}>先不決定</button>
      </div>
    </>}
    {!item.questions.length && item.kind !== 'approval' && <p className="ao-muted">等待 Atlas 補齊結構化題目，暫不能作答。</p>}
    {busy && <p role="status">正在儲存…</p>}{notice && <p role="status">{notice}</p>}
    {error && <div role="alert"><p>{error.message}</p>{error.kind === 'auth' && <button onClick={expireSession}>重新登入</button>}{error.kind === 'conflict' && <button onClick={() => { setDraftRevision(item.revision); setError(null) }}>已核對最新題目，保留輸入</button>}</div>}
  </article>
}

export default function OfficeDecisions({ items, readOnly, reload }) {
  if (!items.length) return null
  return <section className="ao-card is-focus needs-you bo-decisions" aria-label="待 HY 決定">
    <h2>待 HY 決定 <span className="hy-pill" data-s="you">{items.length}</span></h2>
    {items.map(item => <Decision key={item.id} item={item} readOnly={readOnly} reload={reload} />)}
  </section>
}
