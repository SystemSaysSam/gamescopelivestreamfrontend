/**
 * GameScope Live — Web Push Service Worker
 * Handles background Push API events from Google FCM / Mozilla Autopush / Apple Web Push
 * Displays native OS notifications even when the browser tab is completely closed.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[ServiceWorker] Activated and claimed clients.');
    })
  );
});

// Native Push Event from Push Service
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push event received:', event);

  let data = {
    title: 'GameScope Live — GTA VI Stream Alert',
    body: 'Live broadcast update from GameScope Live.',
    icon: '/assets/gta6poster.jpg',
    badge: '/favicon.svg',
    tag: `gamescope-${Date.now()}`,
    url: '/',
    type: 'important'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/assets/gta6poster.jpg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || `gamescope-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    timestamp: Date.now(),
    data: {
      url: data.url || '/',
      tag: data.tag,
      type: data.type
    },
    actions: [
      { action: 'watch', title: 'Watch Livestream' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions).catch((err) => {
      console.warn('[ServiceWorker] showNotification failed with options, attempting minimal fallback:', err);
      return self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/favicon.svg',
        tag: `fallback-${Date.now()}`
      });
    })
  );
});

// Click Handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && client.url !== new URL(targetUrl, self.location.origin).href) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
