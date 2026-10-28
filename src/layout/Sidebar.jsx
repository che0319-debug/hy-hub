import { NavLink } from 'react-router-dom'
import {
  Home, Bot, Inbox,
  MessageSquare, Settings, Target, LayoutDashboard, Boxes, Map
} from 'lucide-react'

const navItems = [
  { to: '/life-island', label: 'HY Life 島', icon: Map },
  { to: '/inbox',      label: 'Inbox',    icon: Inbox },
  { to: '/home',       label: '首頁',     icon: Home },
  { to: '/ai-army',    label: 'AI 軍團', icon: Bot },
  { to: '/bot-office', label: 'Bot Office', icon: LayoutDashboard },
  { to: '/goals',      label: '人生目標',  icon: Target },
  { to: '/strategy',   label: '戰略盤',   icon: Target },
]

const botItems = [
  { to: '/line/hy',      label: 'HY',     icon: MessageSquare },
  { to: '/line/family',  label: '小因',   icon: MessageSquare },
  { to: '/line/950157',  label: '950157', icon: MessageSquare },
  { to: '/line/sam',     label: 'Sam',    icon: MessageSquare },
]

const otherItems = [
  { to: '/system-architecture', label: '系統架構', icon: Boxes },
  { to: '/settings', label: '設定', icon: Settings },
]

function NavItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-600'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
        }`
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  )
}

export default function Sidebar({ pilot = false, world = false, collapsed = false }) {
  return (
    <aside className={`hidden md:flex fixed ${pilot ? 'top-0 w-[216px] pilot-sidebar' : 'top-0 w-[200px]'} left-0 bottom-0 bg-white flex-col py-4 px-2 overflow-y-auto z-40 border-r border-slate-200 transition-transform duration-200 ${collapsed ? 'md:-translate-x-full' : 'md:translate-x-0'}`}>
      {pilot && <div className="pilot-sidebar-title">HY Life OS</div>}
      {world && <div className="hidden md:block px-3 pb-3 text-lg font-bold tracking-wide text-slate-800">HY World</div>}
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavItem key={to} to={to} label={label} Icon={Icon} />
        ))}

      </nav>

      <div className="mt-4 mb-1 px-3 text-xs text-slate-400 font-medium tracking-wider">── Bot 團隊 ──</div>
      <nav className="flex flex-col gap-0.5">
        {botItems.map(({ to, label, icon: Icon }) => (
          <NavItem key={to} to={to} label={label} Icon={Icon} />
        ))}
      </nav>

      <div className="mt-4 mb-1 px-3 text-xs text-slate-400 font-medium tracking-wider">── 其他 ──</div>
      <nav className="flex flex-col gap-0.5">
        {otherItems.map(({ to, label, icon: Icon }) => (
          <NavItem key={to} to={to} label={label} Icon={Icon} />
        ))}
      </nav>
    </aside>
  )
}


