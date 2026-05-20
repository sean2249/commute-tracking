export function pairEvents(events) {
  const buckets = new Map();
  for (const e of events) {
    const key = `${e.local_date}|${e.direction}`;
    let arr = buckets.get(key);
    if (!arr) { arr = []; buckets.set(key, arr); }
    arr.push(e);
  }

  const pairs = [];
  for (const arr of buckets.values()) {
    arr.sort((a, b) => new Date(a.event_at) - new Date(b.event_at));
    const boards = arr.filter((e) => e.event === 'board');
    const aligns = arr.filter((e) => e.event === 'alight');
    const len = Math.max(boards.length, aligns.length);
    for (let i = 0; i < len; i++) {
      const board = boards[i] || null;
      const alight = aligns[i] || null;
      if (!board && !alight) continue;
      if (!board) continue;
      const durationMin = board && alight
        ? Math.round((new Date(alight.event_at) - new Date(board.event_at)) / 60000)
        : null;
      pairs.push({
        board,
        alight,
        direction: board.direction,
        local_date: board.local_date,
        durationMin,
      });
    }
  }

  pairs.sort((a, b) => {
    const aTs = new Date((a.alight || a.board).event_at);
    const bTs = new Date((b.alight || b.board).event_at);
    return bTs - aTs;
  });
  return pairs;
}

export function findOpenBoard(events) {
  const pairs = pairEvents(events);
  for (const p of pairs) {
    if (!p.alight) return p.board;
  }
  return null;
}
