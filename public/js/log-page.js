import { listEvents, deleteEvent } from './api.js';
import { formatDate, formatTime, weekdayShort } from './time.js';
import { weatherIcon, isWeatherUnavailable, ICONS } from './icons.js';
import { pairEvents } from './pair.js';

const listEl = document.getElementById('log-list');
const chipBar = document.getElementById('filter-chips');

const DIRECTION_LABELS = { to_work: '上班', from_work: '下班' };
const DIRECTION_ARROWS = { to_work: '→', from_work: '←' };

let allEvents = [];
let filters = { status: null, direction: null, weather: null };

document.querySelectorAll('[data-icon]').forEach((el) => {
  const name = el.dataset.icon;
  if (ICONS[name]) el.innerHTML = ICONS[name](Number(el.dataset.size) || 20);
});

if (chipBar) {
  chipBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const group = chip.dataset.group;
    const value = chip.dataset.value === '' ? null : chip.dataset.value;
    filters[group] = filters[group] === value ? null : value;
    chipBar.querySelectorAll(`.chip[data-group="${group}"]`).forEach((c) => {
      c.setAttribute('aria-pressed', String((c.dataset.value === '' ? null : c.dataset.value) === filters[group]));
    });
    render();
  });
}

async function load() {
  listEl.innerHTML = skeletonRows(8);
  const { data, error } = await listEvents(200);
  if (error) {
    listEl.innerHTML = `<li class="empty">載入失敗:${escapeHtml(error.message)}</li>`;
    return;
  }
  allEvents = data || [];
  render();
}

function render() {
  let pairs = pairEvents(allEvents);
  if (filters.direction) pairs = pairs.filter((p) => p.direction === filters.direction);
  if (filters.weather) {
    pairs = pairs.filter((p) => {
      const ref = p.alight || p.board;
      return ref.weather === filters.weather;
    });
  }
  if (filters.status === 'paired') pairs = pairs.filter((p) => p.board && p.alight);
  if (filters.status === 'open') pairs = pairs.filter((p) => !p.alight || !p.board);

  if (pairs.length === 0) {
    listEl.innerHTML = `
      <li class="empty-state">
        <div class="icon-lg">${ICONS.list(48)}</div>
        <div>${allEvents.length === 0 ? '票根簿還是空的。回首頁紀錄第一班車。' : '這個篩選下沒有票根。'}</div>
        ${allEvents.length === 0 ? '<a href="index.html" class="btn btn-primary">回首頁紀錄</a>' : ''}
      </li>`;
    return;
  }

  // Group pairs into days, each with an AM (to_work) + PM (from_work) leg.
  const byDate = new Map();
  for (const p of pairs) {
    let day = byDate.get(p.local_date);
    if (!day) {
      const ref = p.alight || p.board;
      day = { date: p.local_date, weekday: ref.weekday, am: null, pm: null };
      byDate.set(p.local_date, day);
    }
    if (p.direction === 'to_work') day.am = p; else day.pm = p;
  }
  const days = [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });

  listEl.innerHTML = days.map((d) => renderDay(d, today)).join('');
  listEl.querySelectorAll('.delete-btn').forEach((b) => {
    b.addEventListener('click', (e) => handlePairDelete(e, b));
  });
}

function renderDay(d, today) {
  const isToday = d.date === today;
  const dd = d.date.slice(8, 10);
  const wd = weekdayShort(d.weekday).toUpperCase();
  return `
    <li class="log-day${isToday ? ' today' : ''}">
      <div class="day-stamp"><span class="d">${dd}</span><span class="wd">${wd}</span></div>
      ${renderLeg(d.am, 'am', 'to_work')}
      ${renderLeg(d.pm, 'pm', 'from_work')}
    </li>
  `;
}

function renderLeg(p, cls, direction) {
  if (!p) {
    return `<div class="leg ${cls} empty">— ${cls === 'am' ? '無上班' : '無下班'} —</div>`;
  }
  const ref = p.alight || p.board;
  const wxUnavailable = isWeatherUnavailable(ref.weather);
  const tempStr = wxUnavailable || ref.temp_c == null ? '—°' : `${ref.temp_c}°`;
  const boardTime = p.board ? formatTime(p.board.local_time) : '⋯';
  const alightTime = p.alight ? formatTime(p.alight.local_time) : '⋯';
  let dur;
  if (p.durationMin != null) dur = `<span class="min">${p.durationMin}<span class="unit">min</span></span>`;
  else if (!p.alight) dur = '<span class="min active">···</span>';
  else dur = '<span class="min muted">—</span>';
  const trash = ICONS.trash ? ICONS.trash(14) : '×';
  return `
    <div class="leg ${cls}" data-direction="${direction}">
      <span class="dir">${DIRECTION_ARROWS[direction] || ''}</span>
      <span class="times"><b>${boardTime}</b><span class="arr">→</span><b>${alightTime}</b></span>
      <span class="dur">${dur}</span>
      <span class="wx${wxUnavailable ? ' unavailable' : ''}">${weatherIcon(ref.weather, 14)}<span class="temp">${tempStr}</span></span>
      <button class="delete-btn" type="button"
              data-board-id="${p.board ? p.board.id : ''}"
              data-alight-id="${p.alight ? p.alight.id : ''}"
              aria-label="刪除">${trash}</button>
    </div>
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
  const leg = btn.closest('.leg') || btn.closest('li');
  if (leg) leg.classList.add('tearing'); // torn ticket
  const boardId = btn.dataset.boardId;
  const alightId = btn.dataset.alightId;
  const ops = [];
  if (boardId) ops.push(deleteEvent(boardId));
  if (alightId) ops.push(deleteEvent(alightId));
  if (ops.length === 0) { await load(); return; }
  const results = await Promise.all(ops);
  const failed = results.find((r) => r && r.error);
  if (failed) {
    showError(failed.error.message || '刪除失敗');
    await load();
    return;
  }
  allEvents = allEvents.filter((e) => e.id !== boardId && e.id !== alightId);
  render();
}

function skeletonRows(n) {
  return Array.from({ length: n }).map(() => '<li class="skeleton-row"><span class="skeleton" style="display:block;height:18px;width:90%"></span></li>').join('');
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'toast-error';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

load();
