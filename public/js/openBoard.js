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
  try {
    localStorage.setItem(KEY, JSON.stringify({
      id: ob.id,
      direction: ob.direction,
      event_at: ob.event_at,
      notifiedAt: ob.notifiedAt ?? null,
      pred: ob.pred ?? null,
    }));
  } catch (err) {
    console.warn('[openBoard] localStorage write failed', err);
  }
}

export function clearOpenBoard() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn('[openBoard] localStorage remove failed', err);
  }
}

export function markNotified() {
  const cur = getOpenBoard();
  if (!cur) return;
  setOpenBoard({ ...cur, notifiedAt: new Date().toISOString() });
}

export function reconcileWithServer(serverEvents) {
  const ob = getOpenBoard();
  if (!ob) return null;
  const board = serverEvents.find((e) => e.id === ob.id);
  if (!board) {
    clearOpenBoard();
    return null;
  }
  const boardTs = new Date(board.event_at).getTime();
  const hasLaterAlight = serverEvents.some((e) =>
    e.event === 'alight' &&
    e.direction === board.direction &&
    e.local_date === board.local_date &&
    new Date(e.event_at).getTime() > boardTs
  );
  if (hasLaterAlight) {
    clearOpenBoard();
    return null;
  }
  return ob;
}
