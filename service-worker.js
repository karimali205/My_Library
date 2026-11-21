const CACHE_NAME = 'my-library-cache-v2.0.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './css/main.css',
  './css/themes.css',
  './css/bookshelf.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/db.js',
  './js/data/library-books.js',
  './js/i18n.js',
  './js/themes.js',
  './js/models.js',
  './js/views/home.js',
  './js/views/library.js',
  './js/views/book-details.js',
  './js/views/book-form.js',
  './js/views/smart-add.js',
  './js/views/authors.js',
  './js/views/series.js',
  './js/views/collections.js',
  './js/views/loans.js',
  './js/views/wishlist.js',
  './js/views/map.js',
  './js/views/stats.js',
  './js/views/inventory.js',
  './js/views/settings.js',
  './js/utils/spine-generator.js',
  './js/utils/image-compressor.js',
  './js/utils/cover-fetcher.js',
  './js/utils/barcode.js',
  './js/utils/qrcode.js',
  './js/utils/csv-excel.js',
  './js/utils/github-sync.js',
  './js/utils/print.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch for each to prevent failing entirely if a dynamic file is added
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => {
          return cache.add(url).catch((err) => {
            console.warn('SW cache failed for:', url, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-first for external APIs (Google Books, Open Library, GitHub API)
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for all local assets so code updates appear immediately
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
