// The twelve endings of a game with the Black Queen. Every finished game lands on exactly one: the rules below are
// total (every outcome has a row) and exclusive (the first rule that applies wins). Pure: no page, no storage.
//
//   ENDINGS        the table, in tally order: 7 wins | 2 losses | 2 draws | 1 resign. Its length is M.
//   ENDING_COUNT   12 (M). Never stored; the tally's "of".
//   classify(f)    -> id, from the facts { result, reason, matedBy, level, promotedQueen, yourMoves, lost }
//   makeEnding(rules, { level, result, reason, tipped, found }) -> the frozen ending model (see below)
//
// The facts, all read from rules.history() when the game ends (after take-backs):
//   result     'win' | 'loss' | 'draw' (from rules.end()) or 'resign' (you tipped your king)
//   reason     'checkmate' | 'stalemate' | 'threefold' | 'fifty' | 'insufficient' | 'resign'
//   matedBy    the moving piece of the mating move ('p' 'n' 'b' 'r' 'q' 'k'), null when it is not a checkmate
//   level      'pawn' | 'knght' | 'queen'
//   promotedQueen  one of your moves promoted to a queen
//   yourMoves  the number of white moves
//   lost       the number of your pieces she captured, pawns included
//
// Wins (the first that applies): knght (mated by a knght), queen (at Queen level), alice (a pawn became a queen),
// quick (under 20 of your moves), clean (nothing lost), long (50 or more of your moves), mate (always).
// Losses: fast (under 10 of your moves), slow (every other loss). Draws: stalemate; round (threefold, fifty moves,
// insufficient material). Resign: tip.
//
// The model (one frozen object per finished game: the 'end' event's payload, controller.ending, the souvenir's input):
//   { id, kind: 'win'|'loss'|'draw'|'resign', name, line, credit, say, why, facts (the card's line of facts),
//     level, levelName, yourMoves, plies, result: '1-0'|'0-1'|'½-½', san: [every ply's SAN], startFen, fen,
//     lastMove: { from, to } | null, check: the mated king's square | null, tipped: the tipped king's square | null,
//     matedBy, promotedQueen, lost, date: Date, found: { n, of: 12, fresh, all } }
import { W, levelName } from './words.js';

const row = (id, kind) => {
  const w = W.end[id];
  return Object.freeze({ id, kind, name: w.name, line: w.line, credit: w.credit || null });
};

export const ENDINGS = Object.freeze([
  row('knght', 'win'),
  row('queen', 'win'),
  row('alice', 'win'),
  row('quick', 'win'),
  row('clean', 'win'),
  row('long', 'win'),
  row('mate', 'win'),
  row('fast', 'loss'),
  row('slow', 'loss'),
  row('stalemate', 'draw'),
  row('round', 'draw'),
  row('tip', 'resign'),
]);
export const ENDING_COUNT = ENDINGS.length;
export const IDS = Object.freeze(ENDINGS.map((e) => e.id));
export const byId = (id) => ENDINGS.find((e) => e.id === id) || null;

export function classify(f = {}) {
  if (f.result === 'resign') return 'tip';
  if (f.result === 'win') {
    if (f.matedBy === 'n') return 'knght';
    if (f.level === 'queen') return 'queen';
    if (f.promotedQueen) return 'alice';
    if (f.yourMoves < 20) return 'quick';
    if (f.lost === 0) return 'clean';
    if (f.yourMoves >= 50) return 'long';
    return 'mate';
  }
  if (f.result === 'loss') return f.yourMoves < 10 ? 'fast' : 'slow';
  // Every draw that is not a stalemate goes round and round: repetition, fifty moves, and kings that can only walk.
  return f.reason === 'stalemate' ? 'stalemate' : 'round';
}

// The ending of the game rules holds. result and reason come from rules.end(), or are 'resign' and 'resign'.
// tipped: the tipped king's square if a king lies down, or a function of the id that returns it. found: memory.found
// (a function of the id), or a ready
// { n, of, fresh, all }; without it nothing is remembered and the tally counts only this ending.
export function makeEnding(rules, { level, result, reason, tipped = null, found, date = new Date() } = {}) {
  const h = rules.history();
  const last = h[h.length - 1] || null;
  const yourMoves = h.filter((m) => m.color === 'w').length;
  const lost = h.filter((m) => m.color === 'b' && m.captured).length;
  const promotedQueen = h.some((m) => m.color === 'w' && m.promotion === 'q');
  const mate = reason === 'checkmate';
  const matedBy = mate && last ? last.piece : null;
  const id = classify({ result, reason, matedBy, level, promotedQueen, yourMoves, lost });
  const e = byId(id);
  const lv = levelName(level);
  let why = null;
  if (e.kind === 'draw') {
    why = reason === 'stalemate' ? (rules.turn() === 'b' ? W.why.herStalemate : W.why.youStalemate) : (W.why[reason] || W.why.threefold);
  }
  const facts = e.kind === 'draw' ? W.factsDraw(lv, why) : e.kind === 'resign' ? W.factsTip(lv, yourMoves) : W.factsMate(lv, yourMoves);
  const say = W.end[id].say;
  let f = typeof found === 'function' ? found(id) : found;
  if (!f || typeof f.n !== 'number') f = { n: 1, of: ENDING_COUNT, fresh: true, all: ENDING_COUNT === 1 };
  return Object.freeze({
    id, kind: e.kind, name: e.name, line: e.line, credit: e.credit,
    say: typeof say === 'function' ? say(why) : say,
    why, facts,
    level, levelName: lv, yourMoves, plies: h.length,
    result: e.kind === 'win' ? '1-0' : e.kind === 'draw' ? '½-½' : '0-1',
    san: Object.freeze(h.map((m) => m.san)),
    startFen: rules.start, fen: rules.fen,
    lastMove: last ? Object.freeze({ from: last.from, to: last.to }) : null,
    check: mate ? rules.kingSquare(rules.turn()) || null : null,
    tipped: (typeof tipped === 'function' ? tipped(id) : tipped) || null,
    matedBy, promotedQueen, lost,
    date,
    found: Object.freeze({ n: f.n, of: f.of || ENDING_COUNT, fresh: !!f.fresh, all: !!f.all }),
  });
}
