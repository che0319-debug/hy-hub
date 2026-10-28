// 更多：手機版放不進底部四格的頁面。
import { Link } from 'react-router-dom'
import '../../public/hy-ui/hy-ui.css'

const GROUPS = [
  ['系統', [['/home', '首頁（今日待辦與行程）'], ['/ai-army', 'AI 軍團']]],
  ['規劃', [['/goals', '人生目標'], ['/strategy', '戰略盤']]],
  ['Bot 團隊', [['/line/hy', 'HY'], ['/line/family', '小因'], ['/line/950157', '950157'], ['/line/sam', 'Sam']]],
  ['其他', [['/settings', '設定']]],
]

export default function More() {
  return (
    <div className="hy hy-stack" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="hy-pagehead"><h1 style={{ fontSize: 22, fontWeight: 700 }}>更多</h1></div>
      {GROUPS.map(([name, links]) => (
        <section key={name} className="hy-card">
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{name}</h2>
          {links.map(([to, label]) => <Link key={to} to={to} style={{ display: 'flex', alignItems: 'center', minHeight: 48, borderTop: '1px solid var(--hy-line)', color: 'var(--hy-ink)', textDecoration: 'none' }}>{label}</Link>)}
        </section>
      ))}
    </div>
  )
}
