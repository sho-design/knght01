/* THE CAST: four of Carroll's characters around the Black Queen's board, drawn as KNGHT hairline figures
   (figures.js) and moved with element.animate (the game never imports gsap). index.js finds this file with a literal
   glob and calls mountCast(controller) once the board is built; it returns { destroy }. The cast only listens
   (controller.on) and asks for a hint (controller.hint()); it never calls land, destroy or leaving, never touches
   the game's live region, and never takes the game's focus.

   Where. Everything sits in the game's layer (controller.layer: over the stage, under the card) in root coordinates,
   in a slot measured from controller.rects() on land, layout, card, turn, move and the like. Occupied: the board with
   its letters, the used part of each player's row, the level tag, the status and last-move lines, every control,
   the card and the promotion chooser, each with 6 px to spare, and the root's edges inset 8. Slots: head (above the
   stage), foot (below it), youEnd (the right end of your row), controlsEnd (the right end of the controls),
   and when the board has a panel beside it: gap (between them), columnTop and columnBottom. A figure needs 56 px of
   height in head, foot and the columns; a caption needs 22. A character with no room does not come; the moment passes.

   Who.
   - The White Rabbit (RABBIT from ../watch.js, its hands on the time in Toronto, or qa.now). 1.3 s after the landing
     starts it stands at the foot of the board (else above it; beside the board, in the panel's column), checks its
     watch and says "I'm late.", or on Wednesday and Friday from 1 to 5 pm "Right on time. Calls are open until 5.";
     then it hops off toward the nearer edge.
   - The Cheshire Cat, only its eyes and grin: after 20 s with no move (the 'idle' event) while hints are left. The grin
     is the cast's one control, a button ("Ask the Cheshire Cat for a hint. N left."): it asks controller.hint() and
     the suggested move is drawn as a dotted path over the board. "That depends a good deal on where you want to get
     to." The eyes go first, the grin last.
   - Humpty Dumpty on his wall: on a phone at the right end of the controls; beside a bigger board, on its edge. He
     comes when a level is chosen and says "When I use a word, it means just what I choose it to mean." on the first
     take back and the first promotion of a game, wobbling.
   - The White Knght: when she takes one of your knghts, the rider falls off, head first. "It's my own invention."
   Captions are one at a time, aria-hidden, Cormorant italic, two lines at most. Any card but the level picker sends
   everyone away; under the picker only the rabbit may stay, clear of it. Reduced motion: fades only, no hops, no
   blink, no wobble, the rider already down. */
import css from './cast.css?inline';
import { RABBIT, toronto } from '../watch.js';
import { W } from './words.js';
import { CAT, HUMPTY, KNGHT } from './figures.js';

const GAP = 6; // clearance round everything the game shows
const EDGE = 8; // and from the root's edges
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const SINE = 'cubic-bezier(.37,0,.63,1)'; // sine.inOut
const right = (b) => b.x + b.w;
const bottom = (b) => b.y + b.h;
const hit = (a, b, g) => a.x < b.x + b.w + g && b.x < a.x + a.w + g && a.y < b.y + b.h + g && b.y < a.y + a.h + g;

export function mountCast(c) {
  if (!c || !c.layer || typeof c.on !== 'function') return null;
  if (!document.getElementById('wlg-cast-css')) {
    const s = document.createElement('style');
    s.id = 'wlg-cast-css';
    s.textContent = css;
    document.head.append(s);
  }
  const L = c.layer, reduce = !!c.reduce, qa = c.qa || {};
  const T = toronto(qa.now ? new Date(qa.now) : new Date());
  const timers = new Set(), anims = new Set(), offs = [], made = [];
  let dead = false, ended = false, climbing = false, playing = false, cardKind = null, said = {};

  const later = (ms, fn) => {
    const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms);
    timers.add(t);
    return t;
  };
  const stop = (t) => { if (t) { clearTimeout(t); timers.delete(t); } };
  const play = (el, kf, o) => {
    if (!el || dead) return null;
    const a = el.animate(kf, o);
    anims.add(a);
    const done = () => anims.delete(a);
    a.finished.then(done, done);
    return a;
  };
  // Opacity to a value from wherever it is now; the end value stays as the element's own style.
  const fade = (el, to, ms, delay = 0) => {
    const from = getComputedStyle(el).opacity;
    if (el._wlcFade) el._wlcFade.cancel();
    el.style.opacity = to;
    const a = play(el, [{ opacity: from }, { opacity: to }], { duration: ms, delay, easing: 'ease-out', fill: 'backwards' });
    el._wlcFade = a;
    return a;
  };
  const add = (tag, cls, html) => {
    const e = document.createElement(tag);
    e.className = cls;
    if (html) e.innerHTML = html;
    if (tag !== 'button') e.setAttribute('aria-hidden', 'true');
    e.hidden = true;
    L.append(e);
    made.push(e);
    return e;
  };
  const desk = () => window.innerWidth >= 760;

  /* ----- Where there is room ----- */
  function measure() {
    let r = null;
    try { r = c.rects(); } catch {}
    if (!r || !r.stage || !r.root) return null;
    const { root, stage, board, panel, her, you, youUsed } = r;
    const controls = r.controls || [];
    const last = controls.length ? controls[controls.length - 1] : null;
    const S = {
      head: { x: stage.x, y: EDGE, w: stage.w, h: stage.y - 2 * EDGE },
      foot: { x: stage.x, y: bottom(stage) + EDGE, w: stage.w, h: root.h - EDGE - (bottom(stage) + EDGE) },
    };
    if (you) {
      const x0 = Math.max(youUsed ? right(youUsed) + 12 : you.x, right(you) - 72);
      if (right(you) - x0 >= 56) S.youEnd = { x: x0, y: you.y - 4, w: right(you) - x0, h: you.h + 8 };
    }
    if (last && panel) {
      const x0 = right(last) + 16;
      if (right(panel) - x0 >= 44) S.controlsEnd = { x: x0, y: last.y, w: right(panel) - x0, h: last.h };
    }
    if (r.layout === 'landscape' && board && panel) {
      // The board's own bottom edge: its file letters hang below it.
      const h1 = c.square('h1');
      const edge = h1 ? h1.y + h1.size / 2 : bottom(board);
      const gx = right(board) + GAP;
      if (panel.x - GAP - gx >= 36) S.gap = { x: gx, y: board.y, w: panel.x - GAP - gx, h: edge - board.y };
      const anchor = r.status || r.last || controls[0];
      if (her && anchor) S.colTop = { x: panel.x, y: bottom(her) + 12, w: panel.w, h: anchor.y - 12 - (bottom(her) + 12) };
      if (last && you) S.colBottom = { x: panel.x, y: bottom(last) + 12, w: panel.w, h: you.y - 12 - (bottom(last) + 12) };
    }
    for (const k of Object.keys(S)) if (!(S[k].w > 0 && S[k].h > 0)) delete S[k];
    const busy = [r.board, r.herUsed, r.tag, r.youUsed, r.status, r.last, ...controls, r.card, r.promo].filter(Boolean);
    return { r, S, busy };
  }
  // The drawing (box) keeps 6 px from everything the game shows and from the rest of the cast; its whole tap target
  // (outer) stays off them too, and inside the root's edges.
  function clear(m, box, outer, self) {
    const o = outer || box;
    if (o.x < EDGE || o.y < EDGE || right(o) > m.r.root.w - EDGE || bottom(o) > m.r.root.h - EDGE) return false;
    for (const b of m.busy) if (hit(box, b, GAP) || hit(o, b, 0)) return false;
    for (const f of FIGS) if (f !== self && f.shown && f.at && hit(o, f.at.box, GAP)) return false;
    return true;
  }

  /* ----- The figures ----- */
  const hand = (d, a) => `<path class="d" d="${d}" transform="rotate(${a} 16.4 13.85)"/>`;
  const RABBIT_SVG = '<svg class="wlc-fig wlc-rabbit-fig" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + `<path class="f" d="${RABBIT.outline}"/><g class="wlc-watch"><path class="b" d="${RABBIT.watch}"/>`
    + `${hand(RABBIT.minute, T.m * 6)}${hand(RABBIT.hour, (T.h % 12) * 30 + T.m / 2)}</g>`
    + `<circle class="k" cx="${RABBIT.eye[0]}" cy="${RABBIT.eye[1]}" r=".6"/></svg>`;

  const portrait = (m) => m.r.layout !== 'landscape';
  // Each: where it may go, in order ([slot, x align, y align, least slot height]), its sizes, and its tap padding.
  const rabbit = {
    el: add('div', 'wlc-at wlc-rabbit', RABBIT_SVG), px: 0, py: 0,
    sizes: () => (desk() ? [[56, 56], [48, 48]] : [[48, 48]]),
    where: (m) => (portrait(m) ? [['foot', 'l', 'c', 56, 8], ['head', 'l', 'c', 56, 8]] : [['colBottom', 'l', 'c', 56], ['colTop', 'l', 'c', 56]]),
  };
  const grin = {
    el: add('button', 'wlc-at wlc-grin-btn', CAT), px: 0, py: 4, beside: 120,
    sizes: () => (desk() ? [[80, 40], [64, 32]] : [[64, 32]]),
    where: (m) => (portrait(m) ? [['head', 'r', 'c', 56], ['youEnd', 'r', 'c']] : [['colTop', 'r', 'c', 56], ['youEnd', 'r', 'c']]),
  };
  const humpty = {
    el: add('div', 'wlc-at wlc-humpty-at', HUMPTY), px: 0, py: 0, beside: 160,
    sizes: () => (desk() ? [[44, 48], [36, 40]] : [[36, 40]]),
    where: (m) => (portrait(m) ? [['controlsEnd', 'r', 'b'], ['foot', 'r', 'c', 56]] : [['gap', 'c', 'b'], ['colBottom', 'r', 'b', 56]]),
  };
  const knght = {
    el: add('div', 'wlc-at wlc-knght-at', KNGHT), px: 0, py: 0, beside: 120,
    sizes: () => (desk() ? [[64, 64], [56, 56]] : [[56, 56]]),
    where: (m) => (portrait(m) ? [['foot', 'r', 'c', 56], ['head', 'r', 'c', 56]] : [['colBottom', 'r', 'c', 56], ['colTop', 'r', 'c', 56]]),
  };
  const FIGS = [humpty, grin, rabbit, knght];
  for (const f of FIGS) { f.shown = false; f.at = null; }
  const grinG = grin.el.querySelector('.wlc-grin'), eyesG = grin.el.querySelector('.wlc-eyes');
  const lids = [...grin.el.querySelectorAll('.wlc-lid')];
  grin.el.type = 'button';
  grin.el.tabIndex = -1;

  // The first place in f's list where one of its sizes fits and nothing is in the way.
  function spot(f, m) {
    for (const [name, ax, ay, least = 0, inset = 0] of f.where(m)) {
      const s = m.S[name];
      if (!s || s.h < least) continue;
      for (const [w, h] of f.sizes()) {
        const ow = w + 2 * f.px, oh = h + 2 * f.py;
        if (ow + inset > s.w || oh > s.h) continue;
        const x = ax === 'l' ? s.x + inset : ax === 'r' ? right(s) - ow : s.x + (s.w - ow) / 2;
        const y = ay === 't' ? s.y : ay === 'b' ? bottom(s) - oh : s.y + (s.h - oh) / 2;
        const box = { x: Math.round(x), y: Math.round(y), w: ow, h: oh };
        const inner = { x: box.x + f.px, y: box.y + f.py, w, h };
        if (clear(m, inner, box, f)) return { box, inner, slot: name, s, w, h };
      }
    }
    return null;
  }
  function put(f, p) {
    f.at = p;
    Object.assign(f.el.style, { left: `${p.box.x}px`, top: `${p.box.y}px`, width: `${p.box.w}px`, height: `${p.box.h}px` });
  }
  function show(f, ms) {
    f.shown = true;
    f.el.hidden = false;
    fade(f.el, 1, ms);
  }
  function out(f, ms = 200) {
    if (!f.shown) return;
    f.shown = false;
    if (capF === f) capOut();
    const a = fade(f.el, 0, ms);
    const gone = () => { if (!f.shown) { f.el.hidden = true; f.at = null; if (f.reset) f.reset(); } };
    if (a) a.finished.then(gone, () => {}); else gone();
  }

  /* ----- Captions: one at a time, beside the speaker, else above or below it, else in a free slot ----- */
  const cap = add('p', 'wlc-cap');
  let capF = null, capT = 0;
  function capFit(m, f, region, align, cy) {
    if (!region || region.w < 60 || region.h < 22) return null;
    cap.style.maxWidth = `${Math.floor(Math.min(region.w, 340))}px`;
    const w = cap.offsetWidth, h = cap.offsetHeight;
    const lh = parseFloat(getComputedStyle(cap).lineHeight) || 19;
    if (!w || Math.round(h / lh) > 2 || h > region.h) return null;
    const x = align === 'r' ? right(region) - w : region.x;
    const y = Math.max(region.y, Math.min(cy - h / 2, bottom(region) - h));
    const box = { x: Math.round(x), y: Math.round(y), w, h };
    if (box.x < EDGE || box.y < EDGE || right(box) > m.r.root.w - EDGE || bottom(box) > m.r.root.h - EDGE) return null;
    for (const b of m.busy) if (hit(box, b, GAP)) return null;
    for (const g of FIGS) if (g.shown && g.at && hit(box, g.at.inner, GAP)) return null;
    return { box, align };
  }
  function capSpot(m, f, text) {
    const fb = f.at.inner, s = m.S[f.at.slot] || f.at.s, cy = fb.y + fb.h / 2, mid = fb.x + fb.w / 2;
    cap.textContent = text;
    const tries = [];
    const toL = [{ x: s.x, y: s.y, w: fb.x - 12 - s.x, h: s.h }, 'r', cy];
    const toR = [{ x: right(fb) + 12, y: s.y, w: right(s) - right(fb) - 12, h: s.h }, 'l', cy];
    const sides = f.side === 'r' ? [toR, toL] : f.side === 'l' ? [toL, toR] : toR[0].w >= toL[0].w ? [toR, toL] : [toL, toR];
    for (const t of sides) if (t[0].w >= (f.beside || 120)) tries.push(t);
    const near = mid < s.x + s.w / 2 ? 'l' : 'r';
    tries.push([{ x: s.x, y: s.y, w: s.w, h: fb.y - 8 - s.y }, near, Infinity]);
    tries.push([{ x: s.x, y: bottom(fb) + 8, w: s.w, h: bottom(s) - bottom(fb) - 8 }, near, -Infinity]);
    for (const n of portrait(m) ? ['foot', 'head'] : ['colBottom', 'colTop']) {
      const t = m.S[n];
      if (t && n !== f.at.slot) tries.push([t, mid < t.x + t.w / 2 ? 'l' : 'r', cy]);
    }
    for (const [reg, al, y] of tries) { const p = capFit(m, f, reg, al, y); if (p) return p; }
    return null;
  }
  function speak(f, text, hold = 3200) {
    if (dead || !f.shown || !f.at) return;
    const m = measure();
    if (!m) return;
    stop(capT);
    capF = null;
    if (cap._wlcFade) cap._wlcFade.cancel();
    cap.style.opacity = 0;
    cap.hidden = false;
    const p = capSpot(m, f, text);
    if (!p) { cap.hidden = true; return; } // no room for words here: the moment passes
    capF = f;
    cap.dataset.side = p.align;
    cap.style.left = `${p.box.x}px`;
    cap.style.top = `${p.box.y}px`;
    const ms = reduce ? 150 : 200;
    fade(cap, 1, ms);
    if (!reduce) play(cap, [{ transform: 'translateY(4px)' }, { transform: 'none' }], { duration: ms, easing: EASE_OUT });
    capT = later(ms + hold, () => capOut());
  }
  function capOut(ms = reduce ? 150 : 300) {
    stop(capT);
    capT = 0;
    if (!capF) return;
    capF = null;
    const a = fade(cap, 0, ms);
    const gone = () => { if (!capF) cap.hidden = true; };
    if (a) a.finished.then(gone, () => {}); else gone();
  }

  /* ----- The White Rabbit, waiting at the landing ----- */
  const rsvg = rabbit.el.firstElementChild, watch = rabbit.el.querySelector('.wlc-watch');
  let rabbitDone = false;
  function rabbitIn() {
    if (rabbitDone || ended || climbing || (cardKind && cardKind !== 'pick')) return;
    const m = measure();
    const p = m && spot(rabbit, m);
    if (!p) return;
    rabbitDone = true;
    put(rabbit, p);
    const toLeft = p.box.x + p.box.w / 2 < m.r.root.w / 2;
    rabbit.side = toLeft ? 'r' : 'l'; // its words on the side it will not hop to
    show(rabbit, reduce ? 150 : 200);
    const line = T.open ? W.cast.open : W.cast.late;
    if (reduce) {
      watch.style.transform = 'rotate(-14deg)';
      speak(rabbit, line);
      later(4000, () => out(rabbit, 250));
      return;
    }
    // It checks its watch (out from the chain, back) and bobs twice, as on the footer line.
    later(200, () => {
      play(watch, [0, -14, 10, 0].map((d) => ({ transform: `rotate(${d}deg)`, easing: SINE })), { duration: 800 });
      play(rsvg, [1, 0.96, 1].map((s) => ({ transform: `scaleY(${s})`, easing: SINE })), { duration: 400, iterations: 2 });
    });
    later(400, () => speak(rabbit, line));
    // Then it is off: three hops toward the nearer edge, a parabola 0.3 of its height, fading over the last.
    later(3300, () => {
      if (!rabbit.shown || !rabbit.at) return;
      const d = (desk() ? 46 : 34) * (toLeft ? -1 : 1), arc = rabbit.at.h * 0.3, flip = toLeft ? ' scaleX(-1)' : '';
      const kf = [];
      for (let i = 0; i <= 24; i++) {
        const k = i / 8, f = k % 1;
        kf.push({ transform: `translate(${(k * d).toFixed(1)}px,${(-4 * arc * f * (1 - f)).toFixed(1)}px)${flip}` });
      }
      rabbit.leaving = true;
      play(rsvg, kf, { duration: 660, easing: 'linear', fill: 'forwards' });
      later(440, () => out(rabbit, 220));
    });
  }
  rabbit.reset = () => {
    rabbit.leaving = false;
    for (const a of rsvg.getAnimations()) a.cancel();
  };

  /* ----- The Cheshire Cat: a grin for a hint ----- */
  let blinkT = 0;
  function grinIn() {
    if (grin.shown || ended || climbing || cardKind || playing !== true || c.phase !== 'you' || !(c.hintsLeft > 0)) return;
    const m = measure();
    const p = m && spot(grin, m);
    if (!p) return;
    put(grin, p);
    grin.el.setAttribute('aria-label', W.cast.grin(c.hintsLeft));
    grin.el.tabIndex = 0;
    grin.el.setAttribute('data-on', '');
    grin.shown = true;
    grin.el.hidden = false;
    if (grin.el._wlcFade) grin.el._wlcFade.cancel();
    grin.el.style.opacity = 1;
    for (const g of [grinG, eyesG]) for (const a of g.getAnimations()) a.cancel();
    // The grin comes first and the eyes after it.
    play(grinG, [{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 200 : 600, easing: 'ease-out', fill: 'both' });
    play(eyesG, [{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 200 : 600, delay: reduce ? 100 : 300, easing: 'ease-out', fill: 'both' });
    speak(grin, W.cast.cheshire, 4000);
    if (!reduce) blink();
  }
  function blink() {
    stop(blinkT);
    blinkT = later(4000 + Math.random() * 2000, () => {
      if (!grin.shown) return;
      for (const lid of lids) play(lid, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.1)' }, { transform: 'scaleY(1)' }], { duration: 240, easing: 'ease-in-out' });
      blink();
    });
  }
  // The eyes go, and then the grin.
  function grinOut() {
    if (!grin.shown) return;
    grin.shown = false;
    stop(blinkT);
    grin.el.removeAttribute('data-on');
    grin.el.tabIndex = -1;
    if (capF === grin) capOut();
    const ms = reduce ? 200 : 300, gap = reduce ? 100 : 300;
    for (const g of [grinG, eyesG]) for (const a of g.getAnimations()) a.cancel();
    play(eyesG, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
    play(grinG, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, delay: gap, easing: 'ease-in', fill: 'both' });
    later(ms + gap + 20, () => { if (!grin.shown) { grin.el.hidden = true; grin.at = null; } });
  }
  grin.reset = () => {};
  grin.el.addEventListener('click', () => {
    if (!grin.shown || dead) return;
    const keys = grin.el.matches(':focus-visible');
    grinOut();
    Promise.resolve().then(() => c.hint()).catch(() => null);
    // A keyboard press gives the board its focus back, where the path is drawn; a tap just lets go.
    if (keys) { const s = c.root.querySelector('.wlg-squares [tabindex="0"]'); if (s) s.focus({ preventScroll: true }); } else grin.el.blur();
  }, { signal: c.signal });

  /* ----- The dotted path of a hint, over the board (it takes no taps) ----- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  let path = null, pathT = 0, hinted = null;
  // still: drawn again where the squares are now (a new layout), at once, on the same 10 s.
  function drawPath(h, still) {
    if (still) { if (path) { path.remove(); path = null; } } else pathGone();
    const a = c.square(h.from), b = c.square(h.to);
    if (!a || !b || dead) return;
    hinted = h;
    const sq = a.size, step = 0.22 * sq;
    const pts = [a];
    // A knght's path is an L: two squares along the long way, then one.
    if (h.piece === 'n') pts.push(Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? { x: b.x, y: a.y } : { x: a.x, y: b.y });
    pts.push(b);
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); segs.push(l); total += l; }
    const at = (s) => {
      for (let i = 0; i < segs.length; i++) {
        if (s <= segs[i] || i === segs.length - 1) { const t = segs[i] ? s / segs[i] : 0; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t }; }
        s -= segs[i];
      }
      return b;
    };
    // The dots leave the piece's middle clear, and stop short of the ring round the destination.
    const ringR = 0.3 * sq, dots = [];
    for (let s = ringR; s < total - ringR - 0.12 * sq; s += step) dots.push(at(s));
    const circ = 2 * Math.PI * ringR, n = Math.max(8, Math.round(circ / step)), dash = `0 ${(circ / n).toFixed(2)}`;
    path = document.createElementNS(SVGNS, 'svg');
    path.setAttribute('class', 'wlc-path');
    path.setAttribute('aria-hidden', 'true');
    path.setAttribute('focusable', 'false');
    path.innerHTML = dots.map((p) => `<g><circle class="h" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(0.075 * sq).toFixed(2)}"/>`
      + `<circle class="c" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(0.045 * sq).toFixed(2)}"/></g>`).join('')
      + `<g><circle class="rh" cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${ringR.toFixed(1)}" stroke-width="${(0.15 * sq).toFixed(2)}" stroke-dasharray="${dash}"/>`
      + `<circle class="r" cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${ringR.toFixed(1)}" stroke-width="${(0.09 * sq).toFixed(2)}" stroke-dasharray="${dash}"/></g>`;
    L.insertBefore(path, L.firstChild);
    if (!reduce && !still) {
      const g = [...path.children], k = Math.max(1, g.length - 1);
      g.forEach((el, i) => {
        const ring = i === g.length - 1;
        play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: ring ? 160 : 90, delay: ring ? 360 : (i / k) * 360, easing: 'ease-out', fill: 'backwards' });
      });
    }
    if (!still) {
      stop(pathT);
      pathT = later(10000, () => pathOut());
    }
  }
  function pathGone() { stop(pathT); if (path) { path.remove(); path = null; } }
  function pathOut() {
    stop(pathT);
    hinted = null;
    const p = path;
    if (!p) return;
    path = null;
    if (reduce) { p.remove(); return; }
    const a = play(p, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
    if (a) a.finished.then(() => p.remove(), () => p.remove()); else p.remove();
  }

  /* ----- Humpty Dumpty on his wall ----- */
  const hd = humpty.el.querySelector('.wlc-hd');
  function humptyIn() {
    if (humpty.shown || !playing || ended || climbing || cardKind) return;
    const m = measure();
    const p = m && spot(humpty, m);
    if (!p) return;
    put(humpty, p);
    show(humpty, reduce ? 200 : 300);
  }
  function humptySays(why) {
    if (said[why] || !humpty.shown) return;
    said[why] = true;
    speak(humpty, W.cast.humpty);
    if (!reduce) play(hd, [0, -5, 4, -2, 0].map((d) => ({ transform: `rotate(${d}deg)`, easing: SINE })), { duration: 900 });
  }
  humpty.reset = () => { for (const a of hd.getAnimations()) a.cancel(); };

  /* ----- The White Knght falls off ----- */
  const rider = knght.el.querySelector('.wlc-rider'), ground = knght.el.querySelector('.wlc-ground');
  const kfig = knght.el.firstElementChild;
  const DOWN = 'translate(-5px,9.1px) rotate(-110deg)';
  let knghtT = [];
  function knghtFalls() {
    if (ended || climbing || cardKind) return;
    for (const t of knghtT) stop(t);
    knghtT = [];
    if (knght.shown) { knght.shown = false; knght.reset(); }
    const m = measure();
    const p = m && spot(knght, m);
    if (!p) return;
    put(knght, p);
    knght.reset();
    show(knght, 150);
    if (reduce) {
      rider.style.transform = DOWN;
      kfig.setAttribute('data-down', '');
      speak(knght, W.cast.whiteKnght);
      knghtT.push(later(4400, () => out(knght, 250)));
      return;
    }
    // Seated; he tips back, then goes over head first, lands beside the horse and bounces once.
    play(rider, [
      { offset: 0, transform: 'translate(0px,0px) rotate(0deg)' },
      { offset: 300 / 1150, transform: 'translate(0px,0px) rotate(0deg)', easing: 'cubic-bezier(.55,0,1,.45)' },
      { offset: 500 / 1150, transform: 'translate(0px,0px) rotate(-25deg)', easing: 'cubic-bezier(.55,0,1,.45)' },
      { offset: 950 / 1150, transform: 'translate(-5px,9.1px) rotate(-110deg)', easing: 'cubic-bezier(.33,1,.68,1)' },
      { offset: 1050 / 1150, transform: 'translate(-5px,8.3px) rotate(-106deg)', easing: 'cubic-bezier(.32,0,.67,0)' },
      { offset: 1, transform: DOWN },
    ], { duration: 1150, fill: 'forwards' });
    play(ground, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 900, fill: 'both' });
    knghtT.push(later(1000, () => speak(knght, W.cast.whiteKnght)));
    knghtT.push(later(4800, () => out(knght, 400)));
  }
  knght.reset = () => {
    for (const el of [rider, ground]) for (const a of el.getAnimations()) a.cancel();
    rider.style.transform = '';
    kfig.removeAttribute('data-down');
  };

  /* ----- Everyone, together ----- */
  // Everything goes: a card, the climb.
  function hush(ms = 200) {
    pathOut();
    capOut(Math.min(ms, 300));
    grinOut();
    for (const f of [humpty, rabbit, knght]) out(f, ms);
    for (const t of knghtT) stop(t);
    knghtT = [];
  }
  // The layout changed: each figure keeps its place if it still fits, else moves on down its list, else goes.
  function reflow() {
    if (dead || !(path || capF || FIGS.some((f) => f.shown))) return;
    const m = measure();
    if (!m) return;
    for (const f of FIGS) {
      if (!f.shown || f.leaving || !f.at) continue;
      const p = spot(f, m);
      if (p) put(f, p);
      else if (f === grin) grinOut();
      else out(f);
    }
    if (capF && capF.at) {
      const p = capSpot(m, capF, cap.textContent);
      if (p) { cap.dataset.side = p.align; cap.style.left = `${p.box.x}px`; cap.style.top = `${p.box.y}px`; } else capOut();
    }
    if (path && hinted) drawPath(hinted, true);
  }

  // Tab (and Shift) on the way to the grin is input too, and would send it away before a keyboard could reach it:
  // the key is noted here, before the game sees it, and an 'idle' off that it caused leaves the grin where it is.
  // (It is let go after the whole keydown has been dispatched: a microtask would run between two listeners.)
  let tabbing = false;
  window.addEventListener('keydown', (e) => {
    tabbing = e.key === 'Tab' || e.key === 'Shift';
    if (tabbing) setTimeout(() => { tabbing = false; }, 0);
  }, { capture: true, signal: c.signal });

  const on = (type, fn) => offs.push(c.on(type, fn));
  on('land', ({ at }) => {
    if (at === 'start' && !reduce) later(1300, rabbitIn);
    if (at === 'done' && reduce) rabbitIn();
  });
  on('card', ({ kind }) => {
    cardKind = kind || null;
    if (kind === 'end' || kind === 'confirm') { hush(); return; }
    pathOut();
    if (kind === 'pick') {
      // Under the level picker only the landing rabbit may stay, and only clear of it.
      grinOut();
      out(humpty);
      out(knght);
      reflow();
      return;
    }
    reflow();
    humptyIn();
  });
  on('level', () => { playing = true; ended = false; humptyIn(); reflow(); });
  on('restart', () => { playing = false; ended = false; said = {}; hush(); });
  on('end', () => { ended = true; grinOut(); pathOut(); });
  on('climb', () => { climbing = true; hush(150); });
  on('idle', ({ on: yes }) => { if (yes) grinIn(); else if (!tabbing) grinOut(); });
  on('hint', (h) => drawPath(h));
  on('select', () => { pathOut(); grinOut(); });
  on('move', () => { pathOut(); grinOut(); reflow(); });
  on('turn', ({ who }) => { if (who !== 'you') grinOut(); reflow(); });
  // A new layout may have room again for Humpty, who stays for the whole game.
  on('layout', () => { reflow(); humptyIn(); });
  on('takeback', () => { pathOut(); reflow(); humptySays('takeback'); });
  on('promote', ({ at }) => { if (at === 'open') humptySays('promote'); });
  on('capture', ({ by, piece }) => { if (by === 'her' && piece === 'n') knghtT.push(later(120, knghtFalls)); });

  function destroy() {
    if (dead) return;
    dead = true;
    for (const t of timers) clearTimeout(t);
    timers.clear();
    for (const a of anims) { try { a.cancel(); } catch {} }
    anims.clear();
    for (const off of offs) { try { off(); } catch {} }
    offs.length = 0;
    if (path) path.remove();
    for (const e of made) e.remove();
  }
  if (c.signal) {
    if (c.signal.aborted) destroy();
    else c.signal.addEventListener('abort', destroy, { once: true });
  }
  return { destroy };
}
