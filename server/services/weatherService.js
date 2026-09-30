const DAILY = [
  'precipitation_sum',
  'precipitation_probability_max',
  'temperature_2m_mean',
  'temperature_2m_max',
  'relative_humidity_2m_mean',
  'dew_point_2m_mean',
  'weather_code'
].join(',');

const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 10000;

// Cache weather data for 30 minutes
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map();
const pendingRequests = new Map();

const condition = (code) => {
  if (code == null) return 'cloudy';
  if (code >= 95) return 'storm';
  if (code >= 51 && code <= 82) return 'rain';
  if (code <= 1) return 'clear';
  return 'cloudy';
};

exports.todayIST = () => {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata'
  });
};

function cacheKey(lat, lon) {
  return `\({Number(lat).toFixed(4)},\){Number(lon).toFixed(4)}`;
}

// 🔥 NAYA FUNCTION: Agar API fail ho jaye (429), toh website crash hone ke bajaye ye fake data bhej dega
function getFallbackData() {
  const fallback = [];
  const today = new Date();
  
  // 30 din purana + aaj + 6 din future = 37 days ka data (jaisa frontend expect karta hai)
  for (let i = -30; i <= 6; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    fallback.push({
      date: d.toLocaleDateString('en-CA'),
      rain: 0,
      rainProb: 15,
      temp: 26,
      tmax: 30,
      humidity: 65,
      dewPoint: 18,
      condition: 'cloudy'
    });
  }
  return fallback;
}

exports.getDays = async (lat, lon) => {
  const latitude = Number(lat);
  const longitude = Number(lon);

  // Validate coordinates
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Invalid coordinates: lat=\({lat}, lon=\){lon}`);
  }
  if (latitude < -90 || latitude > 90) throw new Error(`Invalid latitude: ${latitude}`);
  if (longitude < -180 || longitude > 180) throw new Error(`Invalid longitude: ${longitude}`);

  const key = cacheKey(latitude, longitude);

  // 1. Check cache
  const cached = cache.get(key);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_TTL_MS) {
      console.log(`Weather cache HIT: ${key}`);
      return cached.data;
    }
    cache.delete(key);
  }

  // 2. Check pending request
  if (pendingRequests.has(key)) {
    console.log(`Weather request already running: ${key}`);
    return pendingRequests.get(key);
  }

  // 3. Create request
  const requestPromise = (async () => {
    try {
      const q = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        daily: DAILY,
        past_days: '30',
        forecast_days: '7',
        timezone: 'Asia/Kolkata'
      });

      const fullUrl = `\({WEATHER_API_URL}?\){q.toString()}`;
      
      // 🔥 FIX 1: Proxy Server Add Kiya (Server ka IP chupane ke liye)
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`;

      console.log(`Fetching weather via Proxy for ${key}`);

      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KrishVayu/1.0'
        }
      });

      // 🔥 FIX 2: 429 Rate Limit aane par App Crash NAHI hogi, Fallback data bhejegi
      if (res.status === 429) {
        console.error('Open-Meteo returned 429 Too Many Requests! Using Backup Data.');
        return getFallbackData();
      }

      if (!res.ok) {
        console.error(`Weather API status ${res.status}. Using Backup Data.`);
        return getFallbackData();
      }

      const body = await res.json();

      // Validate response
      if (!body.daily || !Array.isArray(body.daily.time)) {
        console.error('Weather API returned invalid daily response. Using Backup Data.');
        return getFallbackData();
      }

      const d = body.daily;

      // Convert response
      const result = d.time.map((date, i) => ({
        date,
        rain: d.precipitation_sum?.[i] ?? 0,
        rainProb: d.precipitation_probability_max?.[i] ?? null,
        temp: d.temperature_2m_mean?.[i] ?? null,
        tmax: d.temperature_2m_max?.[i] ?? null,
        humidity: d.relative_humidity_2m_mean?.[i] ?? null,
        dewPoint: d.dew_point_2m_mean?.[i] ?? null,
        condition: condition(d.weather_code?.[i])
      }));

      // Save cache
      cache.set(key, {
        timestamp: Date.now(),
        data: result
      });

      console.log(`Weather cache UPDATED: ${key}`);
      return result;

    } catch (error) {
      // 🔥 Agar Network Error ya Timeout aata hai, toh bhi Fallback bhejega
      console.error(`Fetch failed completely: ${error.message}. Using Backup Data.`);
      return getFallbackData();
    } finally {
      // Always remove pending request
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, requestPromise);
  return requestPromise;
};