(() => {
  "use strict";

  const VERSION = "12.9";
  let watchId = null;
  let accuracyCircle = null;
  let lastPosition = null;
  let followMap = true;
  let statusNode = null;
  let statusText = null;
  let stopButton = null;
  let initialized = false;

  function injectStyles() {
    if (document.querySelector("#mycomyGpsStyles")) return;
    const style = document.createElement("style");
    style.id = "mycomyGpsStyles";
    style.textContent = `
      #locateButton.gps-tracking {
        position: relative;
        background: rgba(255,255,255,.28);
        box-shadow: 0 0 0 4px rgba(255,255,255,.10);
      }
      #locateButton.gps-tracking::after {
        content: "";
        position: absolute;
        right: 4px;
        bottom: 4px;
        width: 9px;
        height: 9px;
        background: #72d58a;
        border: 2px solid white;
        border-radius: 50%;
      }
      .gps-status {
        position: absolute;
        z-index: 710;
        top: 116px;
        left: 12px;
        display: none;
        align-items: center;
        gap: 7px;
        max-width: calc(100% - 24px);
        min-height: 34px;
        padding: 6px 8px 6px 10px;
        color: #173c2b;
        background: rgba(255,255,255,.94);
        border: 1px solid rgba(23,60,43,.18);
        border-radius: 999px;
        box-shadow: 0 4px 14px rgba(23,60,43,.18);
        font-size: .68rem;
        font-weight: 800;
        line-height: 1.2;
        pointer-events: auto;
      }
      .gps-status.visible { display: flex; }
      .gps-status .gps-dot {
        flex: 0 0 8px;
        width: 8px;
        height: 8px;
        background: #6f8b7b;
        border-radius: 50%;
      }
      .gps-status.active .gps-dot { background: #36a85c; }
      .gps-status.error .gps-dot { background: #c85a50; }
      .gps-status span:nth-child(2) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .gps-stop {
        flex: 0 0 auto;
        min-height: 28px;
        padding: 0 9px;
        color: #173c2b;
        background: #edf3e8;
        border: 0;
        border-radius: 999px;
        font: inherit;
      }
      body.map-expanded .gps-status {
        top: calc(116px + env(safe-area-inset-top));
      }
      @media (max-width: 520px) {
        .gps-status {
          right: 12px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureStatus() {
    if (statusNode) return statusNode;
    const stage = document.querySelector(".map-stage");
    if (!stage) return null;

    statusNode = document.createElement("div");
    statusNode.id = "gpsStatus";
    statusNode.className = "gps-status";
    statusNode.setAttribute("role", "status");
    statusNode.setAttribute("aria-live", "polite");

    const dot = document.createElement("span");
    dot.className = "gps-dot";
    dot.setAttribute("aria-hidden", "true");

    statusText = document.createElement("span");
    statusText.textContent = "GPS prêt";

    stopButton = document.createElement("button");
    stopButton.type = "button";
    stopButton.className = "gps-stop";
    stopButton.textContent = "Arrêter";
    stopButton.hidden = true;
    stopButton.addEventListener("click", event => {
      event.stopPropagation();
      stopTracking();
    });

    statusNode.append(dot, statusText, stopButton);
    stage.appendChild(statusNode);
    return statusNode;
  }

  function setStatus(text, state = "") {
    const node = ensureStatus();
    if (!node) return;
    node.className = `gps-status visible${state ? ` ${state}` : ""}`;
    if (statusText) statusText.textContent = text;
  }

  function setLocateButton(active) {
    const button = document.querySelector("#locateButton");
    if (!button) return;
    button.classList.toggle("gps-tracking", active);
    button.setAttribute("aria-label", active ? "Recentrer le suivi GPS sur ma position" : "Démarrer le suivi GPS en temps réel");
    button.title = active ? "Suivi GPS actif — toucher pour recentrer" : "Démarrer le suivi GPS";
  }

  function updateUserMarker(lat, lng, accuracy) {
    if (typeof map === "undefined" || !map || typeof L === "undefined") return;
    const latLng = [lat, lng];

    if (typeof userMarker !== "undefined" && userMarker) {
      userMarker.setLatLng(latLng);
      if (userMarker.setStyle) {
        userMarker.setStyle({ radius: 8, color: "#fff", weight: 3, fillColor: "#2b6de0", fillOpacity: 1 });
      }
    } else if (typeof userMarker !== "undefined") {
      userMarker = L.circleMarker(latLng, {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: "#2b6de0",
        fillOpacity: 1
      }).addTo(map);
    }

    const radius = Math.max(4, Math.min(Number(accuracy) || 0, 250));
    if (accuracyCircle) {
      accuracyCircle.setLatLng(latLng);
      accuracyCircle.setRadius(radius);
    } else {
      accuracyCircle = L.circle(latLng, {
        radius,
        color: "#2b6de0",
        weight: 1,
        opacity: .55,
        fillColor: "#2b6de0",
        fillOpacity: .10,
        interactive: false
      }).addTo(map);
    }
  }

  function centerOnLastPosition({ initial = false } = {}) {
    if (!lastPosition || typeof map === "undefined" || !map) return;
    followMap = true;
    const target = [lastPosition.lat, lastPosition.lng];
    if (initial && map.getZoom() < 15) map.setView(target, 15, { animate: true });
    else map.panTo(target, { animate: true, duration: .35 });
  }

  function onPosition(position) {
    const lat = Number(position.coords.latitude);
    const lng = Number(position.coords.longitude);
    const accuracy = Number(position.coords.accuracy || 0);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const firstFix = !lastPosition;
    lastPosition = { lat, lng, accuracy, timestamp: position.timestamp || Date.now() };

    if (typeof pendingPosition !== "undefined") pendingPosition = { lat, lng };
    const spotLocation = document.querySelector("#spotLocation");
    const dialog = document.querySelector("#spotDialog");
    if (spotLocation && dialog?.open) {
      spotLocation.textContent = `Position GPS : ${lat.toFixed(5)}, ${lng.toFixed(5)} · ±${Math.round(accuracy)} m`;
    }

    updateUserMarker(lat, lng, accuracy);
    if (followMap) centerOnLastPosition({ initial: firstFix });

    const accuracyText = accuracy > 0 ? ` · ±${Math.round(accuracy)} m` : "";
    setStatus(`${followMap ? "Suivi GPS actif" : "GPS actif · carte libre"}${accuracyText}`, "active");
    if (stopButton) stopButton.hidden = false;
    setLocateButton(true);
  }

  function onPositionError(error) {
    const messages = {
      1: "Localisation refusée dans Safari",
      2: "Position GPS indisponible",
      3: "Recherche GPS trop longue"
    };
    setStatus(messages[error?.code] || "Impossible d’obtenir la position", "error");
    if (stopButton) stopButton.hidden = watchId === null;
    if (error?.code === 1) stopTracking({ keepStatus: true });
  }

  function startTracking() {
    if (!navigator.geolocation) {
      setStatus("Suivi GPS non pris en charge", "error");
      return;
    }

    if (watchId !== null) {
      followMap = true;
      centerOnLastPosition();
      const accuracyText = lastPosition?.accuracy ? ` · ±${Math.round(lastPosition.accuracy)} m` : "";
      setStatus(`Suivi GPS actif${accuracyText}`, "active");
      return;
    }

    followMap = true;
    lastPosition = null;
    setStatus("Activation du suivi GPS…", "active");
    setLocateButton(true);
    if (stopButton) stopButton.hidden = false;

    watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000
    });
  }

  function stopTracking({ keepStatus = false } = {}) {
    if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    followMap = false;
    if (accuracyCircle) {
      accuracyCircle.remove();
      accuracyCircle = null;
    }
    setLocateButton(false);
    if (stopButton) stopButton.hidden = true;
    if (!keepStatus) setStatus("Suivi GPS arrêté");
  }

  function useGpsForObservation() {
    if (!lastPosition || watchId === null) return;
    setTimeout(() => {
      if (typeof pendingPosition !== "undefined") pendingPosition = { lat: lastPosition.lat, lng: lastPosition.lng };
      const spotLocation = document.querySelector("#spotLocation");
      const dialog = document.querySelector("#spotDialog");
      if (spotLocation && dialog?.open) {
        spotLocation.textContent = `Position GPS : ${lastPosition.lat.toFixed(5)}, ${lastPosition.lng.toFixed(5)} · ±${Math.round(lastPosition.accuracy || 0)} m`;
      }
    }, 0);
  }

  function init() {
    if (initialized) return;
    if (typeof map === "undefined" || !map) return;
    initialized = true;
    injectStyles();
    ensureStatus();

    const locateButton = document.querySelector("#locateButton");
    if (locateButton) {
      locateButton.setAttribute("aria-label", "Démarrer le suivi GPS en temps réel");
      locateButton.title = "Démarrer le suivi GPS";
      locateButton.addEventListener("click", () => startTracking());
    }

    const addSpotButton = document.querySelector("#addSpotButton");
    if (addSpotButton) addSpotButton.addEventListener("click", useGpsForObservation);

    map.on("dragstart", () => {
      if (watchId === null) return;
      followMap = false;
      const accuracyText = lastPosition?.accuracy ? ` · ±${Math.round(lastPosition.accuracy)} m` : "";
      setStatus(`GPS actif · carte libre${accuracyText}`, "active");
    });

    window.addEventListener("pagehide", () => {
      if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    }, { once: true });
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (typeof map !== "undefined" && map) {
      clearInterval(timer);
      setTimeout(init, 80);
    } else if (attempts > 120) {
      clearInterval(timer);
    }
  }, 100);

  window.MycoMyGpsTracking = {
    version: VERSION,
    start: startTracking,
    stop: stopTracking,
    recenter: () => centerOnLastPosition()
  };
})();
