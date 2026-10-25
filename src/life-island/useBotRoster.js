// 小人資料入口：「我的小幫手」分頁與 HY Life 島共用，不新增 endpoint。
// 來源：Bot Office（專案、決策）、首頁待辦（由外層的 useWorldInfo 傳入）、memory-health、AI Work runner 活動。
// 畫面只讀這裡整理好的格式，不直接打 API。
import { useEffect, useMemo, useState } from 'react'
import { fetchMemoryHealth, fetchRunnerActivity } from '../api'
import { authHeaders } from '../auth'
import { loadBotOffice } from '../botOfficeData'
import { HELPERS } from '../botRoster'
import { deriveOffice, deriveRunners, deriveSummary, deriveTodos } from './worldData'

const EVERY = 60 * 1000

export function useBotRoster(info) {
  const [office, setOffice] = useState(null)      // mapOffice 的結果
  const [officeEmpty, setOfficeEmpty] = useState(false)   // Atlas 還沒產生第一份狀態：不是錯誤
  const [memory, setMemory] = useState(null)
  const [runners, setRunners] = useState(null)
  const [failed, setFailed] = useState({ office: false, memory: false, runners: false })
  const [done, setDone] = useState({ office: false, memory: false, runners: false })

  useEffect(() => {
    let alive = true
    const mark = (k, bad) => { if (!alive) return; setFailed(f => (f[k] === bad ? f : { ...f, [k]: bad })); setDone(d => (d[k] ? d : { ...d, [k]: true })) }
    const load = () => {
      loadBotOffice({ headers: authHeaders() })
        .then(d => { if (alive) { setOffice(d); setOfficeEmpty(false); mark('office', false) } })
        .catch(e => { if (e?.kind === 'empty') { if (alive) { setOffice(null); setOfficeEmpty(true) } mark('office', false) } else mark('office', true) })
      fetchMemoryHealth().then(d => { if (alive) { setMemory(d?.bots || null); mark('memory', false) } }).catch(() => mark('memory', true))
      fetchRunnerActivity().then(d => { if (alive) { setRunners(d); mark('runners', false) } }).catch(() => mark('runners', true))
    }
    load()
    const every = setInterval(load, EVERY)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis); window.addEventListener('focus', onVis)
    return () => { alive = false; clearInterval(every); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [])

  const off = useMemo(() => deriveOffice(office), [office])
  const todos = useMemo(() => deriveTodos(info?.list, info?.today), [info?.list, info?.today])
  const exec = useMemo(() => deriveRunners(runners), [runners])

  // 以小人 id 為 key。沒有資料的欄位是 null，由畫面顯示「—」。
  const bots = useMemo(() => {
    const out = { ...exec }
    for (const h of HELPERS) {
      const o = off.byAgent[h.agent]
      out[h.id] = {
        status: o?.status ?? 'wait',
        doing: o?.doing ?? null,
        office: o ? { asks: o.asks, ...o.counts } : null,
        todos: todos[h.agent] || null,
        memory: memory?.[h.agent] || null,
      }
    }
    return out
  }, [off, todos, memory, exec])

  const loaded = done.office || done.memory || done.runners
  const failedCount = Object.values(failed).filter(Boolean).length + (info?.todoFailed ? 1 : 0)
  return { bots, loaded, officeEmpty, unowned: off.unowned, ...deriveSummary({ pending: off.pending, failedCount, loaded }) }
}
