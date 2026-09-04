const CACHE_VERSION = 'human-health-v5';
const CORE = ['/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/offline.html'];

async function precacheApplicationShell() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(CORE);
  try {
    const response = await fetch('/', { cache: 'reload' });
    if (!response.ok) return;
    await cache.put('/', response.clone());
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map(match => new URL(match[1], self.location.origin))
      .filter(url => url.origin === self.location.origin)
      .map(url => `${url.pathname}${url.search}`);
    await Promise.allSettled([...new Set(assets)].map(asset => cache.add(asset)));
  } catch {
    // Core offline fallback remains available even if shell discovery fails.
  }
}

self.addEventListener('install', event => {
  event.waitUntil(precacheApplicationShell());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone())));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')) || (await caches.match('/offline.html')) || new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } })),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok && response.type === 'basic') event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone())));
          return response;
        })
        .catch(() => cached || new Response('', { status: 504, statusText: 'Offline' }));
      return cached || network;
    }),
  );
});
