const CACHE_VERSION = 'human-health-v9';
const CORE = ['/', '/health/', '/coach/', '/platform/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/offline.html'];

async function fetchRequired(asset) {
  const response = await fetch(asset, { cache: 'reload' });
  if (!response.ok) throw new Error(`Required offline asset failed: ${asset} (${response.status})`);
  return response;
}

async function precacheApplicationShell() {
  const cache = await caches.open(CACHE_VERSION);
  try {
    for (const asset of CORE) {
      const response = await fetchRequired(asset);
      await cache.put(asset, response.clone());
    }

    const rootResponse = await cache.match('/');
    if (!rootResponse) throw new Error('Required root shell was not cached.');
    const html = await rootResponse.text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map(match => new URL(match[1], self.location.origin))
      .filter(url => url.origin === self.location.origin)
      .map(url => `${url.pathname}${url.search}`)
      .filter(asset => !CORE.includes(asset));

    for (const asset of [...new Set(assets)]) {
      const response = await fetchRequired(asset);
      await cache.put(asset, response.clone());
    }
  } catch (error) {
    await caches.delete(CACHE_VERSION);
    throw error;
  }
}

async function verifyNewCacheBeforeActivation() {
  const cache = await caches.open(CACHE_VERSION);
  const missing = [];
  for (const asset of CORE) {
    if (!(await cache.match(asset))) missing.push(asset);
  }
  if (missing.length) throw new Error(`Refusing activation with incomplete offline shell: ${missing.join(', ')}`);
}

self.addEventListener('install', event => {
  // A rejected install leaves the currently active service worker and its known-good cache in place.
  // Do not call skipWaiting automatically: activation is only requested explicitly after a complete install.
  event.waitUntil(precacheApplicationShell());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await verifyNewCacheBeforeActivation();
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
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
          if (response.ok) caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone())).catch(() => {});
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(url.pathname)) || (await caches.match('/')) || (await caches.match('/offline.html')) || new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } })),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response.ok && response.type === 'basic') caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone())).catch(() => {});
          return response;
        })
        .catch(() => cached || new Response('', { status: 504, statusText: 'Offline' }));
      return cached || network;
    }),
  );
});
