(() => {
  const VERSION = "12.3";
  const nativeFetch = window.fetch.bind(window);

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

  // Safari pouvait conserver une réponse météo à horizon court dans un ancien
  // Service Worker. Cette interception s'installe AVANT app.js : historique
  // Météo-France, puis aujourd'hui + J+7 via Open-Meteo Best Match.
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
  // un fichier neuf afin que Safari soit obligé de remplacer l'ancien SW.
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
      try { container.register = registerV123; } catch { /* l'enregistrement anticipé ci-dessous reste suffisant */ }
    }

    nativeRegister(`sw-v12.3.js?v=${VERSION}`, { updateViaCache: "none" })
      .then(registration => registration.update())
      .catch(() => { /* MycoMy reste utilisable sans mode hors-ligne */ });
  }
})();
