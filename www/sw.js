// Caches only the app shell (HTML/CSS/JS/icons). Translation and dictionary
// lookups always go to the network — there is no offline word data.
const CACHE = "polylex-shell-v1";
const SHELL = [
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only handle same-origin app-shell requests; let API calls pass straight through.
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
