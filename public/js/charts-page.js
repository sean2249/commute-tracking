import { fetchStats } from './api.js';
import { ICONS } from './icons.js';

const WEEKDAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEATHER_ORDER = ['clear', 'cloudy', 'rain', 'heavy_rain', 'snow', 'unknown'];
const WEATHER_LABELS = {
  clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', heavy_rain: 'Heavy rain', snow: 'Snow', unknown: 'Unknown',
};
const DIR_LABELS = { to_work: 'To work', from_work: 'From work' };
// Strict am/pm semantics: to_work = sun (--am), from_work = clay (--pm).
const DIR_TOKENS = { to_work: '--am', from_work: '--pm' };
const DIRECTIONS = ['to_work', 'from_work'];

const chartInstances = {};

document.querySelectorAll('[data-icon]').forEach((el) => {
  const name = el.dataset.icon;
  if (ICONS[name]) el.innerHTML = ICONS[name](Number(el.dataset.size) || 20);
});

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// --- stats helpers ------------------------------------------------------------

function percentile(values, q) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const median = (values) => percentile(values, 0.5);

function groupBy(rows, keyFn) {
  const groups = {};
  rows.forEach((r) => {
    const k = keyFn(r);
    if (k == null) return;
    (groups[k] ||= []).push(r);
  });
  return groups;
}

// "09:15:22.27" -> minutes since midnight.
function parseClockMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function fmtClock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// Least-squares fit; returns null if fewer than 2 distinct x values.
function linregress(points) {
  const n = points.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  points.forEach((p) => { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

// --- chart config -------------------------------------------------------------

function commonChartOptions() {
  const fg = cssVar('--fg');
  const fgMuted = cssVar('--fg-muted');
  const border = cssVar('--border');
  const mono = cssVar('--font-mono');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: reducedMotion ? false : { duration: 700, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        labels: { color: fg, font: { family: mono, size: 12 } },
      },
      tooltip: {
        backgroundColor: cssVar('--bg-elevated'),
        titleColor: fg,
        bodyColor: fg,
        borderColor: border,
        borderWidth: 1,
        padding: 8,
        cornerRadius: 8,
        titleFont: { family: mono, size: 12 },
        bodyFont: { family: mono, size: 12 },
      },
    },
    scales: {
      x: { ticks: { color: fgMuted, font: { family: mono, size: 11 } }, grid: { color: border } },
      y: { ticks: { color: fgMuted, font: { family: mono, size: 11 } }, grid: { color: border } },
    },
  };
}

function durationYScale(base) {
  return {
    ...base.scales.y,
    beginAtZero: true,
    title: { display: true, text: 'duration (min)', color: cssVar('--fg-muted') },
  };
}

// --- load ---------------------------------------------------------------------

async function load() {
  const { data, error } = await fetchStats();
  if (error) {
    document.getElementById('agg-events').textContent = '—';
    showError('載入統計失敗：' + error.message);
    return;
  }

  const durations = (data.durations || []).map((d) => ({
    direction: d.direction,
    weekday: Number(d.weekday),
    weather: d.board_weather,
    duration_min: Number(d.duration_min),
    board_minutes: parseClockMinutes(d.board_time),
    temp_c: d.board_temp_c == null ? null : Number(d.board_temp_c),
  }));

  renderAggregates(data.totals || {}, durations);
  renderWeekday(durations);
  renderWeather(durations);
  renderBoarding(durations);
  renderTemp(durations);
}

function renderAggregates(t, durations) {
  const set = (id, val, unit = '') => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val == null ? '—' : (val + unit);
  };
  const med = median(durations.map((d) => d.duration_min));
  set('agg-events', t.events ?? 0);
  set('agg-paired', t.paired ?? durations.length);
  set('agg-median', med == null ? null : Math.round(med), ' min');
  set('agg-missing', t.missing_alight ?? 0);
}

function setN(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = 'n=' + n;
}

function lowSample(sectionId, n) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const banner = section.querySelector('.chart-low-sample-banner');
  if (banner) banner.style.display = n > 0 && n < 10 ? 'inline-block' : 'none';
}

function renderEmpty(canvasId, msg = '尚無紀錄') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const wrap = canvas.parentElement;
  wrap.innerHTML = `<div class="chart-empty">${ICONS.list(32)}<div>${msg}</div></div>`;
}

// Grouped bar of median duration per category, split by direction.
function renderMedianBars({ canvasId, sectionId, nId, durations, categories, keyFn, labelFn }) {
  setN(nId, durations.length);
  lowSample(sectionId, durations.length);
  if (durations.length === 0) {
    renderEmpty(canvasId);
    return;
  }
  const present = categories.filter((c) => durations.some((d) => keyFn(d) === c));
  const base = commonChartOptions();
  const datasets = DIRECTIONS.map((dir) => {
    const byCat = groupBy(durations.filter((d) => d.direction === dir), keyFn);
    return {
      label: DIR_LABELS[dir],
      data: present.map((c) => {
        const rows = byCat[c];
        return rows ? Math.round(median(rows.map((r) => r.duration_min)) * 10) / 10 : null;
      }),
      backgroundColor: cssVar(DIR_TOKENS[dir]),
    };
  });
  chartInstances[canvasId]?.destroy();
  chartInstances[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: { labels: present.map(labelFn), datasets },
    options: { ...base, scales: { ...base.scales, y: durationYScale(base) } },
  });
}

function renderWeekday(durations) {
  renderMedianBars({
    canvasId: 'chart-weekday',
    sectionId: 'section-weekday',
    nId: 'n-weekday',
    durations,
    categories: [1, 2, 3, 4, 5, 6, 7],
    keyFn: (d) => d.weekday,
    labelFn: (d) => WEEKDAY_LABELS[d],
  });
}

function renderWeather(durations) {
  renderMedianBars({
    canvasId: 'chart-weather',
    sectionId: 'section-weather',
    nId: 'n-weather',
    durations,
    categories: WEATHER_ORDER,
    keyFn: (d) => d.weather,
    labelFn: (w) => WEATHER_LABELS[w] || w,
  });
}

// Scatter of duration vs a numeric factor, split by direction, with a fit line.
function renderScatterFactor({ canvasId, sectionId, nId, rows, xOf, xScale }) {
  setN(nId, rows.length);
  lowSample(sectionId, rows.length);
  if (rows.length === 0) {
    renderEmpty(canvasId, '尚無樣本');
    return;
  }
  const base = commonChartOptions();
  const datasets = [];
  DIRECTIONS.forEach((dir) => {
    const pts = rows
      .filter((d) => d.direction === dir)
      .map((d) => ({ x: xOf(d), y: d.duration_min }));
    if (pts.length === 0) return;
    const color = cssVar(DIR_TOKENS[dir]);
    datasets.push({ label: DIR_LABELS[dir], data: pts, backgroundColor: color, pointRadius: 4 });
    const fit = linregress(pts);
    if (fit) {
      const xs = pts.map((p) => p.x);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      if (x1 > x0) {
        datasets.push({
          label: DIR_LABELS[dir] + ' fit',
          type: 'line',
          data: [
            { x: x0, y: fit.slope * x0 + fit.intercept },
            { x: x1, y: fit.slope * x1 + fit.intercept },
          ],
          borderColor: color,
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        });
      }
    }
  });
  chartInstances[canvasId]?.destroy();
  chartInstances[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'scatter',
    data: { datasets },
    options: {
      ...base,
      plugins: {
        ...base.plugins,
        legend: {
          ...base.plugins.legend,
          // Hide the regression-line entries — the point series already name the directions.
          labels: { ...base.plugins.legend.labels, filter: (item) => !/ fit$/.test(item.text) },
        },
      },
      scales: {
        x: { ...base.scales.x, ...xScale },
        y: durationYScale(base),
      },
    },
  });
}

function renderBoarding(durations) {
  const rows = durations.filter((d) => d.board_minutes != null);
  renderScatterFactor({
    canvasId: 'chart-boarding',
    sectionId: 'section-boarding',
    nId: 'n-boarding',
    rows,
    xOf: (d) => d.board_minutes,
    xScale: {
      type: 'linear',
      min: 0,
      max: 1440,
      ticks: {
        color: cssVar('--fg-muted'),
        font: { family: cssVar('--font-mono'), size: 11 },
        stepSize: 180,
        callback: (v) => fmtClock(v),
      },
      title: { display: true, text: 'boarding time', color: cssVar('--fg-muted') },
    },
  });
}

function renderTemp(durations) {
  const rows = durations.filter((d) => d.temp_c != null);
  renderScatterFactor({
    canvasId: 'chart-temp',
    sectionId: 'section-temp',
    nId: 'n-temp',
    rows,
    xOf: (d) => d.temp_c,
    xScale: {
      type: 'linear',
      title: { display: true, text: 'temperature (°C)', color: cssVar('--fg-muted') },
    },
  });
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'toast-error';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

load();
