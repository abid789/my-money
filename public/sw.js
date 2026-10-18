// My Money — Production PWA Service Worker with Auto-Update Support
const APP_VERSION = 'v3.3.0';
const CACHE_NAME = `my-money-shell-${APP_VERSION}`;

const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// 1. Install: Pre-cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS);
    }).then(() => {
      // Allow new service worker to take over immediately when requested
      return self.skipWaiting();
    })
  );
});

// 2. Activate: Clear out old version caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('my-money-') && key !== CACHE_NAME) {
            console.log('[SW] Invaliding old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Message handler: Allow frontend to command instant skipWaiting for 1-click update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. Fetch: Safe caching strategy with strict API/Database bypass
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Never intercept non-GET requests (POST, PUT, DELETE, PATCH)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // STRICT CONSTRAINT: Never cache API requests, Supabase database, or Auth endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.includes('/auth/')
  ) {
    return; // Pass through to network directly
  }

  // Navigation requests (HTML pages): NETWORK FIRST with cache fallback
  // This guarantees online users immediately get the newest HTML containing new asset hashes!
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Static assets (hashed js, css, icons, fonts): Cache-first with network fallback
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
        return cachedResponse;
      });
    })
  );
});
