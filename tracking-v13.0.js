(() => {
  "use strict";

  const VERSION = "13.0";
  let watchId = null;
  let accuracyCircle = null;
  let headingMarker = null;
  let lastPosition = null;
  let lastHeading = null;
  let compassHeading = null;
  let followMap = true;
  let statusNode = null;
  let statusText = null;
  let stopButton = null;
  let initialized = false;
  let compassListening = false;
  let lastCompassPaint = 0;

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
      .mycomy-heading-icon {
        width: 42px;
        height: 42px;
        pointer-events: none;
      }
      .mycomy-heading-arrow {
        display: grid;
        place-items: start center;
        width: 42px;
        height: 42px;
        color: #2b6de0;
        font-size: 20px;
        line-height: 18px;
        transform-origin: 21px 21px;
        text-shadow:
          -1px -1px 0 #fff,
           1px -1px 0 #fff,
          -1px  1px 0 #fff,
           1px  1px 0 #fff,
           0 2px 5px rgba(0,0,0,.28);
        transition: transform .18s linear;
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

  function normalizeHeading(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return ((number % 360) + 360) % 360;
  }

  function cardinalDirection(heading) {
    const labels = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
    return labels[Math.round(heading / 45) % 8];
  }

  function distanceMetres(a, b) {
    const toRad = value => value * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function bearingBetween(a, b) {
    const toRad = value => value * Math.PI / 180;
    const toDeg = value => value * 180 / Math.PI;
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const dLng = toRad(b.lng - a.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return normalizeHeading(toDeg(Math.atan2(y, x)));
  }

  function headingText() {
    if (!Number.isFinite(lastHeading)) return "";
    return ` · ${cardinalDirection(lastHeading)} ${Math.round(lastHeading)}°`;
  }

  function trackingStatusText() {
    const mode = followMap ? "Suivi GPS actif" : "GPS actif · carte libre";
    const accuracy = lastPosition?.accuracy > 0 ? ` · ±${Math.round(lastPosition.accuracy)} m` : "";
    return `${mode}${headingText()}${accuracy}`;
  }

  function ensureHeadingMarker(latLng) {
    if (typeof map === "undefined" || !map || typeof L === "undefined") return null;
    if (headingMarker) {
      headingMarker.setLatLng(latLng);
      return headingMarker;
    }
    const icon = L.divIcon({
      className: "mycomy-heading-icon",
      html: '<div class="mycomy-heading-arrow" aria-hidden="true">▲</div>',
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });
    headingMarker = L.marker(latLng, { icon, interactive: false, keyboard: false, zIndexOffset: 900 }).addTo(map);
    return headingMarker;
  }

  function renderHeading(lat, lng, heading) {
    if (!Number.isFinite(heading)) {
      if (headingMarker) {
        headingMarker.remove();
        headingMarker = null;
      }
      return;
    }
    const marker = ensureHeadingMarker([lat, lng]);
    const element = marker?.getElement?.();
    const arrow = element?.querySelector?.(".mycomy-heading-arrow");
    if (arrow) arrow.style.transform = `rotate(${heading}deg)`;
  }

  function updateUserMarker(lat, lng, accuracy, heading) {
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

    renderHeading(lat, lng, heading);

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

  function onCompass(event) {
    const now = Date.now();
    if (now - lastCompassPaint < 180) return;

    let heading = normalizeHeading(event.webkitCompassHeading);
    if (heading === null && event.absolute === true && Number.isFinite(Number(event.alpha))) {
      heading = normalizeHeading(360 - Number(event.alpha));
    }
    if (heading === null) return;

    compassHeading = heading;
    lastHeading = heading;
    lastCompassPaint = now;

    if (lastPosition) {
      renderHeading(lastPosition.lat, lastPosition.lng, lastHeading);
      if (watchId !== null) setStatus(trackingStatusText(), "active");
    }
  }

  async function startCompass() {
    if (compassListening || typeof DeviceOrientationEvent === "undefined") return;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== "granted") return;
      }
      window.addEventListener("deviceorientation", onCompass, true);
      compassListening = true;
    } catch {
      // Le cap GPS reste disponible en mouvement si la boussole est refusée.
    }
  }

  function stopCompass() {
    if (!compassListening) return;
    window.removeEventListener("deviceorientation", onCompass, true);
    compassListening = false;
    compassHeading = null;
  }

  function onPosition(position) {
    const lat = Number(position.coords.latitude);
    const lng = Number(position.coords.longitude);
    const accuracy = Number(position.coords.accuracy || 0);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const previous = lastPosition;
    const firstFix = !previous;
    const next = { lat, lng, accuracy, timestamp: position.timestamp || Date.now() };

    let heading = normalizeHeading(compassHeading);
    if (heading === null) heading = normalizeHeading(position.coords.heading);
    if (heading === null && previous && distanceMetres(previous, next) >= 4) {
      heading = bearingBetween(previous, next);
    }
    if (heading !== null) lastHeading = heading;

    lastPosition = next;

    if (typeof pendingPosition !== "undefined") pendingPosition = { lat, lng };
    const spotLocation = document.querySelector("#spotLocation");
    const dialog = document.querySelector("#spotDialog");
    if (spotLocation && dialog?.open) {
      spotLocation.textContent = `Position GPS : ${lat.toFixed(5)}, ${lng.toFixed(5)}${headingText()} · ±${Math.round(accuracy)} m`;
    }

    updateUserMarker(lat, lng, accuracy, lastHeading);
    if (followMap) centerOnLastPosition({ initial: firstFix });

    setStatus(trackingStatusText(), "active");
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

  async function startTracking() {
    if (!navigator.geolocation) {
      setStatus("Suivi GPS non pris en charge", "error");
      return;
    }

    startCompass();

    if (watchId !== null) {
      followMap = true;
      centerOnLastPosition();
      setStatus(trackingStatusText(), "active");
      return;
    }

    followMap = true;
    lastPosition = null;
    lastHeading = null;
    setStatus("Activation du suivi GPS et de la direction…", "active");
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
    stopCompass();
    if (accuracyCircle) {
      accuracyCircle.remove();
      accuracyCircle = null;
    }
    if (headingMarker) {
      headingMarker.remove();
      headingMarker = null;
    }
    lastHeading = null;
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
        spotLocation.textContent = `Position GPS : ${lastPosition.lat.toFixed(5)}, ${lastPosition.lng.toFixed(5)}${headingText()} · ±${Math.round(lastPosition.accuracy || 0)} m`;
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
      setStatus(trackingStatusText(), "active");
    });

    window.addEventListener("pagehide", () => {
      if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
      stopCompass();
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
    recenter: () => centerOnLastPosition(),
    heading: () => lastHeading
  };
})();
