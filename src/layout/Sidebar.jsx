import { NavLink } from 'react-router-dom'
import {
  Home, Bot, ClipboardList,
  MessageSquare, Settings, Target
} from 'lucide-react'

const navItems = [
  { to: '/',           label: '首頁',     icon: Home },
  { to: '/helpers',    label: '我的小幫手', icon: Bot },
  { to: '/dispatch',   label: '派工與回報', icon: ClipboardList },
  { to: '/goals',      label: '人生目標',  icon: Target },
]

const botItems = [
  { to: '/line/hy',      label: 'HY',     icon: MessageSquare },
  { to: '/line/family',  label: '小因',   icon: MessageSquare },
  { to: '/line/950157',  label: '950157', icon: MessageSquare },
  { to: '/line/sam',     label: 'Sam',    icon: MessageSquare },
]

const otherItems = [
  { to: '/settings', label: '設定', icon: Settings },
]

function NavItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
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

export default function Sidebar() {
  return (
    <aside className="fixed top-12 left-0 bottom-0 w-[200px] bg-white flex flex-col py-4 px-2 overflow-y-auto z-40 border-r border-slate-200">
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
