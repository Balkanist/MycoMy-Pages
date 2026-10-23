const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function context(isoDate = '2026-10-23', runtime = false) {
  const instant = isoDate.includes('T') ? isoDate : isoDate + 'T10:00:00Z';
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return Date.parse(instant); }
  }
  const today = new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Paris'}).format(new Clock());
  const origin = Date.parse(today + 'T12:00:00Z');
  const dates = Array.from({length: 28}, (_, i) => new Date(origin + (i - 21) * 86400000).toISOString().slice(0, 10));
  const hourly = {time: [], soil_moisture_0_to_7cm: [], soil_temperature_0cm: []};
  for (const date of dates) for (let hour = 0; hour < 24; hour++) {
    hourly.time.push(date + 'T' + String(hour).padStart(2, '0') + ':00');
    hourly.soil_moisture_0_to_7cm.push(.28);
    hourly.soil_temperature_0cm.push(10);
  }
  const data = {daily: {time: dates, precipitation_sum: dates.map(() => 5), et0_fao_evapotranspiration: dates.map(() => 1), temperature_2m_mean: dates.map(() => 10)}, hourly};
  const nodes = new Map();
  const ctx = vm.createContext({Date: Clock, URL, URLSearchParams, console: {info() {}, warn() {}, error() {}},
    location: {protocol: 'https:'}, navigator: {onLine: true}, localStorage: {getItem() {return null;}},
    document: {querySelector(key) {if (!nodes.has(key)) nodes.set(key, {style: {}}); return nodes.get(key);}},
    alert(message) {ctx.alertText = message;}
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace(/^boot\(\);\s*$/m, ''), ctx);
  if (runtime) vm.runInContext(fs.readFileSync(path.join(root, 'runtime-v12.5.js'), 'utf8'), ctx);
  ctx.fixture = {data, soilData: data, historyDays: 21, moisture: .28, soilTemperature: 10, lat: 47.7006, lng: 7.3606, potential: 100, droughtCap: 100, droughtKnown: true};
  vm.runInContext('weatherNodes = [fixture]; centerWeatherModel = fixture;', ctx);
  ctx.nodes = nodes;
  return ctx;
}

test('all 21 species have an explicit, valid calendar and zero growth outside it', () => {
  const ctx = context();
  vm.runInContext(`
    if (species.length !== 21 || Object.keys(FRUITING_MONTHS).length !== species.length) throw Error('Incomplete calendar');
    for (const item of species) {
      const months = FRUITING_MONTHS[item.id];
      if (!months?.length || new Set(months).size !== months.length || months.some(month => month < 1 || month > 12)) throw Error('Invalid months for ' + item.id);
      for (let month = 1; month <= 12; month++) {
        if (months.includes(month)) continue;
        const date = '2026-' + String(month).padStart(2, '0') + '-15';
        if (seasonScoreFor(item, date) !== 0) throw Error('Season bonus outside season: ' + item.id);
        if (growthModelForDay(item, fixture, 21, .28, 10, date).score !== 0) throw Error('Growth outside season: ' + item.id);
      }
    }
  `, ctx);
});

test('both morels and St George mushroom remain at zero in autumn despite perfect weather and GBIF peaks', () => {
  const ctx = context();
  vm.runInContext(`
    for (const id of ['morille-commune', 'morille-conique', 'saint-georges']) {
      observationModel.species[id] = {months: [0,0,0,0,0,0,0,0,0,100000,0,0]};
      const item = species.find(entry => entry.id === id);
      if (growthModelFor(item, fixture).score !== 0) throw Error('Autumn growth: ' + id);
      for (let day = 0; day < 7; day++) if (growthModelForForecastDay(item, fixture, day).score !== 0) throw Error('Autumn forecast: ' + id);
    }
  `, ctx);
});

test('the current day opens the season on March 1 even though the weather history ends in February', () => {
  const ctx = context('2026-03-01');
  const result = vm.runInContext('growthModelFor(species.find(item => item.id === "morille-commune"), fixture)', ctx);
  assert.equal(result.inSeason, true);
  assert.ok(result.score > 0);
});

test('a harvest from recent in-season growth cannot bypass the closing date', () => {
  const ctx = context('2026-06-01');
  const result = vm.runInContext('harvestSummaryForView(species.find(item => item.id === "morille-commune"), 0, {locations: [{lat: fixture.lat, lng: fixture.lng}], total: 1, fallback: true})', ctx);
  assert.equal(result.score, 0);
});

test('a forecast can enter the next month without reopening earlier out-of-season dates', () => {
  const ctx = context('2026-02-27');
  const scores = vm.runInContext('Array.from({length: 4}, (_, offset) => growthModelForForecastDay(species.find(item => item.id === "morille-commune"), fixture, offset))', ctx);
  assert.equal(scores[0].score, 0);
  assert.equal(scores[1].score, 0);
  assert.ok(scores[2].score > 0);
});

test('winter species cross the year boundary and spring-to-autumn species include summer', () => {
  const ctx = context();
  for (const id of ['pleurote-huitre', 'collybie-veloutee']) {
    for (const date of ['2026-12-31', '2027-01-01']) assert.equal(vm.runInContext(`isFruitingSeason({id: '${id}'}, '${date}')`, ctx), true);
    assert.equal(vm.runInContext(`isFruitingSeason({id: '${id}'}, '2026-07-15')`, ctx), false);
  }
  assert.equal(vm.runInContext('isFruitingSeason({id: "pholiote-peuplier"}, "2026-07-15")', ctx), true);
});

test('habitat and personal bonuses cannot reopen the map or a best-place fallback out of season', () => {
  const ctx = context();
  const result = vm.runInContext(`
    selectedMapSpecies = 'morille-commune';
    compatibilityFor = environmentCompatibilityFor = treeRppCompatibilityFor = phCompatibilityFor = observationBoost = userCalibrationBoost = soilTypologyCompatibilityFor = () => 100;
    modelConfidence = () => 90;
    const feature = {properties: {}, geometry: {coordinates: [[[7.35,47.69],[7.37,47.69],[7.37,47.71],[7.35,47.71],[7.35,47.69]]]}};
    harvestSummaryForView = () => null;
    ({map: featureModel(feature), best: bestPlaceScore(feature, species.find(item => item.id === selectedMapSpecies))});
  `, ctx);
  assert.equal(result.map.rawScore, 100);
  assert.equal(result.map.score, 0);
  assert.equal(result.best.score, 0);
  assert.equal(result.best.harvestScore, 0);
});

test('the active renderer displays out-of-season zero scores and no recommended day', () => {
  const ctx = context('2026-10-23', true);
  vm.runInContext('selectedMapSpecies = "morille-commune"; renderGrowthIndicator(); renderBestDays(); showBestPlace();', ctx);
  assert.equal(ctx.nodes.get('#growthValue').textContent, '0/100');
  assert.match(ctx.nodes.get('#growthStatus').textContent, /Hors période/);
  assert.equal(ctx.nodes.get('#harvestValue').textContent, '0/100');
  assert.match(ctx.nodes.get('#harvestStatus').textContent, /Hors période/);
  assert.match(ctx.nodes.get('#harvestBestDay').textContent, /Aucun créneau/);
  assert.doesNotMatch(ctx.nodes.get('#bestDays').innerHTML, /forecast-day best/);
  assert.match(ctx.alertText, /hors période habituelle/);
});

test('calendar gating follows the date in Paris near a UTC month boundary', () => {
  const ctx = context('2026-05-31T22:30:00Z');
  assert.equal(vm.runInContext('calendarDateInParis()', ctx), '2026-06-01');
  assert.equal(vm.runInContext('growthModelFor(species.find(item => item.id === "morille-commune"), fixture).score', ctx), 0);
});

test('missing weather cannot leave an old positive score visible for an out-of-season species', () => {
  for (const runtime of [false, true]) {
    const ctx = context('2026-10-23', runtime);
    vm.runInContext('selectedMapSpecies = "morille-commune"; weatherNodes = []; centerWeatherModel = null; renderGrowthIndicator(); renderBestDays();', ctx);
    assert.equal(ctx.nodes.get('#growthValue').textContent, '0/100');
    assert.equal(ctx.nodes.get('#harvestValue').textContent, '0/100');
    assert.match(ctx.nodes.get('#growthStatus').textContent, /Hors période/);
  }
});
