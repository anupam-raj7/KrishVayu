// server/index.js  (full file)
require('dotenv').config();
const path = require('path');
const express = require('express');
const { router: authRouter, requireAuth, getFarmer } = require('./auth');
const location = require('./services/locationService');
const weather = require('./services/weatherService');
const rainfall = require('./services/rainfallService');
const prediction = require('./services/predictionService');
const crops = require('./services/cropService');

process.on('unhandledRejection', err => console.error(err));

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

app.get('/api/locations/blocks', (req, res) => res.json(location.blocks()));
app.get('/api/locations/villages', (req, res) => res.json(location.villages(req.query.block)));

// Direct prediction endpoint (AI first, block-level API fallback).
app.post('/api/prediction/rainfall', async (req, res) => {
  const { block, village, date, temperature, dewPoint, humidity, blockRainfall } = req.body;
  if (!block || !village || !date || ![temperature, dewPoint, humidity, blockRainfall].every(Number.isFinite))
    return res.status(400).json({ success: false, error: 'invalid_input' });
  res.json(await prediction.predictRainfall({ district: location.district(), ...req.body }));
});

// Everything the farmer dashboard needs for one village + date.
app.get('/api/dashboard', requireAuth, async (req, res, next) => {
  try {
    const farmer = await getFarmer(req.farmerId);
    const block = req.query.block || farmer.block;
    const village = req.query.village || farmer.village;
    const place = location.find(block, village);
    if (!place) return res.status(400).json({ error: 'invalid_location' });

    const today = weather.todayIST();
    const date = req.query.date || today;

    let days;
    try {
      days = await weather.getDays(place.lat, place.lon);
    } catch (err) {
      console.error(err.message);
      return res.status(502).json({ error: 'weather_unavailable' });
    }

    const i = days.findIndex(d => d.date === date);
    if (i < 0) return res.status(400).json({ error: 'date_out_of_range' });
    const day = days[i];
    const ti = days.findIndex(d => d.date === today);
    const upcoming = days.slice(ti, ti + 7);

    const result = await prediction.predictRainfall({
      district: location.district(), block, village, date,
      temperature: day.temp, dewPoint: day.dewPoint, humidity: day.humidity,
      blockRainfall: rainfall.blockRainfall(days, date),
      history: days.slice(Math.max(0, i - 30), i) // past days, for models that use lag features
    });

    res.json({
      place: { district: location.district(), block, village },
      date, day, prediction: result,
      chart: days.slice(Math.max(0, ti - 7), ti + 7).map(d => ({ date: d.date, rain: d.rain, past: d.date < today })),
      crops: crops.recommend(Number(date.slice(5, 7)), upcoming),
      advice: crops.advice(upcoming.slice(0, 3))
    });
  } catch (err) { next(err); }
});

// Frontend. If index.html is missing, the browser shows the exact path the server looked at.
const publicDir = path.join(__dirname, '..', 'public');
const indexFile = path.join(publicDir, 'index.html');
app.get('/', (req, res) =>
  res.sendFile(indexFile, err => err && res.status(500).send('index.html not found at: ' + indexFile)));
app.use(express.static(publicDir));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'generic' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Running on http://localhost:' + port));