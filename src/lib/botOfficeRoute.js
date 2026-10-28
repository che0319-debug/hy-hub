// Bot Office 只走新的 /api/office。這頁不能連帶打舊的 AI Office 或 runner 活動。
export function isBotOfficePath(pathname) {
  const path = String(pathname || '')
  return path === '/bot-office' || path.startsWith('/bot-office/')
}
