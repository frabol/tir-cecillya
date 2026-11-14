const CACHE_NAME = "tir-cecillya-v1.0.2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/main.js",
  "./js/ui.js",
  "./js/calendar.js",
  "./js/storage.js",
  "./js/stats.js"
];

// Installation
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

// Activation
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {

        const clone = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });

        return response;

      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
