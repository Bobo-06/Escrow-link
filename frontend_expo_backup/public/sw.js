// ═══════════════════════════════════════════════════════════════════════
// SERVICE WORKER — SecureTrade PWA
// Provides: offline cache, background sync, push notifications
// ═══════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'securetrade-v2';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// ── INSTALL ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH STRATEGY ───────────────────────────────────────────────────────
// Network-first for API calls, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls — network first, fallback to offline indicator
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache successful GET responses
          if (request.method === 'GET' && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          new Response(
            JSON.stringify({
              error: 'OFFLINE',
              message: 'Huna mtandao. Muamala umehifadhiwa. / Offline. Transaction queued.',
              queued: true,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        )
    );
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return res;
          })
          .catch(() => caches.match(OFFLINE_URL))
    )
  );
});

// ── BACKGROUND SYNC ──────────────────────────────────────────────────────
// Retry queued transactions when connectivity is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncQueuedTransactions());
  }
});

async function syncQueuedTransactions() {
  const db = await openDB();
  const queued = await db.getAll('queue');
  for (const tx of queued) {
    try {
      const res = await fetch('/api/escrow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx.payload),
      });
      if (res.ok) {
        await db.delete('queue', tx.id);
        // Notify user
        self.registration.showNotification('SecureTrade ✓', {
          body: `Muamala wako umesindikwa! / Your transaction was processed: ${tx.payload.item}`,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          tag: 'tx-success',
          data: { txId: tx.id },
        });
      }
    } catch (e) {
      console.error('Sync failed for tx:', tx.id);
    }
  }
}

// ── PUSH NOTIFICATIONS ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'SecureTrade analeta ujumbe / SecureTrade has a message',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'securetrade',
    data: data.url ? { url: data.url } : {},
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.important || false,
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'SecureTrade', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});

// ── SIMPLE INDEXEDDB HELPER ──────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('securetrade-offline', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('queue', {
        keyPath: 'id',
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      db.getAll = (store) =>
        new Promise((res, rej) => {
          const tx = db.transaction(store, 'readonly');
          const req = tx.objectStore(store).getAll();
          req.onsuccess = () => res(req.result);
          req.onerror = rej;
        });
      db.delete = (store, id) =>
        new Promise((res, rej) => {
          const tx = db.transaction(store, 'readwrite');
          const req = tx.objectStore(store).delete(id);
          req.onsuccess = res;
          req.onerror = rej;
        });
      resolve(db);
    };
    req.onerror = reject;
  });
}
