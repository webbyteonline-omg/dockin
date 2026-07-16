/* Pulse service worker v3 — offline-first.
   Static: cache-first. API GET: network-first with 5-min TTL cache fallback.
   Mutations: queued to IndexedDB outbox by the app, replayed via Background
   Sync here. Push notifications + notification clicks handled at the bottom. */
const VERSION = "pulse-v5";
const STATIC_CACHE = `${VERSION}-static`;
const API_CACHE = `${VERSION}-api`;
const PAGE_CACHE = `${VERSION}-pages`;
const API_TTL_MS = 5 * 60 * 1000; // 5 minutes

const PRECACHE_URLS = ["/", "/offline", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

// Main app routes — precached opportunistically (on activate, not install)
// so a returning/logged-in user gets instant tab switches even before
// visiting each tab once. Each is fetched independently and failures are
// swallowed: an unauthenticated visitor would just get a redirect to
// /login, which we don't want polluting the page cache, and that must
// never block SW install/activate.
const PRECACHE_ROUTES = [
  "/",
  "/dashboard",
  "/attendance",
  "/academic",
  "/friends",
  "/groups",
  "/chats",
];

function precacheRoutes() {
  return caches.open(PAGE_CACHE).then((cache) =>
    Promise.all(
      PRECACHE_ROUTES.map((url) =>
        fetch(url, { redirect: "manual" })
          .then((res) => {
            // opaqueredirect (type) means it bounced to /login — skip it.
            if (res && res.ok && res.type !== "opaqueredirect") {
              return cache.put(url, res);
            }
          })
          .catch(() => undefined)
      )
    )
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => precacheRoutes())
  );
});

/* ---- fetch strategies ---- */
function staleHeaders(res, fetchedAt) {
  const headers = new Headers(res.headers);
  headers.set("x-pulse-fetched-at", String(fetchedAt));
  return res.arrayBuffer().then(
    (body) => new Response(body, { status: res.status, statusText: res.statusText, headers })
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Static assets: cache-first
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.json")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
    return;
  }

  // API GET (Supabase REST + internal): network-first, TTL-stamped cache fallback
  const isApi =
    url.pathname.startsWith("/rest/v1/") ||
    (url.origin === self.location.origin && url.pathname.startsWith("/api/"));
  if (isApi) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            const fetchedAt = Date.now();
            caches.open(API_CACHE).then(async (c) => {
              const stamped = await staleHeaders(copy, fetchedAt);
              c.put(request, stamped);
            });
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (!cached) return Response.error();
          // Serve stale regardless of TTL when offline; TTL governs freshness hints
          const fetchedAt = Number(cached.headers.get("x-pulse-fetched-at") || 0);
          const age = Date.now() - fetchedAt;
          const headers = new Headers(cached.headers);
          headers.set("x-pulse-stale", age > API_TTL_MS ? "1" : "0");
          const body = await cached.arrayBuffer();
          return new Response(body, { status: cached.status, statusText: cached.statusText, headers });
        })
    );
    return;
  }

  // Navigation: network-first → cache → /offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request)
            .then((cached) => cached || caches.match("/offline"))
            .then((res) => res || Response.error())
        )
    );
  }
});

/* ---- outbox replay (IndexedDB "pulse-outbox" / store "requests") ---- */
const DB_NAME = "pulse-outbox";
const STORE = "requests";

function openOutbox() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function replayOutbox() {
  const db = await openOutbox();
  const all = await new Promise((resolve, reject) => {
    const r = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  let synced = 0;
  for (const item of all) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body || undefined,
      });
      // Success, duplicate, or permanent client error → drop from queue
      if (res.ok || res.status === 409 || (res.status >= 400 && res.status < 500)) {
        db.transaction(STORE, "readwrite").objectStore(STORE).delete(item.id);
        if (res.ok) synced++;
      }
    } catch {
      break; // still offline — retry later, keep order
    }
  }
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((c) => c.postMessage({ type: "OUTBOX_REPLAYED", synced }));
}

self.addEventListener("sync", (event) => {
  if (event.tag === "pulse-outbox-sync") event.waitUntil(replayOutbox());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "REPLAY_OUTBOX") replayOutbox();
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

/* ---- push ---- */
self.addEventListener("push", (event) => {
  let payload = { title: "Pulse", body: "You have a new notification", url: "/dashboard" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url },
      tag: payload.tag || undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
