import { useEffect, useSyncExternalStore } from 'react'
import { loadControlCenter, summarizeControlCenter } from './aiWorkV5Data'

// 首頁 AI Work 統計：與 v5 控制中心共用同一套讀取與統計（aiWorkV5Data），口徑一致。
let snapshot = { summary: null, error: '', loaded: false }
let sequence = 0
const listeners = new Set()
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
const getSnapshot = () => snapshot
const emit = () => listeners.forEach(listener => listener())

export async function refreshAIWork() {
  const request = ++sequence
  try {
    const data = await loadControlCenter()
    if (request === sequence) snapshot = { summary: summarizeControlCenter(data), error: '', loaded: true }
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
    // 與控制中心相同的 60 秒輪詢（每次會打 2＋專案數 支 API）
    const timer = setInterval(onFocus, 60000)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [])
  return data
}
