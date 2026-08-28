(() => {
  const VERSION = "12.4";
  const nativeFetch = window.fetch.bind(window);

  window.fetch = function mycoFetch(input, init) {
    let url;
    try {
      const raw = input instanceof Request ? input.url : String(input);
      url = new URL(raw, location.href);
    } catch {
      return nativeFetch(input, init);
    }

    if (url.hostname !== "api.open-meteo.com") {
      return nativeFetch(input, init);
    }

    // Le modèle Météo-France disponible via Open-Meteo ne couvre pas 7 jours.
    // Pour les appels qui demandent J+7, on utilise directement Best Match.
    // Cela évite toute fusion de réponses côté navigateur, plus fragile sur Safari.
    const forecastDays = Number(url.searchParams.get("forecast_days") || 0);
    if (url.searchParams.get("models") === "meteofrance_seamless" && forecastDays > 4) {
      url.searchParams.delete("models");
    }

    // URL unique + no-store : même un ancien Service Worker Safari ne peut pas
    // ressortir une réponse météo obsolète correspondant à cette requête.
    url.searchParams.set("mycomy_cb", `${VERSION}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    return nativeFetch(url.toString(), { ...(init || {}), cache: "no-store" });
  };
})();
