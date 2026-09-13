import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
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
import LifeOS from './pages/LifeOS'
import AuthGate from './components/AuthGate'
import MobileAppV2 from './mobile/MobileAppV2'

function DesktopRoutes({ onMobileVersion }) {
  return (
    <Routes>
      <Route path="/" element={<App onMobileVersion={onMobileVersion} />}>
        <Route index element={<Home />} />
        <Route path="life-os" element={<LifeOS />} />
        <Route path="helpers" element={<Helpers />} />
        <Route path="dispatch" element={<AIWorkCenter />} />
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
  const [mobileWidth, setMobileWidth] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [mode, setMode] = useState(() => sessionStorage.getItem('hy_world_view') || 'auto')

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setMobileWidth(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  function choose(next) {
    setMode(next)
    sessionStorage.setItem('hy_world_view', next)
  }

  if (mobileWidth && mode !== 'desktop') {
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
