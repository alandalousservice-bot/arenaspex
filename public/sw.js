/**
 * SPEX - Service Worker
 * يوفر تشغيل التطبيق كتطبيق ويب تقدمي (PWA) قابل للتثبيت مع تخزين مؤقت لواجهة التطبيق (App Shell)
 * لا يتم أبداً تخزين طلبات API (/api/*) مؤقتاً لضمان بيانات حية ومصادقة صحيحة دائماً.
 */

const CACHE_VERSION = 'spex-v1';
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

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('spex-') && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Never cache API calls (/api/*): always go to network so auth/session/data stay live.
// - Navigation requests: network-first, fallback to cached shell/offline page.
// - Other same-origin GET requests (JS/CSS/fonts/images): cache-first, falling back to network and updating cache.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept API requests
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation requests (loading the app / route changes)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match('/').then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Same-origin static assets: network-first with cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
