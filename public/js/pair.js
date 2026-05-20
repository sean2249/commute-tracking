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
    const pendingBoards = [];
    for (const e of arr) {
      if (e.event === 'board') {
        pendingBoards.push(e);
      } else if (e.event === 'alight') {
        const board = pendingBoards.shift() || null;
        const durationMin = board
          ? Math.round((new Date(e.event_at) - new Date(board.event_at)) / 60000)
          : null;
        pairs.push({
          board,
          alight: e,
          direction: e.direction,
          local_date: e.local_date,
          durationMin,
        });
      }
    }
    for (const b of pendingBoards) {
      pairs.push({
        board: b,
        alight: null,
        direction: b.direction,
        local_date: b.local_date,
        durationMin: null,
      });
    }
  }

  pairs.sort((a, b) => {
    const aRef = a.alight || a.board;
    const bRef = b.alight || b.board;
    return new Date(bRef.event_at) - new Date(aRef.event_at);
  });
  return pairs;
}

export function findOpenBoard(events) {
  const pairs = pairEvents(events);
  for (const p of pairs) {
    if (p.board && !p.alight) return p.board;
  }
  return null;
}
