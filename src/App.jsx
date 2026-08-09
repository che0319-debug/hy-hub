import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import TopBar from './layout/TopBar'
import Sidebar from './layout/Sidebar'
import { fetchDispatchSessions } from './api'

export const SessionContext = createContext(null)

export function useSessionContext() {
  return useContext(SessionContext)
}

export default function App() {
  const [sessions, setSessions] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location])

  useEffect(() => {
    fetchDispatchSessions()
      .then(data => setSessions(data))
      .catch(err => console.warn('[App] fetchDispatchSessions failed:', err))
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
        <TopBar />
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
        <Sidebar open={sidebarOpen} />
        <main className="ml-0 md:ml-[200px] pt-12 p-6 min-h-screen">
          <Outlet />
        </main>
      </div>
    </SessionContext.Provider>
  )
}
