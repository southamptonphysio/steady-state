// Cache name is stamped with a build timestamp by the post-build script in package.json.
// This ensures a new cache name on every deploy, forcing old caches to be purged.
const CACHE_NAME = "steadystate-__BUILD_TIMESTAMP__";

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

// Allow the app (or DevTools) to trigger skip-waiting on demand.
// The install handler also calls skipWaiting() unconditionally so the SW
// activates immediately on first install; this message channel lets the
// app nudge a waiting SW in multi-tab scenarios too.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept Supabase API calls or any other cross-origin non-font request.
  // Letting the SW touch these causes "FetchEvent.respondWith: TypeError: Load failed"
  // because opaque cross-origin responses can't be safely cached or re-used.
  const isSameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!isSameOrigin && !isFont) return;

  // Navigation requests: serve index.html for SPA routing
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Google Fonts: cache-first
  if (isFont) {
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

  // Local app assets (JS, CSS, images, etc.): cache-first, falling back to network
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
