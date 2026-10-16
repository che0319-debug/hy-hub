import { useState } from 'react'
import { request } from '../aiWorkV5Data'

const errors = {
  PLANNING_PACKAGE_BUSY: 'AI 正在規劃中，請稍後再試。',
  APPROVED_PLAN_REQUIRES_SPEC_CHANGE: '規劃書已核准，請重新載入專案並使用正式規格變更。',
  ROLE_DENIED: '只有 HY 本人可以編輯草稿目標，請確認登入身分。',
}

export default function DraftGoalEditor({ project, onChanged }) {
  const [goal, setGoal] = useState(project.goal || '')
  const [description, setDescription] = useState(project.description || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  // The Office API exposes permissions.delete only for the authenticated owner.
  // Do not infer ownership from owner_bot (the assigned Bot).
  if (project.plan_state !== 'DRAFT' || project.permissions?.delete !== true) return null

  async function submit(event) {
    event.preventDefault()
    if (busy || !goal.trim()) return
    if (!window.confirm('改目標會讓 AI 重新規劃、舊規劃存入歷史。確定送出嗎？')) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await request(`/projects/${encodeURIComponent(project.id)}/goal`, {
        method: 'PUT', body: JSON.stringify({ goal: goal.trim(), description }),
      })
      setMessage('已更新，規劃已重新排入')
      await onChanged()
    } catch (reason) {
      setError(errors[reason.message] || reason.message)
    } finally {
      setBusy(false)
    }
  }

  return <form className="cc5-form" aria-label="編輯目標（草稿階段）" onSubmit={submit}>
    <h3>編輯目標（草稿階段）</h3>
    <fieldset disabled={busy} className="ao-draft-fields">
      <label className="cc5-field" htmlFor="draft-goal">專案目標</label>
      <textarea id="draft-goal" required maxLength={30000} value={goal} onChange={e => setGoal(e.target.value)}/>
      <label className="cc5-field" htmlFor="draft-description">專案說明（選填）</label>
      <textarea id="draft-description" maxLength={10000} value={description} onChange={e => setDescription(e.target.value)}/>
      <p className="ao-muted">改目標會讓 AI 重新規劃、舊規劃存入歷史。</p>
      <button className="ao-primary" type="submit" disabled={busy || !goal.trim()}>{busy ? '更新中…' : '更新目標並重新規劃'}</button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </form>
}
