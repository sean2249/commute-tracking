const KEY = 'commute.openBoard';

export function getOpenBoard() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.id || !obj.direction || !obj.event_at) return null;
    return obj;
  } catch {
    return null;
  }
}

export function setOpenBoard(ob) {
  localStorage.setItem(KEY, JSON.stringify({
    id: ob.id,
    direction: ob.direction,
    event_at: ob.event_at,
    notifiedAt: ob.notifiedAt ?? null,
  }));
}

export function clearOpenBoard() {
  localStorage.removeItem(KEY);
}

export function markNotified() {
  const cur = getOpenBoard();
  if (!cur) return;
  setOpenBoard({ ...cur, notifiedAt: new Date().toISOString() });
}

export function reconcileWithServer(serverEvents) {
  const ob = getOpenBoard();
  if (!ob) return null;
  const found = serverEvents.find((e) => e.id === ob.id);
  if (!found) {
    clearOpenBoard();
    return null;
  }
  return ob;
}
