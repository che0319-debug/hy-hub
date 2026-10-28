// 整個 App 共用一份 Inbox 資料：底部導覽的數字、Inbox 頁、Life 島頂部都讀這裡，數字一定一致，也不重複打 API。
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useWorldInfo } from '../life-island/useWorldInfo'
import { useBotRoster } from '../life-island/useBotRoster'
import { isBotOfficePath } from '../lib/botOfficeRoute.js'
import { loadOfficeActions } from '../lib/officeActions'
import { buildInbox, inboxCounts } from './inboxData.js'

const Ctx = createContext(null)
export const useInbox = () => useContext(Ctx)

export function InboxProvider({ children }) {
  const info = useWorldInfo()
  // 外殼掛在每一頁。Bot Office 的版面契約是不打舊 AI Office／runner，所以這頁先停掉。
  // 離開這頁才讀。已經讀到的 actions 留著，底部數字不用清成空。
  const onBotOffice = isBotOfficePath(useLocation().pathname)
  const roster = useBotRoster(info, { runnerActivity: !onBotOffice })
  const [actions, setActions] = useState(undefined)   // undefined 載入中；null 讀取失敗
  useEffect(() => {
    if (onBotOffice) return undefined
    let alive = true
    const load = () => loadOfficeActions().then(a => alive && setActions(a)).catch(() => alive && setActions(prev => prev || null))
    load()
    const t = setInterval(load, 30000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [onBotOffice])
  const items = useMemo(() => buildInbox({
    decisions: roster.office?.decisions || [], projects: roster.office?.projects || [], actions: actions || [],
    bots: roster.bots || {}, todos: info.list, sched: info.sched, today: info.today,
  }), [roster.office, roster.bots, actions, info.list, info.sched, info.today])
  const counts = useMemo(() => inboxCounts(items), [items])
  const loaded = roster.loaded && actions !== undefined
  return <Ctx.Provider value={{ info, roster, items, counts, loaded, reloadOffice: roster.reloadOffice, actionsFailed: actions === null, officeFailed: roster.loaded && !roster.office && !roster.officeEmpty }}>{children}</Ctx.Provider>
}
