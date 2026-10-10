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

  // The landing: the squares rush up out of the circle, settle, then the pieces drop in rank by rank.
  async function land(from) {
    const r = boardEl.getBoundingClientRect();
    const size = r.width || sqPx * 8, cx = r.left + size / 2, cy = r.top + r.height / 2;
    if (reduce) return;
    const f = from && Number.isFinite(from.x) ? from : { x: cx, y: cy, d: size * 0.2 };
    const s0 = Math.min(1, Math.max(0.02, (f.d || size * 0.2) / size));
    const waits = [];
    waits.push(settled(animate(boardEl, [
      { transform: `translate(${f.x - cx}px,${f.y - cy}px) scale(${s0})`, easing: EASE_OUT },
      { transform: 'translate(0,0) scale(1.012)', offset: 0.7, easing: 'ease-in-out' },
      { transform: 'translate(0,0) scale(1)' },
    ], { duration: 850 })));
    for (const s in btn) {
      const [x, y] = sqXY(s);
      const ring = Math.floor(Math.max(Math.abs(x - 3.5), Math.abs(y - 3.5)));
      animate(btn[s], [{ opacity: 0, transform: 'scale(.82)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 420, delay: ring * 45, easing: EASE_OUT, fill: 'backwards' });
    }
    for (const el of wrap.querySelectorAll('.wlg-frame,.wlg-ranks,.wlg-files')) {
      animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: 600, fill: 'backwards' });
    }
    const rows = [...new Set([...els.keys()].map((s) => sqXY(s)[1]))].sort((a, b) => a - b);
    for (const [s, el] of els) {
      const [x, y] = sqXY(s), d = 650 + rows.indexOf(y) * 110 + x * 18;
      waits.push(settled(animate(el, [
        { transform: `translate(0,${-0.7 * sqPx}px)`, opacity: 0 },
        { transform: 'translate(0,0)', opacity: 1 },
      ], { duration: 300, delay: d, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'backwards' })));
      const g = el.querySelector('.wlg-glyph');
      if (g) animate(g, [{ transform: 'scaleY(.95)', transformOrigin: '50% 90%' }, { transform: 'scaleY(1)', transformOrigin: '50% 90%' }],
        { duration: 120, delay: d + 300, easing: 'ease-out' });
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
