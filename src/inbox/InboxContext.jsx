// 整個 App 共用一份 Inbox 資料：底部導覽的數字、Inbox 頁、Life 島頂部都讀這裡，數字一定一致，也不重複打 API。
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useWorldInfo } from '../life-island/useWorldInfo'
import { useBotRoster } from '../life-island/useBotRoster'
import { loadOfficeActions } from '../lib/officeActions'
import { buildInbox, inboxCounts } from './inboxData.js'

const Ctx = createContext(null)
export const useInbox = () => useContext(Ctx)

export function InboxProvider({ children }) {
  const info = useWorldInfo()
  const roster = useBotRoster(info)
  const [actions, setActions] = useState(undefined)   // undefined 載入中；null 讀取失敗
  useEffect(() => {
    let alive = true
    const load = () => loadOfficeActions().then(a => alive && setActions(a)).catch(() => alive && setActions(prev => prev || null))
    load()
    const t = setInterval(load, 30000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  const items = useMemo(() => buildInbox({
    decisions: roster.office?.decisions || [], projects: roster.office?.projects || [], actions: actions || [],
    bots: roster.bots || {}, todos: info.list, sched: info.sched, today: info.today,
  }), [roster.office, roster.bots, actions, info.list, info.sched, info.today])
  const counts = useMemo(() => inboxCounts(items), [items])
  const loaded = roster.loaded && actions !== undefined
  return <Ctx.Provider value={{ info, roster, items, counts, loaded, reloadOffice: roster.reloadOffice, actionsFailed: actions === null, officeFailed: roster.loaded && !roster.office && !roster.officeEmpty }}>{children}</Ctx.Provider>
}
