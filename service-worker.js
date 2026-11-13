const CACHE_NAME = "tir-cecillya-v2";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/main.js",
  "./js/storage.js",
  "./js/calendar.js",
  "./js/stats.js",
  "./js/ui.js",
  "./icon-192.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  console.log("Tir Cécillya installé et fichiers modulaires mis en cache");
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
