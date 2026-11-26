// Bump CACHE whenever you change any app file, so phones pick up the update.
const CACHE = 'shieldlite-v6';
const ASSETS = [
  './', 'index.html', 'styles.css', 'core.js', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Same-origin GETs: cache first, refresh in the background. Cross-origin API calls are never touched.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // versions.json changes daily: network first, cached copy only when offline.
  if (url.pathname.endsWith('/versions.json')) {
    e.respondWith(fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Pages opened with ?url=… (share sheet / Shortcut) use the cached app shell, and the shared
  // link is never written into the cache.
  const shared = req.mode === 'navigate' && url.search;
  e.respondWith(
    caches.match(shared ? new URL('./', self.location).href : req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok && !shared) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined));
      return hit || net;
    })
  );
});
