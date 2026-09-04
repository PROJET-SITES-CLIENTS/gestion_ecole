/* ====================================================================
   D4 — Service worker PWA (minimal et prudent)
   - Cache-FIRST : uniquement /logo.svg et /manifest.webmanifest
     (ressources statiques immuables de la coquille).
   - Network-FIRST pour tout le reste, AVEC repli hors ligne limité
     aux mêmes ressources statiques.
   - JAMAIS de cache pour le HTML ni les routes applicatives : les
     données scolaires doivent toujours venir du serveur (sessions,
     périmètres par école).
   ==================================================================== */

const CACHE = 'scolagestion-shell-v1';
const PRECACHE = ['/logo.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

/** Ressources autorisées en cache (liste blanche stricte). */
function estStatiqueAutorisee(url) {
  return url.origin === self.location.origin && (url.pathname === '/logo.svg' || url.pathname === '/manifest.webmanifest');
}

/** Jamais de navigation (HTML) en cache : toujours réseau. */
function estNavigation(requete) {
  return requete.mode === 'navigate';
}

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  const url = new URL(requete.url);

  if (requete.method !== 'GET') return;

  // Navigations (HTML) : réseau uniquement, pas de repli en cache.
  if (estNavigation(requete)) return;

  // Ressources de la liste blanche : cache d'abord, réseau en arrière-plan.
  if (estStatiqueAutorisee(url)) {
    event.respondWith(
      caches.match(requete).then((enCache) => {
        if (enCache) return enCache;
        return fetch(requete).then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie)).catch(() => {});
          return reponse;
        });
      }),
    );
    return;
  }

  // Tout le reste (même origine) : réseau d'abord, cache uniquement en
  // repli hors ligne — et seulement si l'entrée y figure déjà.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(requete)
        .then((reponse) => reponse)
        .catch(() => caches.match(requete).then((enCache) => enCache || Response.error())),
    );
  }
});
