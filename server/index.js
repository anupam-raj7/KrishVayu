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
const chat = require('./services/chatService');

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

// Shared by the dashboard and the chatbot. Returns { status, body }.
async function buildDashboard(farmer, q) {
  const block = q.block || farmer.block;
  const village = q.village || farmer.village;
  const place = location.find(block, village);
  if (!place) return { status: 400, body: { error: 'invalid_location' } };

  const today = weather.todayIST();
  const date = q.date || today;
  let days;
  try {
    days = await weather.getDays(place.lat, place.lon);
  } catch (err) {
    console.error(err.message);
    return { status: 502, body: { error: 'weather_unavailable' } };
  }

  const i = days.findIndex(d => d.date === date);
  if (i < 0) return { status: 400, body: { error: 'date_out_of_range' } };
  const day = days[i];
  const ti = days.findIndex(d => d.date === today);
  const upcoming = days.slice(ti, ti + 7);

  const result = await prediction.predictRainfall({
    district: location.district(), block, village, date,
    temperature: day.temp, dewPoint: day.dewPoint, humidity: day.humidity,
    blockRainfall: rainfall.blockRainfall(days, date),
    history: days.slice(Math.max(0, i - 30), i) // past days, for models that use lag features
  });

  return {
    status: 200,
    body: {
      place: { district: location.district(), block, village },
      date, day, prediction: result,
      chart: days.slice(Math.max(0, ti - 7), ti + 7).map(d => ({ date: d.date, rain: d.rain, past: d.date < today })),
      crops: crops.recommend(Number(date.slice(5, 7)), upcoming),
      advice: crops.advice(upcoming.slice(0, 3))
    }
  };
}

app.get('/api/dashboard', requireAuth, async (req, res, next) => {
  try {
    const r = await buildDashboard(await getFarmer(req.farmerId), req.query);
    res.status(r.status).json(r.body);
  } catch (err) { next(err); }
});

// Chatbot: max 20 messages per farmer per hour (protects the free Groq quota).
const chatHits = new Map();
function chatLimit(req, res, next) {
  const now = Date.now();
  const recent = (chatHits.get(req.farmerId) || []).filter(t => now - t < 3600e3);
  if (recent.length >= 20) return res.status(429).json({ error: 'chat_limit' });
  chatHits.set(req.farmerId, [...recent, now]);
  next();
}

app.post('/api/chat', requireAuth, chatLimit, async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 300);
  if (!message) return res.status(400).json({ error: 'invalid_input' });
  try {
    const farmer = await getFarmer(req.farmerId);
    const r = await buildDashboard(farmer, {
      block: String(req.body.block || ''), village: String(req.body.village || ''), date: String(req.body.date || '')
    });
    const reply = await chat.ask({ message, history: req.body.history, lang: req.body.lang, data: r.status === 200 ? r.body : null });
    res.json({ reply });
  } catch (err) {
    console.error('chat failed:', err.message);
    res.status(502).json({ error: 'chat_unavailable' });
  }
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
app.listen(port, () => {
  console.log('Running on http://localhost:' + port);
  prediction.warmModel();
});