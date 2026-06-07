import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import TopBar from './layout/TopBar'
import Sidebar from './layout/Sidebar'
import { fetchDispatchSessions } from './api'

export const SessionContext = createContext(null)

export function useSessionContext() {
  return useContext(SessionContext)
}

export default function App() {
  const [sessions, setSessions] = useState([])

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

  return (
    <SessionContext.Provider value={{ sessions, addSession, removeSession }}>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <TopBar />
        <Sidebar />
        <main className="ml-[200px] pt-12 p-6 min-h-screen">
          <Outlet />
        </main>
      </div>
    </SessionContext.Provider>
  )
}
