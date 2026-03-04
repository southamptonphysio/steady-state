const CACHE_NAME = "steadystate-v1";

// Resources to cache on install
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  // Google Fonts
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,700&display=swap"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache local resources; fonts may fail in dev — that's fine
      return cache.addAll(PRECACHE_URLS).catch(() => {
        return cache.addAll(["/", "/index.html", "/manifest.json"]);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // For navigation requests: serve index.html (SPA routing)
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // For Google Fonts and static assets: cache-first
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
      )
    );
    return;
  }

  // For local assets: cache-first, falling back to network
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok && event.request.method === "GET") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
    )
  );
});
