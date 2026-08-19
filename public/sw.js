/**
 * SPEX - Service Worker (PART C - C2)
 * CACHE_VERSION 'spex-v2': تنقلات وأصول شبكة-أولاً مع رجوع تخزيني؛
 * قراءات GET /api/** بتخزين آخر رد ناجح في API_CACHE (واحذف set-cookie)؛
 * /api/auth/** بلا تخزين إطلاقاً؛ ولا تلمس طلبات POST/DELETE.
 */

const CACHE_VERSION = 'spex-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
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

// Activate: clean up old cache versions (keep current version only)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('spex-') && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - POST/DELETE: لا تلمسها إطلاقاً (تمر مباشرة للشبكة)
// - /api/auth/**: بلا تخزين إطلاقاً (دائماً شبكة)
// - GET /api/**: network-first مع تخزين آخر رد ناجح في API_CACHE (واحذف set-cookie)
// - Navigation: network-first مع رجوع للكاش
// - Static assets: network-first مع رجوع تخزيني (cache fallback)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // لا تلمس طلبات POST/DELETE إطلاقاً
  if (request.method !== 'GET') {
    return;
  }

  // /api/auth/** بلا تخزين إطلاقاً
  if (url.pathname.startsWith('/api/auth/')) {
    // allow network only, no cache
    return;
  }

  // GET /api/** بتخزين آخر رد ناجح في API_CACHE (واحذف set-cookie)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          // خزّن فقط الردود الناجحة (200-299)
          if (response && response.ok) {
            try {
              const clone = response.clone();
              // احذف set-cookie من الرد قبل التخزين حتى لا يُسرب كوكيز httpOnly إلى الكاش
              const headers = new Headers(clone.headers);
              headers.delete('set-cookie');
              // لا يمكن تعديل headers لاستجابة موجودة مباشرة، فننشئ استجابة جديدة بنفس الجسم
              const body = await clone.blob();
              const sanitizedResponse = new Response(body, {
                status: clone.status,
                statusText: clone.statusText,
                headers
              });
              const cache = await caches.open(API_CACHE);
              await cache.put(request, sanitizedResponse);
            } catch (e) {
              // تجاهل فشل التخزين
            }
          }
          return response;
        } catch (err) {
          // عند انقطاع الشبكة، أرجع آخر رد مخزّن إن وجد
          const cached = await caches.match(request);
          if (cached) return cached;
          throw err;
        }
      })()
    );
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
