const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function dataset(moisture = .10, rain = .2, et0 = 3) {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());
  const origin = Date.parse(today + 'T12:00:00Z');
  const dates = Array.from({ length: 28 }, (_, i) => new Date(origin + (i - 21) * 86400000).toISOString().slice(0, 10));
  const data = {
    daily: { time: dates, precipitation_sum: dates.map(() => rain), et0_fao_evapotranspiration: dates.map(() => et0), temperature_2m_mean: dates.map(() => 14) },
    hourly: { time: [], soil_moisture_0_to_7cm: [], soil_temperature_0cm: [] }
  };
  dates.forEach((date, day) => {
    for (let hour = 0; hour < 24; hour++) {
      data.hourly.time.push(date + 'T' + String(hour).padStart(2, '0') + ':00');
      data.hourly.soil_moisture_0_to_7cm.push(typeof moisture === 'function' ? moisture(day) : moisture);
      data.hourly.soil_temperature_0cm.push(14);
    }
  });
  return data;
}

function context(data = dataset(), runtime = false) {
  const nodes = new Map();
  const ctx = vm.createContext({
    URL, URLSearchParams, console: { info() {}, warn() {}, error() {} },
    location: { protocol: 'https:' }, navigator: { onLine: true },
    localStorage: { getItem() { return null; } },
    document: { querySelector(key) { if (!nodes.has(key)) nodes.set(key, { style: {} }); return nodes.get(key); } },
    fetch: async () => ({ ok: true, json: async () => [data] })
  });
  const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace(/^boot\(\);\s*$/m, '');
  vm.runInContext(source, ctx);
  if (runtime) vm.runInContext(fs.readFileSync(path.join(root, 'runtime-v12.5.js'), 'utf8'), ctx);
  vm.runInContext('renderSpatialWeatherIndicators = () => {}; renderForestZones = () => {}; renderBestDays = () => {}; seasonScoreFor = () => 18;', ctx);
  ctx.fixture = { data, soilData: data, historyDays: 21, moisture: .10, soilTemperature: 14, lat: 47.7006, lng: 7.3606 };
  return ctx;
}

test('a sustained severe drought limits even a perfect score to low potential', () => {
  const ctx = context();
  const state = vm.runInContext('hydricStateForDay(fixture, 21)', ctx);
  assert.ok(state.known);
  assert.ok(state.cap <= 25);
  assert.ok(vm.runInContext('limitScoreForDrought(100, hydricStateForDay(fixture, 21))', ctx) <= 25);
});

test('wet soil and a positive water balance leave the score unchanged', () => {
  const ctx = context(dataset(.30, 4, 2));
  assert.equal(vm.runInContext('limitScoreForDrought(90, hydricStateForDay(fixture, 21))', ctx), 90);
});

test('a recent wet day cannot erase three weeks of drought', () => {
  const ctx = context(dataset(day => day === 20 ? .35 : .09));
  const state = vm.runInContext('hydricStateForDay(fixture, 21)', ctx);
  assert.ok(state.moisture < .15);
  assert.ok(state.cap < 45);
});

test('null or missing measurements are not treated as zero moisture or zero rain', () => {
  const ctx = context(dataset(null, null, null));
  const state = vm.runInContext('hydricStateForDay(fixture, 21)', ctx);
  assert.equal(state.known, false);
  assert.equal(state.cap, 100);
  assert.ok(Number.isNaN(state.moisture));
});

test('forecast measurements cannot leak into past hydric assessments', () => {
  const a = context(dataset(day => day >= 21 ? .90 : .10));
  const b = context(dataset(.10));
  assert.equal(vm.runInContext('hydricStateForDay(fixture, 21).moisture', a), vm.runInContext('hydricStateForDay(fixture, 21).moisture', b));
});

test('spatial interpolation preserves a zero score and unknown moisture stays unavailable', () => {
  const ctx = context();
  assert.equal(vm.runInContext('weatherNodes = [{lat: 47.7, lng: 7.3, potential: 0}]; interpolatedWeatherValue(47.7, 7.3, node => node.potential, 35)', ctx), 0);
  assert.equal(vm.runInContext('formatSoilMoisture(NaN)', ctx), 'indisponible');
});

test('species needing wetter soil receive a stronger limit', () => {
  const ctx = context(dataset(.19, 2, 2));
  assert.ok(vm.runInContext('hydricStateForDay(fixture, 21, .23).factor < hydricStateForDay(fixture, 21, .16).factor', ctx));
});

test('growth and forecasts use rolling soil moisture and apply the limit', () => {
  const ctx = context(dataset(day => day >= 21 ? .35 : .09));
  const current = vm.runInContext('growthModelFor({id: "cepe-bordeaux"}, fixture)', ctx);
  const forecast = vm.runInContext('growthModelForForecastDay({id: "cepe-bordeaux"}, fixture, 0)', ctx);
  assert.ok(current.score < current.rawScore);
  assert.ok(forecast.moisture < .20);
  assert.ok(forecast.score <= forecast.droughtCap);
});

test('good habitat and historical bonuses cannot bypass the drought limit', () => {
  const ctx = context();
  const result = vm.runInContext(`
    weatherNodes = [fixture];
    compatibilityFor = environmentCompatibilityFor = treeRppCompatibilityFor = phCompatibilityFor = observationBoost = userCalibrationBoost = soilTypologyCompatibilityFor = () => 100;
    modelConfidence = () => 90;
    featureModel({properties: {}, geometry: {coordinates: [[[7.35,47.69],[7.37,47.69],[7.37,47.71],[7.35,47.71],[7.35,47.69]]]}});
  `, ctx);
  assert.equal(result.rawScore, 100);
  assert.ok(result.score <= 25);
  assert.ok(result.components.secheresse < 0);
});

test('estimated harvest cannot exceed the current drought ceiling', () => {
  const ctx = context();
  const result = vm.runInContext(`
    forecastGrowthSummaryForView = (item, offset) => ({score: offset < 0 ? 95 : 10, droughtCap: 20});
    harvestSummaryForView({id: 'cepe-bordeaux'}, 0, {});
  `, ctx);
  assert.equal(result.score, 20);
});

for (const runtime of [false, true]) {
  test((runtime ? 'active runtime' : 'base loader') + ' uses the 21-day history and the drought limiter', async () => {
    const ctx = context(dataset(day => day >= 18 ? .30 : .09), runtime);
    await vm.runInContext('loadWeather()', ctx);
    const node = vm.runInContext('weatherNodes[0]', ctx);
    assert.ok(node, 'a weather node should be loaded');
    assert.ok(node.moisture < .20, 'the last 72 hours must not replace the 21-day history');
    assert.ok(node.potential <= node.droughtCap);
    assert.ok(node.droughtCap < 80);
  });
}
