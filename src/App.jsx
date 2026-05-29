import { useState, useRef, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import TopBar from './layout/TopBar'
import Sidebar from './layout/Sidebar'
import { sessions as initialSessions } from './mock/data'

export const SessionContext = createContext(null)

export function useSessionContext() {
  return useContext(SessionContext)
}

export default function App() {
  const [sessions, setSessions] = useState([...initialSessions])
  const nextIdRef = useRef(Math.max(...initialSessions.map(s => s.id)) + 1)

  function addSession(sessionData) {
    const newSession = { id: nextIdRef.current++, ...sessionData }
    setSessions(prev => [...prev, newSession])
    console.log('[App] session added:', newSession)
  }

  function removeSession(milestoneId) {
    setSessions(prev => prev.filter(s => s._milestoneId !== milestoneId))
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
