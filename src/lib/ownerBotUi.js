// 選擇器只在重新讀取的 promise 成功（最新資料已寫進 state）後才顯示成功。
export const OWNER_SAVED_REREAD_FAILED = '已儲存，但重新讀取失敗。請按重新讀取。'
export const OWNER_REREAD_FAILED = '重新讀取失敗，請稍後再試。'

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
