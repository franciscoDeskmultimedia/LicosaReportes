// Licosa PWA Service Worker for Web Push Notifications & Offline Shell
const CACHE_NAME = 'licosa-v3';

// Install event: activate immediately without blocking on heavy network precaching
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      }),
      self.clients.claim(),
    ])
  );
});

// Passive fetch listener to satisfy Chromium PWA installability criteria
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API, Next.js server actions and static assets from interception
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('Sin conexión a internet.', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })
  );
});

// Listen for Web Push Notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'LICOSA - Notificación de Obra',
    body: 'Se ha registrado una nueva actividad en obra.',
    url: '/',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const title = data.title || 'LICOSA Obras';
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-monochrome.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Ver Reporte' },
      { action: 'close', title: 'Cerrar' },
    ],
    tag: data.tag || 'licosa-report-alert',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Handler: opens the target daily report or app view
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl !== '/') {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
