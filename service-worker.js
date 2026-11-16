const CACHE_NAME = "tir-cecillya-v1.0.10";

// Uniquement les fichiers du site. Ni Supabase, ni le CDN, ni le classeur Excel.
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/main.js",
  "./js/ui.js",
  "./js/calendar.js",
  "./js/storage.js",
  "./js/stats.js",
  "./js/timer.js",
  "./js/palmares.js",
  "./js/palmares-donnees.js",
  "./icon-192.png",
  "./icon-512.png",
  "./logo-maubeuge.png",
  "./logo-ligue-npdc.png"
];

// Installation
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        FILES_TO_CACHE.map(f =>
          cache.add(f).catch(() => console.warn("Non mis en cache :", f))
        )
      ))
  );
});

// Activation : on supprime TOUS les anciens caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Message envoye par la page quand l'utilisateur clique « Actualiser »
// sur la banniere de nouvelle version.
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch : le HTML/CSS/JS vient TOUJOURS du reseau (pas de cache navigateur),
// le cache ne sert que de secours hors-ligne.
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Meme origine seulement : ni Supabase, ni les CDN.
  if (url.origin !== self.location.origin) return;

  // Le classeur Excel se recharge toujours depuis le reseau.
  if (url.pathname.endsWith(".xlsx")) return;

  const estApp =
    url.pathname.endsWith("/") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js");

  if (estApp) {
    // Reseau d'abord, en ignorant le cache HTTP du navigateur.
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Images et le reste : cache d'abord, c'est plus rapide.
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(response => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
      }
      return response;
    }))
  );
});
