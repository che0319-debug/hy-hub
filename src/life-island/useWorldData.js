// 3D 世界的資料入口：小人狀態、待你確認、系統。與首頁共用同一批 API（不新增 endpoint）。
// 待辦與行程在 useWorldInfo.js（同樣是首頁的來源）。畫面與場景只讀這裡整理好的格式，不直接打 API。
import { useEffect, useMemo, useState } from 'react'
import { fetchMobileState, fetchRunnerActivity } from '../api'
import { fetchDailyOS } from '../lifeOSApi'
import { useAIWork } from '../aiWorkStore'
import { deriveBots, deriveRunners, deriveSummary } from './worldData'

export function useWorldData() {
  const [mobile, setMobile] = useState(null)
  const [daily, setDaily] = useState(null)
  const [runners, setRunners] = useState(null)
  const [failed, setFailed] = useState({ mobile: false, daily: false, runners: false })
  const ai = useAIWork()

  useEffect(() => {
    let alive = true
    const mark = (k, v) => alive && setFailed(f => (f[k] === v ? f : { ...f, [k]: v }))
    const load = () => {
      fetchMobileState().then(d => { if (alive) { setMobile(d); mark('mobile', false) } }).catch(() => mark('mobile', true))
      fetchDailyOS().then(d => { if (alive) { setDaily(d); mark('daily', false) } }).catch(() => mark('daily', true))
      fetchRunnerActivity().then(d => { if (alive) { setRunners(d); mark('runners', false) } }).catch(() => mark('runners', true))
    }
    load()
    const every = setInterval(load, 60 * 1000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis); window.addEventListener('focus', onVis)
    return () => { alive = false; clearInterval(every); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [])

  const bots = useMemo(() => ({ ...deriveBots(mobile, daily), ...deriveRunners(runners) }), [mobile, daily, runners])
  const loaded = mobile !== null || daily !== null || runners !== null || failed.mobile || failed.daily || failed.runners || ai.loaded
  const summary = deriveSummary({ aiWork: ai.summary, aiWorkError: !!ai.error, mobileFailed: failed.mobile, dailyFailed: failed.daily, runnersFailed: failed.runners, loaded })
  return { bots, loaded, ...summary }
}
