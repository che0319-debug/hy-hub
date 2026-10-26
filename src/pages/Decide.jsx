// 待我決定：手機版主頁。只列「需要 HY 動手」的事，來源是 Bot Office 的待決定事項；點進去到 Bot Office 回答。
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authHeaders } from '../auth'
import { loadBotOffice } from '../botOfficeData'
import '../../public/hy-ui/hy-ui.css'

export default function Decide() {
  const [office, setOffice] = useState(undefined)   // undefined 載入中；null 讀取失敗或尚無資料
  useEffect(() => {
    let alive = true
    const load = () => loadBotOffice({ headers: authHeaders() }).then(d => alive && setOffice(d)).catch(() => alive && setOffice(null))
    load()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  const items = office?.decisions || []
  const title = id => office?.projects.find(p => p.id === id)?.title
  return (
    <div className="hy hy-stack" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="hy-pagehead"><h1 style={{ fontSize: 22 }}>待我決定</h1>{office && <span className="hy-pill" data-s={items.length ? 'you' : 'done'}>{items.length ? `${items.length} 件待你決定` : '沒有待辦'}</span>}</div>
      {office === undefined && <p className="hy-lede">讀取中…</p>}
      {office === null && <div className="hy-card"><p>讀不到 Bot Office，暫時看不到待決定的事。</p><Link className="hy-btn" to="/bot-office">去 Bot Office</Link></div>}
      {office && !items.length && <div className="hy-card"><p>目前沒有需要你決定的事。</p></div>}
      {items.map(d => (
        <section key={d.id} className="hy-card needs-you">
          <h2 style={{ fontSize: 17 }}>{d.title}</h2>
          {title(d.projectId) && <p className="hy-meta">專案：{title(d.projectId)}</p>}
          {d.suggestion && <p>建議：{d.suggestion}</p>}
          <Link className="hy-btn" to="/bot-office" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>到 Bot Office 回答</Link>
        </section>
      ))}
    </div>
  )
}
