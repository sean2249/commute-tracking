import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const SECRET_KEY = 'commute.secret';

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

export async function logEvent({ direction, event, weather, temp_c, lat, lon }) {
  return supabase.rpc('log_event', {
    p_secret: secret,
    p_direction: direction,
    p_event: event,
    p_weather: weather ?? 'unknown',
    p_temp_c: temp_c ?? null,
    p_lat: lat ?? null,
    p_lon: lon ?? null,
    p_note: null,
  });
}

export async function listEvents(limit = 50) {
  return supabase.rpc('list_events', { p_secret: secret, p_limit: limit });
}

export async function deleteEvent(id) {
  return supabase.rpc('delete_event', { p_secret: secret, p_id: id });
}

export async function updateWeather(id, { weather, temp_c, lat, lon }) {
  return supabase.rpc('update_weather', {
    p_secret: secret,
    p_id: id,
    p_weather: weather ?? 'unknown',
    p_temp_c: temp_c ?? null,
    p_lat: lat ?? null,
    p_lon: lon ?? null,
  });
}

export async function fetchStats() {
  return supabase.rpc('stats', { p_secret: secret });
}

export async function verifySecret(candidate) {
  const { error } = await supabase.rpc('list_events', { p_secret: candidate, p_limit: 1 });
  return !error;
}
