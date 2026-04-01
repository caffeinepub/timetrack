// Killer service worker — clears all caches and unregisters itself
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      // Tell all clients to reload
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_KILLED' });
        });
      });
    }).then(function() {
      // Unregister self after cleanup
      return self.registration.unregister();
    })
  );
});

// Pass through all fetches — no caching
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
