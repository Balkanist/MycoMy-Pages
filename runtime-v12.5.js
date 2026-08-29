(() => {
  const VERSION = "12.6";
  const originalForestLoader = loadForestZones;

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function setWeatherUnavailable(error) {
    const online = navigator.onLine !== false;
    const score = document.querySelector("#weatherScore");
    const details = document.querySelector("#weatherDetails");
    const bestDays = document.querySelector("#bestDays");
    if (score) score.textContent = "Indisponible";
    if (details) details.textContent = online
      ? "Impossible d’actualiser la météo pour le moment."
      : "Connexion Internet indisponible.";
    if (bestDays) bestDays.innerHTML = `<p class="muted">${online ? "Prévisions météo temporairement indisponibles." : "Prévisions indisponibles hors connexion."}</p>`;
    const harvestStatus = document.querySelector("#harvestStatus");
    const harvestValue = document.querySelector("#harvestValue");
    const harvestBar = document.querySelector("#harvestBar");
    const harvestExplanation = document.querySelector("#harvestExplanation");
    const harvestBestDay = document.querySelector("#harvestBestDay");
    if (harvestStatus) harvestStatus.textContent = "Estimation indisponible";
    if (harvestValue) harvestValue.textContent = "—/100";
    if (harvestBar) harvestBar.style.width = "0%";
    if (harvestExplanation) harvestExplanation.textContent = "La maturité sera recalculée à la prochaine connexion.";
    if (harvestBestDay) harvestBestDay.textContent = "Aucun créneau calculable hors connexion";
    console.error("MycoMy weather", error);
  }

  renderBestDays = function renderBestDaysV126() {
    const container = document.querySelector("#bestDays");
    const intro = document.querySelector("#timingIntro");
    if (!container || !weatherNodes.length) return;

    const selected = species.find(item => item.id === selectedMapSpecies);
    if (!selected) return;
    const sample = visibleWeatherLocations(90);
    const days = [];

    for (let offset = 0; offset < 7; offset++) {
      try {
        const growth = forecastGrowthSummaryForView(selected, offset, sample);
        const day = harvestSummaryForView(selected, offset, sample);
        if (!day || !growth || typeof day.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) continue;
        if (!Number.isFinite(Number(day.score)) || !Number.isFinite(Number(growth.score))) continue;
        const parsed = new Date(`${day.date}T12:00:00`);
        if (Number.isNaN(parsed.getTime())) continue;
        days.push({
          ...day,
          parsed,
          score: Math.round(finite(day.score)),
          minScore: Math.round(finite(day.minScore, day.score)),
          maxScore: Math.round(finite(day.maxScore, day.score)),
          rain: finite(day.rain),
          balance: finite(day.balance),
          moisture: finite(day.moisture, centerWeatherModel?.moisture),
          soilTemperature: finite(day.soilTemperature, centerWeatherModel?.soilTemperature),
          growthScore: Math.round(finite(growth.score))
        });
      } catch (error) {
        console.warn(`MycoMy forecast J+${offset}`, error);
      }
    }

    if (!days.length) {
      container.innerHTML = "<p class='muted'>Prévisions météo temporairement indisponibles.</p>";
      return;
    }

    const bestScore = Math.max(...days.map(day => day.score));
    const current = days[0].score;
    if (intro) intro.textContent = `${selected.name} · ${viewExtentLabel(sample)}`;

    container.innerHTML = days.map((day, index) => {
      const previous = index ? days[index - 1].score : current;
      const delta = day.score - previous;
      const trend = delta >= 4 ? "↗" : delta <= -4 ? "↘" : "→";
      const title = `Récolte estimée ${day.score}/100 · pousse ${day.growthScore}/100 · pluie ${day.rain.toFixed(1)} mm · bilan ${day.balance >= 0 ? "+" : ""}${day.balance.toFixed(1)} mm · sol ${(day.moisture * 100).toFixed(0)} % et ${day.soilTemperature.toFixed(1)} °C`;
      const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day.parsed).replace(".", "");
      const dateLabel = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(day.parsed);
      return `
        <article class="forecast-day ${day.score === bestScore ? "best" : ""}" title="${title}" aria-label="${title}">
          <strong>${weekday}</strong>
          <span class="forecast-date">${dateLabel}</span>
          <span class="day-score">${day.score}</span>
          <span class="day-growth">Pousse ${day.growthScore}</span>
          <span class="day-trend" aria-hidden="true">${trend}</span>
        </article>`;
    }).join("");

    const today = days[0];
    const level = harvestLevel(today.score);
    const indicator = document.querySelector("#harvestIndicator");
    if (indicator) indicator.className = `harvest-indicator level-${level.css}`;
    document.querySelector("#harvestValue").textContent = `${today.score}/100`;
    document.querySelector("#harvestBar").style.width = `${today.score}%`;
    document.querySelector("#harvestStatus").textContent = level.label;
    document.querySelector("#harvestExplanation").textContent = `Taille intéressante estimée après environ ${today.minimumAge} à ${today.maximumAge} jours de développement pour ${selected.name}.`;
    const bestDay = days.reduce((best, day) => day.score > best.score ? day : best, days[0]);
    const bestLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(bestDay.parsed);
    document.querySelector("#harvestBestDay").textContent = bestDay.score === today.score
      ? `Meilleur créneau estimé : aujourd’hui (${today.score}/100)`
      : `Meilleur créneau estimé : ${bestLabel} (${bestDay.score}/100)`;
  };

  loadWeather = async function loadWeatherV125() {
    const loadToken = areaLoadToken;
    const requestedPoints = [...weatherPoints];
    if (!requestedPoints.length) return;

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: requestedPoints.map(point => point.lat).join(","),
      longitude: requestedPoints.map(point => point.lng).join(","),
      daily: "precipitation_sum,temperature_2m_mean,et0_fao_evapotranspiration",
      hourly: "soil_temperature_0cm,soil_moisture_0_to_7cm,relative_humidity_2m",
      past_days: "21",
      forecast_days: "7",
      timezone: "Europe/Paris"
    });

    try {
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
      const payload = await response.json();
      const datasets = Array.isArray(payload) ? payload : [payload];
      const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
      const models = datasets.map((data, index) => {
        if (!data?.daily?.time || !data?.hourly?.time || !requestedPoints[index]) return null;
        let historyDays = data.daily.time.indexOf(today);
        if (historyDays < 1) historyDays = Math.max(1, data.daily.time.length - 7);

        const rain = data.daily.precipitation_sum.slice(0, historyDays).reduce((sum, value) => sum + finite(value), 0);
        const et0 = data.daily.et0_fao_evapotranspiration.slice(0, historyDays).reduce((sum, value) => sum + finite(value), 0);
        const temperatures = data.daily.temperature_2m_mean.slice(0, historyDays).map(Number).filter(Number.isFinite);
        const mean = temperatures.length ? temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length : 0;
        const historicalHours = historyDays * 24;
        const moistureValues = (data.hourly.soil_moisture_0_to_7cm || []).slice(Math.max(0, historicalHours - 72), historicalHours).map(Number).filter(Number.isFinite);
        const soilTemperatures = (data.hourly.soil_temperature_0cm || []).slice(Math.max(0, historicalHours - 72), historicalHours).map(Number).filter(Number.isFinite);
        const moisture = moistureValues.length ? moistureValues.reduce((sum, value) => sum + value, 0) / moistureValues.length : 0;
        const soilTemperature = soilTemperatures.length ? soilTemperatures.reduce((sum, value) => sum + value, 0) / soilTemperatures.length : mean;
        const balance = rain - et0;
        const rainScore = Math.min(43, rain * 1.35);
        const balanceScore = Math.max(0, Math.min(20, 10 + balance * .7));
        const moistureScore = moisture >= .28 ? 22 : moisture >= .20 ? 16 : moisture >= .14 ? 9 : 3;
        const soilTemperatureScore = soilTemperature >= 8 && soilTemperature <= 20 ? 15 : soilTemperature >= 4 && soilTemperature <= 24 ? 9 : 3;

        return {
          ...requestedPoints[index],
          data,
          soilData: data,
          historyDays,
          rain,
          et0,
          balance,
          mean,
          moisture,
          soilTemperature,
          potential: Math.round(Math.min(100, rainScore + balanceScore + moistureScore + soilTemperatureScore))
        };
      }).filter(Boolean);

      if (!models.length) throw new Error("Open-Meteo returned no usable dataset");
      if (loadToken !== areaLoadToken) return;

      centerWeatherModel = models[0];
      weatherNodes = models;
      weatherSeries = centerWeatherModel.data.daily;
      weatherHistoryDays = centerWeatherModel.historyDays;
      weatherPotential = centerWeatherModel.potential;
      renderSpatialWeatherIndicators();
      if (forestFeatures.length) renderForestZones({ skipTerrainFetch: true });
    } catch (error) {
      if (loadToken !== areaLoadToken) return;
      centerWeatherModel = null;
      weatherNodes = [];
      setWeatherUnavailable(error);
    }
  };

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
    return response.json();
  }

  loadForestZones = async function loadForestZonesV125() {
    if (activeArea.id !== "bruebach") return originalForestLoader();

    const status = document.querySelector("#zoneStatus");
    const loadToken = areaLoadToken;
    const area = activeArea;
    try {
      if (status) status.textContent = "Chargement IGN BD Forêt V2 · index…";
      const [index, observations] = await Promise.all([
        fetchJson("./forest68/index.json"),
        fetchJson(`./${area.observationsFile}`).catch(() => null)
      ]);
      if (loadToken !== areaLoadToken) return;
      if (!Array.isArray(index?.chunks) || !index.chunks.length) throw new Error("Index forestier invalide");

      const features = [];
      let failedChunks = 0;
      for (let position = 0; position < index.chunks.length; position++) {
        if (loadToken !== areaLoadToken) return;
        const chunk = index.chunks[position];
        if (status) status.textContent = `Chargement IGN BD Forêt V2 · bloc ${position + 1}/${index.chunks.length}…`;
        try {
          const data = await fetchJson(`./forest68/${chunk.file}`);
          if (Array.isArray(data?.features)) features.push(...data.features);
        } catch (error) {
          failedChunks++;
          console.warn("MycoMy forest chunk", chunk.file, error);
        }
      }

      if (loadToken !== areaLoadToken) return;
      if (!features.length) throw new Error("Aucun bloc forestier chargé");

      observationModel = observations || { species: {} };
      rppProfiles = Array.isArray(index.rpp_profiles) ? index.rpp_profiles : [];
      forestMetadata = index.metadata || {};
      forestFeatures = features;
      indexContextFeatures(forestFeatures);
      loadHydrography();
      renderForestZones();
      renderBestDays();
      renderGrowthIndicator();

      if (failedChunks && status) {
        status.textContent = `${features.length}/${index.featureCount || features.length} mailles IGN · ${failedChunks} bloc${failedChunks > 1 ? "s" : ""} non chargé${failedChunks > 1 ? "s" : ""}`;
      }
    } catch (error) {
      console.error("MycoMy chunked forest", error);
      if (loadToken !== areaLoadToken) return;
      if (status) status.textContent = "Chargement IGN classique de secours…";
      return originalForestLoader();
    }
  };

  console.info(`MycoMy runtime ${VERSION} actif`);
})();

