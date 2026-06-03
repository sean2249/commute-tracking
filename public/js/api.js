import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const SECRET_KEY = 'commute.secret';
const STATS_CACHE_KEY = 'commute.stats.cache';

function resolveSecret() {
  const url = new URL(location.href);
  const fromUrl = url.searchParams.get('key');
  if (fromUrl) {
    localStorage.setItem(SECRET_KEY, fromUrl);
    url.searchParams.delete('key');
    history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
  }
  return localStorage.getItem(SECRET_KEY);
}

export const secret = resolveSecret();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'commute' },
  auth: { persistSession: false },
});

const isUnlockPage = location.pathname.endsWith('/unlock.html') || location.pathname.endsWith('/unlock');

if (!secret && !isUnlockPage) {
  location.replace('unlock.html');
}

export function clearSecret() {
  localStorage.removeItem(SECRET_KEY);
}

export function setSecret(value) {
  localStorage.setItem(SECRET_KEY, value);
}

// --- stats cache (stale-while-revalidate) ------------------------------------
// stats() returns the full durations payload on every call. Since the data only
// changes when this single user logs/edits an event, we cache the last payload
// and let the Charts page paint instantly from it while revalidating in the
// background. Any mutation below invalidates the cache.

export function getCachedStats() {
  try {
    const raw = localStorage.getItem(STATS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedStats(data) {
  try {
    localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode — caching is best-effort */
  }
}

export function invalidateStats() {
  localStorage.removeItem(STATS_CACHE_KEY);
}

export async function logEvent({ direction, event, weather, temp_c, lat, lon }) {
  const res = await supabase.rpc('log_event', {
    p_secret: secret,
    p_direction: direction,
    p_event: event,
    p_weather: weather ?? 'unknown',
    p_temp_c: temp_c ?? null,
    p_lat: lat ?? null,
    p_lon: lon ?? null,
    p_note: null,
  });
  if (!res.error) invalidateStats();
  return res;
}

export async function listEvents(limit = 50) {
  return supabase.rpc('list_events', { p_secret: secret, p_limit: limit });
}

export async function deleteEvent(id) {
  const res = await supabase.rpc('delete_event', { p_secret: secret, p_id: id });
  if (!res.error) invalidateStats();
  return res;
}

export async function updateWeather(id, { weather, temp_c, lat, lon }) {
  const res = await supabase.rpc('update_weather', {
    p_secret: secret,
    p_id: id,
    p_weather: weather ?? 'unknown',
    p_temp_c: temp_c ?? null,
    p_lat: lat ?? null,
    p_lon: lon ?? null,
  });
  if (!res.error) invalidateStats();
  return res;
}

export async function fetchStats() {
  const res = await supabase.rpc('stats', { p_secret: secret });
  if (!res.error && res.data) setCachedStats(res.data);
  return res;
}

export async function verifySecret(candidate) {
  const { error } = await supabase.rpc('list_events', { p_secret: candidate, p_limit: 1 });
  return !error;
}
