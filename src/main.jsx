import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'
import './mobile/mobile-v2.css'
import App from './App'
import Home from './pages/Home'
import Helpers from './pages/Helpers'
import AIWorkCenter from './pages/AIWorkCenter'
import LineHY from './pages/LineHY'
import LineXiaoyin from './pages/LineXiaoyin'
import Line950157 from './pages/Line950157'
import LineFamily from './pages/LineFamily'
import LineSam from './pages/LineSam'
import Settings from './pages/Settings'
import AgentConfig from './pages/AgentConfig'
import Goals from './pages/Goals'
import Strategy from './pages/Strategy'
import AuthGate from './components/AuthGate'
import MobileAppV2 from './mobile/MobileAppV2'
import CommandCenter from './pages/CommandCenter'

function DesktopRoutes({ onMobileVersion }) {
  return (
    <Routes>
      <Route path="/" element={<App onMobileVersion={onMobileVersion} />}>
        <Route index element={<Home />} />
        <Route path="life-os" element={<Navigate to="/" replace />} />
        <Route path="helpers" element={<Helpers />} />
        <Route path="memory" element={<Navigate to="/helpers" replace />} />
        <Route path="workspace" element={<AIWorkCenter />} />
        <Route path="research" element={<Navigate to="/workspace" replace />} />
        <Route path="dispatch" element={<Navigate to="/workspace" replace />} />
        <Route path="line/hy" element={<LineHY />} />
        <Route path="line/xiaoyin" element={<LineXiaoyin />} />
        <Route path="line/950157" element={<Line950157 />} />
        <Route path="line/family" element={<LineFamily />} />
        <Route path="line/sam" element={<LineSam />} />
        <Route path="agent/:id" element={<AgentConfig />} />
        <Route path="goals" element={<Goals />} />
        <Route path="strategy" element={<Strategy />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

function Experience() {
  const location = useLocation()
  const [mobileWidth, setMobileWidth] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [mode, setMode] = useState(() => {
    const current = sessionStorage.getItem('hy_life_os_view')
    const legacy = sessionStorage.getItem('hy_world_view')
    if (!current && legacy) sessionStorage.setItem('hy_life_os_view', legacy)
    sessionStorage.removeItem('hy_world_view')
    return current || legacy || 'auto'
  })

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setMobileWidth(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  function choose(next) {
    setMode(next)
    sessionStorage.setItem('hy_life_os_view', next)
  }

  if (location.pathname === '/command-center') return <CommandCenter />
  if (mobileWidth && mode !== 'desktop' && location.pathname !== '/workspace') {
    return <MobileAppV2 onDesktopVersion={() => choose('desktop')} />
  }
  return <DesktopRoutes onMobileVersion={mobileWidth ? () => choose('mobile') : null} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>
      <HashRouter>
        <Experience />
      </HashRouter>
    </AuthGate>
  </StrictMode>
)

