// User-configurable settings: station names + reminder timings.
// Stored in localStorage; safe defaults when unset.

const K_STATIONS = 'commute.stations';
const K_REMIND = 'commute.remindMin';
const K_DISCARD = 'commute.discardMin';

export const DEFAULT_STATIONS = {
  home: { cn: '住所', en: 'HOME' },
  office: { cn: '公司', en: 'OFFICE' },
};
export const DEFAULT_REMIND_MIN = 30;
export const DEFAULT_DISCARD_MIN = 120;

export function getStations() {
  try {
    const raw = localStorage.getItem(K_STATIONS);
    if (raw) {
      const s = JSON.parse(raw);
      return {
        home: {
          cn: (s.home && s.home.cn) || DEFAULT_STATIONS.home.cn,
          en: (s.home && s.home.en) || DEFAULT_STATIONS.home.en,
        },
        office: {
          cn: (s.office && s.office.cn) || DEFAULT_STATIONS.office.cn,
          en: (s.office && s.office.en) || DEFAULT_STATIONS.office.en,
        },
      };
    }
  } catch {}
  return DEFAULT_STATIONS;
}

export function setStations(s) {
  try { localStorage.setItem(K_STATIONS, JSON.stringify(s)); } catch {}
}

// For a commute direction, return [from, to] station objects.
export function routeFor(direction) {
  const s = getStations();
  return direction === 'to_work' ? [s.home, s.office] : [s.office, s.home];
}

function readNum(k, d) {
  try {
    const v = Number(localStorage.getItem(k));
    return Number.isFinite(v) && v > 0 ? v : d;
  } catch { return d; }
}
function writeNum(k, n) {
  try { localStorage.setItem(k, String(n)); } catch {}
}

export function getRemindMin() { return readNum(K_REMIND, DEFAULT_REMIND_MIN); }
export function getDiscardMin() { return readNum(K_DISCARD, DEFAULT_DISCARD_MIN); }
export function setRemindMin(n) { writeNum(K_REMIND, n); }
export function setDiscardMin(n) { writeNum(K_DISCARD, n); }
