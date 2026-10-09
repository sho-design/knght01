/* Which ending a visitor gets: a shuffle bag kept in one localStorage key.
   Every ending is shown once before any repeats. A scene counts as seen when it is first shown (commit),
   so a visit that never reaches the footer spends nothing. Scenes added in a later deploy join the current round.
   If storage is blocked, it falls back to plain random (never the same ending twice in a row on a swap).
   ?ending=<id> forces one ending and never reads or writes the bag; the knight then steps through the list in order. */
const KEY = 'knght-ending';

const read = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    return s && Array.isArray(s.seen) ? s : { seen: [] };
  } catch (e) {
    return null; // storage blocked or unreadable: plain random
  }
};
const write = (s) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* plain random from here */ }
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function createBag(ids, forced = null) {
  let upcoming = null;

  // Forced (QA, recordings): the asked-for scene, then the registry order. Storage is never touched.
  if (forced && ids.includes(forced)) {
    const after = (cur) => ids[(ids.indexOf(cur) + 1) % ids.length];
    return { forced: true, first: () => forced, peek: after, next: after, commit() {} };
  }

  // What is left in this round, never the one on screen. An empty round starts a new one.
  const choose = (current) => {
    const s = read();
    const others = ids.filter((id) => id !== current);
    if (!others.length) return ids[0];
    if (!s) return pick(others);
    const seen = s.seen.filter((id) => ids.includes(id));
    const left = others.filter((id) => !seen.includes(id));
    return pick(left.length ? left : others);
  };

  return {
    forced: false,
    // The scene for this page load. The last one shown is avoided when a new round begins.
    first() {
      const s = read();
      return choose(s && s.last);
    },
    // The next one the knight will bring, decided early so it can be fetched on hover or focus.
    peek(current) {
      if (!upcoming || upcoming === current) upcoming = choose(current);
      return upcoming;
    },
    next(current) {
      const id = this.peek(current);
      upcoming = null;
      return id;
    },
    // Mark a scene as seen once it is on screen.
    commit(id) {
      const s = read();
      if (!s) return;
      let seen = s.seen.filter((x) => ids.includes(x) && x !== id);
      seen.push(id);
      if (ids.every((x) => seen.includes(x))) seen = []; // the round is complete: the next one starts empty
      write({ seen, last: id });
    },
  };
}
