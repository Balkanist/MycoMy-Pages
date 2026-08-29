const CACHE = "mycomy-v12-6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=12.6",
  "./app.js?v=12.6",
  "./runtime-v12.5.js?v=12.6",
  "./manifest.webmanifest?v=12.6"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("mycomy-") && key !== CACHE).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const path = url.pathname;

  // Données météo : toujours le réseau, sans modifier l'URL Open-Meteo.
  if (url.hostname === "api.open-meteo.com") {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  // Les autres ressources externes ne sont jamais gérées par le cache MycoMy.
  if (url.origin !== self.location.origin) return;

  // Les gros jeux de données et leurs blocs restent network-first. Ils ne sont
  // pas ajoutés au Cache Storage de Safari pour éviter les quotas/mises en mémoire.
  if (path.includes("/forest68/") || /\/(?:bdforet|hydro|observations|context)[^/]*\.json$/.test(path)) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  // Les navigations prennent toujours la version publiée en priorité.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put("./index.html", copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }))
  );
});

