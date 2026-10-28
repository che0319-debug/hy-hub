// 尚未指定有效 owner_bot 的專案：每列一個選單，按「儲存」才寫回。預設不選。
import { useState } from 'react'
import '../../public/hy-ui/hy-ui.css'
import { assignProjectOwnerBot } from '../botOfficeData'
import { authHeaders, expireSession } from '../auth'
import { ownerBotChoices, unownedProjects } from '../life-island/worldData'
import { feedbackAfterReread, feedbackAfterSave } from '../lib/ownerBotUi.js'

const choices = ownerBotChoices()
const tap = { minHeight: 44 }
const selectStyle = { ...tap, width: '100%', maxWidth: '100%', minWidth: 0, border: '1px solid var(--hy-line)', borderRadius: 8, padding: '0 12px', background: 'var(--hy-surface)', color: 'var(--hy-ink)', fontSize: 16 }

export default function OwnerBotPicker({ projects, onSaved, heading = true }) {
  const rows = unownedProjects(projects)
  const [draft, setDraft] = useState({})
  const [busyId, setBusyId] = useState('')
  const [feedback, setFeedback] = useState({})
  if (!rows.length) {
    if (heading) return null
    return <p className="hy-note">目前沒有可指定的專案。請重新讀取 Bot Office。</p>
  }
  const patch = (id, next) => setFeedback(prev => ({ ...prev, [id]: { ...prev[id], ...next } }))
  async function save(row) {
    const owner = draft[row.id]
    if (!owner || busyId) return
    const label = choices.find(c => c.value === owner)?.label || owner
    setBusyId(row.id)
    patch(row.id, { error: '', kind: '', notice: '' })
    try {
      await assignProjectOwnerBot(row.id, {
        request_id: crypto.randomUUID(),
        owner_bot: owner,
        expected_owner_bot: row.ownerBot || '',
        expected_revision: row.revision,
      }, { headers: authHeaders() })
      setDraft(prev => ({ ...prev, [row.id]: '' }))
      try {
        await onSaved?.()
        patch(row.id, feedbackAfterSave(true, label))
      } catch { patch(row.id, feedbackAfterSave(false, label)) }
    } catch (error) {
      patch(row.id, { error: error?.message || '沒有儲存成功，請稍後重試。', kind: error?.kind || 'error', notice: '', label: '' })
    } finally { setBusyId('') }
  }
  async function reread(id) {
    setBusyId(id)
    const previous = feedback[id] || {}
    try {
      await onSaved?.()
      patch(id, feedbackAfterReread(true, previous))
    } catch { patch(id, feedbackAfterReread(false, previous)) }
    finally { setBusyId('') }
  }
  return (
    <section className="hy hy-card" aria-label="尚未指定負責 Bot" style={heading ? { marginBottom: 16 } : { marginTop: 12, padding: 0, border: 0, background: 'transparent', boxShadow: 'none' }}>
      {heading && <h2 className="hy-card-title">尚未指定負責 Bot</h2>}
      <p className="hy-note">選一位負責 Bot，再按儲存。沒有選擇不會送出。完成或退回的專案也可以指定。</p>
      <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(row => {
          const fb = feedback[row.id] || {}
          const busy = busyId === row.id
          const stage = row.stageLabel || row.stage || '狀態待確認'
          return (
            <li key={row.id || row.title} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: '1px solid var(--hy-line)', minWidth: 0 }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, overflowWrap: 'anywhere' }}>{row.title}</h3>
                <p className="hy-meta" style={{ marginTop: 2 }}>{row.id}・{stage}</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', minWidth: 0 }}>
                <label style={{ flex: '1 1 12rem', minWidth: 0 }}>
                  <span className="hy-note">負責 Bot</span>
                  <select className="owner-bot-select" aria-label={`${row.title} 負責 Bot`} value={draft[row.id] || ''} disabled={busy} style={selectStyle} onChange={e => { setDraft(prev => ({ ...prev, [row.id]: e.target.value })); patch(row.id, { notice: '' }) }}>
                    <option value="">請選擇</option>
                    {choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </label>
                <button type="button" className="hy-btn is-primary ao-primary" style={{ ...tap, flex: '1 1 8rem' }} disabled={!!busyId || !draft[row.id]} onClick={() => save(row)}>儲存</button>
              </div>
              {fb.notice && <p role="status">{fb.notice}</p>}
              {fb.error && (
                <div role="alert" className="hy-alert is-bad">
                  <p>{fb.error}</p>
                  {fb.kind === 'auth' && <button type="button" className="hy-btn" style={{ ...tap, marginTop: 8 }} onClick={expireSession}>重新登入</button>}
                  {fb.kind === 'conflict' && <button type="button" className="hy-btn" style={{ ...tap, marginTop: 8 }} onClick={() => reread(row.id)}>重新讀取</button>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
