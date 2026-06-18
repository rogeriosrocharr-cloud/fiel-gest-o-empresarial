const CACHE_NAME = 'fiel-oficina-v4';

self.addEventListener('install', e => {
  /* Pre-cache apenas o app HTML (recursos CDN serão cacheados sob demanda) */
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.add('./')).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Supabase API: always network-first (never serve stale data) */
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  /* CDN assets: cache-first (they have version hashes) */
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return resp;
      }))
    );
    return;
  }

  /* App HTML: network-first with cache fallback */
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  /* Everything else: cache-first */
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
