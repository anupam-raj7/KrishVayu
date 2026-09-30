// public/app.js  (full file)
import { renderChat } from './chat.js';
import { t, setLang, getLang } from './i18n.js';

const $ = s => document.querySelector(s);
const DEMO = new URLSearchParams(location.search).has('demo'); // fake data ONLY when the URL has ?demo
let token = localStorage.getItem('token');
let farmer = null;
let last = null;
let currentTab = 1; // 1: Predicted Rainfall | 2: Weather & Bar | 3: Best Crops

// Real authentic crop photos - verified agricultural imagery
const CROP_PICS = {
  maize: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=400&q=80',
  vegetables: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
  ragi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Finger_millet_grains.jpg/400px-Finger_millet_grains.jpg',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
  groundnut: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Peanuts_in_shells.jpg/400px-Peanuts_in_shells.jpg',
  mustard: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Mustard_seeds.jpg/400px-Mustard_seeds.jpg',
  ginger: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Ginger_roots.jpg/400px-Ginger_roots.jpg',
  arhar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Cajanus_cajan_seeds.jpg/400px-Cajanus_cajan_seeds.jpg',
  potato: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Patates.jpg/400px-Patates.jpg'
};
const CROP_FALLBACK = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=80';

const WEATHER_ICONS = { clear: '☀️', cloudy: '⛅', rain: '🌧️', storm: '⛈️' };

// ---------- demo data (used only with ?demo in the URL) ----------
const MOCK_FARMERS = {
  '0001': { farmerId: '0001', name: 'Demo Farmer One', mobile: '9000000001', district: 'Koraput', block: 'Koraput', village: 'BADASUKU', language: 'en' },
  '0002': { farmerId: '0002', name: 'Demo Farmer Two', mobile: '9000000002', district: 'Koraput', block: 'Bandhugaon', village: 'KUMBHARIPUT', language: 'en' }
};

const DEFAULT_DASHBOARD = {
  place: { block: 'Bandhugaon', village: 'KUMBHARIPUT' },
  date: '2026-09-30',
  prediction: { rainfall: 1.2, fallback: false },
  advice: 'ok',
  day: { condition: 'cloudy', temp: 23.2, humidity: 76, dewPoint: 18.3, rainProb: 0, rain: 0 },
  chart: [
    { date: '2026-09-23', rain: 3.5, past: true }, { date: '2026-09-24', rain: 1.8, past: true },
    { date: '2026-09-25', rain: 0.0, past: true }, { date: '2026-09-26', rain: 5.2, past: true },
    { date: '2026-09-27', rain: 2.1, past: true }, { date: '2026-09-28', rain: 0.5, past: true },
    { date: '2026-09-29', rain: 0.0, past: true }, { date: '2026-09-30', rain: 1.2, past: false, today: true },
    { date: '2026-10-01', rain: 0.0, past: false }, { date: '2026-10-02', rain: 0.4, past: false },
    { date: '2026-10-03', rain: 0.6, past: false }, { date: '2026-10-04', rain: 0.0, past: false },
    { date: '2026-10-05', rain: 0.0, past: false }, { date: '2026-10-06', rain: 0.0, past: false }
  ],
  crops: {
    weeklyRain: 1.0,
    list: [
      { key: 'maize', water: 'medium' }, { key: 'vegetables', water: 'medium' }, { key: 'ragi', water: 'low' },
      { key: 'groundnut', water: 'low' }, { key: 'ginger', water: 'medium' }, { key: 'rice', water: 'high' }
    ]
  }
};

async function api(path, { method = 'GET', body } = {}) {
  try {
    const res = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
      body: body && JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) logout();
    if (!res.ok) throw new Error(data.error || 'generic');
    return data;
  } catch (err) {
    if (!DEMO) throw err; // normal mode: show the real error, never fake data

    if (path.includes('/locations/blocks')) return ['Bandhugaon', 'Koraput', 'Semiliguda', 'Jeypore'];
    if (path.includes('/locations/villages')) return ['KUMBHARIPUT', 'BANDHUGAON', 'BADASUKU', 'ALMONDA'];
    if (path.includes('/dashboard')) return DEFAULT_DASHBOARD;
    if (path.includes('/auth/login')) {
      const f = MOCK_FARMERS[body?.farmerId];
      if (f) return { token: 'token-' + f.farmerId, farmer: f };
      throw new Error('invalid_credentials');
    }
    if (path.includes('/auth/register')) {
      const newF = { farmerId: body.farmerId, name: body.name, mobile: body.mobile, block: body.block, village: body.village, language: body.language || 'en' };
      MOCK_FARMERS[body.farmerId] = newF;
      return { token: 'token-' + newF.farmerId, farmer: newF };
    }
    if (path.includes('/auth/me')) {
      if (farmer) return { farmer };
      const savedId = token?.replace('token-', '');
      if (savedId && MOCK_FARMERS[savedId]) return { farmer: MOCK_FARMERS[savedId] };
      throw new Error('generic');
    }
    throw err;
  }
}

const errText = err => t('e_' + err.message) || t('e_generic');
const fmt = v => (v == null ? '–' : Math.round(v * 10) / 10);

function fill(select, items, selected) {
  select.innerHTML = `<option value="">${t('select')}</option>` +
    items.map(i => `<option value="${i}"${i === selected ? ' selected' : ''}>${i}</option>`).join('');
}
async function fillBlocks(select, selected) { fill(select, await api('/locations/blocks'), selected); }
async function fillVillages(blockSelect, villageSelect, selected) {
  const url = '/locations/villages?block=' + encodeURIComponent(blockSelect.value);
  fill(villageSelect, blockSelect.value ? await api(url) : [], selected);
}

// ---------- auth ----------
function tab(name) {
  $('#loginForm').hidden = name !== 'login';
  $('#registerForm').hidden = name !== 'register';
  $('#tab-login').classList.toggle('active', name === 'login');
  $('#tab-register').classList.toggle('active', name === 'register');
  $('#authMsg').textContent = '';
}
$('#tab-login').onclick = () => tab('login');
$('#tab-register').onclick = () => tab('register');

for (const [formId, path] of [['#loginForm', 'login'], ['#registerForm', 'register']]) {
  $(formId).onsubmit = async e => {
    e.preventDefault();
    try {
      const body = { ...Object.fromEntries(new FormData(e.target)), language: getLang() };
      const data = await api('/auth/' + path, { method: 'POST', body });
      token = data.token;
      farmer = data.farmer;
      localStorage.setItem('token', token);
      enter();
    } catch (err) { $('#authMsg').textContent = errText(err); }
  };
}

function logout() {
  localStorage.removeItem('token');
  location.reload();
}
$('#logout').onclick = logout;

// ---------- dashboard ----------
async function enter() {
  setLang(farmer.language || getLang());
  $('#auth').hidden = true;
  $('#dash').hidden = false;
  $('#logout').hidden = false;

  const day = offset => new Date(Date.now() + offset * 864e5).toLocaleDateString('en-CA');
  Object.assign($('#dDate'), { value: day(0), min: day(-30), max: day(6) });

  await fillBlocks($('#dBlock'), farmer.block);
  await fillVillages($('#dBlock'), $('#dVillage'), farmer.village);

  setupTabButtons();
  load();
}

function setupTabButtons() {
  const btns = [
    { el: $('#btnTab1'), tab: 1 },
    { el: $('#btnTab2'), tab: 2 },
    { el: $('#btnTab3'), tab: 3 },
    { el: $('#btnTab4'), tab: 4 }
  ];
  btns.forEach(({ el, tab }) => {
    el.onclick = () => {
      currentTab = tab;
      btns.forEach(b => b.el.classList.toggle('active', b.tab === currentTab));
      render();
    };
  });
}

async function load() {
  $('#result').innerHTML = `<p>${t('loading')}</p>`;
  try {
    const q = new URLSearchParams({ block: $('#dBlock').value, village: $('#dVillage').value, date: $('#dDate').value });
    last = await api('/dashboard?' + q);
    render();
  } catch (err) {
    $('#result').innerHTML = `<p class="error">${errText(err)}</p>`;
  }
}

function render() {
  if (currentTab === 4) {
    import('./chat.js')
      .then(m => m.renderChat($('#result'), () => last))
      .catch(() => { $('#result').innerHTML = `<p class="error">${t('e_generic')}</p>`; });
    return;
  }
  
  if (!last) return;
  const { place, date, day, prediction: p, chart, crops, advice } = last;

  

  // TAB 1: PREDICTED RAINFALL
  if (currentTab === 1) {
    $('#result').innerHTML = `
      <div class="tab-content">
        <div class="tab-banner">
          <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80" alt="Koraput Hills" onerror="this.style.display='none'">
          <div class="overlay">🌧️ ${t('predTitle')}</div>
        </div>
        <h2>${t('predTitle')}</h2>
        <p class="place">📍 ${place.village}, ${place.block} (${date})</p>
        <p class="big">${fmt(p.rainfall)} <small>mm</small></p>
        <span class="source ${p.fallback ? 'fallback' : ''}">${t(p.fallback ? 'src_block_api' : 'src_ai')}</span>
        <section class="advice ${advice}"><p>${t('adv_' + advice)}</p></section>
      </div>`;
    return;
  }

  // TAB 2: WEATHER & RAINFALL BAR
  if (currentTab === 2) {
    const condIcon = WEATHER_ICONS[day.condition] || '⛅';
    const stat = (label, value) => `<div><dt>${t(label)}</dt><dd>${value}</dd></div>`;

    const max = Math.max(...chart.map(c => c.rain || 0), 4);
    const bars = chart.map(c => {
      const rainVal = fmt(c.rain);
      const heightPercent = Math.max(((c.rain || 0) / max) * 100, 4);
      const isToday = c.date === date || c.today;
      return `
        <div class="chart-col" title="${c.date}: ${rainVal} mm">
          <span class="chart-val">${rainVal}</span>
          <span class="bar ${c.past ? 'past' : (isToday ? 'today' : '')}" style="height:${heightPercent}%"></span>
          <span class="chart-day ${isToday ? 'today' : ''}">${c.date.slice(8)}</span>
        </div>`;
    }).join('');

    $('#result').innerHTML = `
      <div class="tab-content">
        <div class="tab-banner">
          <img src="https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=800&q=80" alt="Weather in Koraput" onerror="this.style.display='none'">
          <div class="overlay">📊 ${t('weather')} & ${t('chart')}</div>
        </div>

        <div class="weather-status-row">
          <span class="weather-icon-badge">${condIcon}</span>
          <div class="weather-title-group">
            <h3>${t('weather')}: ${t('cond_' + day.condition)}</h3>
          </div>
        </div>

        <dl class="stats">
          ${stat('temp', fmt(day.temp) + ' °C')}
          ${stat('humidity', fmt(day.humidity) + ' %')}
          ${stat('dew', fmt(day.dewPoint) + ' °C')}
          ${day.rainProb != null ? stat('prob', day.rainProb + ' %') : ''}
          ${stat('blockRain', fmt(day.rain) + ' mm')}
        </dl>

        <div class="chart-header">
          <strong>${t('chart')}</strong>
          <div class="chart-legend">
            <span><i class="legend-dot past"></i>${t('lgPast') || 'Past'}</span>
            <span><i class="legend-dot today"></i>${t('lgToday') || 'Today'}</span>
            <span><i class="legend-dot future"></i>${t('lgFuture') || 'Forecast'}</span>
          </div>
        </div>

        <div class="chart-wrapper">
          <div class="chart">${bars}</div>
        </div>
      </div>`;
    return;
  }

  // TAB 3: BEST CROPS TO GROW
  if (currentTab === 3) {
    const cropCards = crops.list.map(c => {
      const pic = CROP_PICS[c.key] || CROP_FALLBACK;
      return `
        <li class="crop-card">
          <img class="crop-img" src="${pic}" alt="${t('crop_' + c.key)}" referrerpolicy="no-referrer" onerror="this.src='${CROP_FALLBACK}'">
          <div class="crop-info">
            <b>${t('crop_' + c.key)}</b>
            <span class="water-badge ${c.water}">${t('water')}: ${t('water_' + c.water)}</span>
          </div>
        </li>`;
    }).join('');

    $('#result').innerHTML = `
      <div class="tab-content">
        <div class="tab-banner">
          <img src="${CROP_FALLBACK}" alt="Crops of Koraput" onerror="this.style.display='none'">
          <div class="overlay">🌾 ${t('crops')}</div>
        </div>

        <h2>${t('crops')}</h2>
        <div class="crops-rain-summary">
          🌧️ ${t('week')}: <strong>${crops.weeklyRain} mm</strong>
        </div>
        <ul class="crops-grid">${cropCards}</ul>
        <p class="note">${t('cropsNote')}</p>
      </div>`;
  }
}

$('#dForm').onsubmit = e => { e.preventDefault(); load(); };
$('#dBlock').onchange = () => fillVillages($('#dBlock'), $('#dVillage'));
$('#rBlock').onchange = () => fillVillages($('#rBlock'), $('#rVillage'));

$('#lang').onchange = e => {
  setLang(e.target.value);
  document.querySelectorAll('select.loc option[value=""]').forEach(o => (o.textContent = t('select')));
  if (farmer) {
    api('/auth/me', { method: 'PUT', body: { language: e.target.value } }).catch(() => {});
    if (last) render();
  }
};

// ---------- start ----------
(async () => {
  setLang(getLang());
  try {
    await fillBlocks($('#rBlock'));
  } catch {
    $('#authMsg').textContent = t('e_generic');
  }
  fill($('#rVillage'), []);
  tab('login');
  if (token) {
    try {
      farmer = (await api('/auth/me')).farmer;
      enter();
    } catch {
      /* stay on login */
    }
  }
})();