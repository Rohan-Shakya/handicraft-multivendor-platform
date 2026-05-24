/**
 * Rugs Nepal — service worker.
 *
 * Strategy:
 *   - HTML navigations → network-first, fall back to runtime cache, then to /offline.
 *   - Same-origin static assets (JS, CSS, fonts, images) → stale-while-revalidate.
 *   - Cross-origin requests and API calls → bypass the SW entirely.
 *
 * Bump the version string whenever you change the SW logic or want to force
 * old caches to be evicted on the next visit.
 */

const VERSION = "rugsnepal-v2";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const PAGE_CACHE = `${VERSION}-pages`;

/** Pre-cached during install so the offline page is always available. */
const PRECACHE_URLS = ["/", "/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // `addAll` aborts on a single failure; precache items individually so
      // dev-mode 404s don't break installation.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {
            /* offline page may 404 in dev — non-fatal */
          })
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Claim all open clients so the new SW takes effect immediately.
      await self.clients.claim();
      // Drop caches from previous versions.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
    })()
  );
});

self.addEventListener("message", (event) => {
  // Allow the page to trigger an immediate activation after an update.
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle GETs from the same origin.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API calls or auth/Next.js internal endpoints — they need to
  // hit the network so 401/CSRF/etc. work correctly.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // HTML navigations: network-first, runtime-cache fallback, /offline as last resort.
  const isNavigation =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          // Only cache successful HTML responses.
          if (fresh.ok) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          if (offline) return offline;
          return new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        }
      })()
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      const networkPromise = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => undefined);

      // Return cached immediately if we have it; otherwise wait for the network.
      if (cached) {
        // Refresh in the background.
        networkPromise.catch(() => {});
        return cached;
      }
      const fresh = await networkPromise;
      if (fresh) return fresh;
      // Last-resort: try the cache one more time (rare race).
      const fallback = await cache.match(req);
      if (fallback) return fallback;
      return new Response("Network error", { status: 504 });
    })()
  );
});
