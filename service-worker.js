const CACHE_NAME = 'estimator-v3';

// We will cache index.html, icons and also cache the external CDN resources so the app works offline.
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// URLs containing these strings will be cached dynamically once requested
const dynamicCacheUrls = [
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unpkg.com/lucide'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            // CDNs often return 'opaque' responses (status 0) when requested without CORS headers.
            if(!response || (response.status !== 200 && response.type !== 'opaque')) {
              return response;
            }

            // Check if it's an external library we want to cache (Tailwind, Fonts, Icons)
            const url = event.request.url;
            const shouldCacheDynamically = dynamicCacheUrls.some(cacheStr => url.includes(cacheStr));

            if (shouldCacheDynamically) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          }
        ).catch(() => {
          // If fetch fails and nothing is in cache (e.g. completely offline and navigating to a new page)
          // We can return offline fallback if we wanted.
          console.warn("Network request failed and not in cache: ", event.request.url);
        });
      })
  );
});
