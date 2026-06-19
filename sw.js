// Service worker : cache l'app pour un affichage instantané (stale-while-revalidate)
const CACHE = 'creche-v1';
const ASSETS = ['./', './index.html', './manifest.json', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // On ne met en cache que l'app elle-même ; les appels Supabase passent toujours par le réseau.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached);
      // Affiche le cache immédiatement, met à jour en arrière-plan
      return cached || network;
    })
  );
});
