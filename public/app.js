// public/app.js

import { t, setLang, getLang } from './i18n.js';

const $ = s => document.querySelector(s);

const DEMO = new URLSearchParams(location.search).has('demo');

let token = localStorage.getItem('token');
let farmer = null;
let last = null;

let currentTab = 1;
// 1: Predicted Rainfall
// 2: Weather & Rainfall
// 3: Best Crops


// ============================================================
// CROP IMAGES
// ============================================================

const CROP_PICS = {
  maize:
    'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=400&q=80',

  vegetables:
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',

  ragi:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Finger_millet_grains.jpg/400px-Finger_millet_grains.jpg',

  rice:
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',

  groundnut:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Peanuts_in_shells.jpg/400px-Peanuts_in_shells.jpg',

  mustard:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Mustard_seeds.jpg/400px-Mustard_seeds.jpg',

  ginger:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Ginger_roots.jpg/400px-Ginger_roots.jpg',

  arhar:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Cajanus_cajan_seeds.jpg/400px-Cajanus_cajan_seeds.jpg',

  potato:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Patates.jpg/400px-Patates.jpg'
};

const CROP_FALLBACK =
  'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=80';


// ============================================================
// WEATHER ICONS
// ============================================================

const WEATHER_ICONS = {
  clear: '☀️',
  cloudy: '⛅',
  rain: '🌧️',
  storm: '⛈️'
};


// ============================================================
// DEMO DATA
// Used only when URL contains ?demo
// ============================================================

const MOCK_FARMERS = {

  '0001': {
    farmerId: '0001',
    name: 'Demo Farmer One',
    mobile: '9000000001',
    district: 'Koraput',
    block: 'Koraput',
    village: 'BADASUKU',
    language: 'en'
  },

  '0002': {
    farmerId: '0002',
    name: 'Demo Farmer Two',
    mobile: '9000000002',
    district: 'Koraput',
    block: 'Bandhugaon',
    village: 'KUMBHARIPUT',
    language: 'en'
  }

};


// ============================================================
// DEFAULT DASHBOARD
// ============================================================

const DEFAULT_DASHBOARD = {

  place: {
    block: 'Bandhugaon',
    village: 'KUMBHARIPUT'
  },

  date: '2026-09-30',

  prediction: {
    rainfall: 1.2,
    fallback: false
  },

  advice: 'ok',

  day: {
    condition: 'cloudy',
    temp: 23.2,
    humidity: 76,
    dewPoint: 18.3,
    rainProb: 0,
    rain: 0
  },

  chart: [

    {
      date: '2026-09-23',
      rain: 3.5,
      past: true
    },

    {
      date: '2026-09-24',
      rain: 1.8,
      past: true
    },

    {
      date: '2026-09-25',
      rain: 0.0,
      past: true
    },

    {
      date: '2026-09-26',
      rain: 5.2,
      past: true
    },

    {
      date: '2026-09-27',
      rain: 2.1,
      past: true
    },

    {
      date: '2026-09-28',
      rain: 0.5,
      past: true
    },

    {
      date: '2026-09-29',
      rain: 0.0,
      past: true
    },

    {
      date: '2026-09-30',
      rain: 1.2,
      past: false,
      today: true
    },

    {
      date: '2026-10-01',
      rain: 0.0,
      past: false
    },

    {
      date: '2026-10-02',
      rain: 0.4,
      past: false
    },

    {
      date: '2026-10-03',
      rain: 0.6,
      past: false
    },

    {
      date: '2026-10-04',
      rain: 0.0,
      past: false
    },

    {
      date: '2026-10-05',
      rain: 0.0,
      past: false
    },

    {
      date: '2026-10-06',
      rain: 0.0,
      past: false
    }

  ],

  crops: {

    weeklyRain: 1.0,

    list: [

      {
        key: 'maize',
        water: 'medium'
      },

      {
        key: 'vegetables',
        water: 'medium'
      },

      {
        key: 'ragi',
        water: 'low'
      },

      {
        key: 'groundnut',
        water: 'low'
      },

      {
        key: 'ginger',
        water: 'medium'
      },

      {
        key: 'rice',
        water: 'high'
      }

    ]

  }

};


// ============================================================
// API HELPER
// ============================================================

async function api(path, { method = 'GET', body } = {}) {

  try {

    const res = await fetch('/api' + path, {

      method,

      headers: {
        'Content-Type': 'application/json',

        ...(token && {
          Authorization: 'Bearer ' + token
        })
      },

      body: body ? JSON.stringify(body) : undefined

    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && token) {
      logout();
    }

    if (!res.ok) {
      throw new Error(data.error || 'generic');
    }

    return data;

  } catch (err) {

    if (!DEMO) {
      throw err;
    }

    // Demo mode only
    if (path.includes('/locations/blocks')) {

      return [
        'Bandhugaon',
        'Koraput',
        'Semiliguda',
        'Jeypore'
      ];

    }

    if (path.includes('/locations/villages')) {

      return [
        'KUMBHARIPUT',
        'BANDHUGAON',
        'BADASUKU',
        'ALMONDA'
      ];

    }

    if (path.includes('/dashboard')) {

      return DEFAULT_DASHBOARD;

    }

    if (path.includes('/auth/login')) {

      const f = MOCK_FARMERS[body?.farmerId];

      if (f) {

        return {
          token: 'token-' + f.farmerId,
          farmer: f
        };

      }

      throw new Error('invalid_credentials');

    }

    if (path.includes('/auth/register')) {

      const newF = {

        farmerId: body.farmerId,
        name: body.name,
        mobile: body.mobile,
        block: body.block,
        village: body.village,
        language: body.language || 'en'

      };

      MOCK_FARMERS[body.farmerId] = newF;

      return {
        token: 'token-' + newF.farmerId,
        farmer: newF
      };

    }

    if (path.includes('/auth/me')) {

      if (farmer) {
        return {
          farmer
        };
      }

      const savedId = token?.replace('token-', '');

      if (
        savedId &&
        MOCK_FARMERS[savedId]
      ) {

        return {
          farmer: MOCK_FARMERS[savedId]
        };

      }

      throw new Error('generic');

    }

    throw err;

  }

}


// ============================================================
// HELPERS
// ============================================================

const errText = err =>
  t('e_' + err.message) || t('e_generic');


const fmt = v =>
  v == null
    ? '–'
    : Math.round(v * 10) / 10;


// ============================================================
// SELECT HELPERS
// ============================================================

function fill(select, items, selected) {

  select.innerHTML =
    `<option value="">${t('select')}</option>` +
    items
      .map(
        i =>
          `<option value="${i}" ${
            i === selected ? 'selected' : ''
          }>${i}</option>`
      )
      .join('');

}


async function fillBlocks(select, selected) {

  fill(
    select,
    await api('/locations/blocks'),
    selected
  );

}


async function fillVillages(
  blockSelect,
  villageSelect,
  selected
) {

  const url =
    '/locations/villages?block=' +
    encodeURIComponent(blockSelect.value);

  fill(
    villageSelect,
    blockSelect.value
      ? await api(url)
      : [],
    selected
  );

}


// ============================================================
// AUTH
// ============================================================

function tab(name) {

  $('#loginForm').hidden =
    name !== 'login';

  $('#registerForm').hidden =
    name !== 'register';

  $('#tab-login').classList.toggle(
    'active',
    name === 'login'
  );

  $('#tab-register').classList.toggle(
    'active',
    name === 'register'
  );

  $('#authMsg').textContent = '';

}


$('#tab-login').onclick = () =>
  tab('login');


$('#tab-register').onclick = () =>
  tab('register');


// ============================================================
// LOGIN / REGISTER
// ============================================================

for (
  const [formId, path] of [
    ['#loginForm', 'login'],
    ['#registerForm', 'register']
  ]
) {

  $(formId).onsubmit = async e => {

    e.preventDefault();

    try {

      const body = {
        ...Object.fromEntries(
          new FormData(e.target)
        ),

        language: getLang()
      };

      const data = await api(
        '/auth/' + path,
        {
          method: 'POST',
          body
        }
      );

      token = data.token;

      farmer = data.farmer;

      localStorage.setItem(
        'token',
        token
      );

      enter();

    } catch (err) {

      $('#authMsg').textContent =
        errText(err);

    }

  };

}


// ============================================================
// LOGOUT
// ============================================================

function logout() {

  localStorage.removeItem('token');

  location.reload();

}


$('#logout').onclick = logout;


// ============================================================
// ENTER DASHBOARD
// ============================================================

async function enter() {

  setLang(
    farmer.language || getLang()
  );

  $('#auth').hidden = true;

  $('#dash').hidden = false;

  $('#logout').hidden = false;


  const day = offset => {

    return new Date(
      Date.now() +
      offset * 864e5
    ).toLocaleDateString(
      'en-CA'
    );

  };


  Object.assign(
    $('#dDate'),
    {
      value: day(0),
      min: day(-30),
      max: day(6)
    }
  );


  await fillBlocks(
    $('#dBlock'),
    farmer.block
  );


  await fillVillages(
    $('#dBlock'),
    $('#dVillage'),
    farmer.village
  );


  setupTabButtons();

  load();

}


// ============================================================
// TAB BUTTONS
// ============================================================

function setupTabButtons() {

  const btns = [

    {
      el: $('#btnTab1'),
      tab: 1
    },

    {
      el: $('#btnTab2'),
      tab: 2
    },

    {
      el: $('#btnTab3'),
      tab: 3
    }

  ];


  btns.forEach(
    ({ el, tab }) => {

      el.onclick = () => {

        currentTab = tab;

        btns.forEach(
          b =>
            b.el.classList.toggle(
              'active',
              b.tab === currentTab
            )
        );

        render();

      };

    }
  );

}


// ============================================================
// BLOCK COORDINATES
// ============================================================

const BLOCK_COORDS = {

  Bandhugaon: {
    lat: 18.9500,
    lon: 82.7000
  },

  Boipariguda: {
    lat: 18.7500,
    lon: 82.3333
  },

  Borigumma: {
    lat: 19.0436,
    lon: 82.5562
  },

  Dasmantpur: {
    lat: 19.0333,
    lon: 82.8833
  },

  Jeypore: {
    lat: 18.8683,
    lon: 82.5768
  },

  Koraput: {
    lat: 18.8135,
    lon: 82.7152
  },

  Kotpad: {
    lat: 19.1417,
    lon: 82.3278
  },

  Kundra: {
    lat: 18.8000,
    lon: 82.4000
  },

  Lamtaput: {
    lat: 18.6667,
    lon: 82.5667
  },

  Laxmipur: {
    lat: 18.9833,
    lon: 83.1167
  },

  Nandapur: {
    lat: 18.5333,
    lon: 82.5667
  },

  Narayanpatna: {
    lat: 18.8500,
    lon: 83.1833
  },

  Pottangi: {
    lat: 18.5667,
    lon: 82.9667
  },

  Semiliguda: {
    lat: 18.7000,
    lon: 82.8333
  }

};


// ============================================================
// LOAD DASHBOARD
// ============================================================

async function load() {

  $('#result').innerHTML =
    `${t('loading')}`;


  try {

    const blockName =
      $('#dBlock').value;


    const q =
      new URLSearchParams({

        block: blockName,

        village:
          $('#dVillage').value,

        date:
          $('#dDate').value

      });


    // --------------------------------------------------------
    // 1. FETCH DEFAULT DATA FROM BACKEND
    // --------------------------------------------------------

    last =
      await api(
        '/dashboard?' + q
      );


    // --------------------------------------------------------
    // 2. DIRECT WEATHER API
    // --------------------------------------------------------

    try {

      const coords =
        BLOCK_COORDS[blockName] || {
          lat: 18.8135,
          lon: 82.7152
        };


      const url =
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${coords.lat}` +
        `&longitude=${coords.lon}` +
        `&daily=precipitation_sum,` +
        `precipitation_probability_max,` +
        `temperature_2m_mean,` +
        `temperature_2m_max,` +
        `relative_humidity_2m_mean,` +
        `dew_point_2m_mean,` +
        `weather_code` +
        `&past_days=30` +
        `&forecast_days=7` +
        `&timezone=Asia/Kolkata`;


      const wRes =
        await fetch(url);


      if (wRes.ok) {

        const wData =
          await wRes.json();


        const d =
          wData.daily;


        const todayStr =
          new Date().toLocaleDateString(
            'en-CA',
            {
              timeZone:
                'Asia/Kolkata'
            }
          );


        // ----------------------------------------------------
        // WEATHER CONDITION
        // ----------------------------------------------------

        const getCond = code => {

          if (code == null) {
            return 'cloudy';
          }

          if (code >= 95) {
            return 'storm';
          }

          if (
            code >= 51 &&
            code <= 82
          ) {
            return 'rain';
          }

          if (code <= 1) {
            return 'clear';
          }

          return 'cloudy';

        };


        // ----------------------------------------------------
        // CHART DATA
        // ----------------------------------------------------

        const chartData =
          d.time.map(
            (date, i) => ({

              date,

              rain:
                d.precipitation_sum[i] ??
                0,

              rainProb:
                d.precipitation_probability_max[i] ??
                null,

              temp:
                d.temperature_2m_mean[i] ??
                null,

              tmax:
                d.temperature_2m_max[i] ??
                null,

              humidity:
                d.relative_humidity_2m_mean[i] ??
                null,

              dewPoint:
                d.dew_point_2m_mean[i] ??
                null,

              condition:
                getCond(
                  d.weather_code[i]
                ),

              past:
                date < todayStr,

              today:
                date === todayStr

            })
          );


        const selectedDate =
          $('#dDate').value;


        const dayWeather =
          chartData.find(
            c =>
              c.date === selectedDate
          ) ||
          chartData.find(
            c => c.today
          ) ||
          chartData[30];


        // ----------------------------------------------------
        // OVERWRITE BACKEND WEATHER DATA
        // ----------------------------------------------------

        last.chart =
          chartData;

        last.day =
          dayWeather;


        // ----------------------------------------------------
        // UPDATE PREDICTION
        // ----------------------------------------------------

        if (
          last.prediction &&
          last.prediction.fallback
        ) {

          last.prediction.rainfall =
            dayWeather.rain;

        }

      }

    } catch (frontendErr) {

      console.error(
        'Direct weather fetch failed:',
        frontendErr
      );

    }


    render();

  } catch (err) {

    $('#result').innerHTML =
      `${errText(err)}`;

  }

}


// ============================================================
// RENDER
// ============================================================

function render() {

  if (!last) {
    return;
  }


  const {
    place,
    date,
    day,
    prediction: p,
    chart,
    crops,
    advice
  } = last;


  // ==========================================================
  // TAB 1 - PREDICTED RAINFALL
  // ==========================================================

  if (currentTab === 1) {

    $('#result').innerHTML = `

      <section class="prediction-card">

        <h2>
          🌧️ ${t('predTitle')}
        </h2>

        <p>
          📍 ${place.village},
          ${place.block}
          (${date})
        </p>

        <div class="rainfall-value">
          ${fmt(p.rainfall)} mm
        </div>

        <div class="advice">
          ${t('adv_' + advice)}
        </div>

      </section>

    `;

    return;

  }


  // ==========================================================
  // TAB 2 - WEATHER & RAINFALL
  // ==========================================================

  if (currentTab === 2) {

    const condIcon =
      WEATHER_ICONS[
        day.condition
      ] || '⛅';


    const stat =
      (label, value) =>
        `<div class="weather-stat">
          <span>${t(label)}</span>
          <strong>${value}</strong>
        </div>`;


    const max =
      Math.max(
        ...chart.map(
          c => c.rain || 0
        ),
        4
      );


    const bars =
      chart
        .map(c => {

          const rainVal =
            fmt(c.rain);


          const heightPercent =
            Math.max(
              ((c.rain || 0) / max) *
                100,
              4
            );


          const isToday =
            c.date === date ||
            c.today;


          return `

            <div
              class="rain-bar-wrapper ${
                isToday
                  ? 'today'
                  : ''
              }"
            >

              <div
                class="rain-value"
              >
                ${rainVal} mm
              </div>

              <div
                class="rain-bar"
                style="
                  height:${heightPercent}%;
                "
              ></div>

              <div
                class="rain-date"
              >
                ${c.date.slice(8)}
              </div>

            </div>

          `;

        })
        .join('');


    $('#result').innerHTML = `

      <section class="weather-card">

        <h2>
          📊 ${t('weather')} &
          ${t('chart')}
        </h2>


        <div class="current-weather">

          <div class="weather-icon">
            ${condIcon}
          </div>

          <div>
            ${t('weather')}:
            ${t(
              'cond_' +
              day.condition
            )}
          </div>

        </div>


        <div class="weather-stats">

          ${stat(
            'temp',
            fmt(day.temp) +
            ' °C'
          )}

          ${stat(
            'humidity',
            fmt(day.humidity) +
            ' %'
          )}

          ${stat(
            'dew',
            fmt(day.dewPoint) +
            ' °C'
          )}

          ${
            day.rainProb != null
              ? stat(
                  'prob',
                  day.rainProb +
                    ' %'
                )
              : ''
          }

          ${stat(
            'blockRain',
            fmt(day.rain) +
            ' mm'
          )}

        </div>


        <div class="rain-chart">

          ${bars}

        </div>


        <div class="chart-legend">

          <span>
            ${t('lgPast') || 'Past'}
          </span>

          <span>
            ${t('lgToday') || 'Today'}
          </span>

          <span>
            ${t('lgFuture') || 'Forecast'}
          </span>

        </div>

      </section>

    `;

    return;

  }


  // ==========================================================
  // TAB 3 - BEST CROPS
  // ==========================================================

  if (currentTab === 3) {

    const cropCards =
      crops.list
        .map(c => {

          const pic =
            CROP_PICS[c.key] ||
            CROP_FALLBACK;


          return `

            <div class="crop-card">

              <img
                src="${pic}"
                alt="${c.key}"
                loading="lazy"
              />

              <div class="crop-card-content">

                <h3>
                  ${c.key}
                </h3>

                <p>
                  ${t('water') || 'Water requirement'}:
                  <strong>
                    ${c.water}
                  </strong>
                </p>

              </div>

            </div>

          `;

        })
        .join('');


    $('#result').innerHTML = `

      <section class="crops-section">

        <h2>
          🌾 ${t('crops')}
        </h2>


        <div class="weekly-rain">

          🌧️ ${t('week')}:
          <strong>
            ${crops.weeklyRain} mm
          </strong>

        </div>


        <p class="crop-note">
          ${t('cropsNote')}
        </p>


        <div class="crop-grid">

          ${cropCards}

        </div>

      </section>

    `;

  }

}


// ============================================================
// DASHBOARD FORM
// ============================================================

$('#dForm').onsubmit =
  e => {

    e.preventDefault();

    load();

  };


// ============================================================
// BLOCK CHANGE
// ============================================================

$('#dBlock').onchange =
  () =>
    fillVillages(
      $('#dBlock'),
      $('#dVillage')
    );


// ============================================================
// REGISTER BLOCK CHANGE
// ============================================================

$('#rBlock').onchange =
  () =>
    fillVillages(
      $('#rBlock'),
      $('#rVillage')
    );


// ============================================================
// LANGUAGE CHANGE
// ============================================================

$('#lang').onchange =
  e => {

    setLang(
      e.target.value
    );


    document
      .querySelectorAll(
        'select.loc option[value=""]'
      )
      .forEach(
        o =>
          (o.textContent =
            t('select'))
      );


    if (farmer) {

      api(
        '/auth/me',
        {
          method: 'PUT',

          body: {
            language:
              e.target.value
          }
        }
      ).catch(() => {});


      if (last) {
        render();
      }

    }

  };


// ============================================================
// START APPLICATION
// ============================================================

(async () => {

  setLang(getLang());


  try {

    await fillBlocks(
      $('#rBlock')
    );

  } catch {

    $('#authMsg').textContent =
      t('e_generic');

  }


  fill(
    $('#rVillage'),
    []
  );


  tab('login');


  if (token) {

    try {

      farmer =
        (
          await api(
            '/auth/me'
          )
        ).farmer;


      enter();

    } catch {

      // Stay on login page

    }

  }

})();