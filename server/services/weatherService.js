const DAILY = [
  'precipitation_sum', 'precipitation_probability_max', 'temperature_2m_mean', 'temperature_2m_max',
  'relative_humidity_2m_mean', 'dew_point_2m_mean', 'weather_code'
].join(',');

const condition = c => (c == null ? 'cloudy' : c >= 95 ? 'storm' : c >= 51 && c <= 82 ? 'rain' : c <= 1 ? 'clear' : 'cloudy');

exports.todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// Last 30 days + today + next 6 days, one entry per day.
exports.getDays = async (lat, lon) => {
  const url = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
  const q = new URLSearchParams({ latitude: lat, longitude: lon, daily: DAILY, past_days: 30, forecast_days: 7, timezone: 'Asia/Kolkata' });
  const res = await fetch(`${url}?${q}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('Weather API status ' + res.status);
  const d = (await res.json()).daily;
  return d.time.map((date, i) => ({
    date,
    rain: d.precipitation_sum[i],
    rainProb: d.precipitation_probability_max[i],
    temp: d.temperature_2m_mean[i],
    tmax: d.temperature_2m_max[i],
    humidity: d.relative_humidity_2m_mean[i],
    dewPoint: d.dew_point_2m_mean[i],
    condition: condition(d.weather_code[i])
  }));
};
