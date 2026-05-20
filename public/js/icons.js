const SVG_NS = 'http://www.w3.org/2000/svg';
const STROKE = 'currentColor';
const SW = '1.5';

function svg(size, paths) {
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${STROKE}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export const ICONS = {
  gear: (s = 20) => svg(s, '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  chevronLeft: (s = 20) => svg(s, '<polyline points="15 18 9 12 15 6"/>'),
  chevronRight: (s = 16) => svg(s, '<polyline points="9 18 15 12 9 6"/>'),
  chevronDown: (s = 16) => svg(s, '<polyline points="6 9 12 15 18 9"/>'),
  trash: (s = 16) => svg(s, '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>'),
  undo: (s = 16) => svg(s, '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>'),
  home: (s = 22) => svg(s, '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>'),
  list: (s = 22) => svg(s, '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
  barChart: (s = 22) => svg(s, '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
  sun: (s = 16) => svg(s, '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/>'),
  cloud: (s = 16) => svg(s, '<path d="M17.5 19a4.5 4.5 0 1 0-1.1-8.86 6 6 0 1 0-11.4 2.86A4 4 0 0 0 6.5 19z"/>'),
  cloudRain: (s = 16) => svg(s, '<path d="M16 13a4 4 0 1 0-1-7.87 6 6 0 1 0-10 3.87"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="16" y1="19" x2="16" y2="21"/>'),
  wind: (s = 16) => svg(s, '<path d="M9.59 4.59A2 2 0 1 1 11 8H2"/><path d="M17 8a2 2 0 1 1 1.41 3.41"/><path d="M9.59 19.41A2 2 0 1 0 11 16H2"/>'),
  helpCircle: (s = 16) => svg(s, '<circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  refresh: (s = 16) => svg(s, '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>'),
};

export function weatherIcon(category, size = 16) {
  switch (category) {
    case 'clear': return ICONS.sun(size);
    case 'cloudy': return ICONS.cloud(size);
    case 'rain': return ICONS.cloudRain(size);
    case 'heavy_rain': return ICONS.cloudRain(size);
    case 'snow': return ICONS.wind(size);
    default: return ICONS.helpCircle(size);
  }
}

export function isWeatherUnavailable(category) {
  return !category || category === 'unknown';
}
