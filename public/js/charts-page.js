import { fetchStats, getCachedStats } from './api.js';
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

// Bars start at 0 (truncated bar axes mislead); scatter charts auto-scale so the
// point cloud isn't squashed into a thin band, with a little headroom via `grace`.
function durationYScale(base, { beginAtZero = true } = {}) {
  return {
    ...base.scales.y,
    beginAtZero,
    ...(beginAtZero ? {} : { grace: '10%' }),
    title: { display: true, text: 'duration (min)', color: cssVar('--fg-muted') },
  };
}

// --- load ---------------------------------------------------------------------

// Stale-while-revalidate: paint instantly from the cached payload, then refresh
// from the network and re-render only if the data actually changed.
async function load() {
  const cached = getCachedStats();
  if (cached) render(cached);

  const { data, error } = await fetchStats();
  if (error) {
    if (!cached) {
      document.getElementById('agg-events').textContent = '—';
      showError('載入統計失敗：' + error.message);
    }
    return;
  }
  if (!cached || JSON.stringify(data) !== JSON.stringify(cached)) render(data);
}

function render(data) {
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

  // Per-direction breakdown: median duration + trip count for each direction.
  const byDir = groupBy(durations, (d) => d.direction);
  const cellIds = {
    to_work: ['agg-towork-dur', 'agg-towork-n'],
    from_work: ['agg-fromwork-dur', 'agg-fromwork-n'],
  };
  DIRECTIONS.forEach((dir) => {
    const rows = byDir[dir] || [];
    const m = median(rows.map((r) => r.duration_min));
    const [durId, nId] = cellIds[dir];
    set(durId, m == null ? null : Math.round(m), ' min');
    set(nId, rows.length);
  });
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

// Show an empty-state placeholder without removing the <canvas>, so a later
// (stale-while-revalidate) render with data can still instantiate a chart.
function showEmpty(canvasId, msg = '尚無紀錄') {
  chartInstances[canvasId]?.destroy();
  chartInstances[canvasId] = null;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.style.display = 'none';
  const wrap = canvas.parentElement;
  let ph = wrap.querySelector('.chart-empty');
  if (!ph) {
    ph = document.createElement('div');
    ph.className = 'chart-empty';
    wrap.appendChild(ph);
  }
  ph.innerHTML = `${ICONS.list(32)}<div>${msg}</div>`;
  ph.style.display = '';
}

// Reveal the canvas and hide any empty-state placeholder before (re)instantiating.
function prepCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  canvas.style.display = '';
  const ph = canvas.parentElement.querySelector('.chart-empty');
  if (ph) ph.style.display = 'none';
  return canvas;
}

// Grouped bar of median duration per category, split by direction.
function renderMedianBars({ canvasId, sectionId, nId, durations, categories, keyFn, labelFn }) {
  setN(nId, durations.length);
  lowSample(sectionId, durations.length);
  if (durations.length === 0) {
    showEmpty(canvasId);
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
  chartInstances[canvasId] = new Chart(prepCanvas(canvasId), {
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
// `directions` limits which direction series are drawn (e.g. a single one per chart).
function renderScatterFactor({ canvasId, sectionId, nId, rows, xOf, xScale, directions = DIRECTIONS }) {
  setN(nId, rows.length);
  lowSample(sectionId, rows.length);
  if (rows.length === 0) {
    showEmpty(canvasId, '尚無樣本');
    return;
  }
  const base = commonChartOptions();
  const datasets = [];
  directions.forEach((dir) => {
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
  chartInstances[canvasId] = new Chart(prepCanvas(canvasId), {
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
        y: durationYScale(base, { beginAtZero: false }),
      },
    },
  });
}

// Build a tidy clock x-axis from the data: zoom to the active window instead of
// always spanning a full day. Pads 30 min each side and snaps to whole hours so
// the bounds and ticks land on clean times; step aims for ~5 hourly-aligned ticks.
function boardingXScale(rows) {
  const mins = rows.map((d) => d.board_minutes);
  const lo = mins.length ? Math.min(...mins) : 0;
  const hi = mins.length ? Math.max(...mins) : 1440;
  const min = Math.max(0, Math.floor((lo - 30) / 60) * 60);
  const max = Math.min(1440, Math.ceil((hi + 30) / 60) * 60);
  const stepSize = Math.max(60, Math.ceil((max - min) / 5 / 60) * 60);
  return {
    type: 'linear',
    min,
    max,
    ticks: {
      color: cssVar('--fg-muted'),
      font: { family: cssVar('--font-mono'), size: 11 },
      stepSize,
      callback: (v) => fmtClock(v),
    },
    title: { display: true, text: 'boarding time', color: cssVar('--fg-muted') },
  };
}

function renderBoarding(durations) {
  const rows = durations.filter((d) => d.board_minutes != null);
  // Split into one chart per direction (上班 / 下班); each gets an x-axis scaled
  // to its own boarding window.
  DIRECTIONS.forEach((dir) => {
    const dirRows = rows.filter((d) => d.direction === dir);
    renderScatterFactor({
      canvasId: `chart-boarding-${dir}`,
      sectionId: `section-boarding-${dir}`,
      nId: `n-boarding-${dir}`,
      rows: dirRows,
      xOf: (d) => d.board_minutes,
      xScale: boardingXScale(dirRows),
      directions: [dir],
    });
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
