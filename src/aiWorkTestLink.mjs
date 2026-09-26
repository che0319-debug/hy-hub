// Separate Test origin, no production bearer token or URL credentials.
export function isolatedTestUrl(value, productionOrigin) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.origin === productionOrigin ||
        url.username || url.password || url.search || url.hash ||
        url.pathname !== '/ai-work-test') return null
    return url.href
  } catch { return null }
}
