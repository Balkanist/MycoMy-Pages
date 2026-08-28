const CACHE = "mycomy-v12-2";
// Les gros fichiers géographiques ne sont plus préchargés : sur iPhone, deux
// téléchargements concurrents de la zone Bruebach pouvaient saturer Safari.
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=12.2",
  "./app.js?v=12.2",
  "./weather-v12.2.js?v=12.2",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

function parisDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
}

function mergeDailyHistory(meteoFrance, bestMatch, today) {
  if (!meteoFrance?.daily?.time || !bestMatch?.daily?.time) return bestMatch;
  const result = { ...bestMatch, daily: { ...bestMatch.daily } };
  const mfIndex = new Map(meteoFrance.daily.time.map((date, index) => [date, index]));
  const bestDates = bestMatch.daily.time;

  for (const [field, values] of Object.entries(bestMatch.daily)) {
    if (field === "time" || !Array.isArray(values)) continue;
    const mfValues = meteoFrance.daily[field];
    if (!Array.isArray(mfValues)) continue;
    result.daily[field] = values.map((value, index) => {
      const date = bestDates[index];
      if (!date || date >= today) return value;
      const mfPosition = mfIndex.get(date);
      if (mfPosition === undefined) return value;
      const mfValue = mfValues[mfPosition];
      return mfValue == null ? value : mfValue;
    });
  }
  return result;
}

function mergeWeatherPayloads(meteoFrancePayload, bestMatchPayload) {
  const today = parisDate();
  const mfSets = Array.isArray(meteoFrancePayload) ? meteoFrancePayload : [meteoFrancePayload];
  const bestSets = Array.isArray(bestMatchPayload) ? bestMatchPayload : [bestMatchPayload];
  const merged = bestSets.map((bestSet, index) => mergeDailyHistory(mfSets[index], bestSet, today));
  return Array.isArray(bestMatchPayload) ? merged : merged[0];
}

async function fetchFresh(requestOrUrl) {
  return fetch(requestOrUrl, { cache: "no-store" });
}

async function fetchOpenMeteo(request) {
  const requestedUrl = new URL(request.url);
  const model = requestedUrl.searchParams.get("models");
  const forecastDays = Number(requestedUrl.searchParams.get("forecast_days") || 0);

  // Météo-France ne fournit pas les 7 jours demandés. Pour conserver son
  // historique tout en affichant J+1 à J+7, on fusionne :
  // - passé jusqu'à hier : Météo-France (requête limitée à 4 jours futurs),
  // - aujourd'hui et futur : Open-Meteo Best Match sur 7 jours.
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

    try {
      const [mfPayload, bestPayload] = await Promise.all([
        mfResult.value.json(),
        bestResponse.clone().json()
      ]);
      return new Response(JSON.stringify(mergeWeatherPayloads(mfPayload, bestPayload)), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    } catch {
      // Si la fusion échoue, Best Match reste une prévision complète sur 7 jours.
      return bestResponse;
    }
  }

  // Les données météo ne doivent jamais être servies depuis Cache Storage.
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
