const CACHE_VERSION = 'creeda-v2026-03-31-1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith('creeda-') && name !== STATIC_CACHE && name !== PAGE_CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
            const clone = response.clone();
            event.waitUntil(caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone)));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          return cachedPage || caches.match('/offline');
        })
    );
    return;
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|webp|svg|woff2?|ttf|ico)$/) || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone)));
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
  }
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'Time to log your wellness!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/athlete/checkin' },
    actions: [
      { action: 'log', title: 'Log Now' },
      { action: 'dismiss', title: 'Later' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Creeda', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
