// Service worker minimo: l'app resta apribile senza rete con l'ultima pagina vista.
// Rete per prima per le pagine (dati sempre freschi), cache solo come ripiego; asset statici dalla cache.
const PAGES = "pagine-v1";
const STATIC = "statici-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Asset con hash nel nome: immutabili
  if (url.origin === location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Pagine (non richieste RSC, non API): rete, con ultima copia come ripiego
  if (request.mode === "navigate" && url.origin === location.origin && !url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match("/")) ?? Response.error()),
    );
  }
});
