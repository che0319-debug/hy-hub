// 選擇器只在重新讀取的 promise 成功（最新資料已寫進 state）後才顯示成功。
export const OWNER_SAVED_REREAD_FAILED = '已儲存，但重新讀取失敗。請按重新讀取。'
export const OWNER_REREAD_FAILED = '重新讀取失敗，請稍後再試。'
export const OWNER_SHARED_ROSTER_STALE = '這一頁已更新。其他頁的專案名單稍後會自動再讀。'

// 這一頁的讀取已經落地之後，共用名單失敗不要再拒絕。
// 否則選擇器會把錯誤寫進已經離開清單的那一列，畫面上看不到。
export async function refreshAfterOwnerSave(reloadPage, reloadShared) {
  await reloadPage()
  if (typeof reloadShared !== 'function') return 'saved'
  try {
    await reloadShared()
    return 'saved'
  } catch {
    return 'shared-stale'
  }
}

export function ownerSavedNotice(label) {
  return `已把負責 Bot 設為 ${label}。`
}

export function feedbackAfterSave(ok, label) {
  if (ok) return { notice: ownerSavedNotice(label), error: '', kind: '', label }
  return { notice: '', error: OWNER_SAVED_REREAD_FAILED, kind: 'conflict', label }
}

export function feedbackAfterReread(ok, previous = {}) {
  if (ok) {
    return {
      notice: previous.label ? ownerSavedNotice(previous.label) : '',
      error: '',
      kind: '',
      label: previous.label || '',
    }
  }
  const saved = Boolean(previous.label) || String(previous.error || '').includes('已儲存')
  return {
    notice: '',
    error: saved ? OWNER_SAVED_REREAD_FAILED : OWNER_REREAD_FAILED,
    kind: 'conflict',
    label: previous.label || '',
  }
}
