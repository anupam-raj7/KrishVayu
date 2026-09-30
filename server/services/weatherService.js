// server/services/weatherService.js  (full file)
// Gives the app one list of daily weather (30 past days + today + 6 forecast days) per location.
// Protection against rate limits / outages:
//   1. in-memory cache per location (WEATHER_CACHE_MINUTES, default 180)
//   2. one shared request when many users ask for the same block at once
//   3. retry, then a backup provider (Visual Crossing, if VISUAL_CROSSING_KEY is set)
//   4. if everything fails, serve the last cached data (up to 48 h old)

const TTL_MS = (Number(process.env.WEATHER_CACHE_MINUTES) || 180) * 60 * 1000;
const STALE_MAX_MS = 48 * 60 * 60 * 1000;
const cache = new Map();    // "lat,lon" -> { days, at }
const inFlight = new Map(); // "lat,lon" -> Promise

const sleep = ms => new Promise(r => setTimeout(r, ms));
const istDate = offset => new Date(Date.now() + offset * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
exports.todayIST = () => istDate(0);

// ---- provider 1: Open-Meteo ----
const DAILY = [
  'precipitation_sum', 'precipitation_probability_max', 'temperature_2m_mean', 'temperature_2m_max',
  'relative_humidity_2m_mean', 'dew_point_2m_mean', 'weather_code'
].join(',');
const wmoCondition = c => (c == null ? 'cloudy' : c >= 95 ? 'storm' : c >= 51 && c <= 82 ? 'rain' : c <= 1 ? 'clear' : 'cloudy');

async function fromOpenMeteo(lat, lon) {
  const base = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
  const q = new URLSearchParams({ latitude: lat, longitude: lon, daily: DAILY, past_days: 30, forecast_days: 7, timezone: 'Asia/Kolkata' });
  if (process.env.OPEN_METEO_API_KEY) q.set('apikey', process.env.OPEN_METEO_API_KEY); // only for a paid plan
  const res = await fetch(`${base}?${q}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('status ' + res.status);
  const d = (await res.json()).daily;
  return d.time.map((date, i) => ({
    date,
    rain: d.precipitation_sum[i],
    rainProb: d.precipitation_probability_max[i],
    temp: d.temperature_2m_mean[i],
    tmax: d.temperature_2m_max[i],
    humidity: d.relative_humidity_2m_mean[i],
    dewPoint: d.dew_point_2m_mean[i],
    condition: wmoCondition(d.weather_code[i])
  }));
}

// ---- provider 2 (backup): Visual Crossing, needs a free key ----
const vcCondition = icon => (/thunder/.test(icon || '') ? 'storm' : /rain|showers/.test(icon || '') ? 'rain' : /^clear/.test(icon || '') ? 'clear' : 'cloudy');

async function fromVisualCrossing(lat, lon) {
  const key = process.env.VISUAL_CROSSING_KEY;
  if (!key) throw new Error('VISUAL_CROSSING_KEY not set');
  const q = new URLSearchParams({
    unitGroup: 'metric', include: 'days', contentType: 'json', key,
    elements: 'datetime,temp,tempmax,humidity,dew,precip,precipprob,icon'
  });
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${istDate(-30)}/${istDate(6)}?${q}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('status ' + res.status);
  return (await res.json()).days.map(d => ({
    date: d.datetime,
    rain: d.precip ?? 0,
    rainProb: d.precipprob ?? null,
    temp: d.temp,
    tmax: d.tempmax,
    humidity: d.humidity,
    dewPoint: d.dew,
    condition: vcCondition(d.icon)
  }));
}

// ---- fetch with retry + provider fallback ----
async function withRetry(fn, tries = 2) {
  let lastError;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (err) {
      lastError = err;
      if (i < tries - 1) await sleep(700 * (i + 1));
    }
  }
  throw lastError;
}

async function fetchFresh(lat, lon) {
  for (const [name, provider] of [['Open-Meteo', fromOpenMeteo], ['Visual Crossing', fromVisualCrossing]]) {
    try {
      return await withRetry(() => provider(lat, lon));
    } catch (err) {
      console.warn(`${name} failed: ${err.message}`);
    }
  }
  throw new Error('All weather providers failed');
}

// ---- public function used by server/index.js ----
exports.getDays = async (lat, lon) => {
  const key = `${lat},${lon}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.days;

  if (!inFlight.has(key)) {
    inFlight.set(key, fetchFresh(lat, lon)
      .then(days => { cache.set(key, { days, at: Date.now() }); return days; })
      .finally(() => inFlight.delete(key)));
  }
  try {
    return await inFlight.get(key);
  } catch (err) {
    if (hit && Date.now() - hit.at < STALE_MAX_MS) {
      console.warn('Serving cached (old) weather for', key);
      return hit.days;
    }
    throw err;
  }
};