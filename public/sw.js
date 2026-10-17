// Cache-first service worker. VERSION is replaced at build time with a hash of index.html.
const VERSION = '__BUILD_VERSION__'
const CACHE = `nb-${VERSION}`
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('nb-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(hit => hit || fetch(event.request)))
})
