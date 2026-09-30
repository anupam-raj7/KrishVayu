// ---- AI MODEL CONNECTION POINT ------------------------------------------
// Set AI_MODEL_URL in .env. This service POSTs the payload below and expects
// JSON like { "rainfall": 12.5 }. Replace callModel() if your model's API differs.
const round = n => Math.round(n * 10) / 10;

async function callModel(payload) {
  const url = process.env.AI_MODEL_URL;
  if (!url) throw new Error('AI_MODEL_URL not set');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(Number(process.env.AI_MODEL_TIMEOUT_MS) || 5000)
  });
  if (!res.ok) throw new Error('AI model status ' + res.status);
  const mm = Number((await res.json()).rainfall);
  if (!Number.isFinite(mm) || mm < 0) throw new Error('Invalid AI model output');
  return mm;
}

// Never throws: any AI failure returns the block-level API rainfall instead.
exports.predictRainfall = async input => {
  try {
    return { success: true, rainfall: round(await callModel(input)), unit: 'mm', source: 'ai' };
  } catch (err) {
    console.warn('AI unavailable, using block fallback:', err.message);
    return { success: true, rainfall: round(Number(input.blockRainfall) || 0), unit: 'mm', source: 'block_api', fallback: true };
  }
};
