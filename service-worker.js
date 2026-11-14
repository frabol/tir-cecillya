const CACHE_NAME = "tir-cecillya-v1.0.5";

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
  "./icon-192.png",
  "./icon-512.png",
  "./logo-maubeuge.png"
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

// Activation
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

// Fetch : on ne cache QUE nos propres fichiers.
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Meme origine seulement : ni Supabase, ni les CDN.
  if (url.origin !== self.location.origin) return;

  // Le classeur Excel se recharge toujours depuis le reseau.
  if (url.pathname.endsWith(".xlsx")) return;

  event.respondWith(
    fetch(req)
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      })
      .catch(() => caches.match(req))
  );
});
