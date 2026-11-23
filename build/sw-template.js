// 서비스 워커 — 빌드할 때 자동으로 만들어집니다(build/sw-plugin.ts). 직접 고치지 마세요.
// VERSION은 파일 내용의 해시라서, 앱을 고쳐서 배포하면 자동으로 바뀝니다.
const VERSION = '__VERSION__';
const CACHE = 'workout-log-' + VERSION;
const ASSETS = __ASSETS__;

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

// 앱 파일은 캐시에서 바로 꺼내요(버전마다 통째로 교체되므로 섞이지 않아요).
// 캐시에 없는 같은 출처 요청만 네트워크로 가요.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html', { cacheName: CACHE }).then((hit) => hit || caches.match('./', { cacheName: CACHE })).then((hit) => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true, cacheName: CACHE }).then((hit) => hit || fetch(req)));
});

// 페이지가 "지금 내가 쓰는 파일이 이 버전에 들어 있나?"를 물어봐요(새 버전 안내 여부 판단).
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'has-asset' && e.ports[0]) {
    const path = './' + new URL(d.url).pathname.split('/').slice(-2).join('/');
    e.ports[0].postMessage({ version: VERSION, has: ASSETS.includes(path) });
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => (list.length ? list[0].focus() : self.clients.openWindow('./'))));
});
