(() => {
  const replacements = [
    ["#weatherScore", "Hors ligne", "Indisponible"],
    ["#weatherDetails", "Les données météo seront actualisées à la prochaine connexion.", "Impossible d’actualiser les données météo pour le moment."],
    ["#growthSpecies", "Indisponible hors ligne", "Indisponible"],
    ["#growthExplanation", "L'indicateur sera recalculé à la prochaine connexion.", "L’indicateur sera recalculé dès que les données météo seront disponibles."],
    ["#growthScope", "Vue cartographique indisponible hors connexion", "Vue cartographique temporairement indisponible"]
  ];

  function clarifyWeatherError() {
    if (!navigator.onLine) return;
    for (const [selector, offlineText, onlineText] of replacements) {
      const element = document.querySelector(selector);
      if (element?.textContent.trim() === offlineText) element.textContent = onlineText;
    }
    const bestDays = document.querySelector("#bestDays");
    if (bestDays?.textContent.trim() === "Prévisions indisponibles hors connexion.") {
      bestDays.innerHTML = "<p class='muted'>Prévisions météo temporairement indisponibles.</p>";
    }
  }

  const observer = new MutationObserver(clarifyWeatherError);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  clarifyWeatherError();

  window.addEventListener("online", () => {
    clarifyWeatherError();
    if (typeof window.loadWeather === "function") window.loadWeather();
  });
})();
