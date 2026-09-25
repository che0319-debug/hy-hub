import { useEffect, useSyncExternalStore } from 'react'
import { fetchAIWorkPilot } from './lifeOSApi'

let snapshot = { projects: [], summary: null, migrationRequired: false, migrationCandidates: [], error: '', loaded: false }
let sequence = 0
const listeners = new Set()
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
const getSnapshot = () => snapshot

export async function refreshAIWork() {
  const request = ++sequence
  try {
    const data = await fetchAIWorkPilot()
    if (request === sequence) snapshot = { ...data, error: '', loaded: true }
  } catch (error) {
    if (request === sequence) snapshot = { ...snapshot, error: error.message || 'AI Work 讀取失敗' }
  }
  listeners.forEach(listener => listener())
  return snapshot
}

export function useAIWork() {
  const data = useSyncExternalStore(subscribe, getSnapshot)
  useEffect(() => {
    refreshAIWork()
    const onFocus = () => { if (document.visibilityState === 'visible') refreshAIWork() }
    const timer = setInterval(onFocus, 30000)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [])
  return data
}
