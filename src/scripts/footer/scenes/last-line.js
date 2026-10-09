/* The last line. One hairline draws the footer's last rule. Near the end of the line it steps up onto a plinth and
   draws the B knight without lifting (mane, ear, forelock, nose, jaw, chest; the eye is set as the pen passes it),
   then runs on to the end of the line. While the ink is wet the line is bright; then it settles to the quiet grey,
   a little brighter under the knight. Point at the knight (or tap it) and the pen draws it again.

   Where the knight stands: between the H and the T, tucked under the T's left arm, on the rule. It is the one gap in
   the name with room for a knight on a phone (the floor under the letters is only 26 px there), it is far from the gap
   between N and G (the missing I's place, which this ending leaves alone), far from the swap knight (centred on wide
   screens, at the left on phones) and clear of the back-to-top button. Its size and exact place are fitted to the
   letters' outlines at every width (fit, below), so it never touches the H or the T.

   It keeps the shared base (the rise and the steel). Nothing changes size: the scene hides the footer line's own
   border (a colour) and draws the same line again on a layer behind the letters. The line is a 1 px box at the
   border's own y, so the browser snaps it to the very pixel row the border used (an SVG line would land a row off);
   it is drawn by its clip. The knight is an SVG path drawn with DrawSVG.

   It imports nothing. gsap's path tools come from the host's MotionPathPlugin, and the H's and T's outlines are a
   copy of theirs in letters.js (OUTLINE, at the end). An import of gsap/utils/paths.js, pieces.js or letters.js would
   share that module with the host's chunk or another scene's, and change what every visit downloads (SCENES.md). */

const ID = 'last-line';
const RULE = 0.16; // the footer line's own grey: var(--rule), rgba(255, 255, 255, .16)
const INK = 0.6; // the knight once the ink is dry
// The most the knight may be (ear to rule) for the wordmark's font size on a 390 px phone and at 1440 px (a third
// larger than the prototype's 65 px). The fit makes it smaller where the letters leave less room.
const PHONE = { fs: 93.6, h: 46 };
const DESK = { fs: 345.6, h: 86 };

// Every point of a path, no more than `gap` px apart (a raw path from gsap's stringToRawPath: cubic segments).
function sample(raw, gap = 0.5) {
  const out = [];
  raw.forEach((seg) => {
    for (let i = 0; i + 7 < seg.length; i += 6) {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = seg.slice(i, i + 8);
      const span = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
      const n = Math.max(2, Math.ceil(span / gap));
      for (let j = 0; j <= n; j++) {
        const t = j / n, m = 1 - t;
        const a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, e = t * t * t;
        out.push([a * x0 + b * x1 + c * x2 + e * x3, a * y0 + b * y1 + c * y2 + e * y3]);
      }
    }
  });
  return out;
}

export default {
  id: ID,
  name: 'The last line',
  takesOver: false,

  mount(ctx) {
    const { gsap, footer, stage, letters, flags } = ctx;
    const base = footer.querySelector('.footer__base');
    const idle = () => {};
    if (!base) return { play: idle, pause: idle, resume: idle, still: idle, destroy: idle };
    // gsap's path tools from the host's MotionPathPlugin (not imported: see the top), and placePath (pieces.js) made of them.
    const { stringToRawPath, transformRawPath, rawPathToString } = ctx.plugins.MotionPathPlugin;
    const placePath = (d, k, x = 0, y = 0) => rawPathToString(transformRawPath(stringToRawPath(d), k, 0, 0, k, x, y));

    /* ---------- The knight on the 24 grid: one stroke from the plinth's right end ---------- */
    const KD = ctx.knight.d;
    const z = KD.indexOf('Z');
    const qx = +KD.match(/^M([\d.]+)/)[1]; // where the mane meets the plinth
    const [px, py, sx, ax, ay, bx] = KD.slice(z + 1).match(/[\d.]+/g).map(Number); // the plinth: top line, then foot
    // Onto the plinth at its right end, back along it to the left end, a hair right again over its own ink, and up
    // the mane, round the head and down the chest to the plinth: the knight's whole outline without lifting the pen.
    const STROKE = `M${sx} ${py}H${px}H${qx}${KD.slice(0, z).replace(/^M[\d.]+[ ,][\d.]+/, '')}`;
    const MID = (ax + bx) / 2; // the plinth's centre
    const KPTS = sample(stringToRawPath(STROKE), 0.05);
    const TOP = Math.min(...KPTS.map((p) => p[1])); // the ear's tip
    const TALL = ay - TOP; // ear to rule, in grid units
    const EYE = ctx.knight.eye;

    // The letters the knight stands between, as points on their outlines (1/1000 em, from each span's top-left).
    const OUT = { H: sample(stringToRawPath(OUTLINE.H), 2), T: sample(stringToRawPath(OUTLINE.T), 2) };

    /* ---------- Nodes: the line (two 1 px boxes) and one SVG, behind the letters ---------- */
    ctx.css(`.footer[data-ending="${ID}"] .footer__base{border-top-color:transparent}`);
    // The clip reaches a pixel past the box above and below: it cuts only the line's right end, never its row (a clip
    // edge on the box's fractional top would leave the row part covered, a little dimmer than the border).
    const box = 'position:absolute;height:1px;pointer-events:none;clip-path:inset(-1px 100% -1px 0)';
    // Dry ink below, wet ink above it; the wet fades to show the dry.
    const ruleDry = ctx.make('div', { parent: ctx.underlay, className: 'lastline__rule', attrs: { style: box } });
    const ruleWet = ctx.make('div', { parent: ctx.underlay, className: 'lastline__wet', attrs: { style: `${box};background:#fff` } });
    const STOPS = [0, 0.18, 0.4, 0.62, 0.8, 1, 0.8, 0.62, 0.4, 0.18, 0]; // a soft pool of light under the knight
    const svg = ctx.svg({ layer: 'under', className: 'lastline' });
    const mk = (tag, attrs, parent = svg) => ctx.make(tag, { parent, attrs });
    const line = { fill: 'none', stroke: '#fff', 'stroke-width': 1, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' };
    const dryKnight = mk('g', { opacity: INK });
    const wetKnight = mk('g', {});
    const knight = { dry: mk('path', line, dryKnight), wet: mk('path', line, wetKnight) };
    const eyes = [mk('circle', { fill: '#fff' }, dryKnight), mk('circle', { fill: '#fff' }, wetKnight)];
    const nib = mk('circle', { fill: '#fff', opacity: 0, style: 'filter:drop-shadow(0 0 3px rgba(255,255,255,.85))' });

    /* ---------- Geometry ---------- */
    let geo = null, G = null; // G: { x0, x1, y, bx, s, cx, h, air, box, len, eyeAt }

    // Where the knight fits between the H and the T: the range of plinth centres that keeps it off both letters' ink,
    // row by row, with a pixel to spare above and below. The letters at rest: the line only draws once it is in view,
    // and the rise has ended by then (it ends as the wordmark clears the bottom of the screen). Scrolling back, the H's
    // and T's feet are within a pixel of rest whenever they show, and the knight is behind the letters in any case.
    const fit = (h, y) => {
      const s = h / TALL, k = geo.fontSize / 1000;
      const left = new Map(), right = new Map();
      let minL = Infinity, maxR = -Infinity;
      KPTS.forEach(([u, v]) => {
        const r = Math.floor(y + (v - ay) * s), x = (u - MID) * s;
        if (!left.has(r) || x < left.get(r)) left.set(r, x);
        if (!right.has(r) || x > right.get(r)) right.set(r, x);
        minL = Math.min(minL, x); maxR = Math.max(maxR, x);
      });
      let lo = -Infinity, hi = Infinity;
      const scan = (L, pts, half, take) => pts.forEach(([u, v]) => {
        if (half(u * k, L.w)) return;
        const x = L.x + u * k, r0 = Math.floor(L.y + v * k);
        for (let r = r0 - 1; r <= r0 + 1; r++) take(r, x);
      });
      scan(geo.letters[3], OUT.H, (x, w) => x < w / 2, (r, x) => { if (left.has(r)) lo = Math.max(lo, x - left.get(r)); });
      scan(geo.letters[4], OUT.T, (x, w) => x > w / 2, (r, x) => { if (right.has(r)) hi = Math.min(hi, x - right.get(r)); });
      // No row in common (a floor deep enough for the whole knight): stand in the gap between the two boxes.
      if (!Number.isFinite(lo)) lo = geo.letters[3].x + geo.letters[3].w - minL;
      if (!Number.isFinite(hi)) hi = geo.letters[4].x - maxR;
      return { s, lo, hi, air: (hi - lo) / 2 - 0.5 }; // less half the hairline
    };

    const layout = () => {
      geo = ctx.measure();
      const sr = stage.getBoundingClientRect(), br = base.getBoundingClientRect();
      const x0 = br.left - sr.left, x1 = br.right - sr.left;
      const y = geo.baseTop + 0.5; // the centre of the footer line's own pixel row
      const fs = geo.fontSize;
      // The knight's height: as tall as 46 px on a 390 px phone and 86 px at 1440 px, but never so tall that it would
      // touch the H or the T (on a 390 px phone the gap between their feet allows 40 px).
      let h = Math.min(fs * (PHONE.h / PHONE.fs), PHONE.h + (fs - PHONE.fs) * ((DESK.h - PHONE.h) / (DESK.fs - PHONE.fs)));
      const want = Math.max(2, fs * 0.02); // the least air between the knight and a letter
      let f = fit(h, y);
      while (f.air < want && h > fs * 0.3) { h -= 0.5; f = fit(h, y); }
      const { s } = f;
      const cx = (f.lo + f.hi) / 2;
      const tx = cx - MID * s, ty = y - ay * s;
      const X = (u) => tx + u * s, Y = (v) => ty + v * s;

      // The line: exactly the border's box (its top, its left and right ends).
      [ruleDry, ruleWet].forEach((n) => Object.assign(n.style, { left: `${x0}px`, top: `${geo.baseTop}px`, width: `${x1 - x0}px` }));
      knight.dry.setAttribute('d', placePath(STROKE, s, tx, ty));
      knight.wet.setAttribute('d', knight.dry.getAttribute('d'));
      eyes.forEach((e) => {
        e.setAttribute('cx', X(EYE.cx).toFixed(2));
        e.setAttribute('cy', Y(EYE.cy).toFixed(2));
        e.setAttribute('r', Math.max(1.2, EYE.r * s).toFixed(2));
      });
      nib.setAttribute('r', Math.min(2.4, Math.max(1.6, s * 0.5)).toFixed(2));

      // The pool of light under the knight: the footer line's grey, rising to .42 under the plinth.
      const half = (bx - ax) * s * 1.6, grey = (a) => `rgba(255,255,255,${(RULE + (0.42 - RULE) * a).toFixed(3)})`;
      const pool = STOPS.map((a, i) => `${grey(a)} ${(cx - half + (i / (STOPS.length - 1)) * 2 * half - x0).toFixed(1)}px`);
      ruleDry.style.background = `linear-gradient(90deg,${grey(0)} 0px,${pool.join(',')},${grey(0)} 100%)`;

      // The knight's length, and where along it the pen passes nearest the eye.
      const len = knight.dry.getTotalLength();
      const ex = X(EYE.cx), ey = Y(EYE.cy);
      let best = Infinity, eyeAt = 0.6;
      for (let i = 0; i <= 240; i++) {
        const q = knight.dry.getPointAtLength((len * i) / 240);
        const d = Math.hypot(q.x - ex, q.y - ey);
        if (d < best) { best = d; eyeAt = i / 240; }
      }
      const w = (bx - ax) * s, pad = Math.max(10, (48 - w) / 2);
      G = {
        x0, x1, y, bx: X(bx), s, cx, h, air: f.air, len, eyeAt,
        box: { l: X(ax) - pad, r: X(bx) + pad, t: Y(TOP) - pad, b: y + pad },
      };
      svg.setAttribute('data-fit', `h ${h.toFixed(1)} cx ${cx.toFixed(1)} air ${f.air.toFixed(1)}`);
    };
    layout();

    /* ---------- Time ---------- */
    const nibAt = (x, y) => { nib.setAttribute('cx', x.toFixed(2)); nib.setAttribute('cy', y.toFixed(2)); };
    const penOnKnight = (p) => { const q = knight.dry.getPointAtLength(G.len * p); nibAt(q.x, q.y); };
    // The line drawn up to x (stage px): its clip opens from the left, and the pen sits at its end.
    const rule = { x: 0 };
    const drawRule = () => {
      const cut = `inset(-1px ${Math.max(0, G.x1 - rule.x).toFixed(2)}px -1px 0)`;
      ruleDry.style.clipPath = cut; ruleWet.style.clipPath = cut;
      nibAt(rule.x, G.y);
    };
    // When, in a stroke of `dur` seconds eased by `ease`, the pen has drawn `frac` of it.
    const timeAt = (ease, frac, dur) => {
      const fn = gsap.parseEase(ease);
      let a = 0, b = 1;
      for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (fn(m) < frac) a = m; else b = m; }
      return a * dur;
    };
    // The pen round the knight: its path drawn by DrawSVG, the pen at the drawn end.
    const stroke = (tl, dur, ease, at, again) => {
      const pen = { p: 0 };
      tl.fromTo([knight.dry, knight.wet], { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: dur, ease, immediateRender: !again }, at);
      tl.fromTo(pen, { p: 0 }, {
        p: 1, duration: dur, ease, immediateRender: false,
        onStart: () => penOnKnight(0), onUpdate: () => penOnKnight(pen.p),
      }, '<');
      return tl.recent().startTime();
    };

    // The pen's pace: quick along the rule, slower where it rises, so the drawing is seen.
    const pace = () => {
      const phone = G.s < 3;
      return {
        in: Math.min(1.5, Math.max(0.85, 0.5 + (G.bx - G.x0) / 1300)),
        knight: phone ? 2.5 : 2.8,
        out: Math.min(0.6, Math.max(0.3, 0.2 + (G.x1 - G.bx) / 600)),
      };
    };
    let done = false;
    const build = () => {
      const d = pace();
      const tl = gsap.timeline({ paused: true, onComplete: () => { done = true; } });
      tl.fromTo(nib, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' }, 0);
      tl.fromTo(rule, { x: G.x0 }, { x: G.bx, duration: d.in, ease: 'power2.inOut', onUpdate: drawRule }, 0.05); // to the knight's foot
      const k = stroke(tl, d.knight, 'sine.inOut', '>0.08'); // a breath, then up onto the plinth
      tl.fromTo(eyes, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, k + timeAt('sine.inOut', G.eyeAt, d.knight) + 0.1);
      // Down off the plinth, and on to the end of the line.
      tl.fromTo(rule, { x: G.bx }, { x: G.x1, duration: d.out, ease: 'power2.out', onUpdate: drawRule, immediateRender: false }, k + d.knight + 0.04);
      tl.to(nib, { opacity: 0, duration: 0.35, ease: 'power1.in' }, '>-0.12');
      // The ink dries: the line falls back to the footer's grey, the knight to a quiet one.
      tl.fromTo([ruleWet, wetKnight], { opacity: 1 }, { opacity: 0, duration: 1.5, ease: 'power2.inOut' }, '>-0.25');
      return tl;
    };
    // The knight again, from the plinth up (on hover or a tap, once the line is drawn).
    const buildAgain = () => {
      const dur = pace().knight * 0.8;
      const tl = gsap.timeline({ paused: true });
      tl.set(wetKnight, { opacity: 1, immediateRender: false }, 0);
      tl.set(eyes, { scale: 0, transformOrigin: '50% 50%', immediateRender: false }, 0);
      tl.fromTo(nib, { opacity: 0 }, { opacity: 1, duration: 0.15, immediateRender: false }, 0);
      const k = stroke(tl, dur, 'sine.inOut', 0.02, true);
      tl.to(eyes, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, k + timeAt('sine.inOut', G.eyeAt, dur) + 0.1);
      tl.to(nib, { opacity: 0, duration: 0.3, ease: 'power1.in' }, k + dur - 0.05);
      tl.to(wetKnight, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, '>-0.1');
      return tl;
    };

    let tl = build();
    let again = buildAgain();
    let armed = false, started = false, paused = false, seen = false;
    const go = () => {
      if (!armed || started || paused || !seen) return;
      started = true;
      tl.play(0);
    };
    // The line draws when it comes into view, not before: play() arms it, the footer line's arrival starts it.
    const io = ctx.observe(new IntersectionObserver((es) => {
      seen = es[es.length - 1].isIntersecting;
      go();
    }, { rootMargin: '0px 0px -24px 0px' }));
    io.observe(base);

    /* ---------- Point at the knight, or tap it: the pen draws it again ---------- */
    const over = (x, y) => !!G && x >= G.box.l && x <= G.box.r && y >= G.box.t && y <= G.box.b;
    let hovering = false;
    const redraw = () => {
      if (!done || paused || flags.reduce || again.isActive()) return;
      again.restart();
    };
    ctx.onPointer(({ type, x, y, pointerType, interactive }) => {
      if (interactive) return; // a link or the swap knight
      const on = over(x, y);
      if (pointerType === 'mouse') {
        if (type === 'pointermove' && on && !hovering) redraw();
        hovering = on && type !== 'pointerleave';
      } else if (type === 'pointerup' && on) {
        redraw();
      }
    });

    /* ---------- The steel: the dry knight catches the hall's light as it passes (the T's light, read each frame) ---------- */
    const T = letters[4];
    let shine = -1;
    ctx.tick(() => {
      if (!done || again.isActive()) return;
      const gx = parseFloat(T.style.getPropertyValue('--gx'));
      const ga = parseFloat(T.style.getPropertyValue('--ga'));
      let v = 0;
      // The hall clamps --gx to -60%..160% of the letter: at either end the light is somewhere far off, not here.
      if (Number.isFinite(gx) && Number.isFinite(ga) && gx > -59.5 && gx < 159.5 && G) {
        const L = geo.letters[4];
        const lx = L.x + (gx / 100) * L.w; // where the light is, along the line
        const w = (bx - ax) * G.s * 2.2;
        v = ga * Math.exp(-(((lx - G.cx) / w) ** 2));
      }
      const o = +(INK + (1 - INK) * Math.min(1, v * 1.15)).toFixed(3);
      if (o !== shine) { shine = o; dryKnight.setAttribute('opacity', o); }
    });

    /* ---------- A new width: draw the line again at its new size, in the same state ---------- */
    const offResize = ctx.onResize(ctx.add(() => {
      const wasDone = done || tl.progress() === 1, running = started && !wasDone;
      const p = tl.progress();
      tl.kill(); again.kill();
      layout();
      tl = build();
      again = buildAgain();
      if (wasDone) {
        tl.progress(1).pause();
        gsap.set([knight.dry, knight.wet], { drawSVG: '0% 100%' });
        done = true;
      } else if (running) {
        tl.progress(p);
        if (!paused) tl.play();
      }
    }));

    return {
      play() { armed = true; go(); },
      pause() {
        paused = true;
        tl.pause();
        if (again.isActive()) again.pause();
      },
      resume() {
        paused = false;
        if (started && tl.progress() < 1) tl.resume();
        if (again.progress() > 0 && again.progress() < 1) again.resume();
        go();
      },
      still() {
        // Reduced motion: the finished drawing at once. No pen, no redraw, no light.
        armed = started = true;
        tl.progress(1).pause();
        done = true;
      },
      destroy() {
        offResize();
        tl.kill();
        again.kill();
        io.disconnect();
        svg.remove();
      },
    };
  },
};

/* The H and the T as outlines: LETTERS.H.d and LETTERS.T.d in letters.js, copied (1/1000 em, y down, from the top-left
   of each letter's span). Keep them in step with letters.js. */
const OUTLINE = {
  H: 'M562 156.5Q562 127.5 556.5 112.5Q551 97.5 532.5 91.5Q514 85.5 476 85.5Q473 85.5 473 79.5Q473 73.5 476 73.5Q500 73.5 531.5 75Q563 76.5 602 76.5Q636 76.5 668.5 75Q701 73.5 725 73.5Q728 73.5 728 79.5Q728 85.5 725 85.5Q690 85.5 671.5 91Q653 96.5 647 111Q641 125.5 641 154.5V617.5Q641 646.5 647 661.5Q653 676.5 671.5 681.5Q690 686.5 725 686.5Q728 686.5 728 692.5Q728 698.5 725 698.5Q701 698.5 668.5 697.5Q636 696.5 602 696.5Q563 696.5 531.5 697.5Q500 698.5 476 698.5Q473 698.5 473 692.5Q473 686.5 476 686.5Q514 686.5 532.5 681.5Q551 676.5 556.5 661.5Q562 646.5 562 617.5V384.5H197V617.5Q197 646.5 203 661.5Q209 676.5 228 681.5Q247 686.5 284 686.5Q286 686.5 286 692.5Q286 698.5 284 698.5Q258 698.5 227 697.5Q196 696.5 156 696.5Q122 696.5 90 697.5Q58 698.5 33 698.5Q31 698.5 31 692.5Q31 686.5 33 686.5Q69 686.5 87.5 681.5Q106 676.5 112 661.5Q118 646.5 118 617.5V154.5Q118 125.5 112 111Q106 96.5 88 91Q70 85.5 35 85.5Q32 85.5 32 79.5Q32 73.5 35 73.5Q60 73.5 91 75Q122 76.5 156 76.5Q196 76.5 227.5 75Q259 73.5 284 73.5Q286 73.5 286 79.5Q286 85.5 284 85.5Q247 85.5 228.5 91.5Q210 97.5 203.5 112.5Q197 127.5 197 156.5V361.5H562Z',
  T: 'M199 93.5Q137 93.5 102 128Q67 162.5 50 238.5Q49 240.5 43.5 240.5Q38 240.5 38 237.5Q40 224.5 42.5 200.5Q45 176.5 47 148.5Q49 120.5 50.5 94.5Q52 68.5 52 51.5Q52 46.5 58 46.5Q64 46.5 64 51.5Q64 61.5 74 66Q84 70.5 97 72Q110 73.5 119 73.5Q205 76.5 320 76.5Q390 76.5 432 75Q474 73.5 513 73.5Q547 73.5 565.5 69Q584 64.5 589 48.5Q590 44.5 595.5 44.5Q601 44.5 601 48.5Q599 63.5 597.5 90.5Q596 117.5 594.5 146.5Q593 175.5 592 200.5Q591 225.5 591 237.5Q591 240.5 585.5 240.5Q580 240.5 580 237.5Q573 159.5 540 126.5Q507 93.5 442 93.5Q407 93.5 389.5 98Q372 102.5 366.5 115.5Q361 128.5 361 156.5V617.5Q361 646.5 367.5 661.5Q374 676.5 393.5 681.5Q413 686.5 454 686.5Q456 686.5 456 692.5Q456 698.5 454 698.5Q427 698.5 393.5 697.5Q360 696.5 320 696.5Q282 696.5 248.5 697.5Q215 698.5 187 698.5Q184 698.5 184 692.5Q184 686.5 187 686.5Q226 686.5 246.5 681.5Q267 676.5 274 661.5Q281 646.5 281 617.5V154.5Q281 127.5 275 114Q269 100.5 251 97Q233 93.5 199 93.5Z',
};
