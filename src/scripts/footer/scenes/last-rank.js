/* The last rank. The name is the last rank of the board, and its letters stand on it like pieces.
   A pawn from the set is drawn in between the G and the H. It walks the rank one square at a time, behind the
   letters (the H's stems hide it as it passes), and on the last square, between the H and the T, it is promoted:
   its outline becomes the knight's, and the eye opens. Under it: "Reach the last rank. Choose the knght."
   The pieces stand on the letters' own baseline, sized to the room between the letters (the knight about half the
   cap height), so nothing is added around the name and nothing moves in the footer. The walk starts right of the G
   and never goes near the gap between the N and the G. It keeps the shared base: the pieces ride the rise with the
   letters beside them. Ported from the sketch ride/last-rank (which walked the footer line under the whole name). */
import { PIECES } from '../pieces.js';

const SAY = 'Reach the last rank. Choose the knght.';

/* Where the ink of the G, the H and the T lies, in 1/1000 em from the left of each letter's span (letters.js, the
   same units). Measured once from those outlines (a canvas probe every half unit), so the scene does no geometry work
   at run time; measure again if letters.js changes. "band" is the rows a piece stands in, the 0.25 em (0.4 cap height)
   above the baseline, serifs included; "body" is the same rows without the foot serifs; "full" is the whole letter.
     G  band right 684.5 (the spur)                      full left 49.5
     H  band left 31.5, counter 285.5 to 473.5, right 727.5
        body left 112, counter 203 to 556.5, right 647
     T  band left 184.5 (the foot serif), body left 274  full right 600.5 (the bar) */
const INK = {
  G: { right: 684.5, rightBody: 684.5, left: 49.5 },
  H: { left: 31.5, leftBody: 112, inLo: 285.5, inLoBody: 203, inHi: 473.5, inHiBody: 556.5, right: 727.5, rightBody: 647 },
  T: { left: 184.5, leftBody: 274, right: 600.5 },
};

export default {
  id: 'last-rank',
  name: 'The last rank',
  takesOver: false,

  mount(ctx) {
    const { gsap, letters } = ctx;
    let geo, sq, u, sayX, saySize, sayY;

    // The piece stands behind the letters; the line sits under them, in the room above the footer line.
    const board = ctx.svg({ layer: 'under', className: 'rank' });
    const piece = ctx.make('g', { parent: board, attrs: { color: '#ececec' } });
    const body = ctx.make('path', {
      parent: piece,
      attrs: { d: PIECES.pawn.outline, fill: 'rgba(255,255,255,0.05)', 'fill-opacity': 0, 'fill-rule': 'evenodd', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    });
    const plinth = ctx.make('path', { parent: piece, attrs: { d: PIECES.pawn.plinth, fill: 'none', stroke: 'currentColor', 'stroke-linecap': 'round' } });
    const E = PIECES.knight.eye;
    const eye = ctx.make('circle', { parent: piece, attrs: { cx: E.cx, cy: E.cy, r: E.r, fill: 'currentColor', opacity: 0 } });
    const words = ctx.svg({ layer: 'under', className: 'rank-say' });
    const say = ctx.make('text', {
      parent: words,
      text: SAY,
      attrs: { 'text-anchor': 'end', fill: '#a6a6a6', opacity: 0, style: 'font-family:var(--serif);font-style:italic;font-weight:400;letter-spacing:.01em' },
    });

    const meter = document.createElement('canvas').getContext('2d'); // never added to the page

    // The three squares, in stage pixels: between the G and the H, inside the H, and the last, between the H and the T.
    const layout = () => {
      geo = ctx.measure();
      const k = geo.fontSize / 1000;
      const [, , G, H, T] = geo.letters;
      const at = (L, em) => L.x + em * k;
      // a square: centred on the free space at the foot, as wide as the free space above the foot serifs
      const free = (a, b, aBody, bBody) => ({ c: (a + b) / 2, w: bBody - aBody });
      const s = [
        free(at(G, INK.G.right), at(H, INK.H.left), at(G, INK.G.rightBody), at(H, INK.H.leftBody)),
        free(at(H, INK.H.inLo), at(H, INK.H.inHi), at(H, INK.H.inLoBody), at(H, INK.H.inHiBody)),
        free(at(H, INK.H.right), at(T, INK.T.left), at(H, INK.H.rightBody), at(T, INK.T.leftBody)),
      ];
      sq = s.map((x) => x.c);
      // About half the cap height for the knight (19.1 of the 24 grid), as long as the plinth (14.6) fits every square.
      const room = Math.min(...s.map((x) => x.w)) - 0.012 * geo.fontSize;
      u = Math.max(0.5, Math.min(geo.capHeight * 0.032, room / 14.6));
      const sw = Math.max(1.1, Math.min(1.9, geo.capHeight * 0.0085)); // the hairline, in screen pixels
      body.setAttribute('stroke-width', (sw / u).toFixed(4));
      plinth.setAttribute('stroke-width', (sw / u).toFixed(4));
      // The line: a readable italic in the room under the name, right-aligned under the knight. Where that would
      // reach left of the G (a phone), it runs to the T's edge instead, and shrinks only if it must.
      saySize = Math.max(14, Math.min(24, geo.capHeight * 0.11, geo.floor * 0.6));
      // Measured on a canvas in the line's own face (an SVG text can report a stale length right after a change).
      const serif = getComputedStyle(ctx.word).fontFamily;
      meter.font = `italic 400 ${saySize}px ${serif}`;
      const width = meter.measureText(SAY).width + 0.01 * saySize * (SAY.length - 1);
      const left = at(G, INK.G.left) + 0.1 * geo.fontSize; // never under the gap between the N and the G
      let right = sq[2] + 7.2 * u;
      if (right - width < left) right = at(T, INK.T.right); // the T's right edge: the name's own measure
      if (right - width < left) saySize *= (0.97 * (right - left)) / width; // narrow screens (under 360 px)
      say.setAttribute('font-size', saySize.toFixed(2));
      sayX = right;
      sayY = geo.baseline + (geo.floor + saySize * 0.62) / 2; // centred in the room under the baseline
    };

    // The letters' own offset (the shared rise), so the pieces stand on the baseline as it moves.
    const off = (el, h) => (+gsap.getProperty(el, 'y') || 0) + ((+gsap.getProperty(el, 'yPercent') || 0) / 100) * h;
    const lift = (x) => {
      const pts = [2, 3, 4].map((i) => ({ x: geo.letters[i].cx, v: off(letters[i], geo.letters[i].h) }));
      if (x <= pts[0].x) return pts[0].v;
      for (let i = 1; i < pts.length; i++) {
        if (x <= pts[i].x) return pts[i - 1].v + ((pts[i].v - pts[i - 1].v) * (x - pts[i - 1].x)) / (pts[i].x - pts[i - 1].x);
      }
      return pts[pts.length - 1].v;
    };

    // What the timeline moves: the square (0 to 2), the lift of a step (in grid units), the glow and the line.
    const S = { pos: 0, hop: 0, glow: 0, say: 0 };
    let shown = '';
    const render = () => {
      const p = Math.max(0, Math.min(2, S.pos));
      const i = Math.min(1, Math.floor(p));
      const x = sq[i] + (sq[i + 1] - sq[i]) * (p - i);
      const y = geo.baseline + lift(x) - S.hop * u;
      const t = `translate(${(x - 12 * u).toFixed(2)} ${(y - 21.5 * u).toFixed(2)}) scale(${u.toFixed(4)})`;
      const g = S.glow > 0.004 ? `drop-shadow(0 0 ${Math.max(3, 1.4 * u).toFixed(1)}px rgba(255,255,255,${(0.7 * S.glow).toFixed(3)}))` : 'none';
      const sy = sayY + lift(sayX);
      const st = `${t}|${g}|${S.say.toFixed(3)}|${sy.toFixed(2)}`;
      if (st === shown) return; // nothing moved: write nothing
      shown = st;
      piece.setAttribute('transform', t);
      board.style.filter = g;
      say.setAttribute('x', (sayX + (1 - S.say) * 0.4 * saySize).toFixed(2));
      say.setAttribute('y', sy.toFixed(2));
      say.setAttribute('opacity', S.say.toFixed(3));
    };

    let dead = false;
    const relayout = () => { if (dead) return; layout(); shown = ''; render(); };
    layout();
    gsap.set([body, plinth], { drawSVG: '0%' });
    render();
    const offResize = ctx.onResize(relayout);
    // The line is measured in its own face (the italic), which may land after the upright the host waits for.
    if (document.fonts && document.fonts.load) document.fonts.load(`italic 400 ${Math.round(saySize)}px "Cormorant Garamond"`).then(relayout, () => {});
    // Follow the rise (and any late reflow) while the footer is in view. Cheap: it writes only when something moved.
    // Under reduced motion there is no rise and nothing to follow.
    const offTick = ctx.flags.reduce ? () => {} : ctx.tick(render);

    // One step: a small lift, a carry and a set down.
    const step = (to, dur) => gsap.timeline()
      .to(S, { pos: to, duration: dur, ease: 'power2.inOut' }, 0)
      .to(S, { hop: 2.2, duration: dur * 0.4, ease: 'power2.out' }, 0)
      .to(S, { hop: 0, duration: dur * 0.45, ease: 'power2.in' }, dur * 0.55);

    const tl = gsap.timeline({ paused: true, onUpdate: render })
      // the pawn is drawn in on the first square
      .to([body, plinth], { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut' }, 0)
      .to(body, { attr: { 'fill-opacity': 1 }, duration: 0.5, ease: 'power1.out' }, 0.5)
      .set([body, plinth], { strokeDasharray: 'none' }, 0.95) // drawn: the knight's longer outline must not be cut by the pawn's dash
      .add(step(1, 0.62), 1.15)
      .add(step(2, 0.66), 2.05)
      // the last rank: promoted, and it chooses the knight
      .to(S, { hop: 1.2, duration: 0.3, ease: 'power2.out' }, 2.95)
      .to(S, { glow: 1, duration: 0.35, ease: 'power2.out' }, 2.95)
      .to(body, { morphSVG: { shape: PIECES.knight.outline, shapeIndex: 'auto' }, duration: 0.95, ease: 'power2.inOut' }, 3.05)
      .to(S, { hop: 0, duration: 0.35, ease: 'power2.in' }, 3.8)
      .to(eye, { attr: { opacity: 1 }, duration: 0.3, ease: 'power1.out' }, 3.8)
      .to(S, { glow: 0, duration: 0.8, ease: 'power2.inOut' }, 4.0)
      .to(S, { say: 1, duration: 1, ease: 'power2.out' }, 4.25);

    // The walk starts when the baseline is on screen (play comes when a third of the wordmark shows).
    let started = false, offGate = null;
    const ready = () => ctx.stage.getBoundingClientRect().top + geo.baseline + geo.floor * 0.5 <= window.innerHeight;
    const go = () => {
      if (started) return;
      started = true;
      if (offGate) { offGate(); offGate = null; }
      tl.play(0);
    };

    return {
      play() {
        if (ready()) go();
        else offGate = ctx.tick(() => { if (ready()) go(); });
      },
      pause() { if (started) tl.pause(); },
      resume() { if (started) tl.resume(); },
      still() {
        started = true;
        tl.progress(1).pause(); // the knight on the last square, the eye open, the line in place
        render();
      },
      destroy() {
        dead = true;
        if (offGate) offGate();
        offTick();
        offResize();
        tl.revert();
        board.remove();
        words.remove();
      },
    };
  },
};
