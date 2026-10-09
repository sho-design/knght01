/* The lookout. The approved hairline B knight stands guard on the crossbar of the H, inside its upper counter.
   It rises with the letter and its hairline catches the same steel as the letter around it.
   On arrival it draws in and blinks once, slowly. From then on it keeps watch: the whole head turns (a mirror flip
   about the plinth) toward the side the pointer, or the last tap, is on, and the eye looks there. When sho@knght.com
   is hovered or focused, it turns to look at it. With nothing to watch it faces out again. It never moves on its own.
   Reduced motion: the knight stands in the H, facing out, eye open. Nothing moves and nothing listens. */

const AXIS = 11.9;            // the plinth's centre on the 24 grid: the head turns about it, the plinth stays put
const EAR = 2.4, FOOT = 21.5; // the knight's top and its lowest line on the grid (19.1 tall)
const WIDE = 14.6;            // the head and plinth across, on the grid
const REACH = [1.15, 0.7];    // how far the eye may travel inside the head, in grid units (x, y)
const TILT = (100 * Math.PI) / 180; // the steel's angle: linear-gradient(100deg, ...) in site.css
// The steel on the letters (.has-hall .footer__word .sheen): grey stops at 0, gx - 22%, gx, gx + 22%, 100%.
const STEEL = [[0, 156, 0], [-22, 220, 1], [0, 255, 1], [22, 220, 1], [100, 143, 0]]; // [position, grey, follows gx]
const STOPS = 7;
const INTERACTIVE = 'a,button,input,select,textarea,label,summary,[tabindex]';
let uid = 0;

export default {
  id: 'lookout',
  name: 'The lookout', // the live region says "The lookout. Ending n of N."
  takesOver: false,

  mount(ctx) {
    const { gsap, stage, letters, footer, flags } = ctx;
    const H = letters[3];
    const email = footer.querySelector('.footer__contact a[href^="mailto:"]');
    let geo = ctx.measure();

    /* ---------- The knight, in stage coordinates on the overlay ---------- */
    const i = ctx.knight.d.indexOf('Z');
    const HEAD = ctx.knight.d.slice(0, i + 1); // the head; the plinth's two lines follow it in the same path
    const PLINTH = ctx.knight.d.slice(i + 1).split('M').filter(Boolean).map((p) => `M${p}`); // each drawn from its middle
    const id = `lookout-steel-${++uid}`;
    const svg = ctx.svg({ className: 'lookout' });
    const defs = ctx.make('defs', { parent: svg });
    // A: the steel in the knight's own space (the plinth). B: the same steel seen through the head's turn.
    const steelA = ctx.make('linearGradient', { parent: defs, attrs: { id: `${id}-a`, gradientUnits: 'userSpaceOnUse' } });
    const stops = Array.from({ length: STOPS }, () => ctx.make('stop', { parent: steelA, attrs: { offset: '0', 'stop-color': 'rgb(220,220,220)' } }));
    const steelB = ctx.make('linearGradient', { parent: defs, attrs: { id: `${id}-b`, href: `#${id}-a` } });
    const line = { fill: 'none', 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    const post = ctx.make('g', { parent: svg, className: 'lookout__post' });
    const plinth = PLINTH.map((d) => ctx.make('path', { parent: post, attrs: { ...line, d, stroke: `url(#${id}-a)` } }));
    const head = ctx.make('g', { parent: post, className: 'lookout__head' });
    const outline = ctx.make('path', { parent: head, attrs: { ...line, d: HEAD, stroke: `url(#${id}-b)` } });
    const eye = ctx.make('circle', { parent: head, attrs: { cx: ctx.knight.eye.cx, cy: ctx.knight.eye.cy, r: ctx.knight.eye.r, fill: `url(#${id}-b)` } });
    const strokes = [...plinth, outline];

    /* ---------- Where it stands: on the crossbar, in the middle of the upper counter ---------- */
    // Read the counter from the H as drawn (Cormorant, or any fallback serif), so it always stands on the real bar.
    const scan = () => {
      const at = geo.letters[3];
      const cs = getComputedStyle(H);
      const d = 2, w = Math.ceil(at.w) + 4, h = Math.ceil(at.h);
      if (!w || !h) return null;
      try {
        const cv = document.createElement('canvas');
        cv.width = w * d; cv.height = h * d;
        const c = cv.getContext('2d', { willReadFrequently: true });
        c.scale(d, d);
        c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        c.fillText('H', 0, geo.baseline - at.y);
        const px = c.getImageData(0, 0, w * d, h * d).data, W = w * d, R = h * d;
        const ink = (x, y) => px[(y * W + x) * 4 + 3] > 120;
        let top = -1, l = W, r = -1;
        for (let y = 0; y < R; y++) for (let x = 0; x < W; x++) if (ink(x, y)) { if (top < 0) top = y; if (x < l) l = x; if (x > r) r = x; }
        if (top < 0) return null;
        const cx = Math.round((l + r) / 2);
        let bar = top;
        while (bar < R && !ink(cx, bar)) bar++; // down the middle to the crossbar
        if (bar >= R || bar - top < 6 * d) return null;
        const row = Math.round((top + bar) / 2);
        let il = cx, ir = cx;
        while (il > 0 && !ink(il, row)) il--;
        while (ir < W - 1 && !ink(ir, row)) ir++;
        return { top: top / d, bar: bar / d, il: (il + 1) / d, ir: ir / d };
      } catch (e) {
        return null;
      }
    };

    const at = { X: 0, Y: 0, k: 1, s: 24, sw: 1, reach: REACH };
    let lift = 0;
    const layout = () => {
      const L = geo.letters[3];
      const em = geo.fontSize / 1000;
      // Cormorant's own counter (letters.js), if the letter cannot be read.
      const c = scan() || { top: 73.5 * em, bar: 361.5 * em, il: 197 * em, ir: 562 * em };
      const room = c.bar - c.top, span = c.ir - c.il;
      const s = Math.min((room * 0.8) / ((FOOT - EAR) / 24), (span * 0.82) / (WIDE / 24));
      const k = s / 24;
      const sw = s < 48 ? 1 : 1.3;
      at.s = s; at.k = k; at.sw = sw;
      at.X = L.x + (c.il + c.ir) / 2 - AXIS * k;
      at.Y = L.y + c.bar - FOOT * k - sw / 2 - Math.max(1, s * 0.012);
      strokes.forEach((p) => p.setAttribute('stroke-width', sw));
      // The eye stays legible on a phone, where the knight is small; a bigger eye has less room to move.
      const r = Math.max(ctx.knight.eye.r, 1.1 / k);
      eye.setAttribute('r', r.toFixed(3));
      at.reach = [REACH[0] - (r - 0.6) * 0.6, REACH[1] - (r - 0.6) * 0.5];
      // The steel's gradient line over the H's box (as CSS draws a 100deg gradient), in the knight's own units.
      const cx = L.x + L.w / 2, cy = L.y + L.h / 2;
      const dx = Math.sin(TILT), dy = -Math.cos(TILT);
      const len = Math.abs(L.w * dx) + Math.abs(L.h * dy);
      const to = (x, y) => [((x - at.X) / k).toFixed(3), ((y - at.Y) / k).toFixed(3)];
      const [x1, y1] = to(cx - (dx * len) / 2, cy - (dy * len) / 2);
      const [x2, y2] = to(cx + (dx * len) / 2, cy + (dy * len) / 2);
      Object.entries({ x1, y1, x2, y2 }).forEach(([a, v]) => steelA.setAttribute(a, v));
    };

    // The base rise moves the H; the knight goes with it.
    const liftOf = () => {
      const L = geo.letters[3];
      return (+gsap.getProperty(H, 'y') || 0) + ((+gsap.getProperty(H, 'yPercent') || 0) / 100) * L.h;
    };
    const place = () => {
      post.setAttribute('transform', `translate(${at.X.toFixed(2)} ${(at.Y + lift).toFixed(2)}) scale(${at.k.toFixed(5)})`);
    };

    // The steel: the same stops as the letter, at the hall light's place on it (--gx, set by site.js).
    let gxNow = NaN;
    const gxOf = () => {
      const v = parseFloat(H.style.getPropertyValue('--gx'));
      return Number.isFinite(v) ? v : 50;
    };
    const paintSteel = (gx) => {
      gxNow = gx;
      // CSS rules: a stop placed before an earlier one moves up to it. Then sample the result inside 0 to 100%.
      const pts = STEEL.map(([p, g, f]) => [f ? gx + p : p, g]);
      for (let n = 1; n < pts.length; n++) pts[n][0] = Math.max(pts[n][0], pts[n - 1][0]);
      const grey = (p) => {
        let n = -1;
        for (let m = 0; m < pts.length; m++) if (pts[m][0] <= p) n = m;
        if (n < 0) return pts[0][1];
        if (n === pts.length - 1) return pts[n][1];
        const [p0, g0] = pts[n], [p1, g1] = pts[n + 1];
        return p1 === p0 ? g1 : g0 + ((g1 - g0) * (p - p0)) / (p1 - p0);
      };
      const out = [[0, grey(0)], ...pts.filter(([p]) => p > 0 && p < 100), [100, grey(100)]];
      while (out.length < STOPS) out.push(out[out.length - 1]);
      stops.forEach((s, n) => {
        const [p, g] = out[n];
        const v = Math.round(g);
        s.setAttribute('offset', (p / 100).toFixed(4));
        s.setAttribute('stop-color', `rgb(${v},${v},${v})`);
      });
    };

    /* ---------- The head's turn and the eye, drawn from two small records ---------- */
    const turnState = { f: 1 }; // 1 faces right (as drawn), -1 faces left
    const eyeState = { x: 0, y: 0, b: 1, o: 0 }; // look offset (grid units, in the head), lid (1 open), opacity
    const paintHead = () => {
      let f = turnState.f;
      if (Math.abs(f) < 0.01) f = f < 0 ? -0.01 : 0.01;
      head.setAttribute('transform', `matrix(${f.toFixed(4)} 0 0 1 ${(AXIS * (1 - f)).toFixed(4)} 0)`);
      // The head's steel is the knight's steel seen back through the turn, so the light stays where it is.
      steelB.setAttribute('gradientTransform', `matrix(${(1 / f).toFixed(4)} 0 0 1 ${(AXIS * (1 - 1 / f)).toFixed(4)} 0)`);
    };
    const paintEye = () => {
      const { cx, cy } = ctx.knight.eye;
      eye.setAttribute('transform', `translate(${(cx + eyeState.x).toFixed(3)} ${(cy + eyeState.y).toFixed(3)}) scale(1 ${Math.max(0.06, eyeState.b).toFixed(3)}) translate(${-cx} ${-cy})`);
      eye.setAttribute('opacity', eyeState.o.toFixed(3));
    };
    const turn = gsap.quickTo(turnState, 'f', { duration: 0.55, ease: 'power2.inOut', onUpdate: paintHead });
    const eyeX = gsap.quickTo(eyeState, 'x', { duration: 0.5, ease: 'power3.out', onUpdate: paintEye });
    const eyeY = gsap.quickTo(eyeState, 'y', { duration: 0.5, ease: 'power3.out', onUpdate: paintEye });

    const paintAll = () => {
      lift = liftOf();
      place();
      paintSteel(gxOf());
      paintHead();
      paintEye();
    };
    layout();
    paintAll();

    /* ---------- Arrival: it draws in on the crossbar, the eye opens, one slow blink ---------- */
    let arrived = false, dirty = true;
    const watch = () => { arrived = true; dirty = true; svg.setAttribute('data-watch', ''); }; // QA reads it: the arrival is over
    const tl = gsap.timeline({ paused: true, onComplete: watch })
      .fromTo(plinth, { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: 0.7, ease: 'power2.out', stagger: 0.1 }, 0)
      .fromTo(outline, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.5, ease: 'power2.inOut' }, 0.25)
      .fromTo(eyeState, { o: 0 }, { o: 1, duration: 0.45, ease: 'power1.out', onUpdate: paintEye }, 1.45)
      .set(strokes, { strokeDasharray: 'none', strokeDashoffset: 0 }) // whole lines from here: the turn changes their length on screen
      .to(eyeState, { b: 0.06, duration: 0.34, ease: 'power2.in', onUpdate: paintEye }, 2.75)
      .to(eyeState, { b: 1, duration: 0.5, ease: 'power2.out', onUpdate: paintEye }, '>+0.12');

    /* ---------- Watching: where to look, decided only when something changed ---------- */
    let side = 1, pointer = null, hovered = false, focused = false, lastType = 'mouse';
    const aim = { x: 0, y: 0 };
    const eyeTo = (x, y) => {
      if (Math.abs(x - aim.x) < 0.02 && Math.abs(y - aim.y) < 0.02) return;
      aim.x = x; aim.y = y;
      eyeX(x); eyeY(y);
    };
    const look = () => {
      let tx, ty;
      if ((hovered || focused) && email) {
        const b = email.getBoundingClientRect();
        tx = b.left + b.width / 2; ty = b.top + b.height / 2;
      } else if (pointer) {
        tx = pointer.x; ty = pointer.y;
      }
      let want = side;
      const r = stage.getBoundingClientRect();
      const axis = r.left + at.X + AXIS * at.k;
      if (tx == null) want = 1; // nothing to watch: it faces out again, eye at rest
      else if (tx > axis + at.s * 0.3) want = 1;
      else if (tx < axis - at.s * 0.3) want = -1; // between the two: it holds, and looks you in the face
      if (want !== side) { side = want; turn(side); }
      if (tx == null) { eyeTo(0, 0); return; }
      const { cx, cy } = ctx.knight.eye;
      const ex = r.left + at.X + (AXIS + (cx - AXIS) * side) * at.k;
      const ey = r.top + at.Y + lift + cy * at.k;
      const dx = tx - ex, dy = ty - ey, dist = Math.hypot(dx, dy);
      if (dist < 1) { eyeTo(0, 0); return; }
      const near = Math.min(1, dist / (at.s * 0.9)); // close to the knight it looks you in the face
      eyeTo((dx / dist) * near * at.reach[0] * side, (dy / dist) * near * at.reach[1]);
    };

    const offs = [];
    if (!flags.reduce) {
      // Each frame while it can be seen: follow the rise and the light, and look again if something moved.
      offs.push(ctx.tick(() => {
        const l = liftOf();
        if (l !== lift) { lift = l; place(); dirty = true; }
        const gx = gxOf();
        if (Math.abs(gx - gxNow) > 0.05) paintSteel(gx);
        if (arrived && dirty) { dirty = false; look(); }
      }));
      const interactive = (t) => !!(t && t.closest && t.closest(INTERACTIVE));
      offs.push(
        ctx.on(window, 'pointerdown', (e) => { lastType = e.pointerType; }),
        // A mouse or a pen is watched where it hovers; a finger, where it last tapped (never a press on a link or the knight).
        ctx.on(window, 'pointermove', (e) => {
          if (e.pointerType === 'touch') return;
          lastType = e.pointerType;
          pointer = { x: e.clientX, y: e.clientY };
          dirty = true;
        }),
        ctx.on(window, 'pointerup', (e) => {
          if (e.pointerType === 'mouse' || interactive(e.target)) return;
          pointer = { x: e.clientX, y: e.clientY };
          dirty = true;
        }),
        ctx.on(document, 'mouseout', (e) => { if (!e.relatedTarget) { pointer = null; dirty = true; } }),
        ctx.on(window, 'scroll', () => { if (pointer || hovered || focused) dirty = true; }),
      );
      if (email) {
        offs.push(
          ctx.on(email, 'pointerenter', (e) => { if (e.pointerType !== 'touch') { hovered = true; dirty = true; } }),
          ctx.on(email, 'pointerleave', () => { hovered = false; dirty = true; }),
          // A keyboard's focus, or a finger's; a mouse click's focus counts only while it hovers.
          ctx.on(email, 'focus', () => {
            let ring = false;
            try { ring = email.matches(':focus-visible'); } catch (e) { ring = true; }
            focused = ring || lastType !== 'mouse';
            dirty = true;
          }),
          ctx.on(email, 'blur', () => { focused = false; dirty = true; }),
        );
      }
    }

    const offResize = ctx.onResize((next) => {
      geo = next;
      layout();
      paintAll();
      dirty = true;
    });

    return {
      play: () => tl.play(0),
      pause: () => tl.pause(),
      resume: () => tl.resume(),
      still: () => {
        // Drawn, eye open, facing out. Ticks never run here, so paint it once.
        tl.progress(1).pause();
        watch();
        turnState.f = 1;
        Object.assign(eyeState, { x: 0, y: 0, b: 1, o: 1 });
        paintAll();
      },
      destroy: () => {
        offResize();
        offs.forEach((off) => off());
        tl.revert();
        gsap.killTweensOf([turnState, eyeState]);
        svg.remove();
      },
    };
  },
};
