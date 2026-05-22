import { supabase, secret } from './api.js';
import { VAPID_PUBLIC_KEY } from './config.js';

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function subscribeToPush() {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (Notification.permission !== 'granted') return { ok: false, reason: 'no-permission' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'no-vapid-key' };

  let reg;
  try {
    reg = await navigator.serviceWorker.ready;
  } catch (err) {
    console.warn('[push] sw not ready', err);
    return { ok: false, reason: 'no-sw' };
  }

  let sub;
  try {
    sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));
  } catch (err) {
    console.warn('[push] subscribe failed', err);
    return { ok: false, reason: 'subscribe-failed', error: err };
  }

  const json = sub.toJSON();
  const { error } = await supabase.rpc('register_push_subscription', {
    p_secret: secret,
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh ?? null,
    p_auth: json.keys?.auth ?? null,
    p_user_agent: navigator.userAgent ?? null,
  });
  if (error) {
    console.warn('[push] register RPC failed', error);
    return { ok: false, reason: 'register-failed', error };
  }
  return { ok: true, endpoint: json.endpoint };
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return { ok: true };
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    const { error } = await supabase.rpc('unregister_push_subscription', {
      p_secret: secret,
      p_endpoint: endpoint,
    });
    if (error) {
      console.warn('[push] unregister RPC failed', error);
      return { ok: false, reason: 'unregister-failed', error };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}
