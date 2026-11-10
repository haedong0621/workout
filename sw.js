// 서비스 워커: 오프라인에서도 앱이 열리게 파일을 저장해 둡니다.
// 앱 파일을 고쳐서 다시 올릴 때는 아래 VERSION 숫자를 올려 주세요.
const VERSION = 'v1.0.3';
const CACHE = 'workout-log-' + VERSION;
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/main.js', './js/util.js', './js/version.js', './js/viewport.js', './js/calc.js', './js/seed.js', './js/db.js', './js/timer.js',
  './js/router.js', './js/ui.js', './js/session.js', './js/picker.js',
  './js/views/home.js', './js/views/workout.js', './js/views/routine.js', './js/views/library.js',
  './js/views/history.js', './js/views/body.js', './js/views/settings.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('workout-log-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 캐시를 먼저 보여주고, 뒤에서 새 버전을 받아 두는 방식
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => (list.length ? list[0].focus() : self.clients.openWindow('./'))));
});
