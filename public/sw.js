const VERSION = 'v6';
const SHELL = [
  './',
  './index.html',
  './log.html',
  './charts.html',
  './unlock.html',
  './manifest.webmanifest',
  './assets/bus-right-512.png',
  './css/tokens.css',
  './css/base.css',
  './css/index.css',
  './css/log.css',
  './css/charts.css',
  './css/unlock.css',
  './js/config.js',
  './js/api.js',
  './js/weather.js',
  './js/time.js',
  './js/pwa.js',
  './js/icons.js',
  './js/pair.js',
  './js/openBoard.js',
  './js/reminder.js',
  './js/push.js',
  './js/index-page.js',
  './js/log-page.js',
  './js/charts-page.js',
  './js/unlock-page.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) {
        fetch(e.request).then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(e.request, res));
        }).catch(() => {});
        return hit;
      }
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  if (e.data) {
    try { data = e.data.json(); } catch { data = { body: e.data.text() }; }
  }
  const title = data.title || '通知';
  const opts = {
    body: data.body || ' ',
    tag: data.tag || 'commute',
    badge: 'icons/icon-180.png',
    icon: 'icons/icon-180.png',
    renotify: true,
    data: { url: data.url || './index.html' },
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const targetUrl = new URL(target, self.location.href).href;
    for (const client of all) {
      if (client.url === targetUrl) return client.focus();
    }
    for (const client of all) {
      if ('navigate' in client) {
        try {
          await client.navigate(targetUrl);
          return client.focus();
        } catch {
          // navigate can throw on cross-origin or detached frames; fall through.
        }
      }
    }
    return self.clients.openWindow(target);
  })());
});

self.addEventListener('pushsubscriptionchange', () => {
  // iOS rotates push endpoints periodically. Re-subscription happens on the
  // next board click (subscribeToPush() is idempotent via getSubscription()
  // upsert by endpoint), so no SW-side action needed.
});
