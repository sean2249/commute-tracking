import { deleteEvent } from './api.js';
import { getOpenBoard, clearOpenBoard, markNotified } from './openBoard.js';
import { getRemindMin, getDiscardMin } from './settings.js';

const SAFETY_MAX_MS = 24 * 60 * 60 * 1000;

function readOverride(key, fallback) {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

// Configurable in Settings (defaults 30 min remind / 120 min discard).
// The test* keys remain as fast-path overrides for development.
function remindMs() { return readOverride('commute.testReminderMs', getRemindMin() * 60 * 1000); }
function discardMs() { return readOverride('commute.testDiscardMs', getDiscardMin() * 60 * 1000); }

let remindTimer = null;
let discardTimer = null;
let listeners = { onAutoDiscard: null };
let inited = false;

export function cancel() {
  if (remindTimer) { clearTimeout(remindTimer); remindTimer = null; }
  if (discardTimer) { clearTimeout(discardTimer); discardTimer = null; }
}

export async function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

async function getSwRegistration(timeoutMs = 2000) {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, rej) => setTimeout(() => rej(new Error('sw ready timeout')), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

async function showReminderNotification(ob) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  const title = '別忘了按下車';
  const mins = getRemindMin();
  const body = `${ob.direction === 'to_work' ? '上班' : '下班'}的「上車」已記錄 ${mins} 分鐘了。`;
  const opts = { body, tag: `commute-remind-${ob.id}`, renotify: true, badge: 'icons/icon-180.png', icon: 'icons/icon-180.png' };
  const reg = await getSwRegistration();
  if (reg) {
    try {
      await reg.showNotification(title, opts);
      return true;
    } catch {
      // fall through
    }
  }
  try {
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}

async function fireRemind(ob) {
  await showReminderNotification(ob);
  markNotified();
}

async function fireDiscard(ob) {
  cancel();
  const { error } = await deleteEvent(ob.id);
  if (error && error.code !== 'PGRST116') {
    // network-level failure: keep the openBoard so next reconcile can retry
    console.warn('[reminder] auto-discard delete failed', error);
    return;
  }
  clearOpenBoard();
  if (listeners.onAutoDiscard) {
    try { listeners.onAutoDiscard(ob); } catch (e) { console.warn(e); }
  }
  window.dispatchEvent(new CustomEvent('reminder:auto-discard', { detail: { id: ob.id } }));
}

export async function reconcile() {
  cancel();
  const ob = getOpenBoard();
  if (!ob) return null;
  const elapsed = Date.now() - new Date(ob.event_at).getTime();
  if (elapsed > SAFETY_MAX_MS) {
    await fireDiscard(ob);
    return null;
  }
  if (elapsed >= discardMs()) {
    await fireDiscard(ob);
    return null;
  }
  if (elapsed >= remindMs()) {
    if (!ob.notifiedAt) {
      await fireRemind(ob);
    }
    discardTimer = setTimeout(() => fireDiscard(getOpenBoard() || ob), Math.max(0, discardMs() - elapsed));
  } else {
    remindTimer = setTimeout(() => {
      const cur = getOpenBoard();
      if (cur && cur.id === ob.id && !cur.notifiedAt) fireRemind(cur);
    }, remindMs() - elapsed);
    discardTimer = setTimeout(() => {
      const cur = getOpenBoard();
      if (cur && cur.id === ob.id) fireDiscard(cur);
    }, discardMs() - elapsed);
  }
  return ob;
}

export function init({ onAutoDiscard } = {}) {
  listeners.onAutoDiscard = onAutoDiscard || null;
  if (inited) return reconcile();
  inited = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reconcile();
  });
  return reconcile();
}

export function schedule() {
  return reconcile();
}
