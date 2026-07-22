// Service worker : cache l'app pour un affichage instantané (et hors-ligne)
const CACHE = 'creche-v4';
const ASSETS = ['./', './index.html', './manifest.json', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Chaque ressource est mise en cache indépendamment : un 404 sur une icône
    // ne doit PAS faire échouer toute l'installation (sinon plus rien n'est caché).
    await Promise.all(ASSETS.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // On ne gère que l'app elle-même ; les appels Supabase passent toujours par le réseau.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Chargement de la page (navigation) : on sert le HTML EN CACHE d'abord → jamais d'écran
  // blanc bloqué, même sur connexion très lente. Mise à jour en arrière-plan.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache  = await caches.open(CACHE);
      const cached = (await cache.match('./index.html')) || (await cache.match('./'));
      if (cached) {
        fetch(req).then(r => { if (r && r.status === 200) cache.put('./index.html', r.clone()); }).catch(() => {});
        return cached;
      }
      // Pas encore en cache (tout premier lancement) : réseau, puis on met en cache
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200) cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return new Response('Hors-ligne — relance l\'app une fois connecté.', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // Autres ressources de l'app : cache d'abord, mise à jour en arrière-plan
  e.respondWith((async () => {
    const cache  = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then(r => {
      if (r && r.status === 200) cache.put(req, r.clone());
      return r;
    }).catch(() => cached);
    return cached || network;
  })());
});
