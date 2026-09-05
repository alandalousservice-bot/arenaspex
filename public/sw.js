/**
 * SPEX - Service Worker (PART C - C2)
 * CACHE_VERSION 'spex-v2': تنقلات وأصول شبكة-أولاً مع رجوع تخزيني؛
 * لا تُخزَّن استجابات API المصادق عليها إطلاقاً؛ ولا تلمس طلبات POST/DELETE.
 */

const CACHE_VERSION = 'spex-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/offline.html'
];

// Install: pre-cache the minimal app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: remove the legacy authenticated API cache while preserving static assets.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => /^spex-.*-api$/.test(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - POST/DELETE: لا تلمسها إطلاقاً (تمر مباشرة للشبكة)
// - /api/**: بلا تخزين إطلاقاً (دائماً شبكة، حتى لا تختلط حسابات المصادقة)
// - Navigation: network-first مع رجوع للكاش
// - Static assets: network-first مع رجوع تخزيني (cache fallback)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // لا تلمس طلبات POST/DELETE إطلاقاً
  if (request.method !== 'GET') {
    return;
  }

  // كل API GET يمر عبر الشبكة فقط؛ التخزين الثابت منفصل أدناه.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation requests: network-first, fallback to cached shell/offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // خزّن نسخة للتنقلات في STATIC_CACHE للرجوع إليها عند الانقطاع
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match('/').then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Same-origin static assets: network-first with cache fallback (شبكة-أولاً مع رجوع تخزيني)
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
