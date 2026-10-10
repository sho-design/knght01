// The game sheet. "Keep this game" on every ending card makes a print of the game that just ended, on the device:
// no server, nothing sent anywhere, nothing stored. This header is the souvenir's documentation.
//
// HOW IT IS LOADED. game/index.js finds this file with a literal glob, so it is its own lazy chunk. It is fetched once
// an ending card is showing (after the 1.2 s hold), in an idle moment, and then prepare(ending) starts the drawing so the
// sheet is usually ready before the tap. It imports only ./words.js (W.sheet, the words) and ./set.js (SET and PLINTH,
// the Story set's paths), which the game's chunk already holds, so the only requests it adds are this chunk and, if the
// page has not used them yet, the font files of the page's own Google Fonts (Cormorant Garamond, Hanken Grotesk).
//
//   prepare(ending)  starts drawing; caches a Promise<File> in a WeakMap keyed by the ending. Returns nothing.
//   keep(ending)     -> Promise<'shared' | 'saved' | 'cancelled'>. Throws when the sheet cannot be made.
//                    On a phone (hover: none and pointer: coarse) whose navigator.canShare({ files }) says yes: the share
//                    sheet with the file. Closed by the visitor (AbortError): 'cancelled'. Refused (NotAllowedError, the
//                    tap too long ago) or any other failure: it downloads instead. Everywhere else it downloads:
//                    knght-game-YYYY-MM-DD.png, by the date the game ended, on the device's own calendar.
//   sheet(ending)    -> Promise<File>, the same cached file (for QA).
//
// THE SHEET. 2160 x 2700 px (4:5 portrait, posts as 1080 x 1350), white on black and nothing else: no greys are drawn,
// and a last pass sets any pixel that is not neutral (a browser that antialiases text in colour) to its own grey, so
// every pixel has r = g = b. Margins 176 px at the sides and 164 px at the top and bottom; content 1808 px wide.
//   1. The head: "A GAME WITH THE BLACK QUEEN" left and the date ("10 OCTOBER 2026") right, Hanken Grotesk 500, 28 px,
//      tracked .3em; a 2 px rule under it.
//   2. The ending: its name (Hanken 600, 34 px, tracked .34em, capitals) and its line in Cormorant Garamond 500 at 120 px
//      (italic 400 when it is a quote), balanced over at most two lines (it steps down to 96 px before it takes three).
//      Under it, in Cormorant italic at 46 px: the credit of a quote, or why a draw was a draw.
//   3. The board as the game ended, drawn as the game draws it: white and black squares in a 2 px white frame, the
//      Story set (the same paths as the board, white bodies with black outlines on white squares and white outlines on
//      black, black bodies the other way round, at 88% of a square), the last move's corner ticks, the mated king's
//      double ring, and a tipped king lying on its side (yours head to the left, hers to the right, as in the game, but
//      within its own square: see piece()). Files a to h under it, ranks 1 to 8 at its left, Hanken 500. The moves keep
//      the room they need at 34 px (180 to 340 px) and the board takes the rest, 880 to 1280 px: a short game gets a big
//      board, and a long one keeps a good board and elides the middle of its score (5, below).
//   4. Beside the board, a column of three ruled rows the board's height: LEVEL, MOVES (your moves), RESULT, each a
//      tracked label over its value in Hanken 400 at 88 px (Cormorant's figures are old style, and a canvas cannot turn
//      on its lining ones, so "1-0" would read "I-o").
//   5. The moves, in plain notation (chess.js's SAN), as a justified paragraph the content's width: move numbers in
//      Hanken 500, the moves in Cormorant 500, the result at the end in Hanken 600. It sets as large as fits (48 px down
//      to 28 px); a game too long even at 28 px keeps its first 40% and its last 60% around "…", so the end is there.
//   6. The foot: a 2 px rule, the KNGHT mark (the word in Cormorant 600 tracked .34em over the sword, as in the nav)
//      at the left, and KNGHT.COM at the right on the same baseline.
// The fonts are the page's own: it waits for document.fonts to load each face for the sheet's own text (at most 4 s),
// and a sheet drawn without them uses the same fallbacks as the site's stacks.
import { W } from './words.js';
import { SET, PLINTH } from './set.js';

const S = W.sheet;
const WD = 2160, HT = 2700, MX = 176, MY = 164, CW = WD - 2 * MX;
const SERIF = '"Cormorant Garamond", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const SANS = '"Hanken Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif';
const WHITE = '#fff', BLACK = '#000';
const FACES = ['500 120px "Cormorant Garamond"', 'italic 400 120px "Cormorant Garamond"', '600 120px "Cormorant Garamond"',
  '400 40px "Hanken Grotesk"', '500 40px "Hanken Grotesk"', '600 40px "Hanken Grotesk"'];
// The sword under the word, on its own 600-wide grid (the nav's viewBox 0 27 600 66), stroked 5.
const SWORD = { circle: [30, 60, 16], path: 'M46 60 H120 M120 30 V90 M136 51 L530 51 L594 60 L530 69 L136 69 Z' };

const serif = (px, w = 500, it = false) => `${it ? 'italic ' : ''}${w} ${px}px ${SERIF}`;
const sans = (px, w = 500) => `${w} ${px}px ${SANS}`;
const typo = (s) => String(s || '').replace(/'/g, '’');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const paths = new Map();
const path = (d) => { if (!paths.has(d)) paths.set(d, new Path2D(d)); return paths.get(d); };

/* ----- Type ----- */
async function fonts(text) {
  if (!document.fonts || !document.fonts.load) return;
  const all = Promise.all(FACES.map((f) => document.fonts.load(f, text).catch(() => null)));
  await Promise.race([all.then(() => document.fonts.ready), wait(4000)]);
}
// Capitals set letter by letter with tracking (canvas letterSpacing is not in every browser). Returns the width.
function spaced(x, s, track) {
  let w = 0;
  for (const ch of s) w += x.measureText(ch).width + track;
  return Math.max(0, w - track);
}
function tracked(x, s, X, Y, track, align = 'left') {
  const w = spaced(x, s, track);
  let cx = align === 'right' ? X - w : align === 'center' ? X - w / 2 : X;
  x.textAlign = 'left';
  for (const ch of s) { x.fillText(ch, cx, Y); cx += x.measureText(ch).width + track; }
  return w;
}
function wrap(x, text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const t = line ? `${line} ${word}` : word;
    if (line && x.measureText(t).width > max) { lines.push(line); line = word; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
// The same number of lines, as even as they go.
function balanced(x, text, max) {
  const n = wrap(x, text, max).length;
  if (n < 2) return wrap(x, text, max);
  let lo = max / n, hi = max;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (wrap(x, text, mid).length > n) lo = mid; else hi = mid; }
  return wrap(x, text, hi);
}

/* ----- The board ----- */
// The FEN's placement as 8 rows, rank 8 first: { t, c } or null.
function placement(fen) {
  const rows = String(fen || '').split(' ')[0].split('/');
  if (rows.length !== 8) return [];
  return rows.map((r) => {
    const out = [];
    for (const ch of r) {
      if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) out.push(null);
      else out.push({ t: ch.toLowerCase(), c: ch === ch.toLowerCase() ? 'b' : 'w' });
    }
    return out.slice(0, 8);
  });
}
const at = (s) => (typeof s === 'string' && /^[a-h][1-8]$/.test(s) ? { f: s.charCodeAt(0) - 97, r: 8 - +s[1] } : null);
const lightSq = (f, r) => (f + r) % 2 === 0;

// One piece of the Story set in a box (88% of its square), as symbol() in set.js draws it. tip: -90 (yours, head to
// the left) or 90 (hers, head to the right), at .82 as in the game. The game turns it about its foot, mid-fall, so on
// screen it ends half in the next square; a print has no fall to read, so here it lies on its side within its own
// square, a little below the middle, where the ring of a checkmate still goes round it.
function piece(x, p, ink, cx, cy, box, lw, tip) {
  const s = SET[p.t];
  if (!s) return;
  const k = box / 24, body = p.c === 'w' ? WHITE : BLACK, cut = p.c === 'w' ? BLACK : WHITE;
  x.save();
  x.translate(cx - box / 2, cy - box / 2);
  x.scale(k, k);
  if (tip) { x.translate(12 - 0.7 * Math.sign(tip), 13.2); x.rotate((tip * Math.PI) / 180); x.scale(0.82, 0.82); x.translate(-12, -12); }
  x.lineWidth = lw / k;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  const o = path(s.outline);
  x.fillStyle = body;
  x.fill(o, 'evenodd');
  x.strokeStyle = ink;
  x.stroke(o);
  if (s.details) { x.strokeStyle = cut; x.stroke(path(s.details)); }
  x.strokeStyle = ink;
  x.stroke(path(PLINTH));
  if (s.eye) { x.fillStyle = cut; x.beginPath(); x.arc(s.eye[0], s.eye[1], 0.6, 0, Math.PI * 2); x.fill(); }
  x.restore();
}

function board(x, e, bx, by, size) {
  const sq = size / 8, rows = placement(e.fen);
  x.fillStyle = BLACK;
  x.fillRect(bx, by, size, size);
  x.fillStyle = WHITE;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) if (lightSq(f, r)) x.fillRect(bx + f * sq, by + r * sq, sq, sq);
  x.strokeStyle = WHITE;
  x.lineWidth = 2;
  x.strokeRect(bx - 1, by - 1, size + 2, size + 2);
  const inkAt = (p) => (lightSq(p.f, p.r) ? BLACK : WHITE);
  // The last move: four corner ticks on both squares.
  const lm = e.lastMove || {};
  for (const s of [lm.from, lm.to]) {
    const p = at(s);
    if (!p) continue;
    x.fillStyle = inkAt(p);
    const L = Math.round(sq * 0.18), t = 2, i = 4;
    const X0 = bx + p.f * sq + i, Y0 = by + p.r * sq + i, X1 = bx + (p.f + 1) * sq - i, Y1 = by + (p.r + 1) * sq - i;
    x.fillRect(X0, Y0, L, t); x.fillRect(X0, Y0, t, L);
    x.fillRect(X1 - L, Y0, L, t); x.fillRect(X1 - t, Y0, t, L);
    x.fillRect(X0, Y1 - t, L, t); x.fillRect(X0, Y1 - L, t, L);
    x.fillRect(X1 - L, Y1 - t, L, t); x.fillRect(X1 - t, Y1 - L, t, L);
  }
  // Checkmate: a double ring round the mated king.
  const ck = at(e.check);
  if (ck) {
    x.strokeStyle = inkAt(ck);
    x.lineWidth = 2.5;
    const cx = bx + (ck.f + 0.5) * sq, cy = by + (ck.r + 0.5) * sq, r1 = 0.44 * sq - 1.25;
    for (const r of [r1, r1 - 0.045 * sq]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke(); }
  }
  const tp = at(e.tipped), box = sq * 0.88, lw = Math.max(2.5, sq * 0.022);
  rows.forEach((row, r) => row.forEach((p, f) => {
    if (!p) return;
    const tip = tp && tp.f === f && tp.r === r && p.t === 'k' ? (p.c === 'w' ? -90 : 90) : 0;
    piece(x, p, lightSq(f, r) ? BLACK : WHITE, bx + (f + 0.5) * sq, by + (r + 0.5) * sq, box, lw, tip);
  }));
  // The labels, outside the frame.
  x.fillStyle = WHITE;
  x.font = sans(28, 500);
  x.textAlign = 'center';
  for (let f = 0; f < 8; f++) x.fillText('abcdefgh'[f], bx + (f + 0.5) * sq, by + size + 52);
  x.textAlign = 'right';
  for (let r = 0; r < 8; r++) x.fillText(String(8 - r), bx - 26, by + (r + 0.5) * sq + 10);
  x.textAlign = 'left';
}

// LEVEL, MOVES, RESULT: three ruled rows the board's height. The values are in Hanken: Cormorant's figures are old
// style, and a canvas cannot ask for its lining ones, so "1-0" would read "I-o".
function plate(x, items, X, Y, w, h) {
  const rowH = h / items.length;
  x.fillStyle = WHITE;
  for (let i = 0; i <= items.length; i++) x.fillRect(X, Math.round(Y + i * rowH) - (i === items.length ? 2 : 0), w, 2);
  items.forEach(([label, value], i) => {
    const top = Y + i * rowH;
    x.font = sans(26, 600);
    tracked(x, label.toUpperCase(), X, top + 70, 26 * 0.3);
    x.font = sans(88, 400);
    x.textAlign = 'left';
    x.fillText(String(value), X - 3, top + 70 + 120);
  });
}

/* ----- The moves ----- */
// Every ply as { n, white, san }, numbered from the position the game started from.
function plies(e) {
  const f = String(e.startFen || '').split(' ');
  let n = parseInt(f[5], 10) || 1, white = f[1] !== 'b';
  return (e.san || []).map((san) => {
    const u = { n, white, san };
    if (!white) n++;
    white = !white;
    return u;
  });
}
// What is set: the plies (all, or a head and a tail around "…") and the result. A move number goes before every white
// move, and before a black move that opens the list or follows the "…".
function items(all, result, keep) {
  let list = all;
  const out = [];
  if (keep != null && keep < all.length) {
    const head = Math.max(1, Math.ceil(keep * 0.4));
    list = [...all.slice(0, head), null, ...all.slice(all.length - Math.max(1, keep - head))];
  }
  let fresh = true;
  for (const u of list) {
    if (!u) { out.push({ more: true }); fresh = true; continue; }
    out.push({ ...u, num: u.white ? `${u.n}.` : fresh ? `${u.n}…` : null });
    fresh = false;
  }
  if (result) out.push({ result });
  return out;
}
function measure(x, it, fs) {
  const nf = Math.round(fs * 0.6);
  if (it.more) { x.font = serif(fs, 500); return x.measureText(S.more).width; }
  if (it.result) { x.font = sans(Math.round(fs * 0.66), 600); return x.measureText(it.result).width; }
  x.font = serif(fs, 500);
  let w = x.measureText(it.san).width;
  if (it.num) { x.font = sans(nf, 500); w += x.measureText(it.num).width + fs * 0.2; }
  return w;
}
// Lines of items; the space before a move number is wider, so the pairs read as pairs.
function setLines(x, list, fs, width) {
  const gap = (it) => (it.num && it.white ? fs * 0.62 : fs * 0.36);
  const lines = [];
  let line = [], w = 0;
  for (const it of list) {
    const iw = measure(x, it, fs);
    const g = line.length ? gap(it) : 0;
    if (line.length && w + g + iw > width) { lines.push({ line, w }); line = [{ it, iw, g: 0 }]; w = iw; } else { line.push({ it, iw, g }); w += g + iw; }
  }
  if (line.length) lines.push({ line, w });
  return lines;
}
function moves(x, e, X, Y, width, height) {
  const all = plies(e), LH = 1.5;
  let fs = 48, lines = setLines(x, items(all, e.result), fs, width);
  while (fs > 28 && lines.length * fs * LH > height) { fs -= 2; lines = setLines(x, items(all, e.result), fs, width); }
  if (lines.length * fs * LH > height) {
    // Too long even at 28 px: keep as many plies as fit, the first 40% and the last 60%.
    let lo = 2, hi = all.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (setLines(x, items(all, e.result, mid), fs, width).length * fs * LH <= height) lo = mid; else hi = mid - 1;
    }
    lines = setLines(x, items(all, e.result, lo), fs, width);
  }
  const nf = Math.round(fs * 0.6);
  x.fillStyle = WHITE;
  x.textAlign = 'left';
  lines.forEach(({ line, w }, li) => {
    const y = Y + fs + li * fs * LH;
    const gaps = line.length - 1, extra = li < lines.length - 1 && gaps > 0 ? (width - w) / gaps : 0;
    let cx = X;
    line.forEach(({ it, iw, g }, i) => {
      cx += i ? g + extra : 0;
      if (it.more) { x.font = serif(fs, 500); x.fillText(S.more, cx, y); }
      else if (it.result) { x.font = sans(Math.round(fs * 0.66), 600); x.fillText(it.result, cx, y); }
      else {
        let sx = cx;
        if (it.num) { x.font = sans(nf, 500); x.fillText(it.num, sx, y); sx += x.measureText(it.num).width + fs * 0.2; }
        x.font = serif(fs, 500);
        x.fillText(it.san, sx, y);
      }
      cx += iw;
    });
  });
}

/* ----- The mark ----- */
function mark(x, X, base) {
  const F = 64, track = F * 0.34;
  x.font = serif(F, 600);
  x.fillStyle = WHITE;
  const w = tracked(x, S.mark, X, base, track);
  const k = w / 600, top = base + 0.41 * F;
  x.save();
  x.translate(X, top);
  x.scale(k, k);
  x.translate(0, -27);
  x.lineWidth = 5;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.strokeStyle = WHITE;
  x.beginPath();
  x.arc(SWORD.circle[0], SWORD.circle[1], SWORD.circle[2], 0, Math.PI * 2);
  x.stroke();
  x.stroke(path(SWORD.path));
  x.restore();
  return { top: base - F * 0.64, bottom: top + 66 * k };
}

/* ----- The sheet ----- */
// Any pixel that is not neutral becomes its own grey: the sheet is black and white whatever the browser's text does.
function neutral(x) {
  let d;
  try { d = x.getImageData(0, 0, WD, HT); } catch { return; }
  const p = d.data;
  let n = 0;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    if (r !== g || g !== b) { p[i] = p[i + 1] = p[i + 2] = (r * 54 + g * 183 + b * 19) >> 8; n++; }
  }
  if (n) x.putImageData(d, 0, 0);
}

async function draw(e) {
  const date = e.date instanceof Date ? e.date : new Date(e.date || Date.now());
  const head = S.title.toUpperCase(), when = S.date(date).toUpperCase(), name = typo(e.name).toUpperCase();
  const line = typo(e.line), sub = typo(e.credit || e.why || '');
  const items3 = [[S.level, e.levelName || ''], [S.moves, e.yourMoves ?? 0], [S.result, e.result || '']];
  await fonts([head, when, name, line, sub, S.mark, S.site.toUpperCase(), S.more, '0123456789.abcdefgh',
    ...(e.san || []), ...items3.flat(), e.result].filter((s) => s != null).join(' '));

  const c = document.createElement('canvas');
  c.width = WD;
  c.height = HT;
  const x = c.getContext('2d');
  if (!x) throw new Error('No canvas for the game sheet.');
  x.fillStyle = BLACK;
  x.fillRect(0, 0, WD, HT);
  x.fillStyle = WHITE;
  x.textBaseline = 'alphabetic';

  // 1. The head.
  x.font = sans(28, 500);
  tracked(x, head, MX, MY + 20, 28 * 0.3);
  tracked(x, when, WD - MX, MY + 20, 28 * 0.3, 'right');
  x.fillRect(MX, MY + 64, CW, 2);

  // 2. The ending: its name, its line, and the credit or why.
  let y = MY + 64 + 106;
  x.font = sans(34, 600);
  tracked(x, name, MX, y, 34 * 0.34);
  const quote = !!e.credit;
  let size = 120, lines = [];
  for (const s of [120, 112, 104, 96]) {
    size = s;
    x.font = serif(s, quote ? 400 : 500, quote);
    lines = balanced(x, line, CW);
    if (lines.length <= 2) break;
  }
  y += 40 + Math.round(size * 0.86);
  lines.forEach((l, i) => x.fillText(l, MX - 3, y + i * Math.round(size * 1.06)));
  y += (lines.length - 1) * Math.round(size * 1.06);
  if (sub) {
    y += 92;
    x.font = serif(46, 400, true);
    x.fillText(sub, MX, y);
  }

  // 6. The foot, first: the moves fill what is left between the board and it.
  const base = HT - MY - 60;
  const m = mark(x, MX, base);
  x.font = sans(28, 500);
  tracked(x, S.site.toUpperCase(), WD - MX, base, 28 * 0.3, 'right');
  const rule = Math.round(m.top - 64);
  x.fillRect(MX, rule, CW, 2);

  // 3 and 4. The board and its plate. The moves keep the room they need at 34 px (180 to 340 px); the board takes the
  // rest, from 880 to 1280 px, so a short game gets a big board and a long one keeps a good one and elides its middle.
  const top = Math.round(y + 112), bottom = rule - 76, LABELS = 70, GAP = 70;
  const need = Math.min(340, Math.max(180, setLines(x, items(plies(e), e.result), 34, CW).length * 34 * 1.5));
  const size8 = Math.max(880, Math.min(1280, 8 * Math.floor((bottom - top - LABELS - GAP - need) / 8)));
  const bx = MX + 52;
  board(x, e, bx, top, size8);
  const px = bx + size8 + 100;
  plate(x, items3, px, top, WD - MX - px, size8);

  // 5. The moves.
  const my = top + size8 + LABELS + GAP;
  moves(x, e, MX, my, CW, bottom - my);

  neutral(x);
  const blob = await new Promise((r) => { try { c.toBlob(r, 'image/png'); } catch { r(null); } });
  c.width = 0;
  c.height = 0;
  if (!blob) throw new Error('The game sheet could not be drawn.');
  return new File([blob], S.file(date), { type: 'image/png' });
}

/* ----- Keep it ----- */
const made = new WeakMap();
export function sheet(e) {
  if (!e) return Promise.reject(new Error('No game to keep.'));
  let p = made.get(e);
  if (!p) {
    p = draw(e);
    made.set(e, p);
    p.catch(() => { if (made.get(e) === p) made.delete(e); });
  }
  return p;
}
export function prepare(e) {
  if (e) sheet(e).catch(() => {});
}

const phone = () => { try { return matchMedia('(hover: none) and (pointer: coarse)').matches; } catch { return false; } };
const shareable = (file) => { try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] })); } catch { return false; } };
function save(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function keep(e) {
  const file = await sheet(e);
  if (phone() && shareable(file)) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
      // NotAllowedError (the tap was too long ago, or sharing is off) and anything else: download it instead.
    }
  }
  save(file);
  return 'saved';
}
