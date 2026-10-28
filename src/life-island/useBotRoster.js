// 小人資料入口：「我的小幫手」分頁與 HY Life 島共用，不新增 endpoint。
// 來源：Bot Office（專案、決策）、首頁待辦（由外層的 useWorldInfo 傳入）、memory-health、AI Work runner 活動。
// 畫面只讀這裡整理好的格式，不直接打 API。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchMemoryHealth, fetchRunnerActivity } from '../api'
import { authHeaders } from '../auth'
import { loadBotOffice } from '../botOfficeData'
import { HELPERS } from '../botRoster'
import { deriveAtlas, deriveOffice, deriveRunners, deriveSummary, deriveTodos } from './worldData'
import { createLatestRead, readOfficeLatest } from '../lib/latestRead.js'

const EVERY = 60 * 1000

export function useBotRoster(info) {
  const [office, setOffice] = useState(null)      // mapOffice 的結果
  const [officeEmpty, setOfficeEmpty] = useState(false)   // Atlas 還沒產生第一份狀態：不是錯誤
  const [memory, setMemory] = useState(null)
  const [runners, setRunners] = useState(null)
  const [failed, setFailed] = useState({ office: false, memory: false, runners: false })
  const [done, setDone] = useState({ office: false, memory: false, runners: false })
  const reloadOfficeRef = useRef(() => Promise.resolve())

  useEffect(() => {
    let alive = true
    const mark = (k, bad) => { if (!alive) return; setFailed(f => (f[k] === bad ? f : { ...f, [k]: bad })); setDone(d => (d[k] ? d : { ...d, [k]: true })) }
    const reads = createLatestRead()
    // 輪詢自己吞掉拒絕，failed.office 的亮法不變。reloadOffice 失敗要 reject，選擇器才不會當成成功。
    // empty 已經寫進 state 就 resolve，不再往外丟。
    const loadOffice = () => readOfficeLatest(reads, {
      isActive: isCurrent => alive && isCurrent(),
      load: () => loadBotOffice({ headers: authHeaders() }),
      onApply(data) { setOffice(data); setOfficeEmpty(false); mark('office', false) },
      onEmpty() { setOffice(null); setOfficeEmpty(true); mark('office', false) },
      onFail() { mark('office', true) },
    })
    reloadOfficeRef.current = loadOffice
    const load = () => {
      loadOffice().catch(() => {})
      fetchMemoryHealth().then(d => { if (alive) { setMemory(d?.bots || null); mark('memory', false) } }).catch(() => mark('memory', true))
      fetchRunnerActivity().then(d => { if (alive) { setRunners(d); mark('runners', false) } }).catch(() => mark('runners', true))
    }
    load()
    const every = setInterval(load, EVERY)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis); window.addEventListener('focus', onVis)
    return () => { alive = false; reads.bump(); reloadOfficeRef.current = () => Promise.resolve(); clearInterval(every); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [])

  const reloadOffice = useCallback(() => reloadOfficeRef.current(), [])

  const off = useMemo(() => deriveOffice(office), [office])
  const todos = useMemo(() => deriveTodos(info?.list, info?.today), [info?.list, info?.today])
  const exec = useMemo(() => deriveRunners(runners), [runners])

  // 以小人 id 為 key。沒有資料的欄位是 null，由畫面顯示「—」。
  const bots = useMemo(() => {
    const out = { ...exec }
    const loadedAll = done.office || done.memory || done.runners
    out.atlas = deriveAtlas({ office, officeEmpty, failed, todoFailed: !!info?.todoFailed, unowned: off.unowned, loaded: loadedAll })
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
  }, [off, todos, memory, exec, office, officeEmpty, failed, done, info?.todoFailed])

  const loaded = done.office || done.memory || done.runners
  const failedCount = Object.values(failed).filter(Boolean).length + (info?.todoFailed ? 1 : 0)
  return { bots, loaded, office, officeEmpty, unowned: off.unowned, reloadOffice, ...deriveSummary({ pending: off.pending, failedCount, loaded }) }
}
