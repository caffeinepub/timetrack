// Minimal service worker — enables PWA installation without offline caching
// No fetch handler = all requests go to network normally

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
