// The board: 64 square buttons, a layer of pieces over them, the markers, the landing and the moves.
// It draws; it decides nothing (index.js decides, rules.js judges). Motion is the Web Animations API only.
import { glyph } from './set.js';
import { squareLabel } from './words.js';

const FILES = 'abcdefgh';
// x is the file (a = 0), y the row from the top (rank 8 = 0). You play white, from the bottom.
export const sqName = (x, y) => FILES[x] + (8 - y);
export const sqXY = (s) => [s.charCodeAt(0) - 97, 8 - Number(s[1])];
const toneOf = (x, y) => ((x + y) % 2 === 0 ? 'light' : 'dark'); // a1 is dark, h1 is light

const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const settled = (a) => a.finished.catch(() => {});

// A CSS cubic-bezier as a function of progress, for keyframes sampled in JS.
const bezier = (x1, y1, x2, y2) => (p) => {
  const at = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let lo = 0, hi = 1, t = p;
  for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (at(t, x1, x2) < p) lo = t; else hi = t; }
  return at(t, y1, y2);
};
const TURN = bezier(0.65, 0, 0.35, 1);
// The looking-glass on the board's parent, 1.18 s: 24 keyframes of perspective(1600px) rotate(R) rotateY(Y). The
// back of the board faces you (Y 180) until 0.5 s, then it turns to face you by 1.18 s (edge-on near 0.84 s).
// The tilt R holds the world's roll until 0.68 s, then rights itself in half a second: an ease-out a little past
// square (-12% of the roll at 80%), then square.
function glass(roll0) {
  const frame = (ms) => {
    const y = ms <= 500 ? 180 : 180 * (1 - TURN(Math.min(1, (ms - 500) / 680)));
    const p = Math.max(0, (ms - 680) / 500);
    const r = p <= 0.8 ? roll0 * (1 - 1.12 * (1 - (1 - p / 0.8) ** 3))
      : -0.12 * roll0 * (1 - (1 - Math.cos(Math.PI * Math.min(1, (p - 0.8) / 0.2))) / 2);
    return { offset: ms / 1180, transform: `perspective(1600px) rotate(${r.toFixed(3)}deg) rotateY(${y.toFixed(2)}deg)` };
  };
  return [frame(0), ...Array.from({ length: 23 }, (_, i) => frame(500 + (i * 680) / 22))];
}

export function createBoard(wrap, { reduce }) {
  const btn = {};
  let html = '<div class="wlg-board"><div class="wlg-squares">';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const s = sqName(x, y);
    html += `<button type="button" class="wlg-sq" data-sq="${s}" data-tone="${toneOf(x, y)}" tabindex="-1"></button>`;
  }
  html += '</div><div class="wlg-pieces" aria-hidden="true"></div><i class="wlg-frame" aria-hidden="true"></i>'
    + `<div class="wlg-ranks" aria-hidden="true">${[8, 7, 6, 5, 4, 3, 2, 1].map((r) => `<span>${r}</span>`).join('')}</div>`
    + `<div class="wlg-files" aria-hidden="true">${[...FILES].map((f) => `<span>${f}</span>`).join('')}</div></div>`
    + '<div class="wlg-promo" role="group" hidden></div>';
  wrap.insertAdjacentHTML('beforeend', html);
  const boardEl = wrap.querySelector('.wlg-board');
  const squares = wrap.querySelector('.wlg-squares');
  const layer = wrap.querySelector('.wlg-pieces');
  const promo = wrap.querySelector('.wlg-promo');
  squares.querySelectorAll('.wlg-sq').forEach((b) => { btn[b.dataset.sq] = b; });

  const els = new Map(); // square -> piece element
  const running = new Set();
  let sqPx = 40, cursor = 'e2';
  btn[cursor].tabIndex = 0;

  const track = (a) => { running.add(a); a.finished.catch(() => {}).then(() => running.delete(a)); return a; };
  const animate = (el, kf, opt) => track(el.animate(kf, opt));

  function place(el, s) {
    const [x, y] = sqXY(s);
    el.style.setProperty('--x', x);
    el.style.setProperty('--y', y);
    el.dataset.tone = toneOf(x, y);
    el.dataset.sq = s;
  }
  function create(s, type, color) {
    const el = document.createElement('div');
    el.className = 'wlg-pc';
    el.dataset.k = type + color;
    el.innerHTML = glyph(type, color);
    place(el, s);
    layer.append(el);
    els.set(s, el);
    return el;
  }

  // Make the pieces match the position exactly (after a take back, a new game, or a move's animation).
  function sync(position) {
    const want = new Map();
    for (const row of position) for (const p of row) if (p) want.set(p.square, p);
    for (const [s, el] of els) {
      const p = want.get(s);
      if (!p || el.dataset.k !== p.type + p.color) { el.remove(); els.delete(s); }
      else { place(el, s); delete el.dataset.lift; delete el.dataset.up; el.style.transform = ''; }
    }
    for (const [s, p] of want) if (!els.has(s)) create(s, p.type, p.color);
  }

  function finishAll() {
    for (const a of [...running]) { try { a.finish(); } catch { a.cancel(); } }
    running.clear();
  }

  // Slide a piece from one square to another. The element already sits on the new square; it is drawn back and released.
  function slide(el, from, to, ms) {
    const [fx, fy] = sqXY(from), [tx, ty] = sqXY(to);
    place(el, to);
    if (!ms) return null;
    el.dataset.lift = '';
    const a = animate(el, [
      { transform: `translate(${(fx - tx) * sqPx}px,${(fy - ty) * sqPx}px)` },
      { transform: 'translate(0,0)' },
    ], { duration: ms, easing: 'cubic-bezier(.45,.05,.2,1)' });
    settled(a).then(() => { delete el.dataset.lift; });
    return a;
  }

  // A move from chess.js (already played). mine: your move (0.22 s); hers 0.3 s. dragged: the piece is already there.
  async function move(m, { mine, dragged } = {}) {
    finishAll();
    const ms = reduce || dragged ? 0 : mine ? 220 : 300;
    const waits = [];
    const capSq = m.flags.includes('e') ? m.to[0] + m.from[1] : m.captured ? m.to : null;
    const taken = capSq ? els.get(capSq) : null;
    if (taken) {
      els.delete(capSq);
      if (ms || (!reduce && dragged)) {
        const a = animate(taken, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.8)' }],
          { duration: 150, delay: Math.max(0, ms - 90), easing: 'ease-in', fill: 'forwards' });
        waits.push(settled(a).then(() => taken.remove()));
      } else taken.remove();
    }
    const el = els.get(m.from);
    if (el) {
      els.delete(m.from);
      els.set(m.to, el);
      const a = slide(el, m.from, m.to, ms);
      if (a) waits.push(settled(a));
      if (el.dataset.drag !== undefined) { delete el.dataset.drag; el.style.transform = ''; delete el.dataset.lift; }
    }
    if (m.flags.includes('k') || m.flags.includes('q')) {
      const r = m.to[1], rf = (m.flags.includes('k') ? 'h' : 'a') + r, rt = (m.flags.includes('k') ? 'f' : 'd') + r;
      const rook = els.get(rf);
      if (rook) {
        els.delete(rf); els.set(rt, rook);
        const a = slide(rook, rf, rt, ms || (reduce ? 0 : 220));
        if (a) waits.push(settled(a));
      }
    }
    await Promise.all(waits);
    if (m.promotion && el && el.isConnected) {
      const color = m.color;
      el.dataset.k = m.promotion + color;
      const old = el.querySelector('.wlg-glyph');
      el.insertAdjacentHTML('beforeend', glyph(m.promotion, color));
      const fresh = el.lastElementChild;
      if (reduce) old.remove();
      else {
        // Both glyphs share the one grid cell while the pawn becomes its new piece.
        old.style.gridArea = fresh.style.gridArea = '1 / 1';
        const a = animate(old, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
        animate(fresh, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, easing: EASE_OUT });
        await settled(a);
        old.remove();
        fresh.style.gridArea = '';
      }
    }
  }

  // Markers. marks: { sel, targets: Map(square -> 'target' | 'capture'), last: [from, to], check: square }
  let shown = { sel: null, targets: new Map(), last: null, check: null };
  function mark(next) {
    shown = { sel: null, targets: new Map(), last: null, check: null, ...next };
    for (const s in btn) {
      const b = btn[s];
      b.toggleAttribute('data-sel', s === shown.sel);
      const t = shown.targets.get(s);
      if (t) b.dataset.mark = t; else delete b.dataset.mark;
      b.toggleAttribute('data-last', !!shown.last && shown.last.includes(s));
      b.toggleAttribute('data-check', s === shown.check);
    }
    for (const [s, el] of els) el.toggleAttribute('data-up', s === shown.sel);
  }

  function label(get) {
    for (const s in btn) {
      const t = shown.targets.get(s);
      btn[s].setAttribute('aria-label', squareLabel(s, get(s), s === shown.sel ? 'selected' : t));
    }
  }

  function setCursor(s, focus) {
    if (!btn[s]) return;
    if (cursor !== s) { btn[cursor].tabIndex = -1; cursor = s; }
    btn[s].tabIndex = 0;
    if (focus) btn[s].focus();
  }

  // Drag: the piece follows the pointer; on release it lands or flies home.
  function drag(s, dx, dy) {
    const el = els.get(s);
    if (!el) return;
    el.dataset.drag = ''; el.dataset.lift = '';
    el.style.transform = `translate(${dx}px,${dy}px)`;
  }
  function dragHome(s) {
    const el = els.get(s);
    if (!el) return;
    const from = el.style.transform;
    delete el.dataset.drag;
    el.style.transform = '';
    if (!reduce && from) {
      const a = animate(el, [{ transform: from }, { transform: 'translate(0,0)' }], { duration: 160, easing: EASE_OUT });
      settled(a).then(() => { delete el.dataset.lift; });
    } else delete el.dataset.lift;
  }
  function squareAt(cx, cy) {
    const r = squares.getBoundingClientRect();
    const x = Math.floor((cx - r.left) / (r.width / 8)), y = Math.floor((cy - r.top) / (r.height / 8));
    return x >= 0 && x < 8 && y >= 0 && y < 8 ? sqName(x, y) : null;
  }

  // The landing, through the looking-glass. The board rises out of the core (0 to 0.85 s) seen from behind, so it
  // shows mirrored (files h to a) and still tilted with the world's last roll (from.roll, degrees; -6 without a fall).
  // It turns to face you (0.5 to 1.18 s), and the tilt rights itself in the last half second. The squares rush up
  // ring by ring and the pieces fade in while it is mirrored; each piece settles once the board is square.
  // The turn and the tilt are on the board's parent (wrap), so the rise and the squares keep their own transforms.
  async function land(from) {
    const r = boardEl.getBoundingClientRect();
    const size = r.width || sqPx * 8, cx = r.left + size / 2, cy = r.top + r.height / 2;
    if (reduce) return;
    const f = from && Number.isFinite(from.x) ? from : { x: cx, y: cy, d: size * 0.2 };
    const roll0 = from && Number.isFinite(from.roll) ? from.roll : -6;
    const s0 = Math.min(1, Math.max(0.02, (f.d || size * 0.2) / size));
    const waits = [settled(animate(wrap, glass(roll0), { duration: 1180 }))];
    // The rise is written in the board's own frame, which starts turned round and tilted: undo both on the way
    // from the core, so the board still comes out of the core's centre.
    const a = (roll0 * Math.PI) / 180, dx = f.x - cx, dy = f.y - cy;
    const lx = -(dx * Math.cos(a) + dy * Math.sin(a)), ly = dy * Math.cos(a) - dx * Math.sin(a);
    waits.push(settled(animate(boardEl, [
      { transform: `translate(${lx}px,${ly}px) scale(${s0})`, easing: EASE_OUT },
      { transform: 'translate(0,0) scale(1.012)', offset: 0.7, easing: 'ease-in-out' },
      { transform: 'translate(0,0) scale(1)' },
    ], { duration: 850 })));
    for (const s in btn) {
      const [x, y] = sqXY(s);
      const ring = Math.floor(Math.max(Math.abs(x - 3.5), Math.abs(y - 3.5)));
      animate(btn[s], [{ opacity: 0, transform: 'scale(.82)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 420, delay: ring * 45, easing: EASE_OUT, fill: 'backwards' });
    }
    // The frame and its letters come early, so the mirror can be read.
    for (const el of wrap.querySelectorAll('.wlg-frame,.wlg-ranks,.wlg-files')) {
      animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: 200, fill: 'backwards' });
    }
    const rows = [...new Set([...els.keys()].map((s) => sqXY(s)[1]))].sort((a, b) => a - b);
    for (const [s, el] of els) {
      const [x, y] = sqXY(s), i = rows.indexOf(y);
      waits.push(settled(animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 60 + i * 30, easing: 'ease-out', fill: 'backwards' })));
      const g = el.querySelector('.wlg-glyph');
      if (g) animate(g, [{ transform: 'scaleY(.95)', transformOrigin: '50% 90%' }, { transform: 'scaleY(1)', transformOrigin: '50% 90%' }],
        { duration: 120, delay: 1180 + i * 40 + x * 6, easing: 'ease-out' });
    }
    await Promise.all(waits);
  }

  return {
    el: boardEl, squares, promo, btn, els,
    get cursor() { return cursor; },
    setSize(px) { sqPx = px; },
    sync, move, mark, label, setCursor, finishAll, drag, dragHome, squareAt, land,
    get marks() { return shown; },
  };
}
