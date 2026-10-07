import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from '../aiWorkV5Data'
import { reportView, refreshMessage, shouldPoll, downloadName } from '../lib/projectReport'
import './project-report.css'

// 專案報告卡（風格 A）：放在「產出」最上面。報告由系統在開案、Milestone 核准、
// 結案時自動整理；HY 也可按「整理報告」。報告 HTML 由 AI 產生，一律放在沙盒 iframe 內顯示。
const STYLE_ID = 'hy-ui-css'
function useHyUiStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const link = document.createElement('link')
    link.id = STYLE_ID
    link.rel = 'stylesheet'
    link.href = `${import.meta.env.BASE_URL}hy-ui/hy-ui.css`
    document.head.appendChild(link)
  }, [])
}

const when = seconds => seconds ? new Date(seconds * 1000).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ''
const PILL = { wait: 'wait', ai: 'ai', you: 'you', done: 'done', bad: 'bad' }

export function useProjectReport(projectId) {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const alive = useRef(true)
  const load = useCallback(async () => {
    try {
      const data = await request(`/projects/${encodeURIComponent(projectId)}/report`)
      if (alive.current) { setInfo(data); setError('') }
      return data
    } catch (reason) { if (alive.current) setError(reason.message); return null }
  }, [projectId])
  useEffect(() => { alive.current = true; setInfo(null); load(); return () => { alive.current = false } }, [load])
  useEffect(() => {
    if (!shouldPoll(info)) return undefined
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load() }, 20000)
    return () => window.clearInterval(timer)
  }, [info, load])
  return { info, error, reload: load }
}

// 概況頁的一行狀態：讓 HY 不用進「產出」就知道報告現況。
export function ReportStrip({ projectId, goOutputs }) {
  useHyUiStyles()
  const { info } = useProjectReport(projectId)
  if (!info) return null
  const view = reportView(info)
  return <button type="button" className="hy-card pr-strip" onClick={goOutputs}>
    <span><b>{view.title}</b><small>{view.revision ? ` 第 ${view.revision} 版` : ''}</small></span>
    <span className="hy-pill" data-s={PILL[view.tone]}>{view.label}</span>
  </button>
}

export default function ProjectReportCard({ project }) {
  useHyUiStyles()
  const { info, error, reload } = useProjectReport(project.id)
  const [html, setHtml] = useState(null)
  const [opening, setOpening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const view = reportView(info)
  const latestFile = info?.latest?.file_id || ''

  // 新版本出現時，已開啟的內容要換掉（不顯示舊版）。
  useEffect(() => { setHtml(null) }, [latestFile])

  async function open() {
    if (html) { setHtml(null); return }
    setOpening(true)
    try {
      const data = await request(`/projects/${encodeURIComponent(project.id)}/report/html`)
      setHtml(data.html)
      setNote(null)
    } catch (reason) { setNote({ text: reason.message, tone: 'bad' }) }
    finally { setOpening(false) }
  }

  async function download() {
    try {
      const data = html != null ? { html } : await request(`/projects/${encodeURIComponent(project.id)}/report/html`)
      const url = URL.createObjectURL(new Blob([data.html], { type: 'text/html;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = downloadName(project.title, info)
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (reason) { setNote({ text: reason.message, tone: 'bad' }) }
  }

  async function refresh(force = false) {
    setBusy(true)
    try {
      const result = await request(`/projects/${encodeURIComponent(project.id)}/report/refresh`, { method: 'POST', body: JSON.stringify(force ? { force: true } : {}) })
      setNote(refreshMessage(result))
      await reload()
    } catch (reason) { setNote({ text: reason.message, tone: 'bad' }) }
    finally { setBusy(false) }
  }

  const history = info?.history || []
  return <section className="hy-card is-focus pr-card" aria-labelledby="pr-title" data-state={info?.state || 'loading'}>
    <div className="hy-card-head">
      <h2 id="pr-title" className="hy-card-title">{view.title}{view.revision ? <small className="pr-rev"> 第 {view.revision} 版</small> : null}</h2>
      <span className="hy-pill" data-s={PILL[view.tone]}>{view.label}</span>
    </div>
    {view.updatedAt && <p className="pr-meta">更新於 {when(view.updatedAt)}</p>}
    {view.hint && <p className="pr-hint">{view.hint}</p>}
    {error && <p role="alert" className="hy-alert is-bad">{error}</p>}
    <div className="pr-actions">
      <button type="button" className="hy-btn is-primary" disabled={!view.canOpen || opening} onClick={open}>{opening ? '讀取中…' : html ? '收起報告' : '開啟報告'}</button>
      <button type="button" className="hy-btn" disabled={!view.canRefresh || busy} onClick={() => refresh(false)}>{busy ? '送出中…' : '整理報告'}</button>
      <button type="button" className="hy-btn" disabled={!view.canOpen} onClick={download}>下載 HTML</button>
    </div>
    {note && <p role="status" className={note.tone === 'bad' ? 'hy-alert is-bad' : 'pr-note'}>{note.text}{note.canForce && <> <button type="button" className="pr-link" disabled={busy} onClick={() => refresh(true)}>仍要重新整理</button></>}</p>}
    {html != null && <iframe className="pr-frame" title={view.title} srcDoc={html} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" />}
    {history.length > 1 && <details className="pr-history">
      <summary>歷史版本（{history.length}）</summary>
      <ul>{history.map(item => <li key={item.file_id}>
        <span>第 {item.revision} 版{item.final ? '・結案' : ''}<small> {when(item.created_at)}{item.reason ? `・${item.reason}` : ''}</small></span>
        <a href={item.drive_url} target="_blank" rel="noreferrer">在 Drive 開啟</a>
      </li>)}</ul>
    </details>}
  </section>
}
