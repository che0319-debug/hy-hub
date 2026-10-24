// 世界頂欄用的真實資料：待辦（逾期＋今天＋近 3 天）與今日行程。資料來源與首頁相同（fetchAllMilestones／fetchTodaySchedule）。
import { useEffect, useState } from 'react'
import { fetchAllMilestones, fetchTodaySchedule } from '../api'

const TZ_MS = 8 * 3600 * 1000
export const todayTaipei = () => new Date(Date.now() + TZ_MS).toISOString().slice(0, 10)
const nowHM = () => new Date(Date.now() + TZ_MS).toISOString().slice(11, 16)
const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const normDue = due => (due ? String(due).replace(/\//g, '-') : '')
export function formatDue(due) {
  const d = normDue(due); if (!d) return ''
  const [y, mo, dd] = d.split('-').map(Number)
  return `${d.slice(5)} (${['日', '一', '二', '三', '四', '五', '六'][new Date(y, mo - 1, dd).getDay()]})`
}

export function useWorldInfo() {
  const [todos, setTodos] = useState(null)      // null＝載入中，false＝讀取失敗
  const [events, setEvents] = useState(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    const load = () => {
      fetchAllMilestones().then(d => { if (alive) setTodos(Array.isArray(d) ? d : false) }).catch(() => { if (alive) setTodos(prev => prev || false) })
      fetchTodaySchedule().then(d => { if (alive) setEvents(d && !d.error && Array.isArray(d.events) ? d.events : false) }).catch(() => { if (alive) setEvents(prev => prev || false) })
    }
    load()
    const every = setInterval(load, 5 * 60 * 1000), tick = setInterval(() => setTick(t => t + 1), 30 * 1000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis); window.addEventListener('focus', onVis)
    return () => { alive = false; clearInterval(every); clearInterval(tick); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [])

  const today = todayTaipei(), limit = addDays(today, 3)
  const list = Array.isArray(todos) ? todos.filter(m => { const d = normDue(m.due); return d && d <= limit }).sort((a, b) => normDue(a.due).localeCompare(normDue(b.due))) : null
  const overdue = list ? list.filter(m => normDue(m.due) < today).length : null
  const todayCount = list ? list.filter(m => normDue(m.due) === today).length : null
  const sched = Array.isArray(events) ? [...events].sort((a, b) => (a.start || '').localeCompare(b.start || '')) : null
  const hm = nowHM()
  const next = sched ? sched.find(e => e.start && e.start >= hm) || null : null
  return { today, list, overdue, todayCount, sched, next, hm, todoFailed: todos === false, schedFailed: events === false }
}
