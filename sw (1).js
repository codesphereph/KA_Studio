/* King Arthur Studio and the AI Booth — service worker
 *
 * Deliberately minimal, and deliberately NETWORK-FIRST.
 *
 * A booth is updated between events, and every customer is a first-time
 * visitor on their own phone. Aggressive caching would buy almost nothing and
 * would risk the worst possible failure: a phone quietly serving last month's
 * page. So the network always wins when it can, and the cache exists only to
 * keep the booth alive through a few seconds of bad venue wifi.
 *
 * Bump CACHE whenever you publish; old caches are deleted on activate.
 */
const CACHE = 'ka-booth-v17';
const SHELL = ['./index.html', './download.html', './manifest.json',
               './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // Take over straight away rather than waiting for every tab to close.
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // never touch the API
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // fonts, Drive, Apps Script

  e.respondWith(
    fetch(req)
      .then(res => {
        // Keep a fresh copy for the next bad-wifi moment.
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
