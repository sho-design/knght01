// What the rabbit hole remembers about this browser, and nothing more. One localStorage key, 'knght-wonderland':
//   {"v":1,"p":1,"f":["knght","quick"],"a":0}
//   p  1 once you have made a move in some game
//   f  the endings found, by id, each once, in the order found (ids this build does not know are left out)
//   a  1 when f holds all twelve
// Nothing personal, no dates, no counts, and nothing is sent anywhere. Every read and write is wrapped: storage can
// be missing, blocked or full (a private window), and then a copy in this module keeps the tally true for the page
// view. A write merges what is stored first, so another tab's endings are kept.
// The footer's rabbit (rabbit.js) reads the same key once, for p and a only.
import { IDS, ENDING_COUNT } from './endings.js';

const KEY = 'knght-wonderland';
let mine = { p: 0, f: [] };

function stored() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && typeof v === 'object') return { p: v.p ? 1 : 0, f: Array.isArray(v.f) ? v.f : [] };
  } catch {}
  return { p: 0, f: [] };
}
// This page's copy and the stored value, together.
function merged() {
  const s = stored();
  const f = [];
  for (const id of [...s.f, ...mine.f]) if (IDS.includes(id) && !f.includes(id)) f.push(id);
  mine = { p: s.p || mine.p ? 1 : 0, f };
  return mine;
}
function write(m) {
  const all = m.f.length >= ENDING_COUNT ? 1 : 0;
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, p: m.p, f: m.f, a: all })); } catch {}
  return all;
}

export function read() {
  const m = merged();
  return { p: m.p, f: [...m.f], a: m.f.length >= ENDING_COUNT ? 1 : 0 };
}

// You made a move.
export function played() {
  const m = merged();
  if (m.p && stored().p) return;
  m.p = 1;
  write(m);
}

// A game ended on this ending. fresh: the first time it was found here; all: every ending has been found.
export function found(id) {
  const m = merged();
  let fresh = false;
  if (IDS.includes(id) && !m.f.includes(id)) { m.f.push(id); fresh = true; }
  write(m);
  return { n: m.f.length, of: ENDING_COUNT, fresh, all: m.f.length >= ENDING_COUNT };
}
