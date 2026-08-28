(() => {
  const VERSION = "12.3";
  const nativeFetch = window.fetch.bind(window);

  function parisDate() {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
  }

  function hasDaily(dataset) {
    return Boolean(dataset?.daily?.time && Array.isArray(dataset.daily.time));
  }

  function mergeDailyHistory(meteoFrance, bestMatch, today) {
    if (!hasDaily(meteoFrance) || !hasDaily(bestMatch)) return bestMatch;
    const result = { ...bestMatch, daily: { ...bestMatch.daily } };
    const mfIndex = new Map(meteoFrance.daily.time.map((date, index) => [date, index]));
    const bestDates = bestMatch.daily.time;

    for (const [field, values] of Object.entries(bestMatch.daily)) {
      if (field === "time" || !Array.isArray(values)) continue;
      const mfValues = meteofranceDailyField(meteoFrance, field);
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

  function meteofranceDailyField(dataset, field) {
    return dataset?.daily?.[field];
  }

  function mergePayloads(meteoFrancePayload, bestMatchPayload) {
    const today = parisDate();
    const mfSets = Array.isArray(meteoFrancePayload) ? meteofrancePayloadSafe(meteoFrancePayload) : [meteofrancePayloadSafe(meteoFrancePayload)];
    const bestSets = Array.isArray(bestMatchPayload) ? bestMatchPayload : [bestMatchPayload];
    const merged = bestSets.map((bestSet, index) => mergeDailyHistory(mfSets[index], bestSet, today));
    return Array.isArray(bestMatchPayload) ? merged : merged[0];
  }

  function meteofrancePayloadSafe(payload) {
    return payload;
  }

  // Safari pouvait conserver la réponse Météo-France à horizon court dans un
  // ancien Service Worker. On intercepte ici la requête météo AVANT app.js :
  // historique = Météo-France, aujourd'hui + J+7 = Open-Meteo Best Match.
  window.fetch = async function mycoFetch(input, init) {
    let url;
    try {
      const raw = input instanceof Request ? input.url : String(input);
      url = new URL(raw, location.href);
    } catch {
      return nativeFetch(input, init);
    }

    if (url.hostname !== "api.open-meteo.com") return nativeFetch(input, init);

    url.searchParams.set("mycomy_cb", `${VERSION}-${Date.now()}`);
    const requestInit = { ...(init || {}), cache: "no-store" };
    const model = url.searchParams.get("models");
    const forecastDays = Number(url.searchParams.get("forecast_days") || 0);

    if (model === "meteofrance_seamless" && forecastDays > 4) {
      const mfUrl = new URL(url);
      mfUrl.searchParams.set("forecast_days", "4");
      const bestUrl = new URL(url);
      bestUrl.searchParams.delete("models");

      const [mfResult, bestResult] = await Promise.allSettled([
        nativeFetch(mfUrl.toString(), requestInit),
        nativeFetch(bestUrl.toString(), requestInit)
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

    return nativeFetch(url.toString(), requestInit);
  };

  // app.js v12.1 enregistrait encore sw.js?v=12.1. On redirige cet appel vers
  // un nom de fichier neuf afin que Safari ne puisse pas réutiliser l'ancien SW.
  if ("serviceWorker" in navigator) {
    const container = navigator.serviceWorker;
    const nativeRegister = container.register.bind(container);
    const registerV123 = (scriptURL, options = {}) => {
      const requested = String(scriptURL);
      const target = /(?:^|\/)sw\.js(?:\?|$)/.test(requested)
        ? `sw-v12.3.js?v=${VERSION}`
        : scriptURL;
      return nativeRegister(target, { ...options, updateViaCache: "none" });
    };

    try {
      Object.defineProperty(container, "register", {
        configurable: true,
        writable: true,
        value: registerV123
      });
    } catch {
      try { container.register = registerV123; } catch { /* Safari ancien : l'enregistrement anticipé ci-dessous suffit */ }
    }

    nativeRegister(`sw-v12.3.js?v=${VERSION}`, { updateViaCache: "none" })
      .then(registration => registration.update())
      .catch(() => { /* MycoMy reste utilisable sans mode hors-ligne */ });
  }
})();
