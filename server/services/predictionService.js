// server/services/predictionService.js  (full file)
// ---- AI MODEL CONNECTION POINT ------------------------------------------
// Set AI_MODEL_URL in .env (e.g. https://<model-service>.onrender.com/predict).
// POSTs the payload and expects JSON like { "rainfall": 12.5 }.
const round = n => Math.round(n * 10) / 10;

let lastWarm = 0;

// Wakes a sleeping model service (Render free tier sleeps after ~15 min idle).
// Fire-and-forget; skipped if a warm-up was already sent within minGapMs.
function warmModel(minGapMs = 5 * 60 * 1000) {
  const url = process.env.AI_MODEL_URL;
  if (!url || Date.now() - lastWarm < minGapMs) return;
  lastWarm = Date.now();
  fetch(url.replace(/\/predict\/?$/, '/health'), { signal: AbortSignal.timeout(90000) })
    .then(res => console.log('Model warm-up status:', res.status))
    .catch(err => console.warn('Model warm-up failed:', err.message));
}

async function callModel(payload) {
  const url = process.env.AI_MODEL_URL;
  if (!url) throw new Error('AI_MODEL_URL not set');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(Number(process.env.AI_MODEL_TIMEOUT_MS) || 8000)
  });
  if (!res.ok) throw new Error('AI model status ' + res.status);
  const mm = Number((await res.json()).rainfall);
  if (!Number.isFinite(mm) || mm < 0) throw new Error('Invalid AI model output');
  return mm;
}

// Never throws: any AI failure returns the block-level API rainfall instead,
// and starts waking the model so the next try can work.
async function predictRainfall(input) {
  try {
    return { success: true, rainfall: round(await callModel(input)), unit: 'mm', source: 'ai' };
  } catch (err) {
    console.warn('AI unavailable, using block fallback:', err.message);
    warmModel(60 * 1000);
    return { success: true, rainfall: round(Number(input.blockRainfall) || 0), unit: 'mm', source: 'block_api', fallback: true };
  }
}

module.exports = { predictRainfall, warmModel };