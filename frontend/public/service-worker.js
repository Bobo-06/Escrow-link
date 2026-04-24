/* Biz-Salama Service Worker — enables PWA install on desktop Chrome + offline shell.
   Cache strategy: network-first for everything, fallback to cached shell when offline.
   Bump CACHE_VERSION to force clients to pick up a new build. */

const CACHE_VERSION = 'biz-salama-v3';
const SHELL = [
  '/',
  '/favicon.ico?v=2',
  '/logo192.png?v=2',
  '/logo512.png?v=2',
  '/manifest.json?v=2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle same-origin GET; never intercept API or POST requests.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        // Only cache successful basic responses
        if (fresh && fresh.status === 200 && fresh.type === 'basic') {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Fallback: serve cached shell for navigation requests so the app loads offline
        if (request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
