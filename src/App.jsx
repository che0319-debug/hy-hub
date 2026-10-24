import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'
import TopBar from './layout/TopBar'
import Sidebar from './layout/Sidebar'
import { fetchDispatchSessions } from './api'

export const SessionContext = createContext(null)

export function useSessionContext() {
  return useContext(SessionContext)
}

export default function App({ onMobileVersion }) {
  const [sessions, setSessions] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // 桌面版左側欄可收起／展開，記住上次的選擇
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('hy_sidebar_collapsed') === '1' } catch { return false } })
  function toggleSide() {
    setCollapsed(v => { const n = !v; try { localStorage.setItem('hy_sidebar_collapsed', n ? '1' : '0') } catch { /* 無痕模式等，忽略 */ } return n })
  }
  const location = useLocation()
  const pilotRoute = location.pathname.startsWith('/ai-work')
  const worldRoute = location.pathname.startsWith('/life-island')   // 桌面版一律不顯示頂欄（站名與手機版入口在側欄）；世界頁內容再貼齊最上緣

  useEffect(() => {
    setSidebarOpen(false)
  }, [location])

  useEffect(() => {
    let active = true
    fetchDispatchSessions()
      .then(data => { if (active) setSessions(data) })
      .catch(err => console.warn('[App] fetchDispatchSessions failed:', err))
    return () => { active = false }
  }, [])

  function addSession(session) {
    setSessions(prev => [...prev, session])
    console.log('[App] session added:', session)
  }

  function removeSession(milestoneId) {
    setSessions(prev => prev.filter(s => s.milestoneId !== milestoneId))
    console.log('[App] session removed for milestone:', milestoneId)
  }

  async function refreshSessions() {
    try {
      const data = await fetchDispatchSessions()
      setSessions(data)
    } catch (err) {
      console.warn('[App] refreshSessions failed:', err)
    }
  }

  return (
    <SessionContext.Provider value={{ sessions, addSession, removeSession, refreshSessions }}>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {!pilotRoute && <div className="md:hidden"><TopBar onMobileVersion={onMobileVersion} /></div>}
        <button
          className="md:hidden fixed top-2 left-2 z-50 p-2 rounded-md bg-white shadow text-slate-700"
          onClick={() => setSidebarOpen(v => !v)}
          aria-label="選單"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar open={sidebarOpen} pilot={pilotRoute} world={!pilotRoute} collapsed={collapsed} onMobileVersion={onMobileVersion} />
        <button
          type="button"
          onClick={toggleSide}
          className="hidden md:flex fixed top-1/2 -translate-y-1/2 z-40 w-5 h-14 items-center justify-center bg-white border border-l-0 border-slate-200 rounded-r-md shadow text-slate-500 hover:text-slate-800 transition-all duration-200"
          style={{ left: collapsed ? 0 : (pilotRoute ? 216 : 200) }}
          aria-label={collapsed ? '展開左側欄' : '收起左側欄'}
          aria-expanded={!collapsed}
          title={collapsed ? '展開左側欄' : '收起左側欄'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <main className={pilotRoute ? `pilot-main ml-0 ${collapsed ? 'md:ml-0' : 'md:ml-[216px]'} p-5 md:p-8 min-h-screen transition-[margin] duration-200` : `ml-0 ${collapsed ? 'md:ml-0' : 'md:ml-[200px]'} ${worldRoute ? 'pt-12 md:pt-0' : 'pt-12 md:pt-6'} p-6 min-h-screen transition-[margin] duration-200`}>
          <Outlet />
        </main>
      </div>
    </SessionContext.Provider>
  )
}

