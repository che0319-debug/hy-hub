import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App'
import Home from './pages/Home'
import Helpers from './pages/Helpers'
import Dispatch from './pages/Dispatch'
import CrossDomain from './pages/CrossDomain'
import LineHY from './pages/LineHY'
import LineXiaoyin from './pages/LineXiaoyin'
import Line950157 from './pages/Line950157'
import LineSam from './pages/LineSam'
import Settings from './pages/Settings'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="helpers" element={<Helpers />} />
          <Route path="dispatch" element={<Dispatch />} />
          <Route path="cross" element={<CrossDomain />} />
          <Route path="line/hy" element={<LineHY />} />
          <Route path="line/xiaoyin" element={<LineXiaoyin />} />
          <Route path="line/950157" element={<Line950157 />} />
          <Route path="line/sam" element={<LineSam />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>
)
