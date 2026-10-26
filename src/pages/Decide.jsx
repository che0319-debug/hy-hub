// 待我決定：手機版主頁。只列「需要 HY 動手」的事：
//   1. Bot Office 待決定　2. AI Office 待確認　3. Atlas 回報的系統異常（只列有問題的）
// 每一項都帶你到可以處理的頁面；沒有事就明說沒有。
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadOfficeActions } from '../lib/officeActions'
import { useBotRoster } from '../life-island/useBotRoster'
import '../../public/hy-ui/hy-ui.css'

const GO = { office: '/bot-office', models: '/ai-army?tab=models' }
const btn = { minHeight: 44, display: 'inline-flex', alignItems: 'center' }

export default function Decide() {
  const roster = useBotRoster(null)
  const [actions, setActions] = useState(undefined)   // undefined 載入中；null 讀取失敗
  useEffect(() => {
    let alive = true
    const load = () => loadOfficeActions().then(a => alive && setActions(a)).catch(() => alive && setActions(null))
    load()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  const office = roster.office
  const decisions = office?.decisions || []
  const issues = roster.bots?.atlas?.attention || []
  const total = decisions.length + (actions?.length || 0)
  const loading = !roster.loaded || actions === undefined
  const projectTitle = id => office?.projects.find(p => p.id === id)?.title
  return (
    <div className="hy hy-stack" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="hy-pagehead"><h1 style={{ fontSize: 22, fontWeight: 700 }}>待我決定</h1>{!loading && <span className="hy-pill" data-s={total ? 'you' : 'done'}>{total ? `${total} 件待你決定` : '沒有待辦'}</span>}</div>
      {loading && <p className="hy-lede">讀取中…</p>}

      {decisions.map(d => (
        <section key={d.id} className="hy-card needs-you">
          <p className="hy-meta">Bot Office{projectTitle(d.projectId) ? `・${projectTitle(d.projectId)}` : ''}</p>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>{d.title}</h2>
          {d.suggestion && <p>建議：{d.suggestion}</p>}
          <Link className="hy-btn" style={btn} to="/bot-office">到 Bot Office 回答</Link>
        </section>
      ))}

      {(actions || []).map(a => (
        <section key={a.id} className="hy-card needs-you">
          <p className="hy-meta">AI Office{a.projectTitle ? `・${a.projectTitle}` : ''}</p>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>{a.title}</h2>
          {a.question && a.question !== a.title && <p style={{ whiteSpace: 'pre-line' }}>{a.question.length > 140 ? a.question.slice(0, 139) + '…' : a.question}</p>}
          <Link className="hy-btn" style={btn} to="/ai-work-v5?filter=open">到 AI Office 處理</Link>
        </section>
      ))}

      {actions === null && <div className="hy-card"><p>讀不到 AI Office，待確認事項可能不完整。</p></div>}
      {roster.loaded && !office && !roster.officeEmpty && <div className="hy-card"><p>讀不到 Bot Office，待決定事項可能不完整。</p></div>}
      {!loading && !total && !issues.length && <div className="hy-card"><p>目前沒有需要你決定的事。</p></div>}

      {issues.length > 0 && (
        <section className="hy-card">
          <div className="hy-pagehead"><h2 style={{ fontSize: 17, fontWeight: 700 }}>Atlas 回報的系統異常</h2><span className="hy-pill" data-s="bad">{issues.length} 項</span></div>
          {issues.map((i, k) => (
            <p key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', minHeight: 44 }}>
              <span>{i.text}</span>{GO[i.go] && <Link to={GO[i.go]} style={{ ...btn, flex: 'none' }}>處理</Link>}
            </p>
          ))}
        </section>
      )}
    </div>
  )
}
