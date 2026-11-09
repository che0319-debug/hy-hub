import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { fetchLifeGoals, submitHumanGoals, submitWeeklyGoalsControl } from '../api'
import { validateGoals } from './model.mjs'
import { createGoalsStore } from './store.mjs'

export const lifeGoalsStore = createGoalsStore(async () => {
  let document
  try { document = await fetchLifeGoals() } catch { throw new Error('七維資料暫時讀取失敗，請稍後重試。') }
  return validateGoals(document)
})
export function useLifeGoals() {
  const snapshot = useSyncExternalStore(lifeGoalsStore.subscribe, lifeGoalsStore.getSnapshot)
  useEffect(() => { lifeGoalsStore.ensure() }, [])
  return { ...snapshot, refresh: lifeGoalsStore.refresh }
}
export function useHumanGoalsMutation(submitter = submitHumanGoals) {
  const pending = useRef(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const run = async operations => {
    if (saving) return null
    const signature = JSON.stringify(operations)
    if (pending.current && pending.current.signature !== signature) {
      setError('上一筆儲存結果尚未確認，請先重試原內容。'); return null
    }
    pending.current ||= { signature, requestId: crypto.randomUUID(), operations }
    setSaving(true); setError('')
    try {
      const result = await submitter(pending.current.requestId, pending.current.operations)
      pending.current = null
      await lifeGoalsStore.refresh({ force: true })
      return result
    } catch (e) { if (e.definitive) pending.current = null; setError((e.definitive ? '尚未儲存。' : '儲存未確認，請重試。') + (e.message || '')); return null }
    finally { setSaving(false) }
  }
  return { run, saving, error, unconfirmed: !!pending.current }
}
export function useWeeklyGoalsControl() { return useHumanGoalsMutation(submitWeeklyGoalsControl) }
