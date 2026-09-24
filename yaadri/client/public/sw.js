/* YAADRI service worker: caches the app shell + static assets so games keep working with poor connectivity.
   API calls are NEVER cached (private data). */
const CACHE = 'yaadri-shell-v1'
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/favicon.svg', '/manifest.webmanifest'])).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); return r }).catch(() => caches.match('/')))
    return
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok && (url.pathname.startsWith('/assets/') || url.pathname.match(/\.(svg|woff2?|png|webp)$/))) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
      return r
    })),
  )
})
