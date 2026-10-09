// 離線快取：只快取本 App 與共用樣式（同源），不攔截其他網域請求。
const CACHE = 'fitness-coach-v1'
const ASSETS = [
  './', 'index.html', 'app.js', 'fitness.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'lib/store.js', 'lib/inbody.js', 'lib/coach.js', 'lib/programs.js', 'lib/exercises.js',
  'inbody-template.csv', 'inbody-template.json', '../hy-ui/hy-ui.css',
]
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fitness-coach-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
// 網路優先、失敗用快取：上線後能拿到新版，離線時仍可開啟
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)) }
      return res
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  )
})
