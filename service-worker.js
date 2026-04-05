const CACHE_NAME = 'estimator-v5';

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
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Always attempt a network fetch to get the freshest data
      const networkFetch = fetch(event.request).then(response => {
        // Ensure the response is valid before caching
        if (response && (response.status === 200 || response.type === 'opaque')) {
          const url = event.request.url;
          const isAppResource = url.startsWith(self.location.origin);
          const isDynamicCache = dynamicCacheUrls.some(cacheStr => url.includes(cacheStr));

          // If it's one of our app files or an allowed CDN file, cache it silently
          if (isAppResource || isDynamicCache) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
        }
        return response;
      }).catch(err => {
        console.warn('Network request failed, relying on cache.', event.request.url);
      });

      // 2. Keep the worker alive until the background fetch/cache update is complete
      if (cachedResponse) {
        event.waitUntil(networkFetch);
      }

      // 3. Instantly return the cached version if we have it, otherwise wait for the network
      return cachedResponse || networkFetch;
    })
  );
});
