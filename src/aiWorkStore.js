import { useEffect, useSyncExternalStore } from 'react'
import { loadSummary } from './aiWorkV5Data'

// 首頁 AI Work 統計：後端 /summary 與 v5 控制中心同一套統計口徑（aiWorkV5Data.loadSummary）。
let snapshot = { summary: null, error: '', loaded: false }
let sequence = 0
const listeners = new Set()
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
const getSnapshot = () => snapshot
const emit = () => listeners.forEach(listener => listener())

export async function refreshAIWork() {
  const request = ++sequence
  try {
    const summary = await loadSummary()
    if (request === sequence) snapshot = { summary, error: '', loaded: true }
  } catch (error) {
    console.warn('[AIWork] 控制中心資料讀取失敗:', error)
    if (request === sequence) snapshot = { ...snapshot, error: error.message || 'AI Work 讀取失敗', loaded: true }
  }
  emit()
  return snapshot
}

export function useAIWork() {
  const data = useSyncExternalStore(subscribe, getSnapshot)
  useEffect(() => {
    refreshAIWork()
    const onFocus = () => { if (document.visibilityState === 'visible') refreshAIWork() }
    // 60 秒輪詢（每次 1 支 API）
    const timer = setInterval(onFocus, 60000)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [])
  return data
}
