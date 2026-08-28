const CACHE = "mycomy-v12-4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=12.4",
  "./compat-v12.4.js?v=12.4",
  "./app.js?v=12.4",
  "./weather-v12.4.js?v=12.4",
  "./manifest.webmanifest?v=12.4"
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

function safariSafeWeatherRequest(request) {
  const url = new URL(request.url);
  const forecastDays = Number(url.searchParams.get("forecast_days") || 0);
  if (url.searchParams.get("models") === "meteofrance_seamless" && forecastDays > 4) {
    url.searchParams.delete("models");
  }
  url.searchParams.set("mycomy_sw", `12.4-${Date.now()}`);
  return fetch(url.toString(), { cache: "no-store" });
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const path = url.pathname;

  if (url.hostname === "api.open-meteo.com") {
    event.respondWith(safariSafeWeatherRequest(event.request));
    return;
  }

  // Les ressources externes ne sont pas mises en cache par MycoMy.
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put("./index.html", copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (/\/(?:bdforet|hydro|observations|context)[^/]*\.json$/.test(path)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
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
