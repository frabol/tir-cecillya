self.addEventListener("install", () => {
  console.log("Tir Cécillya installé");
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
