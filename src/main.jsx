import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'
import App from './App'
import Home from './pages/Home'
import AIArmy from './pages/AIArmy'
import BotOffice from './pages/BotOffice'
import LineHY from './pages/LineHY'
import LineXiaoyin from './pages/LineXiaoyin'
import Line950157 from './pages/Line950157'
import LineFamily from './pages/LineFamily'
import LineSam from './pages/LineSam'
import Settings from './pages/Settings'
import SystemArchitecture from './pages/SystemArchitecture'
import AgentConfig from './pages/AgentConfig'
import Goals from './pages/Goals'
import Strategy from './pages/Strategy'
import Inbox from './pages/Inbox'
import More from './pages/More'
import AuthGate from './components/AuthGate'
const LifeIsland = lazy(() => import('./pages/LifeIsland'))

function LegacyAIWorkRedirect() {
  const location = useLocation()
  return <Navigate to={'/ai-work-v5' + location.search} replace />
}

// 舊網址 /expert-team?tab=… → /ai-army?tab=…（其他參數如 owner-cutover 一併保留）
function ExpertTeamRedirect() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  if (!params.get('tab')) params.set('tab', 'experts')
  return <Navigate to={'/ai-army?' + params.toString()} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Navigate to="/life-island" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="decide" element={<Navigate to="/inbox" replace />} />
        <Route path="more" element={<More />} />
        <Route path="life-os" element={<Navigate to="/home" replace />} />
        <Route path="ai-army" element={<AIArmy />} />
        <Route path="helpers" element={<Navigate to="/ai-army?tab=helpers" replace />} />
        <Route path="memory" element={<Navigate to="/ai-army?tab=helpers" replace />} />
        <Route path="workspace/*" element={<LegacyAIWorkRedirect />} />
        <Route path="ai-work" element={<Navigate to="/ai-work-v5" replace />} />
        <Route path="ai-work-v5" element={<Navigate to="/bot-office" replace />} />
        <Route path="bot-office" element={<BotOffice />} />
        <Route path="ai-work-v3-ready" element={<Navigate to="/ai-work-v5" replace />} />
        <Route path="ai-work-test/*" element={<Navigate to="/ai-work-v5" replace />} />
        <Route path="research" element={<Navigate to="/ai-work-v5" replace />} />
        <Route path="dispatch" element={<Navigate to="/ai-work-v5" replace />} />
        <Route path="line/hy" element={<LineHY />} />
        <Route path="line/xiaoyin" element={<LineXiaoyin />} />
        <Route path="line/950157" element={<Line950157 />} />
        <Route path="line/family" element={<LineFamily />} />
        <Route path="line/sam" element={<LineSam />} />
        <Route path="agent/:id" element={<AgentConfig />} />
        <Route path="goals" element={<Goals />} />
        <Route path="strategy" element={<Strategy />} />
        <Route path="system-architecture" element={<SystemArchitecture />} />
        <Route path="expert-team" element={<ExpertTeamRedirect />} />
        <Route path="settings" element={<Settings />} />
        <Route path="life-island" element={<Suspense fallback={<p className="hy-lede">載入 HY Life 島…</p>}><LifeIsland /></Suspense>} />
      </Route>
    </Routes>
  )
}

function Experience() {
  const location = useLocation()
  if (location.pathname === '/command-center') return <Navigate to="/ai-work" replace />
  return <AppRoutes />
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

