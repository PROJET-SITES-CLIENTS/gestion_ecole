/* ====================================================================
   SERVICE WORKER v2 — Résilience hors-ligne + cache intelligent
   Stratégies:
   - CACHE-FIRST : ressources statiques (logo, CSS, JS, fonts)
   - STALE-WHILE-REVALIDATE : coquille HTML (/) servie du cache si
     le réseau échoue → l'utilisateur voit l'interface au lieu d'une
     page d'erreur
   - NETWORK-FIRST : routes API (données fraîches prioritaires)
   - JAMAIS de cache pour /login (gestion de session)
   ==================================================================== */

const CACHE_STATIQUE = 'sg-static-v2';
const CACHE_COQUILLE = 'sg-shell-v2';
const PRECACHE = ['/logo.svg', '/manifest.webmanifest'];

const MOTIF_STATIQUE = /\.(css|js|woff2?|ttf|svg|png|jpg|ico|map)$/i;
const MOTIF_API = /^\/api\//;
const MOTIF_LOGIN = /^\/login/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIQUE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cles) =>
      Promise.all(
        cles.filter((c) => c !== CACHE_STATIQUE && c !== CACHE_COQUILLE).map((c) => caches.delete(c)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  const url = new URL(requete.url);

  if (requete.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (MOTIF_LOGIN.test(url.pathname)) return;

  // 1. Ressources statiques → CACHE-FIRST
  if (MOTIF_STATIQUE.test(url.pathname) || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(requete).then((enCache) =>
        enCache ||
        fetch(requete).then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE_STATIQUE).then((cache) => cache.put(requete, copie)).catch(() => {});
          return reponse;
        }),
      ),
    );
    return;
  }

  // 2. Routes API → NETWORK-FIRST (repli cache si hors-ligne)
  if (MOTIF_API.test(url.pathname)) {
    event.respondWith(
      fetch(requete).catch(() =>
        caches.match(requete).then(
          (enCache) =>
            enCache ||
            new Response(JSON.stringify({ ok: false, error: 'Hors ligne' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }),
        ),
      ),
    );
    return;
  }

  // 3. Navigation HTML → réseau d'abord, CACHE en dernier recours
  if (requete.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE_COQUILLE).then((cache) => cache.put('/', copie)).catch(() => {});
          return reponse;
        })
        .catch(() =>
          caches.match('/').then((enCache) => {
            if (enCache) return enCache;
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="8"><title>Reconnexion…</title></head><body style="font-family:system-ui;padding:40px;text-align:center;color:#333"><h2 style="color:#1E40AF">Reconnexion…</h2><p>Le serveur est momentanément injoignable. Nouvelle tentative automatique.</p></body></html>',
              { status: 200, headers: { 'Content-Type': 'text/html' } },
            );
          }),
        ),
    );
    return;
  }
});
