// HY 本人把專案設為完成，或把誤結案的專案改回執行中。returned 不能重開。
import { useRef, useState } from 'react'
import { authHeaders, expireSession } from '../auth'
import { projectStageBody, projectStageRequestId, setProjectStage } from '../botOfficeData'
import { milestoneProgress } from '../lib/botOfficeView.mjs'

export default function OfficeStageControl({ project, milestones = [], onChanged }) {
  const [mode, setMode] = useState('')
  const [summary, setSummary] = useState('')
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const busyRef = useRef(false)
  const stage = project?.stage
  if (stage === 'returned' || !project?.id) return null

  const progress = milestoneProgress(milestones)
  const incomplete = progress.total > 0 && progress.done < progress.total
  const unfinished = progress.total - progress.done
  const warning = incomplete ? `里程碑 ${unfinished}／${progress.total} 未完成，確定要結案？` : ''
  const warnId = `ao-stage-warn-${String(project.id).replace(/[^A-Za-z0-9_-]/g, '-')}`

  function reset() {
    setMode('')
    setSummary('')
    setAck(false)
    setError(null)
  }

  async function submit(patch) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      const body = projectStageBody(project, patch, projectStageRequestId(project.id))
      await setProjectStage(project.id, body, { headers: authHeaders() })
      await onChanged?.()
      reset()
    } catch (err) {
      setError({ kind: err?.kind || 'error', message: err?.message || '沒有改階段，請稍後重試。' })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  function confirmClose(event) {
    event?.preventDefault()
    const closure = summary.trim()
    if (!closure || busyRef.current) return
    if (incomplete && !ack) {
      setAck(true)
      return
    }
    submit({ stage: 'done', closure_summary: closure })
  }

  const alert = error && (
    <div role="alert">
      <p>{error.message}</p>
      {error.kind === 'auth' && <button type="button" onClick={expireSession}>重新登入</button>}
      {error.kind === 'conflict' && <button type="button" disabled={busy} onClick={() => { setError(null); onChanged?.() }}>重新讀取</button>}
    </div>
  )

  if (stage === 'done') {
    if (mode !== 'reopen') {
      return (
        <div className="ao-stage">
          <button type="button" disabled={busy} onClick={() => { setError(null); setMode('reopen') }}>重新開啟（改回執行中）</button>
        </div>
      )
    }
    return (
      <div className="ao-stage is-open">
        <div className="ao-stage-panel">
          <p>重新開啟後，這個專案會回到執行中。</p>
          {alert}
          <div className="ao-stage-actions">
            <button type="button" disabled={busy} onClick={reset}>取消</button>
            <button type="button" className="ao-primary" disabled={busy} onClick={() => submit({ stage: 'running' })}>{busy ? '送出中…' : '確認重新開啟'}</button>
          </div>
        </div>
      </div>
    )
  }

  if (mode !== 'close') {
    return (
      <div className="ao-stage">
        <button type="button" aria-expanded="false" disabled={busy} onClick={() => { setError(null); setMode('close') }}>設為完成</button>
      </div>
    )
  }

  return (
    <div className="ao-stage is-open">
      <form className="ao-stage-panel" onSubmit={confirmClose}>
        <p className="hy-note">只有全部里程碑結束、寫好結案摘要才設完成。</p>
        {warning && <p className="hy-alert" role="status" id={warnId}>{warning}</p>}
        <label>結案摘要
          <textarea aria-label="結案摘要" value={summary} disabled={busy} onChange={event => { setSummary(event.target.value); setAck(false) }} />
        </label>
        {alert}
        <div className="ao-stage-actions">
          <button type="button" disabled={busy} onClick={reset}>取消</button>
          <button type="submit" className="ao-primary" disabled={busy || !summary.trim()} aria-describedby={warning ? warnId : undefined}>
            {busy ? '送出中…' : incomplete && ack ? '確定要結案' : '設為完成'}
          </button>
        </div>
      </form>
    </div>
  )
}
