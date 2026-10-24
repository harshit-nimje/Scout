/* cine offline shell. Bump CACHE_NAME when the shell asset list changes. */
const CACHE_NAME = 'cine-shell-v3';
const MODEL_CACHE = 'cine-models-v1';
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/sw.js',
  '/mood-worker.js',
  '/icons/cine.svg',
  '/models/all-MiniLM-L6-v2/README.md',
  '/models/all-MiniLM-L6-v2/onnx/README.md'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => (key.startsWith('cine-shell-') && key !== CACHE_NAME) ||
      (key.startsWith('cine-models-') && key !== MODEL_CACHE)).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Model assets are cache-first so a previously downloaded model can be used offline.
  if (url.origin === self.location.origin && url.pathname.startsWith('/models/')) {
    event.respondWith(caches.open(MODEL_CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        return new Response('', { status: 503, statusText: 'Model asset unavailable offline' });
      }
    }));
    return;
  }

  // Cache the Transformers.js module and its same-CDN dependencies after first online use.
  if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/npm/@xenova/transformers@2.17.1/')) {
    event.respondWith(caches.open(MODEL_CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type !== 'opaque') await cache.put(request, response.clone());
        return response;
      } catch (error) {
        return (await cache.match(request)) || new Response('', { status: 503, statusText: 'Transformers.js unavailable offline' });
      }
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('/index.html', response.clone()));
      return response;
    }).catch(async () => (await caches.match('/index.html')) || (await caches.match('/'))));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
