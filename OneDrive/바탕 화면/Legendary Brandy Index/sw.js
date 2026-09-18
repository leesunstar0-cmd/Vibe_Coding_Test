/* Legendary Brandy Index - Service Worker
 * 정적 자산을 캐시해 오프라인에서도 앱이 실행되도록 함.
 * index.html을 수정할 때마다 CACHE 버전을 올리세요. */
const CACHE = 'brandy-index-v2';
const ASSETS = [
  './',
  './index.html',
  './landing.html',
  './contact.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // HTML은 네트워크 우선(최신 시세 반영), 실패 시 캐시
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 그 외 자산은 캐시 우선
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
      return res;
    }).catch(() => cached))
  );
});
