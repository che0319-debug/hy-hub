import { useRef, useState } from 'react'
import { writeOffice, safeDriveUrl } from '../botOfficeData'
import { authHeaders, expireSession } from '../auth'
const NAMES = {hy: 'HY', sam: 'Sam', family: '小因', '950157': '950157'}
const LABELS = {spec_change: '規格變更', message: '會議室留言', new_project: '新增專案', reassign: '改派'}

export function OfficeRequest({ type, projects, projectId, readOnly, reload }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(null), [notice, setNotice] = useState('')
  const [form, setForm] = useState({project: projectId || '', content: '', title: '', goal: '', owner_bot: 'hy', executor: 'grok-build', reviewer: 'claude'})
  const requestId = useRef(null)
  const set = field => e => { requestId.current = null; setForm(old => ({...old, [field]: e.target.value})) }
  async function send(e) {
    e.preventDefault(); setBusy(true); setError(null); setNotice('')
    requestId.current ||= crypto.randomUUID()
    const payload = {type, content: form.content.trim(), request_id: requestId.current}
    if (type === 'new_project') Object.assign(payload, {title: form.title.trim(), goal: form.goal.trim(), owner_bot: form.owner_bot})
    else payload.project = form.project
    if (type === 'reassign') Object.assign(payload, {executor: form.executor, reviewer: form.reviewer})
    try { await writeOffice('requests', payload, {headers: authHeaders()}); requestId.current = null; setNotice('已送出，等待 Atlas 巡視處理。'); setOpen(false); setForm(old => ({...old, content: '', title: '', goal: ''})); await reload() }
    catch (e) { setError(e) } finally { setBusy(false) }
  }
  return <div className="bo-action"><button disabled={readOnly || busy} aria-expanded={open} onClick={() => setOpen(v => !v)}>{LABELS[type]}</button>
    {open && <form className="ao-card bo-request-form" aria-label={LABELS[type]} onSubmit={send}>
      <h2>{LABELS[type]}</h2><fieldset disabled={busy}>
      {type !== 'new_project' && <label>專案<select aria-label={`${LABELS[type]}專案`} value={form.project} onChange={set('project')} required><option value="">請選專案</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}・{NAMES[p.ownerBot] || '待補 owner'}</option>)}</select></label>}
      {type === 'new_project' && <><label>名稱<input value={form.title} onChange={set('title')} required /></label><label>目標<textarea value={form.goal} onChange={set('goal')} required /></label><label>負責 Bot<select value={form.owner_bot} onChange={set('owner_bot')}>{Object.entries(NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></>}
      {type === 'reassign' && <><label>執行者<select value={form.executor} onChange={set('executor')}>{['grok-build', 'gpt', 'claude'].map(n => <option key={n}>{n}</option>)}</select></label><label>審查者<select value={form.reviewer} onChange={set('reviewer')}>{['claude', 'gpt', 'grok-build'].map(n => <option key={n}>{n}</option>)}</select></label>{form.executor === form.reviewer && <p role="alert">執行者與審查者必須不同。</p>}</>}
      <label>說明<textarea value={form.content} onChange={set('content')} required /></label>
      <p className="ao-muted">送出後等待 Atlas 處理；目前的專案資料會在處理完成後更新。</p>
      <div className="ao-toolbar"><button type="submit" disabled={!form.content.trim() || type === 'reassign' && form.executor === form.reviewer}>送給 Atlas</button><button type="button" onClick={() => setOpen(false)}>取消</button></div>
      </fieldset>
    </form>}
    {busy && <p role="status">正在儲存…</p>}{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error.message}{error.kind === 'auth' && <button onClick={expireSession}>重新登入</button>}</p>}
  </div>
}

export function OfficeLog({ project, readOnly, reload }) {
  const [content, setContent] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState(null)
  const requestId = useRef(null)
  async function send(e) {
    e.preventDefault(); setBusy(true); setError(null); requestId.current ||= crypto.randomUUID()
    try { await writeOffice('log', {project: project.id, content: content.trim(), request_id: requestId.current}, {headers: authHeaders()}); requestId.current = null; setContent(''); setNotice('留言已儲存。'); await reload() }
    catch (e) { setError(e) } finally { setBusy(false) }
  }
  return <section className="ao-card"><h2>工作紀錄</h2><form onSubmit={send}><label>HY 留言<textarea aria-label="HY 留言" disabled={readOnly || busy} value={content} onChange={e => { requestId.current = null; setContent(e.target.value) }} /></label><button disabled={readOnly || busy || !content.trim()}>新增留言</button></form>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error.message}{error.kind === 'auth' && <button onClick={expireSession}>重新登入</button>}</p>}
    <ol className="ao-journal">{project.logs.slice().reverse().map(l => <li key={l.id}><time>{l.at}</time><b>{l.actor === 'hy' ? 'HY' : l.answered_by === 'hy' ? 'HY Bot' : NAMES[l.answered_by] || 'Bot'}</b><p className="bo-summary">{l.content}</p></li>)}</ol>
    {!project.logs.length && <p className="ao-muted">尚無留言。</p>}
  </section>
}

export function OfficeReview({ project }) {
  const review = project.review
  return <section className="ao-card"><h2>品質與審查</h2><dl className="hy-kv"><dt>最近審查</dt><dd>{({pass: '通過', fail: '需修改', none: '尚無審查'})[review.verdict] || review.verdict}</dd><dt>退回次數</dt><dd>{review.returnedCount}</dd></dl>
    {safeDriveUrl(review.url) ? <a href={review.url} target="_blank" rel="noopener noreferrer">開啟審查報告 ↗</a> : <p className="ao-muted">審查報告連結待補。</p>}
    <h3>必改清單</h3>{review.requiredChanges.length ? <ul>{review.requiredChanges.map((c, i) => <li key={i}>{c}</li>)}</ul> : <p className="ao-muted">尚未提供必改清單。</p>}
  </section>
}
