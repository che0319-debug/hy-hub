// 手機版底部導覽（<768px）：Life 島｜Inbox｜Bot Office｜更多。桌面版不顯示，沿用左側欄。
import { NavLink, useLocation } from 'react-router-dom'
import { Map, Inbox as InboxIcon, ClipboardList, Menu } from 'lucide-react'
import { useInbox } from '../inbox/InboxContext'
import './bottom-nav.css'

const MORE_PATHS = ['/more', '/home', '/ai-army', '/ai-work', '/goals', '/strategy', '/line', '/agent', '/system-architecture', '/settings']

export default function BottomNav() {
  const { pathname } = useLocation()
  const { counts, loaded } = useInbox()
  const pending = loaded ? counts.total : null
  const moreActive = MORE_PATHS.some(p => pathname.startsWith(p))
  const items = [
    { to: '/life-island', label: 'Life 島', Icon: Map },
    { to: '/inbox', label: 'Inbox', Icon: InboxIcon, badge: pending },
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
