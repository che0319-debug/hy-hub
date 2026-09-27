import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authHeaders, expireSession } from '../auth'
import AIWorkPilot from './AIWorkPilot'
import AIWorkV3 from './AIWorkV3'
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
export default function AIWorkEntry() {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    function load() {
      fetch(`${API_BASE}/api/ai-work-v3/availability`, { headers: authHeaders(), cache: 'no-store' })
        .then(async response => {
          if (response.status === 401) { if (active) expireSession(); return null }
          if (!response.ok) throw new Error('無法確認 AI Work 版本，請重新整理')
          return response.json()
        }).then(result => { if (active && result) { setState(result); setError('') } })
        .catch(reason => { if (active) setError(reason.message) })
    }
    load(); window.addEventListener('focus', load)
    return () => { active = false; window.removeEventListener('focus', load) }
  }, [])
  if (error) return <p role="alert" className="p-6">{error}</p>
  if (!state) return <p role="status" className="p-6">確認 AI Work 版本…</p>
  if (state.active) return <AIWorkV3 />
  return <div className="h-full overflow-auto p-4 md:p-6">
    {state.ready && <p className="mb-4 rounded-lg bg-blue-50 p-3"><Link to="/ai-work-v3-ready">V3 已就緒，進行正式切換檢查</Link></p>}
    <AIWorkPilot />
  </div>
}
