const DAILY = [
  'precipitation_sum',
  'precipitation_probability_max',
  'temperature_2m_mean',
  'temperature_2m_max',
  'relative_humidity_2m_mean',
  'dew_point_2m_mean',
  'weather_code'
].join(',');

const WEATHER_API_URL =
  process.env.WEATHER_API_URL ||
  'https://api.open-meteo.com/v1/forecast';

const REQUEST_TIMEOUT_MS = 10000;

// Cache weather data for 30 minutes.
// This prevents repeated requests for the same location.
const CACHE_TTL_MS = 30 * 60 * 1000;

const cache = new Map();

// If multiple users request the same location at the same time,
// reuse the same Promise instead of making multiple API calls.
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
  // Round coordinates slightly so tiny floating-point differences
  // don't create separate cache entries.
  return `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWeather(url, options = {}) {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KrishVayu/1.0'
        }
      });

      // Success
      if (res.ok) {
        return res;
      }

      // Rate limited
      if (res.status === 429) {
        if (attempt === maxRetries) {
          throw new Error(
            'Weather API rate limit exceeded (429) after retries'
          );
        }

        const retryAfterHeader = res.headers.get('retry-after');

        let waitMs = 2000 * Math.pow(2, attempt);

        if (retryAfterHeader) {
          const retrySeconds = Number(retryAfterHeader);

          if (Number.isFinite(retrySeconds)) {
            waitMs = Math.min(retrySeconds * 1000, 15000);
          }
        }

        console.log(
          `Weather API returned 429. Retrying in ${waitMs}ms...`
        );

        await sleep(waitMs);
        continue;
      }

      throw new Error(
        `Weather API status ${res.status}`
      );

    } catch (error) {
      // Timeout/network error
      if (attempt === maxRetries) {
        throw error;
      }

      console.log(
        `Weather API request failed: ${error.message}. Retrying...`
      );

      await sleep(1000 * (attempt + 1));
    }
  }

  throw new Error('Weather API request failed');
}

exports.getDays = async (lat, lon) => {
  // Validate coordinates before making an external request.
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(
      `Invalid coordinates: lat=${lat}, lon=${lon}`
    );
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude: ${latitude}`);
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude: ${longitude}`);
  }

  const key = cacheKey(latitude, longitude);

  // --------------------------------------------------
  // 1. Check cache
  // --------------------------------------------------

  const cached = cache.get(key);

  if (cached) {
    const age = Date.now() - cached.timestamp;

    if (age < CACHE_TTL_MS) {
      console.log(`Weather cache HIT: ${key}`);
      return cached.data;
    }

    // Remove expired cache
    cache.delete(key);
  }

  // --------------------------------------------------
  // 2. Check if same request is already running
  // --------------------------------------------------

  if (pendingRequests.has(key)) {
    console.log(`Weather request already running: ${key}`);

    return pendingRequests.get(key);
  }

  // --------------------------------------------------
  // 3. Create new API request
  // --------------------------------------------------

  const requestPromise = (async () => {
    try {
      const q = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),

        daily: DAILY,

        // Keep the original behaviour:
        // last 30 days + today + next 6 days
        past_days: '30',
        forecast_days: '7',

        timezone: 'Asia/Kolkata'
      });

      const fullUrl = `${WEATHER_API_URL}?${q.toString()}`;

      console.log(
        `Fetching weather from Open-Meteo for ${key}`
      );

      const res = await fetchWeather(fullUrl);

      const body = await res.json();

      if (!body.daily || !Array.isArray(body.daily.time)) {
        throw new Error(
          'Weather API returned an invalid daily response'
        );
      }

      const d = body.daily;

      const result = d.time.map((date, i) => ({
        date,

        rain: d.precipitation_sum?.[i] ?? 0,

        rainProb:
          d.precipitation_probability_max?.[i] ?? null,

        temp:
          d.temperature_2m_mean?.[i] ?? null,

        tmax:
          d.temperature_2m_max?.[i] ?? null,

        humidity:
          d.relative_humidity_2m_mean?.[i] ?? null,

        dewPoint:
          d.dew_point_2m_mean?.[i] ?? null,

        condition:
          condition(d.weather_code?.[i])
      }));

      // --------------------------------------------------
      // 4. Save result in cache
      // --------------------------------------------------

      cache.set(key, {
        timestamp: Date.now(),
        data: result
      });

      console.log(
        `Weather cache UPDATED: ${key}`
      );

      return result;

    } finally {
      // Remove pending request when finished
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, requestPromise);

  return requestPromise;
};