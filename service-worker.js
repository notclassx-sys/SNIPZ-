
const CACHE_NAME = 'teams-pwa-v5';
const OFFLINE_URL = '/index.html';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA] Pre-caching critical assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA] Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First with Cache Fallback
self.addEventListener('fetch', (event) => {
  // We only care about GET requests for caching
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If it's a valid response, cache it
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try the cache
        return caches.match(event.request).then((response) => {
          if (response) return response;
          
          // If it's a navigation request and both network/cache fail, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          
          return null;
        });
      })
  );
});
