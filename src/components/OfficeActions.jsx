import { useRef, useState } from 'react'
import { writeOffice, applyOfficeRequest, safeDriveUrl, OFFICE_NAMES } from '../botOfficeData'
import { authHeaders, expireSession, getAccessToken } from '../auth'
import { isHyOwnerSession } from '../lib/botOfficeView.mjs'
import { openProjectBody } from '../lib/officeFlow.mjs'
import { OFFICE_AI_CHOICES, officeAiConflict, seedOfficeAi } from '../lib/officeAiDefaults.mjs'
const NAMES = {hy: 'HY', sam: 'Sam', family: '小因', '950157': '950157'}
const LABELS = {spec_change: '規格變更', message: '會議室留言', new_project: '新增專案', reassign: '改派'}
const AI_LABELS = { 'grok-build': 'Grok Build', gpt: 'GPT', claude: 'Claude' }

export function OfficeRequest({ type, projects, projectId, readOnly, reload, inline = false, children, appendix = '', settings = null }) {
  const [open, setOpen] = useState(inline), [busy, setBusy] = useState(false), [error, setError] = useState(null), [notice, setNotice] = useState('')
  const current = (projects || []).find(p => p.id === projectId)
  const seed = seedOfficeAi(settings, current)
  const [form, setForm] = useState({project: projectId || '', content: '', title: '', goal: '', owner_bot: 'hy', executor: seed.executor, reviewer: seed.reviewer, executor_backup: seed.executor_backup, reviewer_backup: seed.reviewer_backup})
  const requestId = useRef(null)
  const set = field => e => { requestId.current = null; setForm(old => ({...old, [field]: e.target.value})) }
  const reassignConflict = officeAiConflict({ executor: { primary: form.executor, backup: form.executor_backup }, reviewer: { primary: form.reviewer, backup: form.reviewer_backup } })
  async function send(e) {
    e.preventDefault(); setBusy(true); setError(null); setNotice('')
    requestId.current ||= crypto.randomUUID()
    const appendixText = type === 'message' ? appendix.trim() : ''
    const payload = {type, content: type === 'new_project' ? (form.content.trim() || form.goal.trim()) : [form.content.trim(), appendixText].filter(Boolean).join('\n'), request_id: requestId.current}
    if (type === 'new_project') Object.assign(payload, {title: form.title.trim(), goal: form.goal.trim(), owner_bot: form.owner_bot})
    else payload.project = form.project
    if (type === 'reassign') Object.assign(payload, {executor: form.executor, reviewer: form.reviewer, executor_backup: form.executor_backup, reviewer_backup: form.reviewer_backup})
    try {
      let opened = false
      if (type === 'new_project' && isHyOwnerSession(getAccessToken())) {
        try {
          await writeOffice('owner/projects', openProjectBody({ request_id: requestId.current, owner_bot: form.owner_bot, title: form.title, goal: form.goal, content: form.content }), { headers: authHeaders() })
          opened = true
        } catch { opened = false }
      }
      if (!opened) await writeOffice('requests', payload, { headers: authHeaders() })
      requestId.current = null
      setNotice(opened ? '已開案，PI 會先寫規劃書' : type === 'reassign' ? '已套用' : '已送出，處理結果會顯示在此專案。')
      setOpen(inline)
      setForm(old => ({ ...old, content: '', title: '', goal: '' }))
      await reload()
    }
    catch (e) { setError(e) } finally { setBusy(false) }
  }
  return <div className="bo-action">{!inline && <button disabled={readOnly || busy} aria-expanded={open} onClick={() => setOpen(v => !v)}>{LABELS[type]}</button>}
    {open && <form className={`${inline ? '' : 'ao-card'} bo-request-form`} aria-label={LABELS[type]} onSubmit={send}>
      {!inline && <h2>{LABELS[type]}</h2>}<fieldset disabled={busy}>
      {type !== 'new_project' && !inline && <label>專案<select aria-label={`${LABELS[type]}專案`} value={form.project} onChange={set('project')} required><option value="">請選專案</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}・{NAMES[p.ownerBot] || '待補 owner'}</option>)}</select></label>}
      {type === 'new_project' && <><label>名稱<input value={form.title} onChange={set('title')} required /></label><label>目標<textarea value={form.goal} onChange={set('goal')} required /></label><label>負責 Bot<select value={form.owner_bot} onChange={set('owner_bot')}>{Object.entries(NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></>}
      {type === 'reassign' && <><label>執行者（主案）<select value={form.executor} onChange={set('executor')} aria-label="執行者主案">{OFFICE_AI_CHOICES.map(n => <option key={n} value={n}>{AI_LABELS[n]}</option>)}</select></label><label>執行者（備案）<select value={form.executor_backup} onChange={set('executor_backup')} aria-label="執行者備案">{OFFICE_AI_CHOICES.map(n => <option key={n} value={n}>{AI_LABELS[n]}</option>)}</select></label><label>審查者（主案）<select value={form.reviewer} onChange={set('reviewer')} aria-label="審查者主案">{OFFICE_AI_CHOICES.map(n => <option key={n} value={n}>{AI_LABELS[n]}</option>)}</select></label><label>審查者（備案）<select value={form.reviewer_backup} onChange={set('reviewer_backup')} aria-label="審查者備案">{OFFICE_AI_CHOICES.map(n => <option key={n} value={n}>{AI_LABELS[n]}</option>)}</select></label>{reassignConflict.map(message => <p key={message} role="alert">{message}</p>)}</>}
      <label>{type === 'new_project' ? '說明（選填）' : inline ? '意見或補充資料' : '說明'}<textarea aria-label={type === 'new_project' ? '說明（選填）' : inline ? '意見或補充資料' : '說明'} value={form.content} onChange={set('content')} required={type !== 'new_project' && !appendix.trim()} /></label>
      <p className="ao-muted">{type === 'reassign' ? '送出後會立即套用到這個專案。' : '送出後會交給專案流程處理，處理完成後更新專案。'}</p>
      {children}<div className="ao-toolbar"><button type="submit" className="ao-primary" disabled={!(type === 'new_project' ? form.title.trim() && form.goal.trim() : form.content.trim() || appendix.trim()) || type === 'reassign' && reassignConflict.length > 0}>{type === 'message' ? '送給 PI' : '送出請求'}</button>{!inline && <button type="button" onClick={() => setOpen(false)}>取消</button>}</div>
      </fieldset>
    </form>}
    {busy && <p role="status">正在儲存…</p>}{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error.message}{error.kind === 'auth' && <button onClick={expireSession}>重新登入</button>}</p>}
  </div>
}

function reassignSummary(payload = {}) {
  const name = id => OFFICE_NAMES[id] || id || '尚未指定'
  const role = (label, primary, backup) => backup ? `${label} ${name(primary)}（備案 ${name(backup)}）` : `${label} ${name(primary)}`
  return `${role('執行', payload.executor, payload.executor_backup)}、${role('審查', payload.reviewer, payload.reviewer_backup)}`
}

export function OfficeReassignQueue({ project, reload }) {
  const open = (project?.requests || []).filter(row => row && row.type === 'reassign' && row.status === 'open')
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(null)
  async function apply(row) {
    const key = row.request_id || row.id
    setBusyId(key); setError(null); setNotice('')
    try {
      await applyOfficeRequest(key, { headers: authHeaders() })
      setNotice('已套用')
      await reload()
    } catch (reason) {
      setError(reason)
    } finally {
      setBusyId('')
    }
  }
  if (!open.length && !notice && !error) return null
  return <section aria-label="待套用的改派">
    <h3>待套用的改派</h3>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error.message}{error.kind === 'auth' && <button type="button" onClick={expireSession}>重新登入</button>}</p>}
    {open.length > 0 && <ul className="ao-bullets">{open.map(row => {
      const key = row.request_id || row.id
      const summary = (row.payload?.content || '').trim() || '尚未填寫說明'
      return <li key={key}><p>{summary}</p><p className="ao-muted">{reassignSummary(row.payload)}</p><button type="button" disabled={Boolean(busyId)} onClick={() => apply(row)}>套用</button></li>
    })}</ul>}
    {!open.length && <p className="ao-muted">沒有待套用的改派。</p>}
  </section>
}

export function OfficeLog({ project, readOnly, reload }) {
  const [content, setContent] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState(null)
  const requestId = useRef(null)
  async function send(e) {
    e.preventDefault(); setBusy(true); setError(null); requestId.current ||= crypto.randomUUID()
    try { await writeOffice('log', {project: project.id, content: content.trim(), request_id: requestId.current}, {headers: authHeaders()}); requestId.current = null; setContent(''); setNotice('留言已儲存。'); await reload() }
    catch (e) { setError(e) } finally { setBusy(false) }
  }
  return <section className="ao-card"><h2>工作日誌</h2><form onSubmit={send}><label>HY 留言<textarea aria-label="HY 留言" disabled={readOnly || busy} value={content} onChange={e => { requestId.current = null; setContent(e.target.value) }} /></label><button disabled={readOnly || busy || !content.trim()}>新增留言</button></form>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error.message}{error.kind === 'auth' && <button onClick={expireSession}>重新登入</button>}</p>}
    <ol className="ao-journal">{project.logs.slice().reverse().map(l => <li key={l.id}><time>{l.at}</time><b>{l.actor === 'hy' ? 'HY' : l.answered_by === 'hy' ? 'HY Bot' : NAMES[l.answered_by] || 'Bot'}</b><p className="bo-summary">{l.content}</p></li>)}</ol>
    {!project.logs.length && <p className="ao-muted">尚無留言。</p>}
  </section>
}

export function OfficeFollowUps({ project }) {
  const names = {open: '待辦', done: '已完成', resolved: '已完成', cancelled: '已取消'}
  return <section className="ao-card bo-follow-ups"><h2>執行前待辦</h2>{project.followUps.length ? <ul className="ao-bullets">{project.followUps.map((f,i) => <li key={f.id || i}><span className="hy-pill" data-s={['done','resolved'].includes(f.status) ? 'done' : 'wait'}>{names[f.status] || f.status || '狀態待補'}</span><p>{f.text}</p>{f.sourceUrl ? <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer">來源 {f.source} ↗</a> : f.source && <small>來源：{f.source}</small>}</li>)}</ul> : <p className="ao-muted">尚未登錄執行前待辦。</p>}</section>
}

export function OfficeReview({ project }) {
  const review = project.review
  return <section className="ao-card"><h2>品質與審查</h2><dl className="hy-kv"><dt>最近審查</dt><dd>{({pass: '通過', fail: '需修改', none: '尚無審查'})[review.verdict] || review.verdict}</dd></dl>
    {safeDriveUrl(review.url) ? <a href={review.url} target="_blank" rel="noopener noreferrer">開啟審查報告 ↗</a> : <p className="ao-muted">審查報告連結待補。</p>}
    <h3>必改清單</h3>{review.requiredChanges.length ? <ul>{review.requiredChanges.map((c, i) => <li key={i}>{c}</li>)}</ul> : <p className="ao-muted">尚未提供必改清單。</p>}
  </section>
}
