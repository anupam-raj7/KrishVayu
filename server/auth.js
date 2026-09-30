// server/auth.js  (full file)
// Storage: MongoDB if MONGODB_URI is set, otherwise a local JSON file (good for local development).
const fs = require('fs');
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const location = require('./services/locationService');

// ---------- storage ----------
let collection;
async function mongoCol() {
  if (!collection) {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    collection = client.db(process.env.MONGODB_DB || 'koraput').collection('farmers');
    await collection.createIndex({ farmerId: 1 }, { unique: true });
  }
  return collection;
}
const mongoStore = {
  get: async id => (await mongoCol()).findOne({ farmerId: id }, { projection: { _id: 0 } }),
  insert: async f => (await mongoCol()).insertOne({ ...f }), // duplicate -> error code 11000
  setLanguage: async (id, language) => (await mongoCol()).updateOne({ farmerId: id }, { $set: { language } })
};

const FILE = path.join(__dirname, 'data', 'farmers.json');
const readAll = () => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : []);
const writeAll = list => fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
const fileStore = {
  get: async id => readAll().find(f => f.farmerId === id) || null,
  insert: async f => {
    const all = readAll();
    if (all.some(x => x.farmerId === f.farmerId)) throw Object.assign(new Error('duplicate'), { code: 11000 });
    writeAll([...all, f]);
  },
  setLanguage: async (id, language) => {
    const all = readAll();
    const f = all.find(x => x.farmerId === id);
    if (f) f.language = language;
    writeAll(all);
  }
};

const store = () => (process.env.MONGODB_URI ? mongoStore : fileStore);
console.log('Farmer storage:', process.env.MONGODB_URI ? 'MongoDB' : 'local JSON file (set MONGODB_URI for MongoDB)');

// ---------- helpers ----------
const getFarmer = id => store().get(id);
const safe = ({ password, ...rest }) => rest;
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
const secret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is not set');
  return 'dev-secret-change-me';
};
const sign = f => jwt.sign({ id: f.farmerId }, secret(), { expiresIn: '7d' });

async function requireAuth(req, res, next) {
  let id;
  try {
    id = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), secret()).id;
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    if (!(await getFarmer(id))) return res.status(401).json({ error: 'unauthorized' });
    req.farmerId = id;
    next();
  } catch (err) { next(err); }
}

// ---------- routes ----------
const router = express.Router();

router.post('/register', wrap(async (req, res) => {
  const { name, mobile, block, village, password } = req.body;
  const farmerId = String(req.body.farmerId || '').trim();
  const language = ['en', 'hi', 'or'].includes(req.body.language) ? req.body.language : 'en';
  if (!farmerId || !name || !/^[6-9]\d{9}$/.test(mobile) || String(password || '').length < 6)
    return res.status(400).json({ error: 'invalid_input' });
  if (!location.find(block, village)) return res.status(400).json({ error: 'invalid_location' });
  const farmer = { farmerId, name: name.trim(), mobile, district: location.district(), block, village, language, password: await bcrypt.hash(password, 10) };
  try {
    await store().insert(farmer);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'farmer_exists' });
    throw err;
  }
  res.json({ token: sign(farmer), farmer: safe(farmer) });
}));

router.post('/login', wrap(async (req, res) => {
  const farmer = await getFarmer(String(req.body.farmerId || '').trim());
  if (!farmer || !(await bcrypt.compare(String(req.body.password || ''), farmer.password)))
    return res.status(401).json({ error: 'invalid_credentials' });
  res.json({ token: sign(farmer), farmer: safe(farmer) });
}));

router.get('/me', requireAuth, wrap(async (req, res) => res.json({ farmer: safe(await getFarmer(req.farmerId)) })));

router.put('/me', requireAuth, wrap(async (req, res) => {
  if (['en', 'hi', 'or'].includes(req.body.language)) await store().setLanguage(req.farmerId, req.body.language);
  res.json({ farmer: safe(await getFarmer(req.farmerId)) });
}));

module.exports = { router, requireAuth, getFarmer };