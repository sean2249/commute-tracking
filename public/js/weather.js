const WMO_GROUPS = {
  clear: [0],
  cloudy: [1, 2, 3],
  rain: [51, 53, 55, 56, 57, 61, 63, 65, 80, 81],
  heavy_rain: [82, 95, 96, 99],
  snow: [71, 73, 75, 77, 85, 86],
};

export function categorize(code) {
  for (const [key, list] of Object.entries(WMO_GROUPS)) {
    if (list.includes(code)) return key;
  }
  return 'unknown';
}

export async function getWeather(lat, lon, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
      { signal: ctrl.signal },
    );
    if (!r.ok) throw new Error('weather http ' + r.status);
    const j = await r.json();
    const code = j?.current?.weather_code;
    const temp = j?.current?.temperature_2m;
    return {
      category: categorize(code),
      temp_c: typeof temp === 'number' ? Math.round(temp) : null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function locateAndFetchWeather() {
  let lat = null, lon = null, weather = 'unknown', temp = null;
  if (!('geolocation' in navigator)) {
    return { lat, lon, weather, temp_c: temp };
  }
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000, maximumAge: 60_000 }),
    );
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
  } catch {
    return { lat, lon, weather, temp_c: temp };
  }
  try {
    const w = await getWeather(lat, lon);
    weather = w.category;
    temp = w.temp_c;
  } catch {
    // keep fallback
  }
  return { lat, lon, weather, temp_c: temp };
}
