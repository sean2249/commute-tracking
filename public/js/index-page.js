import { logEvent, listEvents, deleteEvent, updateWeather } from './api.js';
import { locateAndFetchWeather, WEATHER_REASON_LABELS } from './weather.js';
import { formatTime, formatDate, weekdayShort, addMinutes, inferDirectionByTime } from './time.js';
import { weatherIcon, isWeatherUnavailable, ICONS } from './icons.js';
import { pairEvents } from './pair.js';
import { getOpenBoard, setOpenBoard, clearOpenBoard, reconcileWithServer } from './openBoard.js';
import { init as initReminder, cancel as cancelReminder, schedule as scheduleReminder, ensureNotificationPermission } from './reminder.js';

const strip = document.getElementById('status-strip');
const recentList = document.getElementById('recent-list');
const primaryBtn = document.getElementById('primary-action');
const primaryHint = document.getElementById('primary-action-hint');

const DIRECTION_LABELS = { to_work: '上班', from_work: '下班' };
const EVENT_LABELS = { board: '上車', alight: '下車' };
const DIRECTION_ARROWS = { to_work: '↑', from_work: '↓' };
const LONG_PRESS_MS = 500;

let recentCache = [];
let latestEvent = null;
let latestWeatherReason = null;
let directionOverride = null;
let actionInFlight = false;
let longPressTimer = null;
let longPressFired = false;

document.querySelectorAll('[data-icon]').forEach((el) => {
  const name = el.dataset.icon;
  if (ICONS[name]) el.innerHTML = ICONS[name](Number(el.dataset.size) || 20);
});

function currentBoardDirection() {
  return directionOverride || inferDirectionByTime();
}

function renderPrimaryAction() {
  const ob = getOpenBoard();
  const event = ob ? 'alight' : 'board';
  const direction = ob ? ob.direction : currentBoardDirection();
  const colorVariant = direction === 'from_work' ? 'cool' : 'warm';
  const labelText = EVENT_LABELS[event];
  const iconName = event === 'board' ? 'arrowUp' : 'arrowDown';

  primaryBtn.dataset.event = event;
  primaryBtn.dataset.direction = direction;
  primaryBtn.dataset.color = colorVariant;
  primaryBtn.setAttribute(
    'aria-label',
    `${DIRECTION_LABELS[direction]} · ${labelText}`,
  );

  const iconEl = primaryBtn.querySelector('.primary-action__icon');
  const labelEl = primaryBtn.querySelector('.primary-action__label');
  const stubDirectionEl = primaryBtn.querySelector('.primary-action__stub-direction');
  const routeEl = primaryBtn.querySelector('.primary-action__route');
  const serialEl = primaryBtn.querySelector('.primary-action__serial');
  const dateEl = primaryBtn.querySelector('.primary-action__date');
  iconEl.innerHTML = ICONS[iconName](44);
  labelEl.textContent = labelText;
  stubDirectionEl.textContent = DIRECTION_LABELS[direction];
  routeEl.textContent = direction === 'to_work' ? '家 → 公司' : '公司 → 家';

  const now = new Date();
  const mmdd = formatDate(now).replace('-', '');
  serialEl.textContent = `No. ${mmdd}`;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const wkday = weekdayShort(((now.getDay() + 6) % 7) + 1).toUpperCase();
  dateEl.textContent = `${months[now.getMonth()]} ${String(now.getDate()).padStart(2, '0')} · ${wkday}`;

  if (event === 'board') {
    const other = direction === 'to_work' ? '下班' : '上班';
    primaryHint.textContent = `長按可切換為${other}方向`;
  } else {
    primaryHint.textContent = `寫入後會自動帶入「${DIRECTION_LABELS[direction]}」方向`;
  }
}

function setBusy() {
  actionInFlight = true;
  primaryBtn.setAttribute('disabled', '');
}

function setIdle() {
  actionInFlight = false;
  primaryBtn.dataset.state = '';
  primaryBtn.removeAttribute('disabled');
  renderPrimaryAction();
}

function showLoading() {
  primaryBtn.dataset.state = 'loading';
  primaryBtn.querySelector('.primary-action__icon').innerHTML = '<span class="spinner" aria-label="loading"></span>';
  primaryBtn.querySelector('.primary-action__label').textContent = '';
}

function flashState(state) {
  primaryBtn.dataset.state = state;
  setTimeout(() => {
    if (primaryBtn.dataset.state === state) primaryBtn.dataset.state = '';
  }, 400);
}

function clearLongPressTimer() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function onPrimaryPointerDown(ev) {
  if (actionInFlight) return;
  // Long-press only applies to the board action; alight direction is fixed by open board.
  if (primaryBtn.dataset.event !== 'board') return;
  // Only respond to primary pointer button.
  if (ev.button !== undefined && ev.button !== 0) return;
  longPressFired = false;
  clearLongPressTimer();
  longPressTimer = setTimeout(() => {
    longPressFired = true;
    const inferred = inferDirectionByTime();
    directionOverride = directionOverride
      ? null
      : (inferred === 'to_work' ? 'from_work' : 'to_work');
    renderPrimaryAction();
    if (navigator.vibrate) {
      try { navigator.vibrate(30); } catch {}
    }
  }, LONG_PRESS_MS);
}

function onPrimaryPointerEnd() {
  clearLongPressTimer();
}

function onPrimaryClick(ev) {
  if (longPressFired) {
    longPressFired = false;
    ev.preventDefault();
    return;
  }
  handlePrimary();
}

primaryBtn.addEventListener('pointerdown', onPrimaryPointerDown);
primaryBtn.addEventListener('pointerup', onPrimaryPointerEnd);
primaryBtn.addEventListener('pointercancel', onPrimaryPointerEnd);
primaryBtn.addEventListener('pointerleave', onPrimaryPointerEnd);
primaryBtn.addEventListener('click', onPrimaryClick);

async function handlePrimary() {
  if (actionInFlight) return;
  const event = primaryBtn.dataset.event;
  const direction = primaryBtn.dataset.direction;

  // Notification.requestPermission() AND PushManager.subscribe() must be
  // invoked synchronously inside the user-gesture click handler — Safari/iOS
  // drop the gesture token after any awaited operation. Chain subscribe off
  // the permission promise to stay within the same gesture transaction.
  if (event === 'board') {
    ensureNotificationPermission()
      .then((perm) => {
        if (perm !== 'granted') return null;
        return import('./push.js').then((m) => m.subscribeToPush());
      })
      .catch(() => {});
  }

  setBusy();
  showLoading();
  renderStrip({ state: 'locating' });

  const geo = await locateAndFetchWeather();
  latestWeatherReason = geo.reason;

  const { data, error } = await logEvent({
    direction, event,
    weather: geo.weather,
    temp_c: geo.temp_c,
    lat: geo.lat,
    lon: geo.lon,
  });

  if (error) {
    primaryBtn.classList.add('shake');
    setTimeout(() => primaryBtn.classList.remove('shake'), 240);
    flashState('error');
    setIdle();
    showError(error.message || '送出失敗');
    renderStrip({ state: 'error' });
    return;
  }

  if (event === 'board') {
    setOpenBoard({ id: data.id, direction, event_at: data.logged_at });
    scheduleReminder();
  } else {
    cancelReminder();
    clearOpenBoard();
  }

  directionOverride = null;
  setIdle();
  flashState('success');

  latestEvent = {
    id: data.id,
    direction, event,
    local_time: data.local_time,
    weather: geo.weather,
    temp_c: geo.temp_c,
  };

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
    delete strip.dataset.direction;
    strip.innerHTML = '<div class="row muted">Locating…</div>';
    return;
  }
  if (payload.state === 'error') {
    strip.dataset.state = 'error';
    delete strip.dataset.direction;
    strip.innerHTML = '<div class="row muted">紀錄失敗,請重試</div>';
    return;
  }
  if (payload.state === 'empty') {
    strip.dataset.state = 'empty';
    delete strip.dataset.direction;
    strip.innerHTML = '<div>尚無紀錄。按下方上車鍵開始。</div>';
    return;
  }
  if (payload.state === 'tracking') {
    const ob = payload.openBoard;
    strip.dataset.state = 'tracking';
    strip.dataset.direction = ob.direction;
    const dirLabel = DIRECTION_LABELS[ob.direction];
    const startedAt = formatTime(new Date(ob.event_at));
    const minsAgo = Math.max(0, Math.round((Date.now() - new Date(ob.event_at).getTime()) / 60000));
    strip.innerHTML = `
      <div class="row">
        <span class="time">${startedAt}</span>
        <span class="label">${dirLabel} · 上車</span>
      </div>
      <div class="row muted"><span class="small">追蹤中 · ${minsAgo} 分鐘前</span></div>
    `;
    return;
  }

  const r = payload.record;
  const dirLabel = `${DIRECTION_LABELS[r.direction]}-${EVENT_LABELS[r.event]}`;
  const wxUnavailable = isWeatherUnavailable(r.weather);
  const tempStr = wxUnavailable || r.temp_c == null ? '—°' : `${r.temp_c}°`;

  let etaRow;
  if (r.event === 'alight') {
    etaRow = '';
  } else if (r.prediction) {
    const { eta, swing } = buildEtaText(r.time, r.prediction);
    etaRow = `<div class="eta">ETA ${eta} <span class="small">· n=${r.prediction.n} · ±${swing}min</span></div>`;
  } else {
    etaRow = '<div class="row"><span class="pred-pending">ETA 累積中</span></div>';
  }

  const reasonText = wxUnavailable && latestWeatherReason && latestWeatherReason !== 'ok'
    ? WEATHER_REASON_LABELS[latestWeatherReason] || '天氣資料不可用'
    : '';
  const retryPill = wxUnavailable
    ? `<button class="retry-pill" id="retry-weather" type="button">
         <span class="icon-sm">${ICONS.refresh ? ICONS.refresh(14) : '↻'}</span>
         <span>重抓天氣</span>
       </button>`
    : '';

  strip.dataset.state = 'success';
  strip.dataset.direction = r.direction;
  strip.innerHTML = `
    <div class="row">
      <span class="time">${r.time}</span>
      <span class="label">${dirLabel}</span>
    </div>
    ${etaRow}
    <div class="row weather${wxUnavailable ? ' unavailable' : ''}">
      <span class="icon">${weatherIcon(r.weather)}</span>
      <span class="temp">${tempStr}</span>
      ${reasonText ? `<span class="reason muted">${reasonText}</span>` : ''}
      ${retryPill}
    </div>
  `;

  const retryBtn = document.getElementById('retry-weather');
  if (retryBtn) retryBtn.addEventListener('click', () => retryWeather(r.id));
}

async function retryWeather(eventId) {
  const btn = document.getElementById('retry-weather');
  if (btn) { btn.setAttribute('disabled', ''); btn.querySelector('span:last-child').textContent = '重抓中…'; }
  const geo = await locateAndFetchWeather();
  latestWeatherReason = geo.reason;
  if (geo.reason !== 'ok') {
    if (btn) { btn.removeAttribute('disabled'); btn.querySelector('span:last-child').textContent = '重抓天氣'; }
    if (latestEvent && latestEvent.id === eventId) {
      renderStrip({
        state: 'success',
        record: {
          id: latestEvent.id,
          direction: latestEvent.direction,
          event: latestEvent.event,
          time: formatTime(latestEvent.local_time),
          weather: latestEvent.weather,
          temp_c: latestEvent.temp_c,
          prediction: null,
        },
      });
    }
    showError(WEATHER_REASON_LABELS[geo.reason] || '天氣重抓失敗');
    return;
  }
  const { error } = await updateWeather(eventId, geo);
  if (error) {
    if (btn) { btn.removeAttribute('disabled'); btn.querySelector('span:last-child').textContent = '重抓天氣'; }
    showError(error.message || '更新失敗');
    return;
  }
  if (latestEvent && latestEvent.id === eventId) {
    latestEvent.weather = geo.weather;
    latestEvent.temp_c = geo.temp_c;
  }
  if (latestEvent) {
    renderStrip({
      state: 'success',
      record: {
        id: latestEvent.id,
        direction: latestEvent.direction,
        event: latestEvent.event,
        time: formatTime(latestEvent.local_time),
        weather: geo.weather,
        temp_c: geo.temp_c,
        prediction: null,
      },
    });
  }
  await refreshRecent();
}

async function refreshRecent() {
  const { data, error } = await listEvents(20);
  if (error) {
    recentList.innerHTML = `<li class="empty">無法載入紀錄:${escapeHtml(error.message)}</li>`;
    return;
  }
  recentCache = data || [];
  reconcileWithServer(recentCache);
  renderPrimaryAction();
  // If an open board exists and the user hasn't just logged a new event,
  // surface it in the status strip so they can see what's being tracked.
  const ob = getOpenBoard();
  if (ob && (!latestEvent || latestEvent.id !== ob.id)) {
    renderStrip({ state: 'tracking', openBoard: ob });
  }

  if (recentCache.length === 0) {
    recentList.innerHTML = '<li class="empty">尚無紀錄。</li>';
    return;
  }

  const pairs = pairEvents(recentCache).slice(0, 5);
  if (pairs.length === 0) {
    recentList.innerHTML = '<li class="empty">尚無紀錄。</li>';
    return;
  }

  recentList.innerHTML = pairs.map(renderPairRow).join('');
  recentList.querySelectorAll('.delete-btn').forEach((b) => {
    b.addEventListener('click', (e) => handlePairDelete(e, b));
  });
}

function renderPairRow(p) {
  const primary = p.board || p.alight;
  const ref = p.alight || p.board;
  const wxUnavailable = isWeatherUnavailable(ref.weather);
  const tempStr = wxUnavailable || ref.temp_c == null ? '—°' : `${ref.temp_c}°`;
  const boardTime = p.board ? formatTime(p.board.local_time) : '⋯';
  const alightTime = p.alight ? formatTime(p.alight.local_time) : '⋯';
  let duration;
  if (p.durationMin != null) {
    duration = `<span class="duration mono">${p.durationMin}m</span>`;
  } else if (!p.alight) {
    duration = '<span class="duration active">active</span>';
  } else {
    duration = '<span class="duration muted">—</span>';
  }
  const trash = ICONS.trash ? ICONS.trash(16) : '×';
  const rowClass = !p.alight ? ' open' : (!p.board ? ' orphan' : '');
  return `
    <li class="pair-row${rowClass}">
      <span class="mono date">${formatDate(p.local_date)}</span>
      <span class="wkday muted">${weekdayShort(primary.weekday)}</span>
      <span class="dir">${DIRECTION_ARROWS[p.direction] || ''}</span>
      <span class="dir-label">${DIRECTION_LABELS[p.direction] || ''}</span>
      <span class="trip mono">${boardTime} → ${alightTime}</span>
      ${duration}
      <span class="wx${wxUnavailable ? ' unavailable' : ''}">${weatherIcon(ref.weather)}</span>
      <span class="temp mono">${tempStr}</span>
      <button class="delete-btn" type="button"
              data-board-id="${p.board ? p.board.id : ''}"
              data-alight-id="${p.alight ? p.alight.id : ''}"
              aria-label="刪除">${trash}</button>
    </li>
  `;
}

async function handlePairDelete(ev, btn) {
  ev.stopPropagation();
  if (btn.dataset.confirm !== '1') {
    btn.dataset.confirm = '1';
    btn.classList.add('confirm');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span>確定?</span>';
    setTimeout(() => {
      if (btn.dataset.confirm === '1') {
        btn.dataset.confirm = '';
        btn.classList.remove('confirm');
        btn.innerHTML = orig;
      }
    }, 3000);
    return;
  }
  btn.setAttribute('disabled', '');
  btn.innerHTML = '<span>刪除中…</span>';
  const boardId = btn.dataset.boardId;
  const alightId = btn.dataset.alightId;
  const ops = [];
  if (boardId) ops.push(deleteEvent(boardId));
  if (alightId) ops.push(deleteEvent(alightId));
  if (ops.length === 0) { await refreshRecent(); return; }
  const results = await Promise.all(ops);
  const failed = results.find((r) => r && r.error);
  if (failed) {
    showError(failed.error.message || '刪除失敗');
    await refreshRecent();
    return;
  }
  const ob = getOpenBoard();
  if (ob && (ob.id === boardId || ob.id === alightId)) {
    cancelReminder();
    clearOpenBoard();
  }
  await refreshRecent();
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

window.addEventListener('reminder:auto-discard', () => {
  refreshRecent();
});

const initialOb = getOpenBoard();
if (initialOb) {
  renderStrip({ state: 'tracking', openBoard: initialOb });
} else {
  renderStrip({ state: 'empty' });
}
renderPrimaryAction();
initReminder({
  onAutoDiscard: () => {
    refreshRecent();
  },
});
refreshRecent();
