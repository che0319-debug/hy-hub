import { useState } from 'react'
import { request } from '../aiWorkV5Data'
import { authHeaders, ensureAccessToken } from '../auth'
import './quality-panel.css'

const node = { PLAN: '規劃書', MAJOR_MILESTONE: '重大里程碑', CLOSURE: '結案報告' }
const verdict = { PASS: '內容通過，待正式核准', CHANGES_REQUIRED: '需修改', INSUFFICIENT_EVIDENCE: '證據不足' }
const date = value => value ? new Date(value * 1000).toLocaleString('zh-TW') : '尚無回執'

export function QualityPanel({ project, onChanged }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const quality = project.quality
  async function enable() {
    setBusy(true); setError('')
    try {
      await request(`/projects/${encodeURIComponent(project.id)}/quality/enable-request`, { method: 'POST' })
      await onChanged()
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  const active = (quality?.checkpoints || []).filter(c => !c.approved_action)
  return <div className="hy quality-panel">
    <article className="hy-card is-focus">
      <div className="hy-card-head"><h2 className="hy-card-title">品質與交接</h2>
        <span className="hy-pill" data-s={quality?.quality_contract_version ? 'ai' : 'wait'}>{quality?.quality_contract_version ? '已啟用' : '未啟用'}</span></div>
      <p>內容通過後，仍需原有正式核准。</p>
      {!quality && <p className="hy-empty">後端尚未提供品質契約。</p>}
      {quality && !quality.quality_contract_version && <><p>既有核准保留；啟用前需方法版本與能力證據。</p>
        <button className="hy-btn" disabled={busy} onClick={enable}>提出本專案啟用確認</button></>}
      {!!error && <p role="alert" className="hy-alert">{error}</p>}
      <dl className="hy-kv"><dt>帳號設定</dt><dd>尚未驗證</dd><dt>端到端接通</dt><dd>尚未驗證</dd></dl>
    </article>
    <article className="hy-card">
      <h2 className="hy-card-title">審查節點與目標版本</h2>
      {!active.length && <p className="hy-empty">目前沒有待審節點。</p>}
      {active.map(c => <details key={c.checkpoint_id} className="hy-card">
        <summary>{node[c.kind]}{c.milestone_id ? ` · ${c.milestone_id}` : ''} · 第 {c.round + 1} 輪 · {verdict[c.verdict] || '等待審查'}</summary>
        <dl className="hy-kv"><dt>內容版本</dt><dd><code>{c.target.artifact_set_hash?.slice(0, 16)}</code></dd>
          <dt>資料快照</dt><dd><code>{c.target.input_snapshot_id?.slice(0, 32)}</code></dd></dl>
        {(c.target.review?.findings || []).map(f => <p key={f.finding_id}><strong>{f.finding_id}</strong> · {f.location}：{f.problem}。{f.required_change}</p>)}
        {(c.target.input_snapshot?.sources || []).flatMap(s => s.result.artifact_versions || []).map(a =>
          <button key={a.version_id} className="hy-btn" onClick={async () => {
            try {
              if (!await ensureAccessToken()) throw new Error('登入已過期')
              const base = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
              const response = await fetch(`${base}/api/ai-work-packages/projects/${encodeURIComponent(project.id)}/quality/artifacts/${encodeURIComponent(a.version_id)}`, { headers: authHeaders() })
              if (!response.ok) throw new Error(`原件讀取失敗 ${response.status}`)
              const blob = await response.blob(), url = URL.createObjectURL(blob)
              const link = document.createElement('a'); link.href = url; link.download = a.logical_id.replace(/[^a-zA-Z0-9_-]/g, '_'); link.click()
              setTimeout(() => URL.revokeObjectURL(url), 1000)
            } catch (e) { setError(e.message) }
          }}>下載固定原件 · {a.logical_id}</button>)}
      </details>)}
    </article>
    <article className="hy-card"><h2 className="hy-card-title">共同資料基準</h2>
      {!quality?.baseline && <p className="hy-empty">本專案尚未啟用資料基準。</p>}
      {quality?.baseline && <><p>版本 {quality.baseline.revision}</p>
        {['facts', 'decisions', 'assumptions', 'gaps'].map((key, i) => <details key={key}><summary>{['已確認事實', '正式決定', '工作假設', '資料缺口'][i]} · {quality.baseline[key]?.length || 0}</summary>
          <pre>{JSON.stringify(quality.baseline[key], null, 2)}</pre></details>)}</>}
    </article>
    <article className="hy-card"><h2 className="hy-card-title">審查端活動</h2>
      {!quality?.monitor?.length && <p className="hy-empty">尚無 HY 審查端回執。不能由此判斷平台額度或登入狀態。</p>}
      {(quality?.monitor || []).map(m => <dl className="hy-kv" key={m.client_id}><dt>最後輪詢</dt><dd>{date(m.last_poll)}</dd>
        <dt>最後領取</dt><dd>{date(m.last_claim)}</dd><dt>最後交件</dt><dd>{date(m.last_receipt)}</dd></dl>)}
    </article>
  </div>
}

