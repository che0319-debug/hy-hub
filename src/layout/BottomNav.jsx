// 手機版底部導覽（<768px）：Life 島｜待我決定｜Bot Office｜更多。桌面版不顯示，沿用左側欄。
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Map, BellRing, ClipboardList, Menu } from 'lucide-react'
import { authHeaders } from '../auth'
import { loadBotOffice } from '../botOfficeData'
import { loadOfficeActions } from '../lib/officeActions'
import './bottom-nav.css'

// 「待我決定」的數字：Bot Office 待決定 ＋ AI Office 待確認（與 /decide 頁同一來源；讀不到的一邊當 0）
export function usePendingCount() {
  const [n, setN] = useState(null)
  useEffect(() => {
    let alive = true
    const load = () => Promise.all([
      loadBotOffice({ headers: authHeaders() }).then(d => d?.totals?.pending ?? 0).catch(() => 0),
      loadOfficeActions().then(a => a.length).catch(() => 0),
    ]).then(([a, b]) => { if (alive) setN(a + b) })
    load()
    const t = setInterval(load, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  return n
}

const MORE_PATHS = ['/more', '/home', '/ai-army', '/ai-work', '/goals', '/strategy', '/line', '/agent', '/system-architecture', '/settings']

export default function BottomNav() {
  const { pathname } = useLocation()
  const pending = usePendingCount()
  const moreActive = MORE_PATHS.some(p => pathname.startsWith(p))
  const items = [
    { to: '/life-island', label: 'Life 島', Icon: Map },
    { to: '/decide', label: '待我決定', Icon: BellRing, badge: pending },
    { to: '/bot-office', label: 'Bot Office', Icon: ClipboardList },
  ]
  return (
    <nav className="bn" aria-label="主要導覽">
      {items.map(({ to, label, Icon, badge }) => (
        <NavLink key={to} to={to} className={({ isActive }) => 'bn-item' + (isActive ? ' is-active' : '')}>
          <span className="bn-icon"><Icon size={22} aria-hidden="true" />{badge > 0 && <b className="bn-badge" aria-label={`${badge} 件`}>{badge > 9 ? '9+' : badge}</b>}</span>
          <span>{label}</span>
        </NavLink>
      ))}
      <NavLink to="/more" className={'bn-item' + (moreActive ? ' is-active' : '')}>
        <span className="bn-icon"><Menu size={22} aria-hidden="true" /></span><span>更多</span>
      </NavLink>
    </nav>
  )
}
