// Time-of-day dark mode.
// Day starts 07:00, night starts 17:00 (fixed, per spec — no geolocation).
// A manual override (long-press the brand wordmark / stop dot) wins until
// the end of the current day. Transition crossfades unless reduced-motion.

const K_OVERRIDE = 'commute.themeOverride';
const LONG_PRESS_MS = 500;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Auto theme purely from the clock: dark when 17:00–06:59.
function autoTheme() {
  const h = new Date().getHours();
  return (h >= 17 || h < 7) ? 'dark' : 'light';
}

function readOverride() {
  try {
    const raw = localStorage.getItem(K_OVERRIDE);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && o.day === todayKey() && (o.theme === 'dark' || o.theme === 'light')) return o.theme;
    // stale (different day) — clear it
    localStorage.removeItem(K_OVERRIDE);
  } catch {}
  return null;
}

function effectiveTheme() {
  return readOverride() || autoTheme();
}

export function applyTheme() {
  document.documentElement.dataset.theme = effectiveTheme();
}

function toggleOverride() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(K_OVERRIDE, JSON.stringify({ theme: next, day: todayKey() })); } catch {}
  applyTheme();
  if (navigator.vibrate) { try { navigator.vibrate(30); } catch {} }
}

function wireLongPress() {
  const brand = document.querySelector('.app-header h1');
  if (!brand) return;
  brand.style.cursor = 'pointer';
  brand.setAttribute('title', '長按切換日／夜');
  let timer = null;
  let fired = false;
  const start = () => {
    fired = false;
    timer = setTimeout(() => { fired = true; toggleOverride(); }, LONG_PRESS_MS);
  };
  const end = () => { if (timer) { clearTimeout(timer); timer = null; } };
  brand.addEventListener('pointerdown', start);
  brand.addEventListener('pointerup', end);
  brand.addEventListener('pointercancel', end);
  brand.addEventListener('pointerleave', end);
  // Prevent the long-press from also triggering navigation/selection.
  brand.addEventListener('click', (e) => { if (fired) { e.preventDefault(); fired = false; } });
}

// Apply immediately, re-evaluate every minute so it flips at 07:00 / 17:00.
applyTheme();
setInterval(applyTheme, 60 * 1000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') applyTheme(); });
if (document.readyState !== 'loading') wireLongPress();
else document.addEventListener('DOMContentLoaded', wireLongPress);
