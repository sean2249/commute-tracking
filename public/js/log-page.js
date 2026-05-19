import { listEvents, deleteEvent, updateNote } from './api.js';
import { formatDate, formatTime, weekdayShort } from './time.js';
import { weatherIcon, isWeatherUnavailable, ICONS } from './icons.js';

const listEl = document.getElementById('log-list');
const chipBar = document.getElementById('filter-chips');

const DIRECTION_LABELS = { to_work: '上班', from_work: '下班' };
const EVENT_LABELS = { board: '上車', alight: '下車' };
const DIRECTION_ARROWS = { to_work: '↑', from_work: '↓' };

let allEvents = [];
let filters = { event: null, direction: null, weather: null };
let expandedId = null;

document.querySelectorAll('[data-icon]').forEach((el) => {
  const name = el.dataset.icon;
  if (ICONS[name]) el.innerHTML = ICONS[name](Number(el.dataset.size) || 20);
});

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

async function load() {
  listEl.innerHTML = skeletonRows(8);
  const { data, error } = await listEvents(50);
  if (error) {
    listEl.innerHTML = `<li class="empty">載入失敗：${escapeHtml(error.message)}</li>`;
    return;
  }
  allEvents = data || [];
  render();
  if (location.hash) {
    const id = location.hash.slice(1);
    if (allEvents.some((e) => e.id === id)) toggleExpand(id);
  }
}

function render() {
  const rows = allEvents.filter((e) =>
    (!filters.event || e.event === filters.event) &&
    (!filters.direction || e.direction === filters.direction) &&
    (!filters.weather || e.weather === filters.weather)
  );
  if (rows.length === 0) {
    listEl.innerHTML = `
      <li class="empty-state">
        <div class="icon-lg">${ICONS.list(48)}</div>
        <div>${allEvents.length === 0 ? '尚無紀錄。' : '此篩選下無資料。'}</div>
        ${allEvents.length === 0 ? '<a href="/index.html" class="btn btn-primary">回首頁紀錄</a>' : ''}
      </li>`;
    return;
  }
  listEl.innerHTML = rows.map(renderRow).join('');
  rows.forEach((e) => {
    const btn = document.querySelector(`[data-row-id="${e.id}"]`);
    if (btn) btn.addEventListener('click', () => toggleExpand(e.id));
  });
}

function renderRow(e) {
  const wxUnavailable = isWeatherUnavailable(e.weather);
  const expanded = e.id === expandedId;
  return `
    <li class="log-row${expanded ? ' expanded' : ''}" id="row-${e.id}">
      <button class="row-button" data-row-id="${e.id}">
        <span class="mono date">${formatDate(e.local_date)}</span>
        <span class="mono time">${formatTime(e.local_time)}</span>
        <span class="wkday muted">${weekdayShort(e.weekday)}</span>
        <span class="dir">${DIRECTION_ARROWS[e.direction] || ''}</span>
        <span class="event">${EVENT_LABELS[e.event] || e.event}</span>
        <span class="wx${wxUnavailable ? ' unavailable' : ''}">${weatherIcon(e.weather)}</span>
        <span class="temp">${wxUnavailable || e.temp_c == null ? '—°' : e.temp_c + '°'}</span>
        <span class="note">${escapeHtml(e.note || '—')}</span>
      </button>
      ${expanded ? renderPanel(e) : ''}
    </li>
  `;
}

function renderPanel(e) {
  return `
    <div class="row-panel">
      <label>
        <span>Note</span>
        <textarea id="note-${e.id}" rows="2" placeholder="加入備註…">${escapeHtml(e.note || '')}</textarea>
      </label>
      <div class="actions">
        <button class="btn btn-danger" data-action="delete" data-id="${e.id}">Delete</button>
        <button class="btn btn-primary" data-action="save" data-id="${e.id}">Save</button>
      </div>
    </div>
  `;
}

function toggleExpand(id) {
  expandedId = expandedId === id ? null : id;
  render();
  if (expandedId) {
    history.replaceState({}, '', '#' + expandedId);
    setTimeout(() => {
      document.getElementById(`row-${expandedId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 220);
  } else if (location.hash) {
    history.replaceState({}, '', location.pathname);
  }
}

document.addEventListener('click', async (e) => {
  const action = e.target.closest('[data-action]');
  if (!action) return;
  e.stopPropagation();
  const id = action.dataset.id;
  if (action.dataset.action === 'save') {
    const text = document.getElementById('note-' + id).value;
    action.textContent = 'Saving…';
    const { error } = await updateNote(id, text);
    if (error) { action.textContent = 'Save'; showError(error.message); return; }
    const idx = allEvents.findIndex((x) => x.id === id);
    if (idx >= 0) allEvents[idx].note = text;
    expandedId = null;
    render();
  }
  if (action.dataset.action === 'delete') {
    if (action.dataset.confirm !== '1') {
      action.dataset.confirm = '1';
      action.textContent = 'Confirm delete?';
      setTimeout(() => {
        if (action.dataset.confirm === '1') {
          action.dataset.confirm = '';
          action.textContent = 'Delete';
        }
      }, 3000);
      return;
    }
    action.textContent = 'Deleting…';
    const { error } = await deleteEvent(id);
    if (error) { action.textContent = 'Delete'; showError(error.message); return; }
    allEvents = allEvents.filter((x) => x.id !== id);
    expandedId = null;
    render();
  }
});

function skeletonRows(n) {
  return Array.from({ length: n }).map(() => '<li class="log-row"><div class="skeleton" style="height: 32px; margin: 4px;"></div></li>').join('');
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
