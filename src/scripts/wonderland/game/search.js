/* The Black Queen's engine, written for KNGHT. No code is taken from another engine; the tables are drawn by hand.
   A 0x88 board, a Zobrist key held as two 32-bit halves, iterative deepening with alpha-beta and principal
   variation search, a transposition table, quiescence, killers, history and a check extension.
   Pure module, no DOM: it runs in the worker (engine.worker.js), on the main thread if the worker fails (engine.js),
   and in node (scripts/wonderland-perft.mjs). The board in the page is judged by chess.js (rules.js), never by this file.

   think({ fen, history, moves, level, budget, seed }) => { move: 'g8f6', depth, score, nodes, ms }
   perft(fen, depth) => the number of leaf positions, for the move generator's tests. */

const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
const VALUE = [0, 100, 320, 330, 500, 900, 0];
const PHASE = [0, 0, 1, 1, 2, 4, 0];
const JUMPS = [33, 31, 18, 14, -33, -31, -18, -14];
const STEPS = [16, -16, 1, -1, 17, 15, -17, -15];
const DIAG = [17, 15, -17, -15];
const ORTH = [16, -16, 1, -1];

const MATE = 30000, INF = 32000, MAX_PLY = 96, PER_PLY = 256;
const DOUBLE = 1, EN_PASSANT = 2, CASTLE = 3;
// A move is one integer: from | to << 7 | promotion << 14 | flag << 17.
const mv = (from, to, promo, flag) => from | (to << 7) | (promo << 14) | (flag << 17);

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ---------- Zobrist keys, from a fixed-seed xorshift ---------- */
let zs = 0x2545f491;
const zr = () => { zs ^= zs << 13; zs ^= zs >>> 17; zs ^= zs << 5; return zs | 0; };
const Z_LO = new Int32Array(13 * 128), Z_HI = new Int32Array(13 * 128);
for (let i = 0; i < Z_LO.length; i++) { Z_LO[i] = zr(); Z_HI[i] = zr(); }
const ZC_LO = new Int32Array(16), ZC_HI = new Int32Array(16);
for (let i = 0; i < 16; i++) { ZC_LO[i] = zr(); ZC_HI[i] = zr(); }
const ZE_LO = new Int32Array(8), ZE_HI = new Int32Array(8);
for (let i = 0; i < 8; i++) { ZE_LO[i] = zr(); ZE_HI[i] = zr(); }
const ZS_LO = zr(), ZS_HI = zr();

/* ---------- Piece-square tables, written by hand ----------
   Drawn as the board is seen from white: the first row is rank 8. Black reads them mirrored. */
const T = {
  pmg: [
      0,   0,   0,   0,   0,   0,   0,   0,
     40,  44,  46,  50,  50,  46,  44,  40,
     12,  16,  22,  30,  30,  22,  16,  12,
      6,   8,  12,  22,  22,  12,   8,   6,
      0,   2,   6,  18,  18,   6,   2,   0,
      4,   2,   2,   6,   6,  -2,   2,   4,
      4,   6,   6, -12, -12,   8,   8,   4,
      0,   0,   0,   0,   0,   0,   0,   0],
  peg: [
      0,   0,   0,   0,   0,   0,   0,   0,
     60,  60,  60,  60,  60,  60,  60,  60,
     36,  36,  36,  36,  36,  36,  36,  36,
     20,  20,  20,  20,  20,  20,  20,  20,
     10,  10,  10,  10,  10,  10,  10,  10,
      4,   4,   4,   4,   4,   4,   4,   4,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0],
  nmg: [
    -50, -38, -28, -25, -25, -28, -38, -50,
    -36, -18,  -2,   2,   2,  -2, -18, -36,
    -26,   2,  12,  16,  16,  12,   2, -26,
    -24,   6,  16,  22,  22,  16,   6, -24,
    -24,   4,  14,  20,  20,  14,   4, -24,
    -26,   2,  10,  12,  12,  10,   2, -26,
    -36, -18,   0,   4,   4,   0, -18, -36,
    -50, -34, -28, -25, -25, -28, -34, -50],
  neg: [
    -40, -28, -20, -18, -18, -20, -28, -40,
    -28, -12,  -2,   2,   2,  -2, -12, -28,
    -20,  -2,   8,  12,  12,   8,  -2, -20,
    -18,   2,  12,  16,  16,  12,   2, -18,
    -18,   2,  12,  16,  16,  12,   2, -18,
    -20,  -2,   8,  10,  10,   8,  -2, -20,
    -28, -12,  -2,   0,   0,  -2, -12, -28,
    -40, -28, -20, -18, -18, -20, -28, -40],
  bmg: [
    -18, -10, -10, -10, -10, -10, -10, -18,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10,   2,   6,  10,  10,   6,   2, -10,
    -10,   6,   6,  10,  10,   6,   6, -10,
    -10,   2,  10,  10,  10,  10,   2, -10,
    -10,  10,  10,  10,  10,  10,  10, -10,
    -10,   6,   2,   2,   2,   2,   6, -10,
    -18, -10, -12, -10, -10, -12, -10, -18],
  beg: [
    -14,  -8,  -8,  -6,  -6,  -8,  -8, -14,
     -8,   0,   0,   2,   2,   0,   0,  -8,
     -8,   2,   6,   6,   6,   6,   2,  -8,
     -6,   2,   6,  10,  10,   6,   2,  -6,
     -6,   2,   6,  10,  10,   6,   2,  -6,
     -8,   2,   6,   6,   6,   6,   2,  -8,
     -8,   0,   0,   2,   2,   0,   0,  -8,
    -14,  -8,  -8,  -6,  -6,  -8,  -8, -14],
  rmg: [
      0,   0,   2,   4,   4,   2,   0,   0,
     14,  18,  18,  18,  18,  18,  18,  14,
     -4,   0,   0,   2,   2,   0,   0,  -4,
     -4,   0,   0,   2,   2,   0,   0,  -4,
     -4,   0,   0,   2,   2,   0,   0,  -4,
     -4,   0,   0,   2,   2,   0,   0,  -4,
     -6,   0,   0,   2,   2,   0,   0,  -6,
      0,   0,   2,   6,   6,   4,   0,   0],
  reg: [
      4,   4,   4,   4,   4,   4,   4,   4,
     10,  10,  10,  10,  10,  10,  10,  10,
      2,   2,   2,   2,   2,   2,   2,   2,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   2,   2,   0,   0,   0],
  qmg: [
    -16, -10,  -8,  -4,  -4,  -8, -10, -16,
    -10,  -4,   0,   0,   0,   0,  -4, -10,
     -8,   0,   4,   4,   4,   4,   0,  -8,
     -4,   0,   4,   6,   6,   4,   0,  -4,
     -4,   0,   4,   6,   6,   4,   0,  -4,
     -8,   2,   4,   4,   4,   4,   2,  -8,
    -10,   0,   2,   0,   0,   0,   0, -10,
    -16, -10,  -8,  -2,  -4,  -8, -10, -16],
  qeg: [
    -18, -10,  -8,  -6,  -6,  -8, -10, -18,
    -10,   0,   2,   4,   4,   2,   0, -10,
     -8,   2,   8,  10,  10,   8,   2,  -8,
     -6,   4,  10,  14,  14,  10,   4,  -6,
     -6,   4,  10,  14,  14,  10,   4,  -6,
     -8,   2,   8,  10,  10,   8,   2,  -8,
    -10,   0,   2,   4,   4,   2,   0, -10,
    -18, -10,  -8,  -6,  -6,  -8, -10, -18],
  kmg: [
    -40, -45, -45, -50, -50, -45, -45, -40,
    -40, -45, -45, -50, -50, -45, -45, -40,
    -40, -45, -45, -50, -50, -45, -45, -40,
    -36, -40, -40, -46, -46, -40, -40, -36,
    -26, -32, -32, -38, -38, -32, -32, -26,
    -14, -20, -20, -24, -24, -20, -20, -14,
     12,  12,  -6, -12, -12,  -6,  14,  12,
     18,  28,  10,  -6,   0,   8,  30,  20],
  keg: [
    -50, -36, -26, -20, -20, -26, -36, -50,
    -34, -16,  -4,   2,   2,  -4, -16, -34,
    -26,  -4,  14,  22,  22,  14,  -4, -26,
    -24,   0,  22,  30,  30,  22,   0, -24,
    -24,   0,  22,  30,  30,  22,   0, -24,
    -26,  -4,  14,  20,  20,  14,  -4, -26,
    -34, -18,  -6,   0,   0,  -6, -18, -34,
    -50, -36, -28, -24, -24, -28, -36, -50],
};
// Material plus place, by (piece + 6) * 128 + square, signed from white's side.
const MGT = new Int16Array(13 * 128), EGT = new Int16Array(13 * 128);
{
  const names = [null, 'p', 'n', 'b', 'r', 'q', 'k'];
  for (let t = 1; t <= 6; t++) {
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const sq = r * 16 + f, w = (7 - r) * 8 + f, b = r * 8 + f;
      MGT[(t + 6) * 128 + sq] = VALUE[t] + T[names[t] + 'mg'][w];
      EGT[(t + 6) * 128 + sq] = VALUE[t] + T[names[t] + 'eg'][w];
      MGT[(6 - t) * 128 + sq] = -(VALUE[t] + T[names[t] + 'mg'][b]);
      EGT[(6 - t) * 128 + sq] = -(VALUE[t] + T[names[t] + 'eg'][b]);
    }
  }
}
const PASSED = [0, 10, 15, 25, 45, 75, 120, 0];

// Castling rights kept after a move touches a square: K 1, Q 2, k 4, q 8.
const KEEP = new Uint8Array(128).fill(15);
KEEP[0] = 13; KEEP[4] = 12; KEEP[7] = 14; KEEP[112] = 7; KEEP[116] = 3; KEEP[119] = 11;

/* ---------- The position ---------- */
const board = new Int8Array(128);
let side = 1, castle = 0, ep = -1, half = 0, fullmove = 1, hLo = 0, hHi = 0;
const kings = new Int16Array(2); // [white, black]
const ki = (s) => (s > 0 ? 0 : 1);

const U = 1024; // undo stack
const uCap = new Int8Array(U), uCastle = new Int8Array(U), uEp = new Int16Array(U), uHalf = new Int16Array(U);
const uLo = new Int32Array(U), uHi = new Int32Array(U);
let sp = 0;

const MOVES = new Int32Array((MAX_PLY + 8) * PER_PLY);
const SCORES = new Int32Array((MAX_PLY + 8) * PER_PLY);

const off = (s) => (s & 0x88) !== 0;

// An en passant square only counts when a pawn of the side to move stands ready to take,
// so the key matches whichever way the position was reached.
function epUsable(sq, s) {
  const a = sq - 16 * s - 1, b = sq - 16 * s + 1;
  return (!off(a) && board[a] === s) || (!off(b) && board[b] === s);
}

function computeHash() {
  hLo = 0; hHi = 0;
  for (let sq = 0; sq < 120; sq++) {
    if (off(sq)) { sq += 7; continue; }
    const p = board[sq];
    if (p) { const i = (p + 6) * 128 + sq; hLo ^= Z_LO[i]; hHi ^= Z_HI[i]; }
  }
  hLo ^= ZC_LO[castle]; hHi ^= ZC_HI[castle];
  if (ep >= 0) { hLo ^= ZE_LO[ep & 7]; hHi ^= ZE_HI[ep & 7]; }
  if (side < 0) { hLo ^= ZS_LO; hHi ^= ZS_HI; }
}

function setFEN(fen) {
  board.fill(0);
  const [placement, turn = 'w', rights = '-', passant = '-', halfmove = '0', full = '1'] = String(fen).trim().split(/\s+/);
  let r = 7, f = 0;
  for (const ch of placement) {
    if (ch === '/') { r--; f = 0; continue; }
    if (ch >= '1' && ch <= '8') { f += ch.charCodeAt(0) - 48; continue; }
    const t = 'pnbrqk'.indexOf(ch.toLowerCase()) + 1;
    if (t > 0 && r >= 0 && f < 8) {
      const sq = r * 16 + f;
      board[sq] = ch === ch.toLowerCase() ? -t : t;
      if (t === K) kings[ch === ch.toLowerCase() ? 1 : 0] = sq;
    }
    f++;
  }
  side = turn === 'b' ? -1 : 1;
  castle = (rights.includes('K') ? 1 : 0) | (rights.includes('Q') ? 2 : 0) | (rights.includes('k') ? 4 : 0) | (rights.includes('q') ? 8 : 0);
  ep = -1;
  if (passant && passant !== '-') {
    const sq = (passant.charCodeAt(1) - 49) * 16 + (passant.charCodeAt(0) - 97);
    if (!off(sq) && epUsable(sq, side)) ep = sq;
  }
  half = parseInt(halfmove, 10) || 0;
  fullmove = parseInt(full, 10) || 1;
  sp = 0;
  computeHash();
}

function attacked(sq, by) {
  let s = sq - 16 * by - 1;
  if (!off(s) && board[s] === by) return true;
  s = sq - 16 * by + 1;
  if (!off(s) && board[s] === by) return true;
  const n = N * by, k = K * by, b = B * by, r = R * by, q = Q * by;
  for (let i = 0; i < 8; i++) {
    s = sq + JUMPS[i];
    if (!off(s) && board[s] === n) return true;
    s = sq + STEPS[i];
    if (!off(s) && board[s] === k) return true;
  }
  for (let i = 0; i < 4; i++) {
    const d = DIAG[i];
    s = sq + d;
    while (!off(s)) {
      const p = board[s];
      if (p) { if (p === b || p === q) return true; break; }
      s += d;
    }
    const o = ORTH[i];
    s = sq + o;
    while (!off(s)) {
      const p = board[s];
      if (p) { if (p === r || p === q) return true; break; }
      s += o;
    }
  }
  return false;
}

const inCheck = () => attacked(kings[ki(side)], -side);

/* Pseudo-legal moves into MOVES from `base`. With quiet false: captures and queen promotions only. Returns the end. */
function gen(base, quiet) {
  let n = base;
  const us = side;
  for (let sq = 0; sq < 120; sq++) {
    if (off(sq)) { sq += 7; continue; }
    const p = board[sq];
    if (p === 0 || (p > 0) !== (us > 0)) continue;
    const t = p > 0 ? p : -p;
    if (t === P) {
      const fwd = 16 * us, last = us > 0 ? 7 : 0, start = us > 0 ? 1 : 6;
      for (let k = -1; k <= 1; k += 2) {
        const c = sq + fwd + k;
        if (off(c)) continue;
        const q = board[c];
        if (q !== 0 && (q > 0) !== (us > 0)) {
          if ((c >> 4) === last) {
            MOVES[n++] = mv(sq, c, Q, 0);
            if (quiet) { MOVES[n++] = mv(sq, c, R, 0); MOVES[n++] = mv(sq, c, B, 0); MOVES[n++] = mv(sq, c, N, 0); }
          } else MOVES[n++] = mv(sq, c, 0, 0);
        } else if (c === ep) MOVES[n++] = mv(sq, c, 0, EN_PASSANT);
      }
      const to = sq + fwd;
      if (!off(to) && board[to] === 0) {
        if ((to >> 4) === last) {
          MOVES[n++] = mv(sq, to, Q, 0);
          if (quiet) { MOVES[n++] = mv(sq, to, R, 0); MOVES[n++] = mv(sq, to, B, 0); MOVES[n++] = mv(sq, to, N, 0); }
        } else if (quiet) {
          MOVES[n++] = mv(sq, to, 0, 0);
          if ((sq >> 4) === start && board[to + fwd] === 0) MOVES[n++] = mv(sq, to + fwd, 0, DOUBLE);
        }
      }
    } else if (t === N || t === K) {
      const dirs = t === N ? JUMPS : STEPS;
      for (let i = 0; i < 8; i++) {
        const to = sq + dirs[i];
        if (off(to)) continue;
        const q = board[to];
        if (q === 0) { if (quiet) MOVES[n++] = mv(sq, to, 0, 0); }
        else if ((q > 0) !== (us > 0)) MOVES[n++] = mv(sq, to, 0, 0);
      }
      if (t === K && quiet) {
        if (us > 0 && sq === 4) {
          if ((castle & 1) && board[5] === 0 && board[6] === 0 && board[7] === R
            && !attacked(4, -1) && !attacked(5, -1) && !attacked(6, -1)) MOVES[n++] = mv(4, 6, 0, CASTLE);
          if ((castle & 2) && board[3] === 0 && board[2] === 0 && board[1] === 0 && board[0] === R
            && !attacked(4, -1) && !attacked(3, -1) && !attacked(2, -1)) MOVES[n++] = mv(4, 2, 0, CASTLE);
        } else if (us < 0 && sq === 116) {
          if ((castle & 4) && board[117] === 0 && board[118] === 0 && board[119] === -R
            && !attacked(116, 1) && !attacked(117, 1) && !attacked(118, 1)) MOVES[n++] = mv(116, 118, 0, CASTLE);
          if ((castle & 8) && board[115] === 0 && board[114] === 0 && board[113] === 0 && board[112] === -R
            && !attacked(116, 1) && !attacked(115, 1) && !attacked(114, 1)) MOVES[n++] = mv(116, 114, 0, CASTLE);
        }
      }
    } else {
      const dirs = t === B ? DIAG : t === R ? ORTH : null;
      const count = t === Q ? 8 : 4;
      for (let i = 0; i < count; i++) {
        const d = dirs ? dirs[i] : STEPS[i];
        let to = sq + d;
        while (!off(to)) {
          const q = board[to];
          if (q === 0) { if (quiet) MOVES[n++] = mv(sq, to, 0, 0); }
          else { if ((q > 0) !== (us > 0)) MOVES[n++] = mv(sq, to, 0, 0); break; }
          to += d;
        }
      }
    }
  }
  return n;
}

function toggle(p, sq) { const i = (p + 6) * 128 + sq; hLo ^= Z_LO[i]; hHi ^= Z_HI[i]; }

function make(m) {
  const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = m >>> 17;
  const p = board[from];
  let cap = board[to];
  uCastle[sp] = castle; uEp[sp] = ep; uHalf[sp] = half; uLo[sp] = hLo; uHi[sp] = hHi;
  if (ep >= 0) { hLo ^= ZE_LO[ep & 7]; hHi ^= ZE_HI[ep & 7]; }
  hLo ^= ZC_LO[castle]; hHi ^= ZC_HI[castle];
  board[from] = 0; toggle(p, from);
  if (flag === EN_PASSANT) {
    const cs = to - 16 * side;
    cap = board[cs]; board[cs] = 0; toggle(cap, cs);
  } else if (cap) toggle(cap, to);
  uCap[sp] = cap;
  sp++;
  const np = promo ? promo * side : p;
  board[to] = np; toggle(np, to);
  if (flag === CASTLE) {
    const rf = to > from ? from + 3 : from - 4, rt = to > from ? from + 1 : from - 1, rk = board[rf];
    board[rf] = 0; toggle(rk, rf); board[rt] = rk; toggle(rk, rt);
  }
  if (p === K * side) kings[ki(side)] = to;
  castle &= KEEP[from] & KEEP[to];
  hLo ^= ZC_LO[castle]; hHi ^= ZC_HI[castle];
  ep = -1;
  if (flag === DOUBLE) {
    const a = to - 1, b = to + 1;
    if ((!off(a) && board[a] === -side) || (!off(b) && board[b] === -side)) {
      ep = from + 16 * side; hLo ^= ZE_LO[ep & 7]; hHi ^= ZE_HI[ep & 7];
    }
  }
  half = (p === side || cap) ? 0 : half + 1;
  side = -side; hLo ^= ZS_LO; hHi ^= ZS_HI;
}

function unmake(m) {
  const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = m >>> 17;
  side = -side;
  sp--;
  const cap = uCap[sp];
  const p = promo ? side : board[to];
  board[from] = p;
  if (flag === EN_PASSANT) { board[to] = 0; board[to - 16 * side] = cap; }
  else board[to] = cap;
  if (flag === CASTLE) {
    const rf = to > from ? from + 3 : from - 4, rt = to > from ? from + 1 : from - 1;
    board[rf] = board[rt]; board[rt] = 0;
  }
  if (p === K * side) kings[ki(side)] = from;
  castle = uCastle[sp]; ep = uEp[sp]; half = uHalf[sp]; hLo = uLo[sp]; hHi = uHi[sp];
}

function makeNull() {
  uEp[sp] = ep; uHalf[sp] = half; uLo[sp] = hLo; uHi[sp] = hHi; sp++;
  if (ep >= 0) { hLo ^= ZE_LO[ep & 7]; hHi ^= ZE_HI[ep & 7]; }
  ep = -1; half = 0; // a null move ends the repetition scan
  side = -side; hLo ^= ZS_LO; hHi ^= ZS_HI;
}
function unmakeNull() {
  side = -side; sp--;
  ep = uEp[sp]; half = uHalf[sp]; hLo = uLo[sp]; hHi = uHi[sp];
}

/* ---------- Perft ---------- */
function perftAt(depth, ply) {
  if (depth === 0) return 1;
  const base = ply * PER_PLY, end = gen(base, true);
  let total = 0;
  for (let i = base; i < end; i++) {
    const m = MOVES[i];
    make(m);
    if (!attacked(kings[ki(-side)], side)) total += depth === 1 ? 1 : perftAt(depth - 1, ply + 1);
    unmake(m);
  }
  return total;
}
export function perft(fen, depth) { setFEN(fen); return perftAt(depth, 0); }

/* ---------- Evaluation, in centipawns from the side to move ---------- */
const wFile = new Int8Array(8), bFile = new Int8Array(8), wLow = new Int8Array(8), bHigh = new Int8Array(8);
const wPawns = new Int16Array(16), bPawns = new Int16Array(16), rooks = new Int16Array(20);
let contempt = 0, herSide = -1;
const drawScore = () => (side === herSide ? -contempt : contempt);
const centre = (sq) => { const f = sq & 7, r = sq >> 4; return Math.max(3 - f, f - 4) + Math.max(3 - r, r - 4); };
const apart = (a, b) => Math.abs((a & 7) - (b & 7)) + Math.abs((a >> 4) - (b >> 4));

function evaluate() {
  let mg = 0, eg = 0, phase = 0, wb = 0, bb = 0, wp = 0, bp = 0, nr = 0, minors = 0, majors = 0, mat = 0;
  wFile.fill(0); bFile.fill(0); wLow.fill(8); bHigh.fill(-1);
  for (let sq = 0; sq < 120; sq++) {
    if (off(sq)) { sq += 7; continue; }
    const p = board[sq];
    if (!p) continue;
    const i = (p + 6) * 128 + sq;
    mg += MGT[i]; eg += EGT[i];
    const t = p > 0 ? p : -p;
    phase += PHASE[t];
    if (t !== K) mat += p > 0 ? VALUE[t] : -VALUE[t];
    if (t === P) {
      const f = sq & 7, r = sq >> 4;
      if (p > 0) { wFile[f]++; if (r < wLow[f]) wLow[f] = r; wPawns[wp++] = sq; }
      else { bFile[f]++; if (r > bHigh[f]) bHigh[f] = r; bPawns[bp++] = sq; }
    } else if (t === B) { if (p > 0) wb++; else bb++; minors++; }
    else if (t === N) minors++;
    else if (t === R) { rooks[nr++] = p > 0 ? sq : -1 - sq; majors++; }
    else if (t === Q) majors++;
  }
  if (wp + bp === 0 && majors === 0 && minors <= 1) return drawScore();
  if (wb >= 2) { mg += 30; eg += 30; }
  if (bb >= 2) { mg -= 30; eg -= 30; }
  for (let f = 0; f < 8; f++) {
    if (wFile[f] > 1) { mg -= 12 * (wFile[f] - 1); eg -= 12 * (wFile[f] - 1); }
    if (bFile[f] > 1) { mg += 12 * (bFile[f] - 1); eg += 12 * (bFile[f] - 1); }
  }
  for (let i = 0; i < wp; i++) {
    const sq = wPawns[i], f = sq & 7, r = sq >> 4;
    const lf = f > 0 ? f - 1 : f, rf = f < 7 ? f + 1 : f;
    if ((f === 0 || wFile[f - 1] === 0) && (f === 7 || wFile[f + 1] === 0)) { mg -= 10; eg -= 10; }
    if (bHigh[lf] <= r && bHigh[f] <= r && bHigh[rf] <= r) { mg += PASSED[r] >> 1; eg += PASSED[r]; }
  }
  for (let i = 0; i < bp; i++) {
    const sq = bPawns[i], f = sq & 7, r = sq >> 4;
    const lf = f > 0 ? f - 1 : f, rf = f < 7 ? f + 1 : f;
    if ((f === 0 || bFile[f - 1] === 0) && (f === 7 || bFile[f + 1] === 0)) { mg += 10; eg += 10; }
    if (wLow[lf] >= r && wLow[f] >= r && wLow[rf] >= r) { mg -= PASSED[7 - r] >> 1; eg -= PASSED[7 - r]; }
  }
  for (let i = 0; i < nr; i++) {
    const v = rooks[i], white = v >= 0, f = (white ? v : -1 - v) & 7;
    const own = white ? wFile[f] : bFile[f], their = white ? bFile[f] : wFile[f];
    const bonus = own === 0 ? (their === 0 ? 15 : 8) : 0;
    if (white) { mg += bonus; eg += bonus; } else { mg -= bonus; eg -= bonus; }
  }
  // With no pawns left and a clear lead, drive the lone king to the edge and bring the other king close.
  if (wp + bp === 0 && Math.abs(mat) >= 400) {
    const strong = mat > 0 ? 1 : -1, wk = kings[0], bk = kings[1];
    const loser = strong > 0 ? bk : wk;
    const push = 10 * centre(loser) + 4 * (14 - apart(wk, bk));
    eg += strong * push; mg += strong * push;
  }
  if (phase > 24) phase = 24;
  const score = ((mg * phase + eg * (24 - phase)) / 24) | 0;
  return (side > 0 ? score : -score) + 10;
}

/* ---------- Search ---------- */
const TT_SIZE = 1 << 18, TT_MASK = TT_SIZE - 1;
const ttKey = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttScore = new Int16Array(TT_SIZE);
const ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE); // 0 empty, 1 exact, 2 lower, 3 upper
const killers = new Int32Array(MAX_PLY * 2);
const history = new Int32Array(2 * 128 * 128);
const repLo = new Int32Array(1024 + MAX_PLY), repHi = new Int32Array(1024 + MAX_PLY);
let repBase = 0;

let nodes = 0, stopAt = 0, stopped = false, useQ = true, useNull = false, useLMR = false, lastLevel = '';

function clearTables() {
  ttFlag.fill(0); history.fill(0); killers.fill(0);
}

function isRepeat(ply) {
  const at = repBase + ply;
  repLo[at] = hLo; repHi[at] = hHi;
  const stop = Math.max(0, at - half);
  for (let i = at - 2; i >= stop; i -= 2) if (repLo[i] === hLo && repHi[i] === hHi) return true;
  return false;
}

function orderMoves(base, end, ply, ttm) {
  const k1 = killers[ply * 2], k2 = killers[ply * 2 + 1], hs = side > 0 ? 0 : 16384;
  for (let i = base; i < end; i++) {
    const m = MOVES[i], from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = m >>> 17;
    const victim = flag === EN_PASSANT ? P : Math.abs(board[to]);
    let s;
    if (m === ttm) s = 4000000;
    else if (victim) s = 2000000 + VALUE[victim] * 8 - Math.abs(board[from]);
    else if (promo === Q) s = 1900000;
    else if (m === k1) s = 1800000;
    else if (m === k2) s = 1790000;
    else if (promo) s = -100000;
    else s = history[hs + from * 128 + to];
    SCORES[i] = s;
  }
}

function pick(i, end) {
  let bi = i, bs = SCORES[i];
  for (let j = i + 1; j < end; j++) if (SCORES[j] > bs) { bs = SCORES[j]; bi = j; }
  if (bi !== i) {
    const m = MOVES[i]; MOVES[i] = MOVES[bi]; MOVES[bi] = m;
    const s = SCORES[i]; SCORES[i] = SCORES[bi]; SCORES[bi] = s;
  }
  return MOVES[i];
}

function tick() {
  if ((++nodes & 1023) === 0 && now() > stopAt) stopped = true;
  return stopped;
}

function quiesce(alpha, beta, ply) {
  if (tick()) return 0;
  const check = inCheck();
  if (ply >= MAX_PLY - 1) return check ? 0 : evaluate();
  let best, stand = 0;
  if (!check) {
    stand = evaluate();
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    best = stand;
  } else best = -MATE + ply;
  const base = ply * PER_PLY, end = gen(base, check);
  orderMoves(base, end, ply, 0);
  let legal = 0;
  for (let i = base; i < end; i++) {
    const m = pick(i, end);
    if (!check) {
      const to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = m >>> 17;
      const gain = flag === EN_PASSANT ? 100 : VALUE[Math.abs(board[to])];
      if (!promo && stand + gain + 200 < alpha) continue;
    }
    make(m);
    if (attacked(kings[ki(-side)], side)) { unmake(m); continue; }
    legal++;
    const score = -quiesce(-beta, -alpha, ply + 1);
    unmake(m);
    if (stopped) return 0;
    if (score > best) {
      best = score;
      if (score > alpha) { alpha = score; if (score >= beta) return score; }
    }
  }
  if (check && legal === 0) return -MATE + ply;
  return best;
}

function hasPieces(s) {
  for (let sq = 0; sq < 120; sq++) {
    if (off(sq)) { sq += 7; continue; }
    const p = board[sq] * s;
    if (p > 1 && p < 6) return true;
  }
  return false;
}

function search(depth, alpha, beta, ply, ext, allowNull) {
  if (tick()) return 0;
  if (half >= 100 || isRepeat(ply)) return drawScore();
  if (ply >= MAX_PLY - 2) return evaluate();
  // Mate distance: no line here can beat a mate already found nearer the root.
  const ma = Math.max(alpha, -MATE + ply), mb = Math.min(beta, MATE - ply - 1);
  if (ma >= mb) return ma;
  const check = inCheck();
  if (check && ext < 16) { depth++; ext++; }
  if (depth <= 0) return useQ ? quiesce(alpha, beta, ply) : evaluate();

  const pv = beta - alpha > 1;
  const slot = hLo & TT_MASK;
  let ttm = 0;
  if (ttFlag[slot] && ttKey[slot] === hHi) {
    ttm = ttMove[slot];
    if (!pv && ttDepth[slot] >= depth) {
      let s = ttScore[slot];
      if (s > MATE - 1000) s -= ply; else if (s < -MATE + 1000) s += ply;
      const fl = ttFlag[slot];
      if (fl === 1 || (fl === 2 && s >= beta) || (fl === 3 && s <= alpha)) return s;
    }
  }

  if (useNull && allowNull && !pv && !check && depth >= 3 && beta < MATE - 1000 && hasPieces(side)) {
    const r = depth > 6 ? 3 : 2;
    makeNull();
    const s = -search(depth - 1 - r, -beta, -beta + 1, ply + 1, ext, false);
    unmakeNull();
    if (stopped) return 0;
    if (s >= beta) return beta;
  }

  const base = ply * PER_PLY, end = gen(base, true);
  orderMoves(base, end, ply, ttm);
  const a0 = alpha;
  let best = -INF, bestMove = 0, legal = 0, quiets = 0;
  const k1 = killers[ply * 2], k2 = killers[ply * 2 + 1];
  for (let i = base; i < end; i++) {
    const m = pick(i, end);
    const to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = m >>> 17;
    const quiet = board[to] === 0 && flag !== EN_PASSANT && !promo;
    make(m);
    if (attacked(kings[ki(-side)], side)) { unmake(m); continue; }
    legal++;
    let score;
    if (legal === 1) score = -search(depth - 1, -beta, -alpha, ply + 1, ext, true);
    else {
      let r = 0;
      if (useLMR && quiet && depth >= 3 && !check && quiets >= 3 && m !== k1 && m !== k2 && !inCheck()) r = 1;
      score = -search(depth - 1 - r, -alpha - 1, -alpha, ply + 1, ext, true);
      if (r && score > alpha && !stopped) score = -search(depth - 1, -alpha - 1, -alpha, ply + 1, ext, true);
      if (score > alpha && score < beta && !stopped) score = -search(depth - 1, -beta, -alpha, ply + 1, ext, true);
    }
    unmake(m);
    if (stopped) return 0;
    if (quiet) quiets++;
    if (score > best) {
      best = score; bestMove = m;
      if (score > alpha) {
        alpha = score;
        if (score >= beta) {
          if (quiet) {
            if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
            const h = (side > 0 ? 0 : 16384) + (m & 127) * 128 + to;
            history[h] += depth * depth;
            if (history[h] > 1000000) for (let j = 0; j < history.length; j++) history[j] >>= 1;
          }
          break;
        }
      }
    }
  }
  if (legal === 0) return check ? -MATE + ply : drawScore();
  let st = best;
  if (st > MATE - 1000) st += ply; else if (st < -MATE + 1000) st -= ply;
  ttKey[slot] = hHi; ttMove[slot] = bestMove; ttScore[slot] = st; ttDepth[slot] = depth;
  ttFlag[slot] = best >= beta ? 2 : best > a0 ? 1 : 3;
  return best;
}

/* ---------- The root ---------- */
const FILES = 'abcdefgh', PROMO = ['', '', 'n', 'b', 'r', 'q'];
const uci = (m) => {
  const f = m & 127, t = (m >> 7) & 127, p = (m >> 14) & 7;
  return FILES[f & 7] + ((f >> 4) + 1) + FILES[t & 7] + ((t >> 4) + 1) + PROMO[p];
};

function rng32(seed) {
  // Mix the seed first, so neighbouring seeds (1, 2, 3) start far apart.
  let s = (seed >>> 0) ^ 0x9e3779b9;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); s = (s ^ (s >>> 16)) >>> 0;
  if (!s) s = 0x9e3779b9;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const LEVELS = {
  pawn: { depth: 2, q: false, nullMove: false, lmr: false, contempt: 0, budget: 150 },
  knght: { depth: 4, q: true, nullMove: false, lmr: false, contempt: 0, budget: 600 },
  queen: { depth: 64, q: true, nullMove: true, lmr: true, contempt: 20, budget: 1500 },
};

// One root move searched to `depth` with the window (alpha, beta), from the side to move at the root.
function rootScore(m, depth, alpha, beta) {
  make(m);
  const s = -search(depth - 1, -beta, -alpha, 1, 0, true);
  unmake(m);
  return s;
}

export function think({ fen, history: past = [], moves = [], level = 'knght', budget, seed = 1 } = {}) {
  const t0 = now();
  const L = LEVELS[level] || LEVELS.knght;
  const ms = Math.min(Math.max(+budget || L.budget, 20), 2000);
  const random = rng32(seed);
  if (level !== lastLevel) { clearTables(); lastLevel = level; }
  killers.fill(0);

  // Positions since the last capture or pawn move, then the root.
  repBase = 0;
  for (const f of past.slice(-1000)) { setFEN(f); repLo[repBase] = hLo; repHi[repBase] = hHi; repBase++; }
  setFEN(fen);
  herSide = side; contempt = L.contempt; useQ = L.q; useNull = L.nullMove; useLMR = L.lmr;
  repLo[repBase] = hLo; repHi[repBase] = hHi;

  // The root searches only the moves the board allows.
  const allowed = new Set(moves);
  const end = gen(0, true), root = [];
  for (let i = 0; i < end; i++) {
    const m = MOVES[i];
    make(m);
    const legal = !attacked(kings[ki(-side)], side);
    unmake(m);
    if (legal && (!allowed.size || allowed.has(uci(m)))) root.push(m);
  }
  const done = (m, depth, score) => ({ move: m ? uci(m) : (moves[0] || ''), depth, score, nodes, ms: Math.round(now() - t0) });
  nodes = 0; stopped = false;
  if (!root.length) return done(0, 0, 0);
  if (root.length === 1) return done(root[0], 0, 0);

  // Order the root: captures by value, then promotions.
  orderMoves(0, end, 0, 0);
  const pre = new Map();
  for (let i = 0; i < end; i++) pre.set(MOVES[i], SCORES[i]);
  root.sort((a, b) => pre.get(b) - pre.get(a));

  if (level === 'pawn') {
    // Two plies, no quiescence: every move scored with a full window, then noise.
    stopAt = t0 + ms;
    const scored = [];
    for (const m of root) {
      const s = rootScore(m, L.depth, -INF, INF);
      if (stopped) break;
      scored.push([m, s]);
    }
    if (!scored.length) scored.push([root[0], 0]);
    scored.sort((a, b) => b[1] - a[1]);
    if (scored[0][1] >= MATE - 100) return done(scored[0][0], L.depth, scored[0][1]);
    if (random() < 0.15) { const m = root[Math.floor(random() * root.length)]; return done(m, 0, 0); }
    let best = scored[0], bestNoisy = -INF;
    for (const e of scored) {
      const v = e[1] + Math.round((random() * 2 - 1) * 90);
      if (v > bestNoisy) { bestNoisy = v; best = e; }
    }
    return done(best[0], L.depth, best[1]);
  }

  // Knght and Queen: iterative deepening. Variety needs a little time at the end.
  const opening = level === 'queen' && ((fullmove - 1) * 2 + (side < 0 ? 1 : 0)) < 8;
  const varied = level === 'knght' || opening;
  const hardStop = t0 + ms * (varied ? 0.82 : 1);
  stopAt = hardStop;
  let bestMove = root[0], bestScore = -INF, depthDone = 0;
  const scores = new Map(root.map((m) => [m, -INF]));
  for (let depth = 1; depth <= L.depth; depth++) {
    let alpha = -INF, iterBest = 0, iterScore = -INF, searched = 0;
    for (const m of root) {
      let s;
      if (searched === 0) s = rootScore(m, depth, -INF, INF);
      else {
        s = rootScore(m, depth, alpha, alpha + 1);
        if (!stopped && s > alpha) s = rootScore(m, depth, alpha, INF);
      }
      if (stopped) break;
      searched++;
      scores.set(m, s);
      if (s > iterScore) { iterScore = s; iterBest = m; if (s > alpha) alpha = s; }
    }
    if (stopped) {
      // Keep the last full depth. The move tried first at this depth is that depth's best, so once it is finished,
      // the best of the moves finished so far is at least as good.
      if (searched > 0 && iterBest) { bestMove = iterBest; bestScore = iterScore; }
      break;
    }
    bestMove = iterBest; bestScore = iterScore; depthDone = depth;
    root.sort((a, b) => (a === bestMove ? -1 : b === bestMove ? 1 : scores.get(b) - scores.get(a)));
    if (bestScore >= MATE - depth - 1) break; // she has found a mate
    if (now() - t0 > ms * (varied ? 0.4 : 0.5)) break; // the next depth would not finish
  }

  if (varied && depthDone > 0 && Math.abs(bestScore) < MATE - 1000 && root.length > 1) {
    const margin = level === 'knght' ? 60 : 15;
    stopped = false; stopAt = t0 + ms;
    const pool = [[bestMove, bestScore]];
    for (const m of root) {
      if (m === bestMove) continue;
      if (now() > stopAt) break;
      const s = rootScore(m, depthDone, bestScore - margin, bestScore + 1);
      if (stopped) break;
      if (s > bestScore - margin) pool.push([m, Math.min(s, bestScore)]);
    }
    if (level === 'knght') {
      let pickM = bestMove, pickS = -INF, raw = bestScore;
      for (const [m, s] of pool) {
        const v = s + Math.round((random() * 2 - 1) * 25);
        if (v > pickS) { pickS = v; pickM = m; raw = s; }
      }
      return done(pickM, depthDone, raw);
    }
    const [m, s] = pool[Math.floor(random() * pool.length)];
    return done(m, depthDone, s);
  }
  return done(bestMove, depthDone, bestScore);
}
