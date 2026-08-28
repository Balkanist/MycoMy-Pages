const CACHE = "mycomy-v12-3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=12.3",
  "./compat-v12.3.js?v=12.3",
  "./app.js?v=12.3",
  "./weather-v12.2.js?v=12.3",
  "./manifest.webmanifest?v=12.3"
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

function parisDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
}

function hasDaily(dataset) {
  return Boolean(dataset?.daily?.time && Array.isArray(dataset.daily.time));
}

function mergeDailyHistory(mfData, bestData, today) {
  if (!hasDaily(mfData) || !hasDaily(bestData)) return bestData;
  const result = { ...bestData, daily: { ...bestData.daily } };
  const mfIndex = new Map(mfData.daily.time.map((date, index) => [date, index]));

  for (const [field, values] of Object.entries(bestData.daily)) {
    if (field === "time" || !Array.isArray(values)) continue;
    const mfValues = mfData.daily?.[field];
    if (!Array.isArray(mfValues)) continue;
    result.daily[field] = values.map((value, index) => {
      const date = bestData.daily.time[index];
      if (!date || date >= today) return value;
      const mfPosition = mfIndex.get(date);
      if (mfPosition === undefined) return value;
      const mfValue = mfValues[mfPosition];
      return mfValue == null ? value : mfValue;
    });
  }
  return result;
}

function mergePayloads(mfPayload, bestPayload) {
  const today = parisDate();
  const mfSets = Array.isArray(mfPayload) ? mfPayload : [mfPayload];
  const bestSets = Array.isArray(bestPayload) ? bestPayload : [bestPayload];
  const merged = bestSets.map((bestData, index) => mergeDailyHistory(mfSets[index], bestData, today));
  return Array.isArray(bestPayload) ? merged : merged[0];
}

async function fetchFresh(requestOrUrl) {
  return fetch(requestOrUrl, { cache: "no-store" });
}

async function fetchOpenMeteo(request) {
  const requestedUrl = new URL(request.url);
  const model = requestedUrl.searchParams.get("models");
  const forecastDays = Number(requestedUrl.searchParams.get("forecast_days") || 0);

  if (model === "meteofrance_seamless" && forecastDays > 4) {
    const mfUrl = new URL(requestedUrl);
    mfUrl.searchParams.set("forecast_days", "4");
    const bestUrl = new URL(requestedUrl);
    bestUrl.searchParams.delete("models");

    const [mfResult, bestResult] = await Promise.allSettled([
      fetchFresh(mfUrl.toString()),
      fetchFresh(bestUrl.toString())
    ]);

    if (bestResult.status !== "fulfilled") throw bestResult.reason;
    const bestResponse = bestResult.value;
    if (!bestResponse.ok) return bestResponse;
    if (mfResult.status !== "fulfilled" || !mfResult.value.ok) return bestResponse;

    const fallback = bestResponse.clone();
    try {
      const [mfPayload, bestPayload] = await Promise.all([
        mfResult.value.json(),
        bestResponse.json()
      ]);
      return new Response(JSON.stringify(mergePayloads(mfPayload, bestPayload)), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    } catch {
      return fallback;
    }
  }

  return fetchFresh(request);
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const path = url.pathname;

  if (url.hostname === "api.open-meteo.com") {
    event.respondWith(fetchOpenMeteo(event.request));
    return;
  }

  // Ne jamais mettre en cache les autres services externes (tuiles OSM,
  // Leaflet CDN, IGN, iNaturalist, etc.).
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
