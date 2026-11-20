/* sw.js – offline support. Caches every game file on first visit,
   then serves from cache (cache-first). Bump VERSION after changing files. */
const VERSION = 'kidsquest-v3';
const FILES = [
  './', './index.html', './manifest.json', './css/style.css',
  './js/state.js', './js/audio.js', './js/effects.js', './js/mascot.js',
  './js/levels.js', './js/questions.js', './js/main.js',
  './icons/icon.svg', './icons/icon-maskable.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      // keep a copy of same-origin files for next time
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
