const SEARCH_AREAS = {
  bruebach: {
    id: "bruebach", name: "Bruebach", lat: 47.7006, lng: 7.3606, radius: 40, zoom: 10,
    forestFile: "bdforet68.json?v=8", hydroFile: "hydro68.json?v=1", observationsFile: "observations68.json?v=2",
    contextFile: "context68.json?v=1"
  },
  porcelette: {
    id: "porcelette", name: "Porcelette", lat: 49.157222, lng: 6.656389, radius: 10, zoom: 12,
    forestFile: "bdforet57.json?v=2", hydroFile: "hydro57.json?v=1", observationsFile: "observations57.json?v=1"
  },
  chatel: {
    id: "chatel", name: "Châtel-Saint-Germain", lat: 49.1297, lng: 6.0642, radius: 10, zoom: 12,
    forestFile: "bdforet-chatel.json?v=1", hydroFile: "hydro-chatel.json?v=1", observationsFile: "observations-chatel.json?v=1"
  },
  hayange: {
    id: "hayange", name: "Hayange", lat: 49.3340, lng: 6.0641, radius: 10, zoom: 12,
    forestFile: "bdforet-hayange.json?v=1", hydroFile: "hydro-hayange.json?v=1", observationsFile: "observations-hayange.json?v=1"
  }
};
const STORAGE_KEY = "mycomy-spots-v1";
const LEGACY_STORAGE_KEY = "mycobruebach-spots-v1";
const FOREST_CACHE_KEY = "mycomy-forest-grid-40km-ign-v6";
const PREVIOUS_FOREST_CACHE_KEY = "mycomy-forest-grid-30km-ign-v3";
const LEGACY_FOREST_CACHE_KEY = "mycobruebach-forest-grid-v1";
const GRID_CELL = .003;
const FINE_ZOOM = 15;
const FINE_COLS = 3;
const FINE_ROWS = 4;
const CASCADE_SCORE_THRESHOLD = 60;
const CASCADE_BUFFER_KM = .28;
const CASCADE_OBSERVATION_RADIUS_KM = .45;
const ZONE_BANDS = [
  { min: 80, color: "#8b1e3f" },
  { min: 60, color: "#d1495b" },
  { min: 40, color: "#e9a23b" },
  { min: 20, color: "#a7bd58" },
  { min: 0, color: "#5f9f78" }
];
const TREE_LABELS = {
  abies_alba: "sapin blanc", picea_abies: "épicéa commun", fagus_sylvatica: "hêtre commun",
  quercus_petraea: "chêne sessile", quercus_robur: "chêne pédonculé", pinus_sylvestris: "pin sylvestre",
  castanea_sativa: "châtaignier", carpinus_betulus: "charme", fraxinus_excelsior: "frêne", populus_nigra: "peuplier noir"
};
const HOST_TREES = {
  "morille-commune": { fraxinus_excelsior: 1, populus_nigra: .75, quercus_robur: .25 },
  "morille-conique": { picea_abies: .7, abies_alba: .6, fraxinus_excelsior: .35 },
  "cepe-bordeaux": { fagus_sylvatica: 1, quercus_petraea: .9, quercus_robur: .85, picea_abies: .85, abies_alba: .8, pinus_sylvestris: .55 },
  "cepe-ete": { quercus_petraea: 1, quercus_robur: .95, fagus_sylvatica: .8, castanea_sativa: .7 },
  "cepe-pins": { pinus_sylvestris: 1, picea_abies: .25 },
  "cepe-bronze": { quercus_petraea: 1, quercus_robur: .95, castanea_sativa: .8, fagus_sylvatica: .45 },
  girolle: { fagus_sylvatica: 1, quercus_petraea: .85, quercus_robur: .8, picea_abies: .65, abies_alba: .55, pinus_sylvestris: .45 },
  trompette: { fagus_sylvatica: 1, quercus_petraea: .95, quercus_robur: .9, carpinus_betulus: .8 },
  "pied-mouton": { fagus_sylvatica: 1, quercus_petraea: .8, picea_abies: .65, abies_alba: .6 },
  "chanterelle-tube": { picea_abies: 1, abies_alba: .85, pinus_sylvestris: .55, fagus_sylvatica: .45 },
  "lactaire-delicieux": { pinus_sylvestris: 1 },
  oronge: { quercus_petraea: 1, quercus_robur: .9, castanea_sativa: .85 },
  "pleurote-huitre": { fagus_sylvatica: .85, populus_nigra: 1, quercus_robur: .55 },
  "pholiote-peuplier": { populus_nigra: 1 }, "bolet-jaune": { pinus_sylvestris: 1 },
  sparassis: { pinus_sylvestris: 1, picea_abies: .45 }, "bolet-bai": { picea_abies: 1, pinus_sylvestris: .85, fagus_sylvatica: .4 },
  "collybie-veloutee": { populus_nigra: 1, fraxinus_excelsior: .7, fagus_sylvatica: .45 },
  "russule-charbonniere": { fagus_sylvatica: 1, quercus_petraea: .85, quercus_robur: .8 }
};
const PH_PREFERENCES = {
  "morille-commune": [6, 7.8], "morille-conique": [5.5, 7.5], "cepe-bordeaux": [4.2, 6.4],
  "cepe-ete": [4.5, 6.8], "cepe-pins": [4, 6.2], "cepe-bronze": [4.5, 6.8], girolle: [4, 6.2],
  trompette: [5, 7.2], "pied-mouton": [4.5, 7], "chanterelle-tube": [3.8, 5.8],
  "lactaire-delicieux": [5.5, 7.5], oronge: [4.5, 6.8], "bolet-jaune": [4, 6], "bolet-bai": [4, 6.2],
  "russule-charbonniere": [4.5, 6.8]
};
const GROWTH_PROFILES = {
  default: { rainDays: 14, rainTarget: 35, triggerRain: 5, moisture: [.18, .38], soilTemp: [7, 20] },
  "morille-commune": { rainDays: 14, rainTarget: 28, triggerRain: 4, moisture: [.17, .34], soilTemp: [6, 14] },
  "morille-conique": { rainDays: 14, rainTarget: 30, triggerRain: 4, moisture: [.18, .36], soilTemp: [5, 14] },
  "cepe-bordeaux": { rainDays: 18, rainTarget: 42, triggerRain: 6, moisture: [.20, .40], soilTemp: [9, 18] },
  "cepe-ete": { rainDays: 14, rainTarget: 36, triggerRain: 6, moisture: [.18, .36], soilTemp: [12, 21] },
  "cepe-pins": { rainDays: 18, rainTarget: 38, triggerRain: 6, moisture: [.18, .38], soilTemp: [8, 18] },
  "cepe-bronze": { rainDays: 14, rainTarget: 35, triggerRain: 6, moisture: [.17, .34], soilTemp: [14, 23] },
  girolle: { rainDays: 18, rainTarget: 45, triggerRain: 5, moisture: [.21, .42], soilTemp: [10, 19] },
  trompette: { rainDays: 21, rainTarget: 52, triggerRain: 6, moisture: [.23, .44], soilTemp: [8, 16] },
  "pied-mouton": { rainDays: 18, rainTarget: 42, triggerRain: 5, moisture: [.20, .42], soilTemp: [8, 18] },
  "chanterelle-tube": { rainDays: 21, rainTarget: 48, triggerRain: 5, moisture: [.23, .46], soilTemp: [5, 14] },
  "lactaire-delicieux": { rainDays: 18, rainTarget: 38, triggerRain: 5, moisture: [.18, .38], soilTemp: [8, 18] },
  oronge: { rainDays: 14, rainTarget: 32, triggerRain: 6, moisture: [.16, .33], soilTemp: [15, 24] },
  "bolet-jaune": { rainDays: 18, rainTarget: 38, triggerRain: 5, moisture: [.19, .39], soilTemp: [7, 17] },
  "bolet-bai": { rainDays: 18, rainTarget: 42, triggerRain: 5, moisture: [.20, .41], soilTemp: [7, 17] }
};
// Fenêtre indicative entre une pousse probable et une taille de cueillette
// intéressante. Elle reste une heuristique météo, jamais une constatation terrain.
const HARVEST_WINDOWS = {
  default: [3, 6],
  "morille-commune": [3, 5], "morille-conique": [3, 5],
  "cepe-bordeaux": [3, 6], "cepe-ete": [2, 5], "cepe-pins": [3, 6], "cepe-bronze": [2, 5],
  girolle: [5, 9], trompette: [5, 9], "pied-mouton": [4, 8], coulemelle: [2, 4],
  "saint-georges": [3, 6], "chanterelle-tube": [5, 9], "lactaire-delicieux": [3, 6], oronge: [2, 4],
  "pleurote-huitre": [3, 6], "pholiote-peuplier": [3, 6], "bolet-jaune": [2, 5],
  sparassis: [5, 9], "bolet-bai": [3, 6], "collybie-veloutee": [3, 6], "russule-charbonniere": [3, 6]
};
function weatherPointsFor(area) {
  const latStep = area.radius / 111;
  const lngStep = area.radius / (111 * Math.cos(area.lat * Math.PI / 180));
  const offsets = [
    [0, 0, area.name], [0, -.5, "Ouest"], [0, .5, "Est"], [.5, 0, "Nord"], [-.5, 0, "Sud"],
    [.38, -.38, "Nord-Ouest"], [.38, .38, "Nord-Est"], [-.38, -.38, "Sud-Ouest"], [-.38, .38, "Sud-Est"],
    [0, -1, "Périphérie ouest"], [0, 1, "Périphérie est"], [1, 0, "Périphérie nord"], [-1, 0, "Périphérie sud"],
    [.72, -.72, "Périphérie nord-ouest"], [.72, .72, "Périphérie nord-est"], [-.72, -.72, "Périphérie sud-ouest"], [-.72, .72, "Périphérie sud-est"]
  ];
  return offsets.map(([latOffset, lngOffset, name]) => ({
    lat: area.lat + latOffset * latStep,
    lng: area.lng + lngOffset * lngStep,
    name
  }));
}

if (location.protocol === "file:") {
  document.body.insertAdjacentHTML("afterbegin", `<div class="launch-warning"><strong>Mode fichier limité : les polygones ne peuvent pas être chargés.</strong>Fermez cette page puis double-cliquez sur « Demarrer MycoMy.cmd » dans le dossier de l’application.</div>`);
}

const species = [
  { id: "morille-commune", group: "Printemps", name: "Morille commune", latin: "Morchella esculenta agg.", season: "Printemps", habitat: "Lisières, frênes, anciens vergers et sols remués selon les espèces.", risk: "Toxique crue ; cuisson suffisante indispensable. Confusion possible avec les gyromitres." },
  { id: "morille-conique", group: "Printemps", name: "Morille conique", latin: "Morchella elata agg.", season: "Printemps", habitat: "Terrains perturbés, lisières et secteurs montagnards selon les espèces.", risk: "Toxique crue ; cuisson suffisante indispensable. Validation mycologique recommandée." },
  { id: "cepe-bordeaux", group: "Bolets", name: "Cèpe de Bordeaux", latin: "Boletus edulis", season: "Été–automne", habitat: "Feuillus ou conifères, selon le peuplement.", risk: "À distinguer notamment du bolet amer ; faire contrôler toute récolte incertaine." },
  { id: "cepe-ete", group: "Bolets", name: "Cèpe d’été", latin: "Boletus reticulatus", season: "Fin printemps–été", habitat: "Bois feuillus plutôt chauds, notamment chênes et hêtres.", risk: "Ne pas conclure à la comestibilité à partir du seul réseau du pied ou de la couleur." },
  { id: "cepe-pins", group: "Bolets", name: "Cèpe des pins", latin: "Boletus pinophilus", season: "Été–automne", habitat: "Conifères, particulièrement les pins, parfois sous feuillus.", risk: "Contrôler tous les caractères du bolet et écarter les spécimens altérés." },
  { id: "cepe-bronze", group: "Bolets", name: "Cèpe bronzé", latin: "Boletus aereus", season: "Été–automne", habitat: "Bois feuillus chauds, surtout chênes et hêtres.", risk: "Espèce thermophile ; ne pas se fier uniquement à la couleur sombre du chapeau." },
  { id: "girolle", group: "Chanterelles", name: "Girolle", latin: "Cantharellus cibarius", season: "Été–automne", habitat: "Forêts de feuillus et de conifères sur sols adaptés.", risk: "Confusions possibles avec le clitocybe de l’olivier et la fausse girolle." },
  { id: "trompette", group: "Chanterelles", name: "Trompette de la mort", latin: "Craterellus cornucopioides", season: "Été–automne", habitat: "Bois feuillus humides, souvent sous hêtres ou chênes.", risk: "Écarter les exemplaires trop vieux ou dégradés ; validation humaine recommandée." },
  { id: "pied-mouton", group: "Autres", name: "Pied-de-mouton", latin: "Hydnum repandum", season: "Été–automne", habitat: "Bois feuillus et conifères, souvent en groupes.", risk: "Vérifier l’ensemble des caractères, notamment les aiguillons sous le chapeau." },
  { id: "coulemelle", group: "Autres", name: "Coulemelle", latin: "Macrolepiota procera", season: "Été–automne", habitat: "Lisières, clairières et prés proches des bois.", risk: "Risque majeur de confusion avec de petites lépiotes toxiques ou mortelles : niveau expert requis." },
  { id: "saint-georges", group: "Printemps", name: "Mousseron de la Saint-Georges", latin: "Calocybe gambosa", season: "Printemps", habitat: "Prairies, haies, lisières et ronds de sorcières.", risk: "Plusieurs champignons printaniers toxiques peuvent partager les mêmes milieux." },
  { id: "chanterelle-tube", group: "Chanterelles", name: "Chanterelle en tube", latin: "Craterellus tubaeformis", season: "Automne", habitat: "Bois humides, moussus, souvent dans les secteurs plus frais.", risk: "Contrôler les plis, le pied creux et tous les caractères avant consommation." },
  { id: "lactaire-delicieux", group: "Autres", name: "Lactaire délicieux", latin: "Lactarius deliciosus", season: "Automne", habitat: "Sous les pins, sur sols plutôt calcaires ou neutres.", risk: "Plusieurs lactaires se ressemblent ; contrôler le lait, les couleurs et l’arbre associé." },
  { id: "oronge", group: "Expert", name: "Oronge", latin: "Amanita caesarea", season: "Été–automne", habitat: "Bois feuillus chauds, principalement sous chênes et châtaigniers.", risk: "Risque vital de confusion avec d’autres amanites, surtout à l’état d’œuf : niveau expert uniquement." },
  { id: "pleurote-huitre", group: "Bois", name: "Pleurote en huître", latin: "Pleurotus ostreatus", season: "Automne–hiver", habitat: "Sur bois mort ou affaibli de feuillus.", risk: "Identifier le support, l’insertion des lames et l’ensemble de la touffe." },
  { id: "pholiote-peuplier", group: "Bois", name: "Pholiote du peuplier", latin: "Cyclocybe aegerita", season: "Printemps–automne", habitat: "En touffes sur souches et racines de peupliers ou saules.", risk: "Confusions possibles avec d’autres champignons lignicoles en touffes." },
  { id: "bolet-jaune", group: "Bolets", name: "Bolet jaune", latin: "Suillus luteus", season: "Automne", habitat: "Sous les pins, souvent sur sols acides.", risk: "La cuticule visqueuse est généralement retirée ; réactions digestives possibles." },
  { id: "sparassis", group: "Bois", name: "Sparassis crépu", latin: "Sparassis crispa", season: "Été–automne", habitat: "Au pied des conifères, surtout des pins.", risk: "Ne récolter que des exemplaires jeunes et parfaitement identifiés." },
  { id: "bolet-bai", group: "Bolets", name: "Bolet bai", latin: "Imleria badia", season: "Été–automne", habitat: "Bois de conifères ou mixtes, souvent sur sols acides.", risk: "Contrôler les pores, le bleuissement et éliminer les spécimens trop vieux." },
  { id: "collybie-veloutee", group: "Bois", name: "Collybie à pied velouté", latin: "Flammulina velutipes", season: "Automne–hiver", habitat: "En touffes sur bois de feuillus, souvent par temps froid.", risk: "Confusion dangereuse avec d’autres espèces lignicoles ; niveau avancé recommandé." },
  { id: "russule-charbonniere", group: "Expert", name: "Russule charbonnière", latin: "Russula cyanoxantha", season: "Été–automne", habitat: "Bois feuillus ou mixtes.", risk: "Le genre Russula est difficile ; ne jamais utiliser le goût comme seul critère." }
];

let selectedGroup = "Tous";
let activeArea = (() => {
  try { return SEARCH_AREAS[localStorage.getItem("mycomy-active-area")] || SEARCH_AREAS.bruebach; }
  catch { return SEARCH_AREAS.bruebach; }
})();
let weatherPoints = weatherPointsFor(activeArea);
let pendingPosition = { lat: activeArea.lat, lng: activeArea.lng };
let map;
let userMarker;
let bestPlaceMarker;
let areaCircle;
let areaMarker;
let forestLayer;
let hydroLayer;
let lidarLayer;
let forestFeatures = [];
let renderedFeatures = [];
let zonesVisible = true;
let lidarVisible = false;
let weatherPotential = 35;
let selectedMapSpecies = "cepe-bordeaux";
let weatherSeries = null;
let centerWeatherModel = null;
let weatherHistoryDays = 21;
let weatherNodes = [];
let observationModel = { species: {} };
let rppProfiles = [];
let forestMetadata = {};
let candidateContextProfiles = [];
let candidateContextAssignments = [];
let candidateContextState = "idle";
let contextIndexByFeature = new WeakMap();
let advancedFilters = { radius: activeArea.radius, minScore: 0, forest: "all" };
const spotMarkers = [];
const fineTerrainCache = new Map();
let fineRenderTimer;
let terrainRequestToken = 0;
let renderedFineMode = false;
let areaLoadToken = 0;

function loadSpots() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveSpots(spots) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
}

function renderAreaFocus() {
  if (!map) return;
  if (areaCircle) areaCircle.remove();
  if (areaMarker) areaMarker.remove();
  areaCircle = L.circle([activeArea.lat, activeArea.lng], {
    radius: activeArea.radius * 1000,
    color: "#245d42",
    weight: 1,
    fillColor: "#5f8f6e",
    fillOpacity: .07
  }).addTo(map);
  areaMarker = L.circleMarker([activeArea.lat, activeArea.lng], {
    radius: 7, color: "#fff", weight: 3, fillColor: "#d39d42", fillOpacity: 1
  }).addTo(map).bindPopup(`${activeArea.name} — centre de recherche`);
}

function initMap() {
  if (!window.L) {
    document.querySelector("#map").innerHTML = "<p style='padding:20px'>Le fond de carte n’est pas disponible hors connexion pour le moment.</p>";
    return;
  }
  map = L.map("map", { zoomControl: false, preferCanvas: true }).setView([activeArea.lat, activeArea.lng], activeArea.zoom);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap"
  }).addTo(map);
  map.createPane("lidarPane");
  map.getPane("lidarPane").style.zIndex = 250;
  lidarLayer = L.tileLayer.wms("https://data.geopf.fr/wms-r", {
    layers: "IGNF_LIDAR-HD_MNT_ELEVATIONGRIDCOVERAGE.WGS84G",
    format: "image/png",
    transparent: true,
    opacity: .42,
    pane: "lidarPane",
    maxZoom: 20,
    attribution: "IGN LiDAR HD"
  });
  renderAreaFocus();
  renderSpots();
  loadForestZones();
  map.on("zoomstart", () => { terrainRequestToken++; });
  map.on("zoomend moveend", () => {
    clearTimeout(fineRenderTimer);
    fineRenderTimer = setTimeout(() => {
      updateDetailLayers();
      const fineMode = map.getZoom() >= FINE_ZOOM;
      if (forestFeatures.length && (fineMode || fineMode !== renderedFineMode)) {
        renderForestZones();
        requestAnimationFrame(() => map.invalidateSize({ pan: false }));
      }
      renderSpatialWeatherIndicators();
    }, 220);
  });
}

function forestDescription(tags) {
  return `${tags.tfv || ""} ${tags.tfv_g11 || ""} ${tags.essence || ""} ${tags.leaf_type || ""} ${tags.wood || ""} ${tags.genus || ""} ${tags.species || ""}`.toLowerCase();
}

function compatibilityFor(tags, speciesId) {
  const leafType = forestDescription(tags);
  const broadleaf = /feuillu|broad|decidu|fagus|quercus|hêtre|chêne|charme|châtaignier|frêne|bouleau|peuplier|saule/.test(leafType);
  const conifer = /conif|résineux|needle|picea|abies|pinus|sapin|épicéa|pin|douglas|mélèze/.test(leafType);
  const oakBeech = /hêtre|chêne|fagus|quercus/.test(leafType);
  const preferences = {
    "cepe-bordeaux": broadleaf || conifer,
    "cepe-ete": broadleaf,
    "cepe-pins": conifer,
    "cepe-bronze": broadleaf,
    girolle: broadleaf || conifer,
    trompette: broadleaf,
    "pied-mouton": broadleaf || conifer,
    coulemelle: false,
    "morille-commune": broadleaf,
    "morille-conique": broadleaf || conifer,
    "saint-georges": false,
    "chanterelle-tube": conifer,
    "lactaire-delicieux": conifer,
    oronge: broadleaf,
    "pleurote-huitre": broadleaf,
    "pholiote-peuplier": broadleaf,
    "bolet-jaune": conifer,
    sparassis: conifer,
    "bolet-bai": conifer,
    "collybie-veloutee": broadleaf,
    "russule-charbonniere": broadleaf
  };
  if (!leafType.trim()) return 6;
  if (speciesId === "trompette") return oakBeech ? 34 : broadleaf ? 25 : conifer ? -15 : 4;
  if (speciesId === "cepe-ete" || speciesId === "cepe-bronze" || speciesId === "oronge") {
    return oakBeech ? 32 : broadleaf ? 22 : -12;
  }
  return preferences[speciesId] ? 25 : -9;
}

function environmentCompatibilityFor(tags, speciesId) {
  const substrate = tags.substrate || "indéterminé";
  const elevation = Number(tags.elevation);
  const slope = Number(tags.slope);
  const aspect = tags.aspect || "";
  let score = 0;
  const acidicSpecies = ["cepe-bordeaux", "cepe-pins", "girolle", "chanterelle-tube", "bolet-jaune", "bolet-bai", "oronge"];
  const limestoneSpecies = ["morille-commune", "morille-conique", "trompette", "lactaire-delicieux"];
  const continuitySpecies = ["cepe-bordeaux", "cepe-ete", "cepe-pins", "cepe-bronze", "girolle", "trompette", "pied-mouton", "chanterelle-tube", "lactaire-delicieux", "oronge", "bolet-jaune", "bolet-bai", "russule-charbonniere"];
  if (acidicSpecies.includes(speciesId)) score += substrate === "acide" ? 10 : substrate === "calcaire" ? -5 : 1;
  if (limestoneSpecies.includes(speciesId)) score += ["calcaire", "argileux"].includes(substrate) ? 9 : substrate === "acide" ? -4 : 2;
  if (["morille-commune", "pholiote-peuplier"].includes(speciesId) && substrate === "sableux-alluvial") score += 8;
  if (tags.forest_age === "ancienne" && continuitySpecies.includes(speciesId)) score += 7;
  if (tags.forest_age === "récente" && continuitySpecies.includes(speciesId)) score -= 2;
  if (Number.isFinite(elevation)) {
    if (["oronge", "cepe-bronze", "cepe-ete"].includes(speciesId)) score += elevation <= 500 ? 6 : elevation > 750 ? -7 : 1;
    if (["chanterelle-tube", "cepe-pins", "morille-conique"].includes(speciesId)) score += elevation >= 450 ? 5 : 0;
  }
  if (["trompette", "girolle", "chanterelle-tube", "pied-mouton"].includes(speciesId)) {
    if (["N", "NE", "E", "NO"].includes(aspect)) score += 5;
    if (Number.isFinite(slope) && slope <= 18) score += 3;
  }
  if (["oronge", "cepe-bronze", "cepe-ete"].includes(speciesId) && ["S", "SE", "SO", "O"].includes(aspect)) score += 5;
  return score;
}

function featureCenter(feature) {
  const ring = feature.geometry.coordinates[0];
  return { lng: (ring[0][0] + ring[2][0]) / 2, lat: (ring[0][1] + ring[2][1]) / 2 };
}

function distanceKm(a, b) {
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function userCalibrationBoost(feature, speciesId = selectedMapSpecies) {
  const center = featureCenter(feature);
  let boost = 0;
  for (const spot of loadSpots()) {
    if (spot.species !== speciesId) continue;
    const distance = distanceKm(center, spot);
    if (distance > 1.2) continue;
    const decay = Math.max(0, 1 - distance / 1.2) ** 2;
    // Une absence est moins probante qu'une presence : le champignon a pu etre manque.
    boost += (spot.outcome === "not_found" ? -8 : 20) * decay;
  }
  return Math.max(-12, Math.min(28, Math.round(boost)));
}

function moistureCompatibilityFor(properties, speciesId) {
  const moisture = Number(properties.local_moisture_index);
  if (!Number.isFinite(moisture)) return 0;
  const moistureLoving = ["trompette", "girolle", "chanterelle-tube", "pied-mouton", "morille-commune", "pholiote-peuplier"];
  if (moistureLoving.includes(speciesId)) return Math.round((moisture - 50) / 5);
  if (["oronge", "cepe-bronze", "cepe-ete"].includes(speciesId)) return Math.round((50 - Math.abs(moisture - 50)) / 12);
  return Math.round((moisture - 50) / 12);
}

function rppProfileFor(properties = {}) {
  return rppProfiles[Number(properties.rpp_profile)] || {
    rpp: properties.rpp || {}, local_percentile: properties.rpp_local_percentile || {}
  };
}

function treeRppCompatibilityFor(properties, speciesId) {
  const hosts = HOST_TREES[speciesId];
  if (!hosts) return 0;
  const profile = rppProfileFor(properties);
  let bestRaw = 0;
  let bestLocal = 0;
  for (const [tree, weight] of Object.entries(hosts)) {
    bestRaw = Math.max(bestRaw, Number(profile.rpp?.[tree] || 0) * weight);
    bestLocal = Math.max(bestLocal, Number(profile.local_percentile?.[tree] || 0) * weight);
  }
  // Le rang local différencie les secteurs du rayon, la RPP brute conserve le
  // signal biogéographique. La contribution reste positive et plafonnée car la
  // donnée JRC date de 2006 et sa maille native est de 1 km.
  return Math.round(Math.min(14, bestLocal * .1 + bestRaw * .08));
}

function phCompatibilityFor(properties, speciesId) {
  const ph = Number(properties.soil_ph);
  const preferred = PH_PREFERENCES[speciesId];
  if (!Number.isFinite(ph) || !preferred) return 0;
  const [low, high] = preferred;
  if (ph >= low && ph <= high) return 6;
  const distance = ph < low ? low - ph : ph - high;
  return Math.max(-3, Math.round(6 - distance * 5));
}

function dominantHostRpp(properties, speciesId) {
  const hosts = HOST_TREES[speciesId] || {};
  const profile = rppProfileFor(properties);
  return Object.keys(hosts)
    .map(tree => ({ tree, value: Number(profile.rpp?.[tree] || 0) }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
}

function modelConfidence(feature) {
  const properties = feature.properties || {};
  let confidence = 18;
  if (forestDescription(properties).trim()) confidence += 18;
  if (properties.terrain_source) confidence += 10;
  if (Number.isFinite(Number(properties.local_moisture_index))) confidence += 10;
  if (Number.isFinite(Number(properties.soil_ph))) confidence += 8;
  if (rppProfileFor(properties).rpp && Object.keys(rppProfileFor(properties).rpp).length) confidence += 13;
  if (weatherNodes.length) confidence += 10;
  if (observationModel.species?.[selectedMapSpecies]?.occurrences) confidence += 7;
  if (loadSpots().some(spot => spot.species === selectedMapSpecies)) confidence += 6;
  if (properties.fineGrid) confidence += 4;
  if (Number.isFinite(Number(properties.fine_relative_elevation))) confidence += 6;
  if (properties.fineGrid && properties.geology_50k_source) confidence += 5;
  if (properties.fineGrid && properties.wetland_source) confidence += 5;
  return Math.min(100, confidence);
}

function hasNearbyPersonalObservation(feature, speciesId = selectedMapSpecies) {
  const center = featureCenter(feature);
  return loadSpots().some(spot =>
    spot.species === speciesId && distanceKm(center, spot) <= CASCADE_OBSERVATION_RADIUS_KM
  );
}

function coarseFeaturesInView() {
  const bounds = map.getBounds().pad(.12);
  return forestFeatures.filter(feature => {
    const center = featureCenter(feature);
    return bounds.contains([center.lat, center.lng]);
  });
}

function indexContextFeatures(features) {
  contextIndexByFeature = new WeakMap();
  features.forEach((feature, index) => contextIndexByFeature.set(feature, index));
}

function candidateContextFor(feature) {
  const featureIndex = contextIndexByFeature.get(feature);
  const profileIndex = Number.isInteger(featureIndex) ? Number(candidateContextAssignments[featureIndex]) : -1;
  return profileIndex >= 0 ? candidateContextProfiles[profileIndex] || {} : {};
}

async function loadCandidateContext() {
  if (!activeArea.contextFile || candidateContextState !== "idle") return;
  candidateContextState = "loading";
  const loadToken = areaLoadToken;
  try {
    const response = await fetch(`./${activeArea.contextFile}`);
    if (!response.ok) throw new Error("context");
    const payload = await response.json();
    if (loadToken !== areaLoadToken) return;
    candidateContextProfiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    candidateContextAssignments = Array.isArray(payload.assignments) ? payload.assignments : [];
    candidateContextState = "loaded";
    if (map?.getZoom() >= FINE_ZOOM && forestFeatures.length) renderForestZones();
  } catch {
    if (loadToken === areaLoadToken) candidateContextState = "failed";
  }
}

function adaptiveFeatures() {
  if (!map || map.getZoom() < FINE_ZOOM) return forestFeatures;
  if (candidateContextState === "idle") loadCandidateContext();
  const coarseFeatures = coarseFeaturesInView();
  const evaluated = coarseFeatures.map(feature => ({
    feature,
    center: featureCenter(feature),
    model: featureModel(feature),
    observed: hasNearbyPersonalObservation(feature)
  }));
  const directCandidates = evaluated.filter(item =>
    item.model.score >= CASCADE_SCORE_THRESHOLD || item.observed
  );
  const features = [];
  for (const evaluatedFeature of evaluated) {
    const { feature, center, model, observed } = evaluatedFeature;
    const direct = model.score >= CASCADE_SCORE_THRESHOLD || observed;
    const buffered = !direct && directCandidates.some(candidate =>
      distanceKm(center, candidate.center) <= CASCADE_BUFFER_KM
    );
    // Les secteurs faibles restent visibles avec leur score initial, mais ne
    // déclenchent ni subdivision ni interrogation altimétrique détaillée.
    if (!direct && !buffered) {
      features.push(feature);
      continue;
    }
    const ring = feature.geometry.coordinates[0];
    const west = ring[0][0];
    const south = ring[0][1];
    const east = ring[2][0];
    const north = ring[2][1];
    const width = (east - west) / FINE_COLS;
    const height = (north - south) / FINE_ROWS;
    const forestMask = Number(feature.properties?.forest_subcell_mask);
    for (let x = 0; x < FINE_COLS; x++) {
      for (let y = 0; y < FINE_ROWS; y++) {
        const bit = x * FINE_ROWS + y;
        if (Number.isFinite(forestMask) && !(forestMask & (1 << bit))) continue;
        const w = west + x * width;
        const s = south + y * height;
        const e = w + width;
        const n = s + height;
        const key = `${((w + e) / 2).toFixed(6)}:${((s + n) / 2).toFixed(6)}`;
        const terrain = fineTerrainCache.get(key);
        features.push({
          type: "Feature",
          properties: {
            ...feature.properties,
            ...candidateContextFor(feature),
            ...terrain,
            fineGrid: true,
            fineKey: key,
            base_elevation: feature.properties?.elevation,
            base_local_moisture_index: feature.properties?.local_moisture_index,
            cascade_initial_score: model.score,
            cascade_reason: observed ? "observation" : direct ? "seuil" : "marge"
          },
          geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] }
        });
      }
    }
  }
  return features;
}

function wetlandCompatibilityFor(properties, speciesId) {
  if (!properties.wetland_context) return 0;
  if (["trompette", "girolle", "chanterelle-tube", "pied-mouton", "morille-commune", "pholiote-peuplier"].includes(speciesId)) return 7;
  if (["oronge", "cepe-bronze", "cepe-ete"].includes(speciesId)) return -3;
  return 2;
}

function fineReliefCompatibilityFor(properties, speciesId) {
  const relative = Number(properties.fine_relative_elevation);
  if (!Number.isFinite(relative)) return 0;
  const dampSpecies = ["trompette", "girolle", "chanterelle-tube", "pied-mouton"];
  const warmSpecies = ["oronge", "cepe-bronze", "cepe-ete"];
  if (dampSpecies.includes(speciesId)) return Math.max(-4, Math.min(5, Math.round(-relative * 1.2)));
  if (warmSpecies.includes(speciesId)) return Math.max(-3, Math.min(4, Math.round(relative * .9)));
  return Math.max(-2, Math.min(2, Math.round(-relative * .45)));
}

async function enrichFineTerrain(features) {
  const missing = features.filter(feature => feature.properties.fineGrid && !fineTerrainCache.has(feature.properties.fineKey));
  if (!missing.length) return;
  const token = ++terrainRequestToken;
  for (let start = 0; start < missing.length; start += 100) {
    if (token !== terrainRequestToken) return;
    const batch = missing.slice(start, start + 100);
    const centers = batch.map(featureCenter);
    const url = new URL("https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json");
    url.search = new URLSearchParams({
      lon: centers.map(point => point.lng).join("|"),
      lat: centers.map(point => point.lat).join("|"),
      resource: "ign_rge_alti_wld",
      delimiter: "|",
      indent: "false",
      measures: "false",
      zonly: "true"
    });
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("terrain");
      const payload = await response.json();
      batch.forEach((feature, index) => {
        const elevation = Number(payload.elevations?.[index]);
        if (!Number.isFinite(elevation)) return;
        const relative = elevation - Number(feature.properties.base_elevation || elevation);
        const baseMoisture = Number(feature.properties.local_moisture_index);
        fineTerrainCache.set(feature.properties.fineKey, {
          elevation: Math.round(elevation),
          fine_relative_elevation: Math.round(relative * 10) / 10,
          local_moisture_index: Number.isFinite(baseMoisture) ? Math.max(0, Math.min(100, Math.round(baseMoisture - relative * 1.6))) : undefined,
          terrain_source: "IGN RGE ALTI haute resolution (issu du LiDAR HD lorsque disponible)"
        });
      });
    } catch { return; }
  }
  if (token === terrainRequestToken && map.getZoom() >= FINE_ZOOM) renderForestZones({ skipTerrainFetch: true });
}

function nearestWeatherNodes(lat, lng) {
  const longitudeScale = Math.cos(activeArea.lat * Math.PI / 180);
  return weatherNodes
    .map(node => ({
      node,
      distanceSquared: (lat - node.lat) ** 2 + ((lng - node.lng) * longitudeScale) ** 2
    }))
    .sort((a, b) => a.distanceSquared - b.distanceSquared)
    .slice(0, 4)
    .map(item => ({ ...item, weight: 1 / (item.distanceSquared + .0004) }));
}

function interpolatedWeatherValue(lat, lng, selector, fallback = 0) {
  if (!weatherNodes.length) return fallback;
  const nearest = nearestWeatherNodes(lat, lng);
  const exact = nearest.find(item => item.distanceSquared < 1e-10);
  if (exact) return Number(selector(exact.node)) || fallback;
  const weighted = nearest.reduce((result, item) => {
    const value = Number(selector(item.node));
    if (!Number.isFinite(value)) return result;
    return { sum: result.sum + value * item.weight, weights: result.weights + item.weight };
  }, { sum: 0, weights: 0 });
  return weighted.weights ? weighted.sum / weighted.weights : fallback;
}

function localWeatherPotential(feature) {
  const center = featureCenter(feature);
  return interpolatedWeatherValue(center.lat, center.lng, node => node.potential, weatherPotential);
}

function visibleWeatherLocations(maxSamples = 160) {
  if (!map) return { locations: [{ lat: activeArea.lat, lng: activeArea.lng }], total: 1, fallback: true };
  const bounds = map.getBounds();
  const visible = renderedFeatures
    .map(featureCenter)
    .filter(center => bounds.contains([center.lat, center.lng]));
  if (!visible.length) {
    const center = map.getCenter();
    return { locations: [{ lat: center.lat, lng: center.lng }], total: 0, fallback: true };
  }
  const step = Math.max(1, Math.ceil(visible.length / maxSamples));
  return { locations: visible.filter((_, index) => index % step === 0), total: visible.length, fallback: false };
}

function viewExtentLabel(sample) {
  if (!map || sample.fallback) return "au centre de la carte";
  const bounds = map.getBounds();
  const center = map.getCenter();
  const width = distanceKm({ lat: center.lat, lng: bounds.getWest() }, { lat: center.lat, lng: bounds.getEast() });
  const height = distanceKm({ lat: bounds.getSouth(), lng: center.lng }, { lat: bounds.getNorth(), lng: center.lng });
  return `${sample.total} maille${sample.total > 1 ? "s" : ""} visible${sample.total > 1 ? "s" : ""} · emprise ~${Math.max(.1, width).toFixed(width < 10 ? 1 : 0)} × ${Math.max(.1, height).toFixed(height < 10 ? 1 : 0)} km`;
}

function weatherSummaryForView() {
  if (!weatherNodes.length) return null;
  const sample = visibleWeatherLocations();
  const values = sample.locations.map(location => ({
    potential: interpolatedWeatherValue(location.lat, location.lng, node => node.potential, weatherPotential),
    rain: interpolatedWeatherValue(location.lat, location.lng, node => node.rain, centerWeatherModel?.rain || 0),
    balance: interpolatedWeatherValue(location.lat, location.lng, node => node.balance, centerWeatherModel?.balance || 0),
    moisture: interpolatedWeatherValue(location.lat, location.lng, node => node.moisture, centerWeatherModel?.moisture || 0),
    soilTemperature: interpolatedWeatherValue(location.lat, location.lng, node => node.soilTemperature, centerWeatherModel?.soilTemperature || 0)
  }));
  const average = key => values.reduce((sum, value) => sum + value[key], 0) / values.length;
  return { sample, potential: average("potential"), rain: average("rain"), balance: average("balance"), moisture: average("moisture"), soilTemperature: average("soilTemperature") };
}

function growthAtLocation(item, location) {
  const nearest = nearestWeatherNodes(location.lat, location.lng)
    .map(entry => ({ ...entry, growth: growthModelFor(item, entry.node) }))
    .filter(entry => entry.growth);
  if (!nearest.length) return null;
  const average = selector => {
    const weighted = nearest.reduce((result, entry) => ({
      sum: result.sum + Number(selector(entry)) * entry.weight,
      weights: result.weights + entry.weight
    }), { sum: 0, weights: 0 });
    return weighted.sum / weighted.weights;
  };
  return {
    score: average(entry => entry.growth.score),
    rain: average(entry => entry.growth.rain),
    balance: average(entry => entry.growth.balance),
    moisture: average(entry => entry.node.moisture),
    soilTemperature: average(entry => entry.node.soilTemperature),
    daysSinceRain: average(entry => entry.growth.daysSinceRain ?? 21),
    profile: nearest[0].growth.profile
  };
}

function growthSummaryForView(item) {
  if (!item || !weatherNodes.length) return null;
  const sample = visibleWeatherLocations();
  const values = sample.locations.map(location => growthAtLocation(item, location)).filter(Boolean);
  if (!values.length) return null;
  const average = key => values.reduce((sum, value) => sum + value[key], 0) / values.length;
  return {
    sample,
    score: Math.round(average("score")),
    minScore: Math.round(Math.min(...values.map(value => value.score))),
    maxScore: Math.round(Math.max(...values.map(value => value.score))),
    rain: average("rain"),
    balance: average("balance"),
    moisture: average("moisture"),
    soilTemperature: average("soilTemperature"),
    daysSinceRain: Math.round(average("daysSinceRain")),
    profile: values[0].profile
  };
}

function forecastGrowthAtLocation(item, location, offset) {
  const nearest = nearestWeatherNodes(location.lat, location.lng)
    .map(entry => ({ ...entry, growth: growthModelForForecastDay(item, entry.node, offset) }))
    .filter(entry => entry.growth);
  if (!nearest.length) return null;
  const average = selector => {
    const weighted = nearest.reduce((result, entry) => ({
      sum: result.sum + Number(selector(entry)) * entry.weight,
      weights: result.weights + entry.weight
    }), { sum: 0, weights: 0 });
    return weighted.sum / weighted.weights;
  };
  return {
    date: nearest[0].growth.date,
    score: average(entry => entry.growth.score),
    rain: average(entry => entry.growth.rain),
    balance: average(entry => entry.growth.balance),
    moisture: average(entry => entry.growth.moisture),
    soilTemperature: average(entry => entry.growth.soilTemperature)
  };
}

function forecastGrowthSummaryForView(item, offset, sample) {
  const values = sample.locations.map(location => forecastGrowthAtLocation(item, location, offset)).filter(Boolean);
  if (!values.length) return null;
  const average = key => values.reduce((sum, value) => sum + value[key], 0) / values.length;
  return {
    date: values[0].date,
    score: Math.round(average("score")),
    minScore: Math.round(Math.min(...values.map(value => value.score))),
    maxScore: Math.round(Math.max(...values.map(value => value.score))),
    rain: average("rain"),
    balance: average("balance"),
    moisture: average("moisture"),
    soilTemperature: average("soilTemperature")
  };
}

function harvestSummaryForView(item, offset, sample) {
  if (!item || !sample) return null;
  const [minimumAge, maximumAge] = HARVEST_WINDOWS[item.id] || HARVEST_WINDOWS.default;
  const midpoint = (minimumAge + maximumAge) / 2;
  const candidates = [];
  for (let age = minimumAge; age <= maximumAge; age++) {
    const growth = forecastGrowthSummaryForView(item, offset - age, sample);
    if (!growth) continue;
    const weight = 1 / (1 + Math.abs(age - midpoint));
    candidates.push({ growth, weight });
  }
  const current = forecastGrowthSummaryForView(item, offset, sample);
  if (!candidates.length || !current) return null;
  const weightTotal = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  const matureGrowth = candidates.reduce((sum, entry) => sum + entry.growth.score * entry.weight, 0) / weightTotal;
  const score = Math.max(0, Math.min(100, Math.round(matureGrowth * .8 + current.score * .2)));
  return { ...current, score, growthScore: current.score, minimumAge, maximumAge };
}

function harvestLevel(score) {
  if (score >= 80) return { css: "strong", label: "Très bon moment pour prospecter" };
  if (score >= 65) return { css: "good", label: "Récolte intéressante possible" };
  if (score >= 45) return { css: "possible", label: "Quelques sujets mûrs possibles" };
  if (score >= 25) return { css: "wait", label: "Mieux vaut encore patienter" };
  return { css: "low", label: "Récolte peu probable actuellement" };
}

function observationBoost(feature, speciesId = selectedMapSpecies) {
  const model = observationModel.species?.[speciesId];
  if (!model?.cells) return 0;
  const center = featureCenter(feature);
  const key = `${Math.floor(center.lng / GRID_CELL)}:${Math.floor(center.lat / GRID_CELL)}`;
  const spatial = Number(model.cells[key] || 0);
  const month = new Date().getMonth();
  const peak = Math.max(...(model.months || [0]), 1);
  const seasonalFactor = .45 + .55 * Number(model.months?.[month] || 0) / peak;
  return Math.round(spatial * seasonalFactor);
}

function featureModel(feature) {
  const properties = feature.properties || {};
  const refined = Boolean(properties.fineGrid && Number.isFinite(Number(properties.cascade_initial_score)));
  const modelingProperties = refined ? {
    ...properties,
    substrate: properties.substrate_50k || properties.substrate,
    local_moisture_index: Number.isFinite(Number(properties.local_moisture_index))
      ? Math.max(0, Math.min(100, Number(properties.local_moisture_index) + (properties.wetland_context ? 8 : 0)))
      : properties.local_moisture_index
  } : properties;
  const components = {
    meteo: Math.round(localWeatherPotential(feature) * .30),
    peuplement: Math.round(compatibilityFor(modelingProperties, selectedMapSpecies) * .65),
    milieu: Math.round(environmentCompatibilityFor(modelingProperties, selectedMapSpecies) * .70),
    humidite: Math.round(moistureCompatibilityFor(modelingProperties, selectedMapSpecies) * .80),
    arbresRpp: treeRppCompatibilityFor(modelingProperties, selectedMapSpecies),
    ph: phCompatibilityFor(modelingProperties, selectedMapSpecies),
    historique: Math.round(observationBoost(feature) * .70),
    personnel: userCalibrationBoost(feature),
    zoneHumide: refined ? wetlandCompatibilityFor(modelingProperties, selectedMapSpecies) : 0,
    reliefFin: refined ? fineReliefCompatibilityFor(modelingProperties, selectedMapSpecies) : 0
  };
  const score = Math.max(5, Math.min(100, Math.round(12 + Object.values(components).reduce((sum, value) => sum + value, 0))));
  return {
    score,
    initialScore: refined ? Number(properties.cascade_initial_score) : score,
    refined,
    confidence: modelConfidence(feature),
    components
  };
}

function featureScore(feature) {
  return featureModel(feature).score;
}

function bestPlaceScore(feature, item) {
  const place = featureModel(feature);
  const location = featureCenter(feature);
  const growth = growthAtLocation(item, location);
  const weatherScore = growth?.score ?? localWeatherPotential(feature);
  return {
    feature,
    location,
    placeScore: place.score,
    weatherScore: Math.round(weatherScore),
    score: Math.round(place.score * .70 + weatherScore * .30),
    confidence: place.confidence
  };
}

function showBestPlace() {
  const button = document.querySelector("#bestPlaceButton");
  const item = species.find(entry => entry.id === selectedMapSpecies);
  const candidates = renderedFeatures.filter(feature =>
    distanceFromActiveArea(feature) <= advancedFilters.radius && matchesForestFilter(feature)
  );
  if (!item || !candidates.length) {
    alert("Aucune maille forestière n’est disponible avec les filtres actuels.");
    return;
  }
  button.disabled = true;
  button.textContent = "Analyse en cours…";
  requestAnimationFrame(() => setTimeout(() => {
    const best = candidates.reduce((winner, feature) => {
      const candidate = bestPlaceScore(feature, item);
      return !winner || candidate.score > winner.score ? candidate : winner;
    }, null);
    button.disabled = false;
    button.textContent = "⌖ Meilleur endroit/météo";
    if (!best) return;
    if (bestPlaceMarker) bestPlaceMarker.remove();
    bestPlaceMarker = L.circleMarker([best.location.lat, best.location.lng], {
      radius: 11, color: "#fff", weight: 3, fillColor: "#d49a2f", fillOpacity: 1
    }).addTo(map);
    const forest = forestDescription(best.feature.properties || {}) || "Peuplement forestier";
    bestPlaceMarker.bindPopup(
      `<strong>Meilleur compromis actuel : ${best.score}/100</strong>` +
      `<br>${escapeHtml(item.name)} · ${escapeHtml(forest)}` +
      `<br><small>Terrain ${best.placeScore}/100 · météo/pousse ${best.weatherScore}/100 · confiance ${best.confidence}/100</small>` +
      `<br><small>Estimation indicative : vérifiez toujours les conditions sur place.</small>`
    );
    map.setView([best.location.lat, best.location.lng], Math.max(map.getZoom(), 15));
    bestPlaceMarker.openPopup();
  }, 20));
}

function zoneStyle(feature) {
  const score = featureScore(feature);
  const color = ZONE_BANDS.find(band => score >= band.min)?.color || ZONE_BANDS[ZONE_BANDS.length - 1].color;
  const fillOpacity = score >= 80 ? .42 : score >= 60 ? .34 : score >= 40 ? .24 : score >= 20 ? .16 : .10;
  const lineOpacity = score >= 60 ? .88 : score >= 40 ? .62 : .38;
  return { color, weight: score >= 60 ? 1.15 : .75, opacity: lineOpacity, fillColor: color, fillOpacity };
}

function distanceFromActiveArea(feature) {
  const ring = feature.geometry.coordinates[0];
  const centerLng = (ring[0][0] + ring[2][0]) / 2;
  const centerLat = (ring[0][1] + ring[2][1]) / 2;
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(centerLat - activeArea.lat);
  const dLng = toRad(centerLng - activeArea.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(activeArea.lat)) * Math.cos(toRad(centerLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchesForestFilter(feature) {
  if (advancedFilters.forest === "all") return true;
  const text = forestDescription(feature.properties || {});
  if (advancedFilters.forest === "broadleaf") return /feuillu|broad|decidu|fagus|quercus|hêtre|chêne/.test(text);
  return /conif|résineux|needle|picea|abies|pinus|sapin|épicéa|pin|douglas|mélèze/.test(text);
}

function renderForestZones({ skipTerrainFetch = false } = {}) {
  if (!map) return;
  renderedFineMode = map.getZoom() >= FINE_ZOOM;
  if (forestLayer) forestLayer.remove();
  const candidates = adaptiveFeatures();
  const visibleFeatures = candidates.filter(feature =>
    distanceFromActiveArea(feature) <= advancedFilters.radius &&
    featureScore(feature) >= advancedFilters.minScore &&
    matchesForestFilter(feature)
  );
  renderedFeatures = visibleFeatures;
  forestLayer = L.geoJSON({ type: "FeatureCollection", features: visibleFeatures }, {
    style: zoneStyle,
    onEachFeature: (feature, layer) => {
      const model = featureModel(feature);
      const score = model.score;
      const type = feature.properties.tfv || feature.properties.tfv_g11 || feature.properties.leaf_type || feature.properties.wood || "peuplement non renseigné";
      const environment = feature.properties.terrain_source
        ? `<br><small>${escapeHtml(feature.properties.geology || "Sous-sol indéterminé")} · ${feature.properties.elevation} m · pente ${feature.properties.slope}° · exposition ${escapeHtml(feature.properties.aspect)} · forêt ${escapeHtml(feature.properties.forest_age || "non renseignée")}</small>`
        : "";
      const historyBoost = observationBoost(feature);
      const history = historyBoost ? `<br><small>Signal historique GBIF agrégé : +${historyBoost}</small>` : "";
      const calibration = userCalibrationBoost(feature);
      const calibrationText = calibration ? `<br><small>Calibration personnelle : ${calibration > 0 ? "+" : ""}${calibration}</small>` : "";
      const moisture = Number.isFinite(Number(feature.properties.local_moisture_index))
        ? `<br><small>Indice local d’humidité : ${feature.properties.local_moisture_index}/100 · eau à ${feature.properties.hydro_distance_m ?? "?"} m</small>`
        : "";
      const soil = feature.properties.soil_source
        ? `<br><small>Sol régional : ${escapeHtml(feature.properties.soil_texture || "texture non renseignée")} · ${escapeHtml(feature.properties.soil_water || "hydrologie non renseignée")} (RRP 1:250 000)</small>`
        : "";
      const ph = Number.isFinite(Number(feature.properties.soil_ph))
        ? `<br><small>pH estimé : ${Number(feature.properties.soil_ph).toFixed(1)} (SoilGrids, maille source 250 m)</small>`
        : "";
      const hostRpp = dominantHostRpp(feature.properties, selectedMapSpecies);
      const rpp = hostRpp.length
        ? `<br><small>Essences hôtes RPP : ${hostRpp.map(item => `${escapeHtml(TREE_LABELS[item.tree] || item.tree)} ${item.value.toFixed(1)} %`).join(" · ")} (JRC, maille source 1 km)</small>`
        : "";
      const fine = feature.properties.fineGrid
        ? `<br><small>Analyse fine en cascade · score initial ${model.initialScore}/100 · maille ~75–85 m${Number.isFinite(Number(feature.properties.fine_relative_elevation)) ? ` · relief local ${Number(feature.properties.fine_relative_elevation) >= 0 ? "+" : ""}${feature.properties.fine_relative_elevation} m` : " · relief en cours de chargement"}</small>`
        : "";
      const detailedGeology = model.refined && feature.properties.geology_50k_source
        ? `<br><small>Géologie affinée : ${escapeHtml(feature.properties.geology_50k_description || feature.properties.substrate_50k || "non renseignée")} (BRGM 1:50 000)</small>`
        : "";
      const wetland = model.refined && feature.properties.wetland_context
        ? `<br><small>Contexte humide CIGAL : ${escapeHtml(feature.properties.wetland_class || "zone à dominante humide")} · fiabilité ${escapeHtml(feature.properties.wetland_reliability || "non renseignée")}</small>`
        : "";
      const refinedContributions = model.refined
        ? ` · zone humide ${model.components.zoneHumide >= 0 ? "+" : ""}${model.components.zoneHumide} · relief fin ${model.components.reliefFin >= 0 ? "+" : ""}${model.components.reliefFin}`
        : "";
      const explanation = `<br><small>Contributions : météo ${model.components.meteo >= 0 ? "+" : ""}${model.components.meteo} · peuplement ${model.components.peuplement >= 0 ? "+" : ""}${model.components.peuplement} · RPP ${model.components.arbresRpp >= 0 ? "+" : ""}${model.components.arbresRpp} · milieu ${model.components.milieu >= 0 ? "+" : ""}${model.components.milieu} · humidité ${model.components.humidite >= 0 ? "+" : ""}${model.components.humidite} · pH ${model.components.ph >= 0 ? "+" : ""}${model.components.ph}${refinedContributions}</small>`;
      const source = `<br><small>Météo + ${escapeHtml(feature.properties.source || "informations forestières OSM")}.</small>`;
      layer.bindPopup(`<strong>${model.refined ? "Score affiné" : "Score initial"} : ${score}/100</strong> · confiance des données ${model.confidence}/100<br>${escapeHtml(type)}${environment}${moisture}${soil}${ph}${rpp}${fine}${detailedGeology}${wetland}${history}${calibrationText}${explanation}${source}`);
    }
  });
  if (zonesVisible) forestLayer.addTo(map);
  if (map.getZoom() >= FINE_ZOOM && !skipTerrainFetch) enrichFineTerrain(candidates);
  const refinedCount = visibleFeatures.filter(feature => feature.properties?.fineGrid).length;
  const coarseCount = visibleFeatures.length - refinedCount;
  const historicalCount = Number(observationModel.species?.[selectedMapSpecies]?.occurrences || 0);
  document.querySelector("#zoneStatus").textContent = forestFeatures.length
    ? `${visibleFeatures.length}/${candidates.length} mailles${map.getZoom() >= FINE_ZOOM ? ` · ${refinedCount} affinées à ~75–85 m · ${coarseCount} au score initial` : " ~225 × 330 m"}${historicalCount ? ` · ${historicalCount} obs. GBIF` : ""}`
    : "Aucune donnée forestière";
  const summary = document.querySelector("#filterSummary");
  if (summary) summary.textContent = `${visibleFeatures.length} mailles ciblées · rayon ${advancedFilters.radius} km · score ≥ ${advancedFilters.minScore}${historicalCount ? ` · ${historicalCount} observations publiques agrégées` : ""}.`;
  renderSpatialWeatherIndicators();
}

async function loadHydrography() {
  if (!map) return;
  const loadToken = areaLoadToken;
  const hydroFile = activeArea.hydroFile;
  try {
    const response = await fetch(`./${hydroFile}`);
    if (!response.ok) return;
    const data = await response.json();
    if (loadToken !== areaLoadToken) return;
    if (hydroLayer) hydroLayer.remove();
    hydroLayer = L.geoJSON(data, {
      style: { color: "#2479a8", weight: 1.4, opacity: .72 },
      interactive: false
    });
    updateDetailLayers();
  } catch { /* couche facultative */ }
}

function updateDetailLayers() {
  if (!map) return;
  const detailed = map.getZoom() >= 14;
  if (hydroLayer) {
    if (detailed && zonesVisible && !map.hasLayer(hydroLayer)) hydroLayer.addTo(map);
    if ((!detailed || !zonesVisible) && map.hasLayer(hydroLayer)) hydroLayer.remove();
  }
  if (lidarLayer) {
    if (detailed && lidarVisible && !map.hasLayer(lidarLayer)) lidarLayer.addTo(map);
    if ((!detailed || !lidarVisible) && map.hasLayer(lidarLayer)) lidarLayer.remove();
  }
}

async function loadForestZones() {
  const status = document.querySelector("#zoneStatus");
  const loadToken = areaLoadToken;
  const area = activeArea;
  const cacheKey = area.id === "bruebach" ? FOREST_CACHE_KEY : `mycomy-forest-grid-${area.id}-${area.radius}km-ign-v1`;
  try {
    status.textContent = "Chargement IGN BD Forêt V2…";
    const [response, observationsResponse] = await Promise.all([
      fetch(`./${area.forestFile}`),
      fetch(`./${area.observationsFile}`).catch(() => null)
    ]);
    if (!response.ok) throw new Error("IGN");
    const data = await response.json();
    if (loadToken !== areaLoadToken) return;
    if (observationsResponse?.ok) observationModel = await observationsResponse.json();
    if (loadToken !== areaLoadToken) return;
    if (!Array.isArray(data.features) || !data.features.length) throw new Error("IGN");
    rppProfiles = Array.isArray(data.rpp_profiles) ? data.rpp_profiles : [];
    forestMetadata = data.metadata || {};
    forestFeatures = data.features;
    indexContextFeatures(forestFeatures);
    loadHydrography();
    try { localStorage.setItem(cacheKey, JSON.stringify(data.features)); } catch { /* cache facultatif */ }
    renderForestZones();
    renderBestDays();
    renderGrowthIndicator();
    return;
  } catch { /* OSM et cache local prennent le relais */ }
  if (loadToken !== areaLoadToken) return;
  try {
    const legacyCache = area.id === "bruebach" ? localStorage.getItem(PREVIOUS_FOREST_CACHE_KEY) || localStorage.getItem(LEGACY_FOREST_CACHE_KEY) : null;
    const cachedGrid = JSON.parse(localStorage.getItem(cacheKey) || legacyCache) || [];
    if (cachedGrid.length) {
      forestFeatures = cachedGrid;
      indexContextFeatures(forestFeatures);
      renderForestZones();
      status.textContent = `${forestFeatures.length} mailles · actualisation…`;
    }
  } catch { /* le chargement réseau prend le relais */ }
  const radiusMetres = area.radius * 1000;
  const query = `[out:json][timeout:50];(way["natural"="wood"](around:${radiusMetres},${area.lat},${area.lng});way["landuse"="forest"](around:${radiusMetres},${area.lat},${area.lng});relation["natural"="wood"](around:${radiusMetres},${area.lat},${area.lng});relation["landuse"="forest"](around:${radiusMetres},${area.lat},${area.lng}););out tags geom;`;
  try {
    const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
    let data = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { method: "POST", body: new URLSearchParams({ data: query }) });
        if (response.ok) { data = await response.json(); break; }
      } catch { /* essayer le serveur suivant */ }
    }
    if (!data) throw new Error("forest");
    const wayPolygons = data.elements.filter(item => item.type === "way" && item.geometry?.length > 3).map(item => ({
      type: "Feature",
      properties: item.tags || {},
      geometry: { type: "Polygon", coordinates: [item.geometry.map(point => [point.lon, point.lat])] }
    }));
    const relationPolygons = data.elements.filter(item => item.type === "relation").flatMap(item =>
      (item.members || []).filter(member => member.role === "outer" && member.geometry?.length > 3).map(member => ({
        type: "Feature",
        properties: item.tags || {},
        geometry: { type: "Polygon", coordinates: [member.geometry.map(point => [point.lon, point.lat])] }
      }))
    );
    forestFeatures = buildForestGrid([...wayPolygons, ...relationPolygons].slice(0, 2400));
    indexContextFeatures(forestFeatures);
    if (loadToken !== areaLoadToken) return;
    try { localStorage.setItem(cacheKey, JSON.stringify(forestFeatures)); } catch { /* cache facultatif */ }
    renderForestZones();
  } catch {
    if (loadToken !== areaLoadToken) return;
    try {
      const legacyCache = area.id === "bruebach" ? localStorage.getItem(PREVIOUS_FOREST_CACHE_KEY) || localStorage.getItem(LEGACY_FOREST_CACHE_KEY) : null;
      const fallbackGrid = JSON.parse(localStorage.getItem(cacheKey) || legacyCache) || [];
      forestFeatures = fallbackGrid;
      indexContextFeatures(forestFeatures);
    } catch { forestFeatures = []; }
    if (forestFeatures.length) renderForestZones();
    else status.textContent = "Forêts indisponibles hors ligne";
  }
}

function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crosses = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function buildForestGrid(polygons) {
  const cell = GRID_CELL;
  const cells = new Map();
  for (const feature of polygons) {
    const ring = feature.geometry.coordinates[0];
    const lngs = ring.map(point => point[0]);
    const lats = ring.map(point => point[1]);
    const x0 = Math.floor(Math.min(...lngs) / cell);
    const x1 = Math.ceil(Math.max(...lngs) / cell);
    const y0 = Math.floor(Math.min(...lats) / cell);
    const y1 = Math.ceil(Math.max(...lats) / cell);
    for (let x = x0; x < x1; x++) {
      for (let y = y0; y < y1; y++) {
        const center = [(x + .5) * cell, (y + .5) * cell];
        if (!pointInPolygon(center, ring)) continue;
        const key = `${x}:${y}`;
        if (!cells.has(key)) cells.set(key, {
          type: "Feature",
          properties: feature.properties,
          geometry: { type: "Polygon", coordinates: [[
            [x * cell, y * cell], [(x + 1) * cell, y * cell], [(x + 1) * cell, (y + 1) * cell], [x * cell, (y + 1) * cell], [x * cell, y * cell]
          ]] }
        });
        if (cells.size >= 6000) return [...cells.values()];
      }
    }
  }
  return [...cells.values()];
}

function markerIcon(outcome = "found") {
  const symbol = outcome === "not_found" ? "−" : "●";
  return L.divIcon({ className: "", html: `<div class='spot-marker ${outcome}'><span>${symbol}</span></div>`, iconSize: [32, 32], iconAnchor: [8, 30] });
}

function renderSpots() {
  if (!map) return;
  spotMarkers.splice(0).forEach(marker => marker.remove());
  loadSpots().forEach(spot => {
    const item = species.find(entry => entry.id === spot.species);
    const outcome = spot.outcome || "found";
    const marker = L.marker([spot.lat, spot.lng], { icon: markerIcon(outcome) }).addTo(map);
    marker.bindPopup(`<strong>${outcome === "not_found" ? "Pas trouvé" : "Trouvé"} · ${item?.name || "Observation"}</strong><br>${spot.date}${spot.note ? `<br>${escapeHtml(spot.note)}` : ""}`);
    spotMarkers.push(marker);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function taxonSearchName(item) {
  return item.latin.replace(/\s+agg\.$/i, "").trim();
}

async function loadSpeciesReference(item, details) {
  if (details.dataset.loaded === "true") return;
  details.dataset.loaded = "true";
  const media = details.querySelector(".species-media");
  const query = taxonSearchName(item);
  const fallbackUrl = `https://www.inaturalist.org/taxa/search?q=${encodeURIComponent(query)}`;
  media.innerHTML = `<p class="microcopy">Chargement de la photo de référence…</p>`;
  try {
    const response = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&rank=species&per_page=5`);
    if (!response.ok) throw new Error("photo");
    const payload = await response.json();
    const taxon = payload.results?.find(result => result.name?.toLowerCase() === query.toLowerCase()) || payload.results?.[0];
    const photo = taxon?.default_photo;
    if (!taxon || !photo?.medium_url) throw new Error("photo");
    media.innerHTML = `
      <img class="species-photo" src="${escapeHtml(photo.medium_url)}" alt="Photo de référence de ${escapeHtml(item.name)}" loading="lazy">
      <p class="photo-credit">${escapeHtml(photo.attribution || "Photo publiée sur iNaturalist")}</p>
      <div class="identification-links">
        <a href="https://www.inaturalist.org/taxa/${taxon.id}" target="_blank" rel="noopener noreferrer">Autres photos sur iNaturalist ↗</a>
        <a href="https://fongibase.fongifrance.fr/" target="_blank" rel="noopener noreferrer">Consulter FongiBase ↗</a>
        <a href="https://www.mycofrance.fr/contact/" target="_blank" rel="noopener noreferrer">Contacter la Société mycologique de France ↗</a>
      </div>`;
  } catch {
    media.innerHTML = `
      <p class="microcopy">Photo indisponible pour le moment.</p>
      <div class="identification-links">
        <a href="${fallbackUrl}" target="_blank" rel="noopener noreferrer">Chercher les photos sur iNaturalist ↗</a>
        <a href="https://fongibase.fongifrance.fr/" target="_blank" rel="noopener noreferrer">Consulter FongiBase ↗</a>
        <a href="https://www.mycofrance.fr/contact/" target="_blank" rel="noopener noreferrer">Contacter la Société mycologique de France ↗</a>
      </div>`;
  }
}

function renderSpecies() {
  const groups = ["Tous", ...new Set(species.map(item => item.group))];
  document.querySelector("#speciesFilters").innerHTML = groups.map(group =>
    `<button class="filter-chip ${group === selectedGroup ? "active" : ""}" data-group="${group}" type="button">${group}</button>`
  ).join("");
  const visible = species.filter(item => selectedGroup === "Tous" || item.group === selectedGroup);
  document.querySelector("#speciesList").innerHTML = visible.map(item => `
    <article class="species-card">
      <div class="species-top">
        <div><p class="species-name">${item.name}</p><p class="latin">${item.latin}</p></div>
        <span class="season">${item.season}</span>
      </div>
      <p class="microcopy">${item.habitat}</p>
      <p class="risk">⚠ ${item.risk}</p>
      <details class="species-identification" data-species-id="${item.id}">
        <summary>Photos et aide à l’identification</summary>
        <div class="species-media"><p class="microcopy">Ouvrez cette fiche pour charger une photo.</p></div>
        <p class="identification-warning">Une ressemblance visuelle ne suffit jamais pour décider de consommer un champignon.</p>
      </details>
    </article>`).join("");
  document.querySelectorAll(".filter-chip").forEach(button => button.addEventListener("click", () => {
    selectedGroup = button.dataset.group;
    renderSpecies();
  }));
  document.querySelectorAll(".species-identification").forEach(details => details.addEventListener("toggle", () => {
    if (!details.open) return;
    const item = species.find(entry => entry.id === details.dataset.speciesId);
    if (item) loadSpeciesReference(item, details);
  }));
}

function sumRecent(values, end, days) {
  return values.slice(Math.max(0, end - days), end).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function daysSinceTriggerRain(daily, end, threshold) {
  for (let index = end - 1; index >= Math.max(0, end - 21); index--) {
    if (Number(daily.precipitation_sum[index] || 0) >= threshold) return end - 1 - index;
  }
  return null;
}

function rangeScore(value, [low, high], maximum) {
  if (!Number.isFinite(value)) return Math.round(maximum * .35);
  if (value >= low && value <= high) return maximum;
  const span = Math.max(high - low, .01);
  const distance = value < low ? low - value : value - high;
  return Math.max(0, Math.round(maximum * (1 - distance / span)));
}

function growthModelForDay(item, model, end, moisture = model?.moisture, soilTemperature = model?.soilTemperature) {
  if (!item || !model?.data?.daily) return null;
  const profile = GROWTH_PROFILES[item.id] || GROWTH_PROFILES.default;
  const daily = model.data.daily;
  const rain = sumRecent(daily.precipitation_sum, end, profile.rainDays);
  const et0 = sumRecent(daily.et0_fao_evapotranspiration, end, profile.rainDays);
  const balance = rain - et0;
  const today = daily.time[Math.max(0, end - 1)] || new Date().toISOString().slice(0, 10);
  const seasonal = Math.min(22, Math.round(seasonScoreFor(item, today) * 1.22));
  const rainPoints = Math.min(26, Math.round(rain / profile.rainTarget * 26));
  const balancePoints = Math.max(0, Math.min(14, Math.round(7 + balance / 8)));
  const moisturePoints = rangeScore(moisture, profile.moisture, 20);
  const temperaturePoints = rangeScore(soilTemperature, profile.soilTemp, 18);
  const score = Math.max(0, Math.min(100, seasonal + rainPoints + balancePoints + moisturePoints + temperaturePoints));
  return {
    score, rain, balance, seasonal, rainPoints, balancePoints, moisturePoints, temperaturePoints,
    daysSinceRain: daysSinceTriggerRain(daily, end, profile.triggerRain), profile
  };
}

function growthModelFor(item, model = centerWeatherModel) {
  return growthModelForDay(item, model, model?.historyDays || 0);
}

function forecastSoilAverage(model, dailyIndex, field, fallback) {
  const values = model?.soilData?.hourly?.[field];
  if (!Array.isArray(values)) return fallback;
  const start = Math.max(0, dailyIndex * 24);
  const slice = values.slice(start, start + 24).filter(Number.isFinite);
  return slice.length ? slice.reduce((sum, value) => sum + value, 0) / slice.length : fallback;
}

function growthModelForForecastDay(item, model, offset) {
  const dailyIndex = (model?.historyDays || 0) + offset;
  const moisture = forecastSoilAverage(model, dailyIndex, "soil_moisture_0_to_7cm", model?.moisture);
  const soilTemperature = forecastSoilAverage(model, dailyIndex, "soil_temperature_0cm", model?.soilTemperature);
  const result = growthModelForDay(item, model, dailyIndex + 1, moisture, soilTemperature);
  return result ? { ...result, moisture, soilTemperature, date: model.data.daily.time[dailyIndex] } : null;
}

function growthLevel(score) {
  if (score >= 80) return { css: "strong", label: "Forte pousse probable" };
  if (score >= 65) return { css: "good", label: "Conditions favorables" };
  if (score >= 45) return { css: "possible", label: "Pousse possible, encore incertaine" };
  if (score >= 25) return { css: "wait", label: "Conditions en préparation" };
  return { css: "low", label: "Pousse peu probable actuellement" };
}

function renderGrowthIndicator() {
  const item = species.find(entry => entry.id === selectedMapSpecies);
  const model = growthSummaryForView(item);
  if (!item || !model) return;
  const indicator = document.querySelector("#growthIndicator");
  const level = growthLevel(model.score);
  indicator.className = `growth-indicator level-${level.css}`;
  document.querySelector("#growthSpecies").textContent = item.name;
  document.querySelector("#growthValue").textContent = `${model.score}/100`;
  document.querySelector("#growthBar").style.width = `${model.score}%`;
  document.querySelector("#growthStatus").textContent = level.label;
  const rainAge = model.daysSinceRain >= 21 ? `aucune pluie ≥ ${model.profile.triggerRain} mm depuis 21 j` : `dernière pluie ≥ ${model.profile.triggerRain} mm il y a ~${model.daysSinceRain} j`;
  document.querySelector("#growthExplanation").textContent = `${model.rain.toFixed(1)} mm/${model.profile.rainDays} j · bilan ${model.balance >= 0 ? "+" : ""}${model.balance.toFixed(1)} mm · sol ${(model.moisture * 100).toFixed(0)} % et ${model.soilTemperature.toFixed(1)} °C · ${rainAge}.`;
  document.querySelector("#growthScope").textContent = `Vue cartographique · ${viewExtentLabel(model.sample)} · plage ${model.minScore}–${model.maxScore}/100`;
}

function renderWeatherOverview() {
  const model = weatherSummaryForView();
  if (!model) return;
  document.querySelector("#weatherScore").textContent = `${Math.round(model.potential)}/100`;
  document.querySelector("#weatherDetails").textContent = `${viewExtentLabel(model.sample)} · ${model.rain.toFixed(1)} mm/21 j · bilan hydrique ${model.balance >= 0 ? "+" : ""}${model.balance.toFixed(1)} mm · humidité du sol ${(model.moisture * 100).toFixed(0)} % · sol ${model.soilTemperature.toFixed(1)} °C.`;
}

function renderSpatialWeatherIndicators() {
  renderWeatherOverview();
  renderGrowthIndicator();
  renderBestDays();
}

async function loadWeather() {
  const loadToken = areaLoadToken;
  const requestedPoints = weatherPoints;
  const score = document.querySelector("#weatherScore");
  const details = document.querySelector("#weatherDetails");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: requestedPoints.map(point => point.lat).join(","),
    longitude: requestedPoints.map(point => point.lng).join(","),
    models: "meteofrance_seamless",
    daily: "precipitation_sum,temperature_2m_mean,et0_fao_evapotranspiration",
    hourly: "soil_temperature_0cm,soil_moisture_0_to_7cm,relative_humidity_2m",
    past_days: "21",
    forecast_days: "7",
    timezone: "Europe/Paris"
  });
  const soilUrl = new URL("https://api.open-meteo.com/v1/forecast");
  soilUrl.search = new URLSearchParams({
    latitude: requestedPoints.map(point => point.lat).join(","),
    longitude: requestedPoints.map(point => point.lng).join(","),
    hourly: "soil_temperature_0cm,soil_moisture_0_to_7cm,relative_humidity_2m",
    past_days: "21",
    forecast_days: "7",
    timezone: "Europe/Paris"
  });
  try {
    const [response, soilResponse] = await Promise.all([fetch(url), fetch(soilUrl)]);
    if (!response.ok || !soilResponse.ok) throw new Error("weather");
    const [payload, soilPayload] = await Promise.all([response.json(), soilResponse.json()]);
    const datasets = Array.isArray(payload) ? payload : [payload];
    const soilDatasets = Array.isArray(soilPayload) ? soilPayload : [soilPayload];
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
    const models = datasets.map((data, index) => {
      const soilData = soilDatasets[index] || data;
      const historyDays = Math.max(1, data.daily.time.indexOf(today));
      const rain = data.daily.precipitation_sum.slice(0, historyDays).reduce((sum, value) => sum + (value || 0), 0);
      const et0 = data.daily.et0_fao_evapotranspiration.slice(0, historyDays).reduce((sum, value) => sum + (value || 0), 0);
      const temperatures = data.daily.temperature_2m_mean.slice(0, historyDays).filter(Number.isFinite);
      const mean = temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length;
      const historicalHours = historyDays * 24;
      const moistureValues = soilData.hourly.soil_moisture_0_to_7cm.slice(Math.max(0, historicalHours - 72), historicalHours).filter(Number.isFinite);
      const soilTemperatures = soilData.hourly.soil_temperature_0cm.slice(Math.max(0, historicalHours - 72), historicalHours).filter(Number.isFinite);
      const moisture = moistureValues.reduce((sum, value) => sum + value, 0) / moistureValues.length;
      const soilTemperature = soilTemperatures.reduce((sum, value) => sum + value, 0) / soilTemperatures.length;
      const rainScore = Math.min(43, rain * 1.35);
      const balance = rain - et0;
      const balanceScore = Math.max(0, Math.min(20, 10 + balance * .7));
      const moistureScore = moisture >= .28 ? 22 : moisture >= .20 ? 16 : moisture >= .14 ? 9 : 3;
      const soilTemperatureScore = soilTemperature >= 8 && soilTemperature <= 20 ? 15 : soilTemperature >= 4 && soilTemperature <= 24 ? 9 : 3;
      return {
        ...requestedPoints[index], data, soilData, historyDays, rain, et0, balance, mean, moisture, soilTemperature,
        potential: Math.round(Math.min(100, rainScore + balanceScore + moistureScore + soilTemperatureScore))
      };
    });
    if (loadToken !== areaLoadToken) return;
    const centerModel = models[0];
    centerWeatherModel = centerModel;
    weatherNodes = models;
    weatherSeries = centerModel.data.daily;
    weatherHistoryDays = centerModel.historyDays;
    weatherPotential = centerModel.potential;
    renderSpatialWeatherIndicators();
    if (forestFeatures.length) renderForestZones();
    renderBestDays();
  } catch {
    if (loadToken !== areaLoadToken) return;
    centerWeatherModel = null;
    score.textContent = "Hors ligne";
    details.textContent = "Les données météo seront actualisées à la prochaine connexion.";
    document.querySelector("#bestDays").innerHTML = "<p class='muted'>Prévisions indisponibles hors connexion.</p>";
    document.querySelector("#growthSpecies").textContent = "Indisponible hors ligne";
    document.querySelector("#growthValue").textContent = "—/100";
    document.querySelector("#growthBar").style.width = "0%";
    document.querySelector("#growthStatus").textContent = "Données météo indisponibles";
    document.querySelector("#growthExplanation").textContent = "L'indicateur sera recalculé à la prochaine connexion.";
    document.querySelector("#growthScope").textContent = "Vue cartographique indisponible hors connexion";
  }
}

function seasonScoreFor(item, isoDate) {
  const month = new Date(`${isoDate}T12:00:00`).getMonth() + 1;
  const text = item.season.toLowerCase();
  const allowed = [];
  if (text.includes("printemps")) allowed.push(3, 4, 5);
  if (text.includes("été")) allowed.push(6, 7, 8);
  if (text.includes("automne")) allowed.push(9, 10, 11);
  if (text.includes("hiver")) allowed.push(12, 1, 2);
  const calendarScore = allowed.includes(month) ? 15 : 2;
  const observedMonths = observationModel.species?.[item.id]?.months || [];
  const peak = Math.max(...observedMonths, 0);
  if (!peak) return calendarScore;
  const observedScore = 2 + 16 * Number(observedMonths[month - 1] || 0) / peak;
  return Math.round(calendarScore * .45 + observedScore * .55);
}

function renderBestDays() {
  if (!weatherNodes.length) return;
  const selected = species.find(item => item.id === selectedMapSpecies);
  const sample = visibleWeatherLocations(90);
  const days = Array.from({ length: 7 }, (_, offset) => forecastGrowthSummaryForView(selected, offset, sample)).filter(Boolean);
  if (!days.length) return;
  const bestScore = Math.max(...days.map(day => day.score));
  const current = growthSummaryForView(selected)?.score ?? days[0].score;
  document.querySelector("#timingIntro").textContent = `${selected.name} · ${viewExtentLabel(sample)}`;
  document.querySelector("#bestDays").innerHTML = days.map((day, index) => {
    const previous = index ? days[index - 1].score : current;
    const delta = day.score - previous;
    const trend = delta >= 4 ? "↗" : delta <= -4 ? "↘" : "→";
    const date = new Date(`${day.date}T12:00:00`);
    const title = `${day.score}/100 (plage ${day.minScore}–${day.maxScore}) · pluie ${day.rain.toFixed(1)} mm · bilan ${day.balance >= 0 ? "+" : ""}${day.balance.toFixed(1)} mm · sol ${(day.moisture * 100).toFixed(0)} % et ${day.soilTemperature.toFixed(1)} °C`;
    return `
    <article class="forecast-day ${day.score === bestScore ? "best" : ""}" title="${title}" aria-label="${title}">
      <strong>${new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(".", "")}</strong>
      <span class="forecast-date">${new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date)}</span>
      <span class="day-score">${day.score}</span>
      <span class="day-trend" aria-hidden="true">${trend}</span>
    </article>`;
  }).join("");
}

function useCurrentPosition({ centerMap = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(position => {
      pendingPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
      document.querySelector("#spotLocation").textContent = `Position : ${pendingPosition.lat.toFixed(5)}, ${pendingPosition.lng.toFixed(5)}`;
      if (map && centerMap) {
        if (userMarker) userMarker.remove();
        userMarker = L.circleMarker([pendingPosition.lat, pendingPosition.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2b6de0", fillOpacity: 1 }).addTo(map);
        map.setView([pendingPosition.lat, pendingPosition.lng], 14);
      }
      resolve(pendingPosition);
    }, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
}

function initForm() {
  const dialog = document.querySelector("#spotDialog");
  const select = document.querySelector("#spotSpecies");
  select.innerHTML = species.map(item => `<option value="${item.id}">${item.name}</option>`).join("");
  document.querySelector("#spotDate").value = new Date().toISOString().slice(0, 10);
  document.querySelector("#addSpotButton").addEventListener("click", () => {
    pendingPosition = map ? { lat: map.getCenter().lat, lng: map.getCenter().lng } : { lat: activeArea.lat, lng: activeArea.lng };
    document.querySelector("#spotLocation").textContent = `Position : ${pendingPosition.lat.toFixed(5)}, ${pendingPosition.lng.toFixed(5)}`;
    dialog.showModal();
  });
  document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
  document.querySelector("#useLocationButton").addEventListener("click", async event => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Localisation…";
    try { await useCurrentPosition(); }
    catch { document.querySelector("#spotLocation").textContent = "Position indisponible : autorisez la localisation dans Safari."; }
    event.currentTarget.disabled = false;
    event.currentTarget.textContent = "Utiliser ma position";
  });
  document.querySelector("#spotForm").addEventListener("submit", event => {
    event.preventDefault();
    const spots = loadSpots();
    spots.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      species: select.value,
      outcome: document.querySelector("input[name='spotOutcome']:checked")?.value || "found",
      date: document.querySelector("#spotDate").value,
      note: document.querySelector("#spotNote").value.trim(),
      ...pendingPosition
    });
    saveSpots(spots);
    renderSpots();
    if (forestFeatures.length) renderForestZones();
    document.querySelector("#spotNote").value = "";
    dialog.close();
  });
  document.querySelector("#locateButton").addEventListener("click", async () => {
    try { await useCurrentPosition({ centerMap: true }); }
    catch { alert("Autorisez la localisation pour MycoMy dans les réglages Safari."); }
  });
}

function updateAreaControls() {
  advancedFilters = { radius: activeArea.radius, minScore: 0, forest: "all" };
  document.querySelector("#weatherTitle").textContent = `Indice météo spatialisé · ${activeArea.name}`;
  document.querySelector("#areaChoiceLabel").textContent = `${activeArea.name} · ${activeArea.radius} km`;
  document.querySelector("#areaSelect").value = activeArea.id;
}

function switchArea(areaId) {
  const nextArea = SEARCH_AREAS[areaId];
  if (!nextArea || nextArea.id === activeArea.id) return;
  areaLoadToken++;
  terrainRequestToken++;
  activeArea = nextArea;
  try { localStorage.setItem("mycomy-active-area", activeArea.id); } catch { /* préférence facultative */ }
  weatherPoints = weatherPointsFor(activeArea);
  pendingPosition = { lat: activeArea.lat, lng: activeArea.lng };
  advancedFilters = { ...advancedFilters, radius: activeArea.radius };
  observationModel = { species: {} };
  rppProfiles = [];
  forestMetadata = {};
  candidateContextProfiles = [];
  candidateContextAssignments = [];
  candidateContextState = "idle";
  contextIndexByFeature = new WeakMap();
  forestFeatures = [];
  renderedFeatures = [];
  weatherNodes = [];
  weatherSeries = null;
  centerWeatherModel = null;
  fineTerrainCache.clear();
  if (forestLayer) { forestLayer.remove(); forestLayer = null; }
  if (hydroLayer) { hydroLayer.remove(); hydroLayer = null; }
  if (bestPlaceMarker) { bestPlaceMarker.remove(); bestPlaceMarker = null; }
  updateAreaControls();
  renderAreaFocus();
  map.setView([activeArea.lat, activeArea.lng], activeArea.zoom);
  document.querySelector("#zoneStatus").textContent = `Chargement des forêts autour de ${activeArea.name}…`;
  document.querySelector("#weatherScore").textContent = "—";
  document.querySelector("#weatherDetails").textContent = `Chargement de la météo de ${activeArea.name}…`;
  loadForestZones();
  loadWeather();
}

function initMapControls() {
  updateAreaControls();
  document.querySelector("#areaSelect").addEventListener("change", event => switchArea(event.currentTarget.value));
  const mapSpecies = document.querySelector("#mapSpecies");
  mapSpecies.innerHTML = species.map(item => `<option value="${item.id}">${item.name}</option>`).join("");
  mapSpecies.value = selectedMapSpecies;
  mapSpecies.addEventListener("change", () => {
    selectedMapSpecies = mapSpecies.value;
    if (bestPlaceMarker) { bestPlaceMarker.remove(); bestPlaceMarker = null; }
    if (forestFeatures.length) renderForestZones();
    renderBestDays();
    renderGrowthIndicator();
  });
  document.querySelector("#bestPlaceButton").addEventListener("click", showBestPlace);
  document.querySelector("#toggleZonesButton").addEventListener("click", event => {
    zonesVisible = !zonesVisible;
    event.currentTarget.classList.toggle("active", zonesVisible);
    event.currentTarget.setAttribute("aria-pressed", String(zonesVisible));
    if (forestLayer) zonesVisible ? forestLayer.addTo(map) : forestLayer.remove();
    updateDetailLayers();
  });
  document.querySelector("#toggleLidarButton").addEventListener("click", event => {
    lidarVisible = !lidarVisible;
    event.currentTarget.classList.toggle("active", lidarVisible);
    event.currentTarget.setAttribute("aria-pressed", String(lidarVisible));
    updateDetailLayers();
    if (lidarVisible && map.getZoom() < 14) map.setZoom(14);
  });
  const setExpanded = expanded => {
    document.body.classList.toggle("map-expanded", expanded);
    setTimeout(() => map?.invalidateSize(), 50);
  };
  document.querySelector("#expandMapButton").addEventListener("click", () => setExpanded(true));
  document.querySelector("#closeMapButton").addEventListener("click", () => setExpanded(false));
}

async function prepareServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  try {
    const previousController = navigator.serviceWorker.controller;
    const registration = await navigator.serviceWorker.register("sw.js?v=12.1", { updateViaCache: "none" });
    await registration.update();
    if (previousController && navigator.serviceWorker.controller === previousController) {
      await Promise.race([
        new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true })),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    }
  } catch { /* l'application fonctionne aussi sans cache PWA */ }
}

async function boot() {
  await prepareServiceWorker();
  renderSpecies();
  initMap();
  initForm();
  initMapControls();
  loadWeather();
}

boot();


