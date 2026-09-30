// server/services/chatService.js  (new file)
// Talks to Groq (OpenAI-compatible API). The key stays on the server only.
const URL = 'https://api.groq.com/openai/v1/chat/completions';
// Main model first; if it errors or hits its limit, the small fast model is tried.
const MODELS = [
  process.env.CAPABLE_MODEL || 'openai/gpt-oss-120b',
  process.env.CHEAP_MODEL || 'openai/gpt-oss-20b'
];
const LANGUAGES = { en: 'English', hi: 'Hindi', or: 'Odia' };
const r1 = v => (v == null ? 'unknown' : Math.round(v * 10) / 10);

function contextText(d) {
  if (!d) return 'No weather data is available right now.';
  const w = d.day;
  const rainList = d.chart.filter(c => !c.past).map(c => `${c.date}: ${r1(c.rain)} mm`).join(', ');
  return [
    `Village: ${d.place.village}, Block: ${d.place.block}, Koraput district, Odisha`,
    `Date: ${d.date}`,
    `Predicted rainfall: ${r1(d.prediction.rainfall)} mm (${d.prediction.fallback ? 'block-level weather API estimate' : 'AI village prediction'})`,
    `Weather: ${w.condition}, temperature ${r1(w.temp)} C, humidity ${r1(w.humidity)}%, dew point ${r1(w.dewPoint)} C, chance of rain ${r1(w.rainProb)}%`,
    `Rain from today for the next days: ${rainList}`,
    `Expected rain in next 7 days: ${d.crops.weeklyRain} mm`,
    `Suitable crops this month: ${d.crops.list.map(c => `${c.key} (water need ${c.water})`).join(', ')}`,
    `Weather warning status: ${d.advice}`
  ].join('\n');
}

const systemPrompt = (lang, data) => `You are "Koraput Rain Advisor", a helpful assistant for small farmers in Koraput district, Odisha, India.
Rules:
- Answer ONLY about farming, crops, rainfall and weather. For anything else, politely say you can only help with farming and weather.
- Reply in ${LANGUAGES[lang] || 'English'}. Use very simple, short words, at most 5 sentences. No markdown, no tables.
- For weather, use ONLY the data below. Never invent numbers. If the data is missing, say so.
- General crop advice is fine. Do NOT give exact pesticide or fertiliser doses; tell the farmer to ask the local agriculture office (KVK).
- If the rainfall source is a block-level estimate, say it is an estimate for the block, not the village.

DATA:
${contextText(data)}`;

exports.ask = async ({ message, history, lang, data }) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');
  const past = (Array.isArray(history) ? history : [])
    .slice(-6)
    .filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 500) }));
  const messages = [{ role: 'system', content: systemPrompt(lang, data) }, ...past, { role: 'user', content: message }];

  let lastError;
  for (const model of MODELS) {
    try {
      const res = await fetch(URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: 350, temperature: 0.3 }),
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) throw new Error(`Groq ${model} status ${res.status}`);
      const text = (await res.json()).choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error(`Groq ${model} gave an empty reply`);
      return text;
    } catch (err) {
      lastError = err;
      console.warn(err.message);
    }
  }
  throw lastError;
};