import { fetchStats } from './api.js';
import { ICONS } from './icons.js';

const WEEKDAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEATHER_LABELS = {
  clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', heavy_rain: 'Heavy rain', snow: 'Snow', unknown: 'Unknown',
};
const DIR_LABELS = { to_work: 'To work', from_work: 'From work' };

const chartInstances = {};

document.querySelectorAll('[data-icon]').forEach((el) => {
  const name = el.dataset.icon;
  if (ICONS[name]) el.innerHTML = ICONS[name](Number(el.dataset.size) || 20);
});

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function commonChartOptions() {
  const fg = cssVar('--fg');
  const fgMuted = cssVar('--fg-muted');
  const border = cssVar('--border');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: reducedMotion ? false : { duration: 700, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        labels: { color: fg, font: { family: cssVar('--font-mono'), size: 12 } },
      },
      tooltip: {
        backgroundColor: cssVar('--bg-elevated'),
        titleColor: fg,
        bodyColor: fg,
        borderColor: border,
        borderWidth: 1,
        padding: 8,
        cornerRadius: 8,
        titleFont: { family: cssVar('--font-mono'), size: 12 },
        bodyFont: { family: cssVar('--font-mono'), size: 12 },
      },
    },
    scales: {
      x: { ticks: { color: fgMuted, font: { family: cssVar('--font-mono'), size: 11 } }, grid: { color: border } },
      y: { ticks: { color: fgMuted, font: { family: cssVar('--font-mono'), size: 11 } }, grid: { color: border } },
    },
  };
}

async function load() {
  const { data, error } = await fetchStats();
  if (error) {
    document.getElementById('agg-events').textContent = '—';
    showError('載入統計失敗：' + error.message);
    return;
  }

  renderAggregates(data.totals || {});
  const durations = data.durations || [];
  const predictions = data.predictions || [];
  const boardings = data.recent_boardings || [];

  renderTrend(durations);
  renderScatter(boardings);
  renderWeather(predictions);
  renderWeekday(predictions);
}

function renderAggregates(t) {
  const set = (id, val, unit = '') => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val == null ? '—' : (val + unit);
  };
  set('agg-events', t.events ?? 0);
  set('agg-paired', t.paired ?? 0);
  set('agg-avg', t.avg_7d_min ?? null, ' min');
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

function renderTrend(durations) {
  setN('n-trend', durations.length);
  lowSample('section-trend', durations.length);
  if (durations.length === 0) {
    renderEmpty('chart-trend');
    return;
  }
  const byDir = { to_work: [], from_work: [] };
  durations.forEach((d) => {
    if (!byDir[d.direction]) return;
    byDir[d.direction].push({ x: d.local_date, y: Number(d.duration_min) });
  });
  const accent = cssVar('--accent');
  const muted = cssVar('--fg-muted');
  chartInstances.trend?.destroy();
  chartInstances.trend = new Chart(document.getElementById('chart-trend'), {
    type: 'line',
    data: {
      datasets: [
        { label: DIR_LABELS.to_work, data: byDir.to_work, borderColor: accent, backgroundColor: accent, tension: 0.2, pointRadius: 3 },
        { label: DIR_LABELS.from_work, data: byDir.from_work, borderColor: muted, backgroundColor: muted, tension: 0.2, pointRadius: 3, borderDash: [4, 4] },
      ],
    },
    options: {
      ...commonChartOptions(),
      parsing: false,
      scales: {
        ...commonChartOptions().scales,
        x: { ...commonChartOptions().scales.x, type: 'time', time: { unit: 'day' } },
        y: { ...commonChartOptions().scales.y, title: { display: true, text: 'min', color: cssVar('--fg-muted') } },
      },
    },
  });
}

function renderScatter(boardings) {
  setN('n-scatter', boardings.length);
  lowSample('section-scatter', boardings.length);
  if (boardings.length === 0) {
    renderEmpty('chart-scatter');
    return;
  }
  const accent = cssVar('--accent');
  const muted = cssVar('--fg-muted');
  const datasets = { to_work: [], from_work: [] };
  boardings.forEach((b) => {
    const [h, m] = (b.local_time || '00:00').split(':').map(Number);
    const minutesFrom8 = (h * 60 + m) - 8 * 60;
    datasets[b.direction]?.push({ x: b.local_date, y: minutesFrom8 });
  });
  chartInstances.scatter?.destroy();
  chartInstances.scatter = new Chart(document.getElementById('chart-scatter'), {
    type: 'scatter',
    data: {
      datasets: [
        { label: DIR_LABELS.to_work, data: datasets.to_work, backgroundColor: accent },
        { label: DIR_LABELS.from_work, data: datasets.from_work, backgroundColor: muted },
      ],
    },
    options: {
      ...commonChartOptions(),
      scales: {
        ...commonChartOptions().scales,
        x: { ...commonChartOptions().scales.x, type: 'time', time: { unit: 'day' } },
        y: { ...commonChartOptions().scales.y, title: { display: true, text: 'min from 8:00', color: cssVar('--fg-muted') } },
      },
    },
  });
}

function renderWeather(predictions) {
  const eligible = predictions.filter((p) => p.n >= 3);
  setN('n-weather', eligible.reduce((sum, p) => sum + p.n, 0));
  lowSample('section-weather', eligible.length === 0 ? 0 : 10);
  if (eligible.length === 0) {
    renderEmpty('chart-weather', '尚無樣本（每組需 n≥3）');
    return;
  }
  const groups = {};
  eligible.forEach((p) => {
    if (!groups[p.weather]) groups[p.weather] = { medians: [], p90s: [], n: 0 };
    groups[p.weather].medians.push(Number(p.median_min));
    groups[p.weather].p90s.push(Number(p.p90_min));
    groups[p.weather].n += p.n;
  });
  const labels = Object.keys(groups);
  const medians = labels.map((k) => avg(groups[k].medians));
  const p90s = labels.map((k) => avg(groups[k].p90s));
  chartInstances.weather?.destroy();
  chartInstances.weather = new Chart(document.getElementById('chart-weather'), {
    type: 'bar',
    data: {
      labels: labels.map((k) => WEATHER_LABELS[k] || k),
      datasets: [
        { label: 'Median', data: medians, backgroundColor: cssVar('--accent') },
        { label: 'P90', data: p90s, backgroundColor: cssVar('--fg-muted') },
      ],
    },
    options: commonChartOptions(),
  });
}

function renderWeekday(predictions) {
  const eligible = predictions.filter((p) => p.n >= 3);
  setN('n-weekday', eligible.reduce((sum, p) => sum + p.n, 0));
  lowSample('section-weekday', eligible.length === 0 ? 0 : 10);
  if (eligible.length === 0) {
    renderEmpty('chart-weekday', '尚無樣本（每組需 n≥3）');
    return;
  }
  const groups = {};
  eligible.forEach((p) => {
    if (!groups[p.weekday]) groups[p.weekday] = { medians: [], p90s: [], n: 0 };
    groups[p.weekday].medians.push(Number(p.median_min));
    groups[p.weekday].p90s.push(Number(p.p90_min));
    groups[p.weekday].n += p.n;
  });
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => groups[d]);
  const medians = days.map((d) => avg(groups[d].medians));
  const p90s = days.map((d) => avg(groups[d].p90s));
  chartInstances.weekday?.destroy();
  chartInstances.weekday = new Chart(document.getElementById('chart-weekday'), {
    type: 'bar',
    data: {
      labels: days.map((d) => WEEKDAY_LABELS[d]),
      datasets: [
        { label: 'Median', data: medians, backgroundColor: cssVar('--accent') },
        { label: 'P90', data: p90s, backgroundColor: cssVar('--fg-muted') },
      ],
    },
    options: commonChartOptions(),
  });
}

function avg(arr) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'toast-error';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

load();
