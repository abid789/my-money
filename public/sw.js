// My Money — Lightweight Static Shell Service Worker
const CACHE_NAME = 'my-money-shell-v2';
const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install: Cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up previous caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Static asset caching with strict API bypass
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 1. Never intercept non-GET requests (mutations, uploads, etc.)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 2. CRITICAL CONSTRAINT: Never cache API endpoints, Supabase database, or Auth requests
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.includes('/auth/')
  ) {
    return; // Pass through to network directly
  }

  // 3. For navigation requests (SPA HTML), use network with fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 4. For static bundled assets (js, css, images, fonts), cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for assets
        return cachedResponse;
      });
    })
  );
});
