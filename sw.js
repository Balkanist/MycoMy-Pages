const CACHE = "mycomy-v12-1";
// Les gros fichiers géographiques ne sont plus préchargés : sur iPhone, deux
// téléchargements concurrents de la zone Bruebach pouvaient saturer Safari.
const APP_SHELL = ["./", "./index.html", "./styles.css?v=12.1", "./app.js?v=12.1", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const path = new URL(event.request.url).pathname;
  if (/\/(?:bdforet|hydro|observations|context)[^/]*\.json$/.test(path)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
