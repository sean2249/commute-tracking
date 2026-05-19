import { logEvent, listEvents, deleteEvent } from './api.js';
import { locateAndFetchWeather } from './weather.js';
import { formatTime, formatDate, weekdayShort, addMinutes, minutesBetween } from './time.js';
import { weatherIcon, isWeatherUnavailable, ICONS } from './icons.js';

const strip = document.getElementById('status-strip');
const recentList = document.getElementById('recent-list');
const buttons = document.querySelectorAll('.entry-button');

const DIRECTION_LABELS = { to_work: '上班', from_work: '下班' };
const EVENT_LABELS = { board: '上車', alight: '下車' };
const DIRECTION_ARROWS = { to_work: '↑', from_work: '↓' };

let recentCache = [];
let undoCountdownId = null;

document.querySelectorAll('[data-icon]').forEach((el) => {
  const name = el.dataset.icon;
  if (ICONS[name]) el.innerHTML = ICONS[name](Number(el.dataset.size) || 20);
});

buttons.forEach((btn) => {
  btn.addEventListener('click', () => handleEntry(btn));
});

function setButtonsState(state) {
  buttons.forEach((b) => {
    if (state === 'idle') {
      b.dataset.state = '';
      b.removeAttribute('disabled');
      b.querySelector('.label').textContent = b.dataset.label;
    } else {
      b.setAttribute('disabled', '');
    }
  });
}

function showLoading(btn) {
  btn.dataset.state = 'loading';
  btn.querySelector('.label').innerHTML = '<span class="spinner" aria-label="loading"></span>';
}

function flashState(btn, state) {
  btn.dataset.state = state;
  setTimeout(() => {
    if (btn.dataset.state === state) btn.dataset.state = '';
  }, 400);
}

async function handleEntry(btn) {
  const direction = btn.dataset.direction;
  const event = btn.dataset.event;
  const labelText = btn.querySelector('.label').textContent;
  btn.dataset.label = labelText;
  setButtonsState('busy');
  showLoading(btn);
  renderStrip({ state: 'locating' });

  const geo = await locateAndFetchWeather();

  const { data, error } = await logEvent({
    direction, event,
    weather: geo.weather,
    temp_c: geo.temp_c,
    lat: geo.lat,
    lon: geo.lon,
  });

  if (error) {
    flashState(btn, 'error');
    btn.classList.add('shake');
    setTimeout(() => btn.classList.remove('shake'), 240);
    btn.querySelector('.label').textContent = btn.dataset.label;
    setButtonsState('idle');
    showError(error.message || '送出失敗');
    renderStrip({ state: 'error' });
    return;
  }

  flashState(btn, 'success');
  btn.querySelector('.label').textContent = btn.dataset.label;
  setButtonsState('idle');

  renderStrip({
    state: 'success',
    record: {
      id: data.id,
      direction, event,
      time: formatTime(data.local_time),
      weather: geo.weather,
      temp_c: geo.temp_c,
      prediction: data.prediction,
    },
  });

  await refreshRecent();
}

function buildEtaText(time, pred) {
  const eta = addMinutes(time, pred.median_min);
  const swing = Math.max(0, Math.round(pred.p90_min - pred.median_min));
  return { eta, swing };
}

function renderStrip(payload) {
  if (payload.state === 'locating') {
    strip.dataset.state = 'locating';
    strip.innerHTML = '<div class="row muted">Locating…</div>';
    return;
  }
  if (payload.state === 'error') {
    strip.dataset.state = 'error';
    strip.innerHTML = '<div class="row muted">紀錄失敗，請重試</div>';
    return;
  }
  if (payload.state === 'empty') {
    strip.dataset.state = 'empty';
    strip.innerHTML = '<div>尚無紀錄。按下方任一按鈕開始。</div>';
    return;
  }

  const r = payload.record;
  const dirLabel = `${DIRECTION_LABELS[r.direction]}-${EVENT_LABELS[r.event]}`;
  const wxUnavailable = isWeatherUnavailable(r.weather);
  const tempStr = wxUnavailable || r.temp_c == null ? '—°' : `${r.temp_c}°`;

  let etaRow;
  if (r.event === 'alight') {
    const earlierBoard = recentCache.find(
      (e) => e.direction === r.direction && e.event === 'board' && e.local_date === todayLocal()
    );
    if (earlierBoard) {
      const min = minutesBetween(formatTime(earlierBoard.local_time), r.time);
      etaRow = `<div class="eta">耗時 ${min} <span class="small">min</span></div>`;
    } else {
      etaRow = '';
    }
  } else if (r.prediction) {
    const { eta, swing } = buildEtaText(r.time, r.prediction);
    etaRow = `<div class="eta">ETA ${eta} <span class="small">· n=${r.prediction.n} · ±${swing}min</span></div>`;
  } else {
    etaRow = '<div class="row"><span class="pred-pending">ETA 累積中</span></div>';
  }

  strip.dataset.state = 'success';
  strip.innerHTML = `
    <div class="row">
      <span class="time">${r.time}</span>
      <span class="label">${dirLabel}</span>
    </div>
    ${etaRow}
    <div class="row weather${wxUnavailable ? ' unavailable' : ''}">
      <span class="icon">${weatherIcon(r.weather)}</span>
      <span class="temp">${tempStr}</span>
    </div>
    <button class="undo-pill" id="undo-btn" type="button">
      <span class="icon-sm">${ICONS.undo(14)}</span>
      <span>Undo (<span id="undo-count">10</span>)</span>
    </button>
  `;
  startUndoCountdown(r.id);
}

function startUndoCountdown(eventId) {
  if (undoCountdownId) clearInterval(undoCountdownId);
  const btn = document.getElementById('undo-btn');
  const counter = document.getElementById('undo-count');
  if (!btn || !counter) return;
  let seconds = 10;
  counter.textContent = seconds;
  btn.addEventListener('click', async () => {
    btn.setAttribute('disabled', '');
    await deleteEvent(eventId);
    clearInterval(undoCountdownId);
    renderStrip({ state: 'empty' });
    await refreshRecent();
  });
  undoCountdownId = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(undoCountdownId);
      btn.style.opacity = '0';
      setTimeout(() => btn.remove(), 250);
      return;
    }
    counter.textContent = seconds;
  }, 1000);
}

function todayLocal() {
  const d = new Date();
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

async function refreshRecent() {
  const { data, error } = await listEvents(20);
  if (error) {
    recentList.innerHTML = `<li class="empty">無法載入紀錄：${escapeHtml(error.message)}</li>`;
    return;
  }
  recentCache = data || [];
  if (recentCache.length === 0) {
    recentList.innerHTML = '<li class="empty">尚無紀錄。</li>';
    return;
  }
  const top = recentCache.slice(0, 5);
  recentList.innerHTML = top.map((e) => {
    const wxUnavailable = isWeatherUnavailable(e.weather);
    return `
      <li>
        <a href="log.html#${e.id}">
          <span class="mono date">${formatDate(e.local_date)}</span>
          <span class="mono time">${formatTime(e.local_time)}</span>
          <span class="wkday muted">${weekdayShort(e.weekday)}</span>
          <span class="dir">${DIRECTION_ARROWS[e.direction] || ''}</span>
          <span class="event">${EVENT_LABELS[e.event] || e.event}</span>
          <span class="wx${wxUnavailable ? ' unavailable' : ''}">${weatherIcon(e.weather)}</span>
          <span class="temp">${wxUnavailable || e.temp_c == null ? '—°' : e.temp_c + '°'}</span>
        </a>
      </li>
    `;
  }).join('');
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'toast-error';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

renderStrip({ state: 'empty' });
refreshRecent();
