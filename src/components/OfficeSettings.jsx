import { useEffect, useRef, useState } from 'react'
import { expireSession } from '../auth'
import { getOfficeSettings, saveOfficeSettings } from '../api'
import { OFFICE_AI_CHOICES, OFFICE_AI_DEFAULTS, officeAiConflict, parseOfficeSettings } from '../lib/officeAiDefaults.mjs'

const LABELS = { 'grok-build': 'Grok Build', gpt: 'GPT', claude: 'Claude' }

export default function OfficeSettings({ onClose, onSaved, canEdit = true }) {
  const dialogRef = useRef(null)
  const [form, setForm] = useState(OFFICE_AI_DEFAULTS)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [readOnly, setReadOnly] = useState(!canEdit)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function applyPayload(payload, { fallback = false } = {}) {
    const parsed = parseOfficeSettings(payload)
    setForm(parsed.ai_defaults)
    setRevision(parsed.revision)
    setReadOnly(fallback || !canEdit)
    setNote(fallback
      ? '設定 API 尚未上線，目前顯示系統預設值，僅供查看。'
      : (canEdit ? '' : '只有 HY 本人可以修改預設 AI。'))
  }

  async function load() {
    setLoading(true)
    setError('')
    setNotice('')
    try {
      applyPayload(await getOfficeSettings())
    } catch (err) {
      if (err?.status === 404) applyPayload({ ai_defaults: OFFICE_AI_DEFAULTS, revision: 0 }, { fallback: true })
      else setError(err?.message || '讀取設定失敗，請稍後重試。')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    let cancelled = false
    load().then(() => { if (cancelled) return })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const root = dialogRef.current
    const previously = document.activeElement
    const focusables = () => [...(root?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [])]
      .filter(el => !el.disabled && el.getAttribute('aria-hidden') !== 'true')
    const start = focusables()[0]
    start?.focus()
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (previously && typeof previously.focus === 'function') previously.focus()
    }
  }, [onClose, loading])

  const conflicts = officeAiConflict(form)
  const locked = readOnly || loading || busy || conflicts.length > 0
  const setRole = (role, field) => e => setForm(old => ({ ...old, [role]: { ...old[role], [field]: e.target.value } }))

  async function save(e) {
    e.preventDefault()
    if (locked) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await saveOfficeSettings({ expected_revision: revision, ai_defaults: form })
      applyPayload(result?.ai_defaults ? result : { ...result, ai_defaults: form, revision: revision + 1 })
      setNotice('已儲存。新開專案會套用這組預設；既有專案請用改派。')
      await onSaved?.()
    } catch (err) {
      if (err?.status === 409) setError('設定已被更新，請重新整理')
      else setError(err?.message || '儲存失敗，請稍後重試。')
    } finally { setBusy(false) }
  }

  return (
    <div className="ao-settings-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <form
        className="ao-card ao-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ao-settings-title"
        ref={dialogRef}
        onSubmit={save}
      >
        <h2 id="ao-settings-title">全系統預設 AI</h2>
        <p className="ao-muted">新開專案會套用這組主案／備案。改預設不會回頭改既有專案；既有專案請到「AI 執行配置 → 改派」。</p>
        <p className="ao-muted">主案連續失敗、沒有額度或停用時會改用備案，並且每次通知你。不會自動改掉專案上記的主案。</p>
        {loading && <p role="status">正在讀取設定…</p>}
        {note && <p className="ao-muted" role="status">{note}</p>}
        <div className="ao-settings-fields">
          <label>執行 AI（主案）
            <select value={form.executor.primary} onChange={setRole('executor', 'primary')} disabled={readOnly || loading || busy} aria-label="執行 AI 主案">
              {OFFICE_AI_CHOICES.map(id => <option key={id} value={id}>{LABELS[id]}</option>)}
            </select>
          </label>
          <label>執行 AI（備案）
            <select value={form.executor.backup} onChange={setRole('executor', 'backup')} disabled={readOnly || loading || busy} aria-label="執行 AI 備案">
              {OFFICE_AI_CHOICES.map(id => <option key={id} value={id}>{LABELS[id]}</option>)}
            </select>
          </label>
          <label>審查 AI（主案）
            <select value={form.reviewer.primary} onChange={setRole('reviewer', 'primary')} disabled={readOnly || loading || busy} aria-label="審查 AI 主案">
              {OFFICE_AI_CHOICES.map(id => <option key={id} value={id}>{LABELS[id]}</option>)}
            </select>
          </label>
          <label>審查 AI（備案）
            <select value={form.reviewer.backup} onChange={setRole('reviewer', 'backup')} disabled={readOnly || loading || busy} aria-label="審查 AI 備案">
              {OFFICE_AI_CHOICES.map(id => <option key={id} value={id}>{LABELS[id]}</option>)}
            </select>
          </label>
        </div>
        {conflicts.map(message => <p key={message} role="alert">{message}</p>)}
        {error && <p role="alert">{error}{error.includes('請重新整理') && <button type="button" className="ao-btn" onClick={load}>重新整理</button>}{error.includes('重新登入') && <button type="button" className="ao-btn" onClick={expireSession}>重新登入</button>}</p>}
        {notice && <p role="status">{notice}</p>}
        <div className="ao-toolbar">
          <button type="submit" className="ao-primary" disabled={locked}>{busy ? '儲存中…' : '儲存'}</button>
          <button type="button" onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  )
}
