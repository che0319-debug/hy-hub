// 整個 App 共用一份 Inbox 資料：底部導覽的數字、Inbox 頁、Life 島頂部都讀這裡，數字一定一致，也不重複打 API。
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useWorldInfo } from '../life-island/useWorldInfo'
import { useBotRoster } from '../life-island/useBotRoster'
import { buildInbox, inboxCounts } from './inboxData.js'

const Ctx = createContext(null)
export const useInbox = () => useContext(Ctx)

export function InboxProvider({ children }) {
  const info = useWorldInfo()
  const roster = useBotRoster(info)
  const items = useMemo(() => buildInbox({
    decisions: roster.office?.decisions || [], projects: roster.office?.projects || [],
    bots: roster.bots || {}, todos: info.list, sched: info.sched, today: info.today,
  }), [roster.office, roster.bots, info.list, info.sched, info.today])
  const counts = useMemo(() => inboxCounts(items), [items])
  const loaded = roster.loaded
  return <Ctx.Provider value={{ info, roster, items, counts, loaded, officeFailed: roster.loaded && !roster.office && !roster.officeEmpty }}>{children}</Ctx.Provider>
}
