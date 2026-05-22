const TZ = 'Asia/Taipei';
const WEEKDAY_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function nowInTz() {
  return new Date();
}

export function formatTime(d) {
  if (typeof d === 'string') {
    const m = d.match(/^(\d{2}):(\d{2})/);
    if (m) return `${m[1]}:${m[2]}`;
  }
  if (d instanceof Date) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ, hour12: false });
  }
  return '';
}

export function formatDate(d) {
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[2]}-${m[3]}`;
  }
  if (d instanceof Date) {
    return d.toLocaleDateString('en-CA', { month: '2-digit', day: '2-digit', timeZone: TZ });
  }
  return '';
}

export function weekdayShort(n) {
  return WEEKDAY_SHORT[n] || '';
}

export function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + Math.round(Number(minutes));
  const hh = String(Math.floor((total % (24 * 60) + 24 * 60) % (24 * 60) / 60)).padStart(2, '0');
  const mm = String(((total % 60) + 60) % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function inferDirectionByTime(date = new Date()) {
  const hourStr = date.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ });
  const hour = parseInt(hourStr, 10);
  return hour >= 16 ? 'from_work' : 'to_work';
}

export function minutesBetween(earlier, later) {
  if (!earlier || !later) return null;
  const [eh, em] = earlier.split(':').map(Number);
  const [lh, lm] = later.split(':').map(Number);
  return (lh * 60 + lm) - (eh * 60 + em);
}
