/* The guard. The approved hairline B knight keeps watch from the top of the H, on its right stem.
   It comes up from behind the letter head first: the ears, then the eye over the edge, a look each way, then it
   stands. Come close and it ducks behind the letter. Step back and it peeks over the edge first; it stands again only
   when you are well away. Reach for sho@knght.com and it turns to look at it. Left alone, it makes one knight's move:
   it is lifted, carried two letters over and set down on the N, then it glances back at the H. The next quiet spell
   takes it home, and there it stays: one move out and one home per visit, never a patrol.

   It lands on the top of the N's left stem, as far from the gap between the N and the G as the N allows: that gap
   belongs to Candle. The carry passes over it and never stops there.

   Drawn on the overlay and clipped at the letters' top edge, so whatever is below the edge is behind the letter.
   Lifted or standing, it stays in the room between the links and the letters. The letters are never touched.
   Phone: a tap near it makes it duck, and a tap beside the email makes it turn to look. A press on the email itself
   belongs to the link and is never read.
   Reduced motion: it stands on the H, facing out, eye at rest. Nothing moves and nothing listens. */

const AXIS = 11.9;            // the plinth's centre on the 24 grid: it turns about it and stands on it
const EAR = 2.4, FOOT = 21.5; // the knight's top and its lowest line on the grid
const BROW = 10.3;            // where the edge crosses the head when it peeks: just under the eye (8.4)
const REACH = [1.15, 0.7];    // how far the eye may travel inside the head, in grid units (x, y)
const TILT = 5;               // degrees: the head leans in a little while it peeks
const QUIET = 7;              // seconds left alone before it moves
// The posts: the top of the H's right stem (home), and the top of the N's left stem, two letters over.
// x and top in 1/1000 em from the letter's span (Cormorant 500), used when the drawn letter cannot be read.
const POSTS = [
  { ch: 'H', side: 'right', x: 600.5, top: 73.5 },
  { ch: 'N', side: 'left', x: 111, top: 73.5 },
];
// The steel on the letters (.has-hall .footer__word .sheen): grey stops at 0, gx - 22%, gx, gx + 22%, 100%.
const STEEL = [[0, 156, 0], [-22, 220, 1], [0, 255, 1], [22, 220, 1], [100, 143, 0]];
const INTERACTIVE = 'a,button,input,select,textarea,label,summary,[tabindex]';
let uid = 0;

export default {
  id: 'guard',
  name: 'The guard', // the live region says "The guard. Ending n of N."
  takesOver: false,

  mount(ctx) {
    const { gsap, stage, letters, footer, flags } = ctx;
    const email = footer.querySelector('.footer__contact a[href^="mailto:"]');
    let geo = ctx.measure();

    /* ---------- Nodes: the edge (clipped), the body on it, the lean, the head that turns, the eye ---------- */
    const id = `guard-edge-${++uid}`;
    const svg = ctx.svg({ className: 'guard' });
    const defs = ctx.make('defs', { parent: svg });
    const clip = ctx.make('clipPath', { parent: defs, attrs: { id, clipPathUnits: 'userSpaceOnUse' } });
    const wall = ctx.make('rect', { parent: clip, attrs: { x: -40, y: -4000, width: 100, height: 4000 } }); // all above the edge
    const edgeG = ctx.make('g', { parent: svg, attrs: { 'clip-path': `url(#${id})` } });
    const body = ctx.make('g', { parent: edgeG });
    const lean = ctx.make('g', { parent: body });
    const head = ctx.make('g', { parent: lean });
    const line = { fill: 'none', stroke: '#e6e6e6', 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    // The head turns; the plinth stays put under it, as a piece's round base would.
    const cut = ctx.knight.d.indexOf('Z') + 1;
    const plinth = ctx.make('path', { parent: lean, attrs: { ...line, d: ctx.knight.d.slice(cut) } });
    const outline = ctx.make('path', { parent: head, attrs: { ...line, d: ctx.knight.d.slice(0, cut) } });
    const eye = ctx.make('circle', { parent: head, attrs: { cx: ctx.knight.eye.cx, cy: ctx.knight.eye.cy, r: ctx.knight.eye.r, fill: '#e6e6e6' } });

    /* ---------- Where it stands: read from the letters as drawn, so it stands on the real edge in any serif ---------- */
    const scan = (L, side) => {
      const cs = getComputedStyle(L.el);
      const d = 2, w = Math.ceil(L.w) + 4, h = Math.ceil(L.h);
      if (!w || !h) return null;
      try {
        const cv = document.createElement('canvas');
        cv.width = w * d; cv.height = h * d;
        const c = cv.getContext('2d', { willReadFrequently: true });
        c.scale(d, d);
        c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        c.fillText(L.ch.trim(), 0, geo.baseline - L.y);
        const px = c.getImageData(0, 0, w * d, h * d).data, W = w * d, R = h * d;
        const ink = (x, y) => px[(y * W + x) * 4 + 3] > 120;
        let top = -1;
        for (let y = 0; y < R && top < 0; y++) for (let x = 0; x < W; x++) if (ink(x, y)) { top = y; break; }
        if (top < 0) return null;
        // The runs of ink a little under the top are the serifs (their tops dip, so not the very first row).
        // The post is the middle of the outer one on its side.
        const row = Math.min(R - 1, top + Math.max(2, Math.round(parseFloat(cs.fontSize) * 0.0085 * d)));
        const runs = [];
        for (let x = 0; x < W; x++) {
          if (!ink(x, row)) continue;
          let e = x;
          while (e + 1 < W && ink(e + 1, row)) e++;
          runs.push([x, e + 1]);
          x = e;
        }
        if (!runs.length) return null;
        const [a, b] = side === 'right' ? runs[runs.length - 1] : runs[0];
        const mid = Math.round((a + b) / 2);
        // Where the plinth meets the letter: the highest ink under it.
        const half = Math.round(((Math.max(parseFloat(cs.fontSize) * 0.2, 34) * 14.6) / 24 / 2) * d);
        let edge = R;
        for (let x = Math.max(a, mid - half); x < Math.min(b, mid + half); x++) {
          for (let y = top; y < row; y++) if (ink(x, y)) { if (y < edge) edge = y; break; }
        }
        return { x: (a + b) / 2 / d, top: (edge < R ? edge : top) / d };
      } catch (e) {
        return null;
      }
    };

    const at = { s: 24, k: 1, sw: 1, gap: 0.5, lift: 10, hide: 20, peek: 11, near: 84, far: 150, tap: 52, reach: REACH };
    let posts = [];
    const layout = () => {
      const em = geo.fontSize / 1000;
      posts = POSTS.map((p) => {
        const li = geo.letters.findIndex((l) => l.ch.trim() === p.ch);
        const L = geo.letters[li];
        const m = scan(L, p.side) || { x: p.x * em, top: p.top * em };
        return { li, ch: p.ch, X: L.x + m.x, edge: L.y + m.top };
      });
      const room = Math.min(...posts.map((p) => p.edge)) - geo.linksBottom; // from the links down to the letters' top
      const margin = Math.max(8, room * 0.13);                                // kept clear under the links, lifted or not
      const tall = (FOOT - EAR) / 24;                                         // the knight's height per unit of size
      let s = Math.min(Math.max(geo.fontSize * 0.2, 34), 96);
      s = Math.max(16, Math.min(s, (room - margin - Math.min(12, room * 0.15)) / tall));
      const k = s / 24, sw = s < 48 ? 1 : 1.3;
      const near = Math.max(84, s * 1.2);
      Object.assign(at, {
        s, k, sw, near,
        gap: Math.max(0.75, s * 0.01), // a hair of air under the plinth, so both its lines read on the serif
        lift: Math.max(0, Math.min(s * 0.38, room - margin - s * tall - sw)),
        hide: FOOT - EAR + (sw + 1.5) / k,
        peek: FOOT - BROW,
        far: near * 2,
        tap: Math.max(52, s * 1.6),
      });
      outline.setAttribute('stroke-width', sw);
      plinth.setAttribute('stroke-width', sw);
      // The eye stays legible on a phone, where the knight is small; a bigger eye has less room to move.
      const r = Math.max(ctx.knight.eye.r, 1.1 / k);
      eye.setAttribute('r', r.toFixed(3));
      at.reach = [REACH[0] - (r - 0.6) * 0.6, REACH[1] - (r - 0.6) * 0.5];
      wall.setAttribute('width', geo.width + 80);
    };

    /* ---------- State, painted only when it changes ---------- */
    // The body. d: how far below standing (grid units). up: lifted (px). cx: the carry, 0 to 1. lean: 0 to 1.
    const S = { d: 0, up: 0, cx: 0, lean: 0 };
    // The head. f: facing (1 right, as drawn; -1 left). ex, ey: the eye's look, in grid units inside the head.
    const E = { f: 1, ex: 0, ey: 0 };
    let post = 0, dest = -1, rises = [0, 0];
    const riseOf = (p) => {
      const el = letters[p.li], L = geo.letters[p.li];
      return (+gsap.getProperty(el, 'y') || 0) + ((+gsap.getProperty(el, 'yPercent') || 0) / 100) * L.h;
    };
    const where = () => {
      const A = posts[post], B = dest >= 0 ? posts[dest] : A, t = S.cx;
      const rA = rises[post], rB = dest >= 0 ? rises[dest] : rA;
      return { X: A.X + (B.X - A.X) * t, edge: A.edge + (B.edge - A.edge) * t + rA + (rB - rA) * t };
    };
    // The grey of the steel at the knight's place on the letter under it: it catches the same light as the name.
    const steelAt = (X) => {
      let L = geo.letters[0], best = Infinity;
      geo.letters.forEach((l) => { const dd = X < l.x ? l.x - X : X > l.x + l.w ? X - l.x - l.w : 0; if (dd < best) { best = dd; L = l; } });
      const gx = parseFloat(L.el.style.getPropertyValue('--gx'));
      if (!Number.isFinite(gx)) return 230;
      const p = ((X - L.x) / L.w) * 100;
      const pts = STEEL.map(([q, g, f]) => [f ? gx + q : q, g]);
      for (let n = 1; n < pts.length; n++) pts[n][0] = Math.max(pts[n][0], pts[n - 1][0]);
      let n = -1;
      for (let m = 0; m < pts.length; m++) if (pts[m][0] <= p) n = m;
      if (n < 0) return pts[0][1];
      if (n === pts.length - 1) return pts[n][1];
      const [p0, g0] = pts[n], [p1, g1] = pts[n + 1];
      return p1 === p0 ? g1 : g0 + ((g1 - g0) * (p - p0)) / (p1 - p0);
    };
    const greyAt = (X) => Math.round(Math.max(200, steelAt(X))); // never dimmer than a clear hairline
    const last = {};
    const set = (n, key, a, v) => { if (last[key] !== v) { last[key] = v; n.setAttribute(a, v); } };
    const paint = () => {
      const { X, edge } = where();
      const { k, sw, gap } = at;
      set(edgeG, 'e', 'transform', `translate(0 ${edge.toFixed(2)})`);
      set(body, 'b', 'transform', `translate(${X.toFixed(2)} ${(-(sw / 2 + gap) - S.up + S.d * k).toFixed(2)}) scale(${k.toFixed(5)}) translate(${-AXIS} ${-FOOT})`);
      let f = E.f;
      if (Math.abs(f) < 0.01) f = f < 0 ? -0.01 : 0.01;
      set(lean, 'l', 'transform', S.lean > 0.002 ? `rotate(${(TILT * S.lean * Math.sign(f)).toFixed(2)} ${AXIS} ${BROW})` : 'translate(0 0)');
      set(head, 'h', 'transform', `matrix(${f.toFixed(4)} 0 0 1 ${(AXIS * (1 - f)).toFixed(4)} 0)`);
      set(eye, 'y', 'transform', `translate(${E.ex.toFixed(3)} ${E.ey.toFixed(3)})`);
      const v = greyAt(X);
      last.g = v;
      set(outline, 's', 'stroke', `rgb(${v},${v},${v})`);
      set(plinth, 'p', 'stroke', `rgb(${v},${v},${v})`);
      set(eye, 'f', 'fill', `rgb(${v},${v},${v})`);
    };
    const mark = (k, v) => { if (svg.getAttribute(`data-${k}`) !== String(v)) svg.setAttribute(`data-${k}`, v); }; // for QA

    layout();
    S.d = at.hide;
    rises = posts.map(riseOf);
    paint();
    mark('pose', 'hide'); mark('post', posts[post].ch); mark('face', 1);

    /* ---------- Timing that belongs to the scene: tweens and calls made later, in handlers, are recorded too ---------- */
    const inScene = (fn) => ctx.add(fn);
    const calls = new Set();
    const later = inScene((s, fn) => {
      const c = gsap.delayedCall(s, () => { calls.delete(c); fn(); });
      calls.add(c);
      return c;
    });
    const clearCalls = () => { calls.forEach((c) => c.kill()); calls.clear(); pending = null; };

    /* ---------- The body: hide, peek, stand ---------- */
    const DEPTH = () => ({ hide: at.hide, peek: at.peek, stand: 0 });
    let level = 'hide', pending = null, arrived = false, played = false, paused = false, moving = false, scanNext = false;
    const go = inScene((to, duration, ease) => {
      level = to;
      mark('pose', to);
      gsap.killTweensOf(S, 'd,lean');
      gsap.to(S, { d: DEPTH()[to], lean: to === 'peek' ? 1 : 0, duration, ease, onUpdate: paint });
    });
    const drop = () => { if (pending) { pending.kill(); calls.delete(pending); pending = null; } };

    // The eye and the turn: one tween each, made here and reused.
    const eyeX = gsap.quickTo(E, 'ex', { duration: 0.45, ease: 'power3.out', onUpdate: paint });
    const eyeY = gsap.quickTo(E, 'ey', { duration: 0.45, ease: 'power3.out', onUpdate: paint });
    const turnTo = gsap.quickTo(E, 'f', { duration: 0.5, ease: 'power2.inOut', onUpdate: paint });
    let face = 1, aim = [0, 0], eyeHeld = false, faceHeld = false, backing = false;
    const turn = (f) => { if (f !== face) { face = f; turnTo(f); mark('face', f); } };
    const eyeTo = (x, y) => {
      if (Math.abs(x - aim[0]) < 0.02 && Math.abs(y - aim[1]) < 0.02) return;
      aim = [x, y];
      eyeX(x); eyeY(y);
    };
    const turnBack = gsap.delayedCall(0.6, () => { backing = false; turn(1); }).pause();

    /* ---------- What it wants: from how close you are ---------- */
    let want = 'stand', touch = false, dirty = true;
    const UP = () => (touch ? 0.85 : 0.45);                      // a beat behind the letter before it looks again
    const HOLD = () => (scanNext ? 1.75 : touch ? 1.15 : 0.95);  // how long it peeks before it stands
    const settle = () => {
      if (!arrived || moving || paused) return;
      if (want === 'hide') {
        drop();
        if (level !== 'hide') go('hide', 0.24, 'power2.in');
        return;
      }
      if (level === 'hide') {
        if (!pending) pending = later(UP(), () => { pending = null; peekUp(); });
        return;
      }
      if (want === 'peek') {
        if (level === 'stand') { drop(); go('peek', 0.42, 'power2.inOut'); }
        else drop(); // it was about to stand: it stays down a while longer
        return;
      }
      if (level === 'peek' && !pending) pending = later(HOLD() * 0.6, () => { pending = null; standUp(); });
    };
    const peekUp = () => {
      if (want === 'hide') return;
      go('peek', 0.6, 'power2.out');
      if (scanNext) {
        // The first look over the edge: back, then ahead, then out.
        eyeHeld = true;
        later(0.3, () => eyeTo(-at.reach[0] * 0.9, -0.1));
        later(0.9, () => eyeTo(at.reach[0], 0.05));
        later(1.5, () => { eyeHeld = false; dirty = true; });
      }
      if (want === 'stand') pending = later(0.6 + HOLD(), () => { pending = null; standUp(); });
    };
    const standUp = () => {
      if (want !== 'stand' || moving) { settle(); return; }
      go('stand', 0.7, 'power2.inOut');
      if (scanNext) { scanNext = false; arm(); } // the arrival is over: from here on, a quiet spell counts
    };

    /* ---------- Watching ---------- */
    let ptr = null, tapAt = null, fingerNear = false, hovered = false, focused = false, lastType = 'mouse';
    const tapTimer = gsap.delayedCall(3.5, () => { tapAt = null; dirty = true; }).pause();
    // Where its head is when it stands, on screen (the eye is about there too).
    const headAt = () => {
      const r = stage.getBoundingClientRect(), { X, edge } = where();
      return { x: r.left + X, y: r.top + edge - (FOOT - 9) * at.k };
    };
    const think = () => {
      const H = headAt();
      let next = 'stand';
      if (fingerNear) next = 'hide';
      else if (ptr) {
        const dd = Math.hypot(ptr.x - H.x, ptr.y - H.y);
        next = dd < at.near ? 'hide' : dd < at.far ? 'peek' : 'stand';
      }
      if (next !== want) { want = next; settle(); }
      if (moving) return;
      // Reaching for the email: hovering it or coming close to it, a keyboard's focus, or a finger beside it.
      // A press on the email itself is the link's: it is never read here.
      let reach = false, tx = null, ty = null;
      if (email) {
        const b = email.getBoundingClientRect();
        const by = (p) => !!p && p.x > b.left - 36 && p.x < b.right + 36 && p.y > b.top - 28 && p.y < b.bottom + 28;
        reach = hovered || focused || by(ptr) || (touch && by(tapAt));
        if (reach) { tx = b.left + b.width / 2; ty = b.top + b.height / 2; }
      }
      if (!reach && ptr) { tx = ptr.x; ty = ptr.y; } else if (!reach && tapAt) { tx = tapAt.x; ty = tapAt.y; }
      // It turns only for the email. Anything else it follows with its eye.
      if (!faceHeld) {
        if (reach) {
          if (backing) { backing = false; turnBack.pause(); }
          if (tx < H.x - at.s * 0.25) turn(-1); else if (tx > H.x + at.s * 0.25) turn(1);
        } else if (face !== 1 && !backing) { backing = true; turnBack.restart(true); }
      }
      mark('looking', reach ? 'email' : tx == null ? 'out' : 'you');
      if (eyeHeld) return;
      if (tx == null) { eyeTo(0, 0); return; }
      const { cx, cy } = ctx.knight.eye;
      const ex = H.x + (cx - AXIS) * face * at.k, ey = H.y + (cy - 9 + S.d) * at.k;
      const dx = tx - ex, dy = ty - ey, dist = Math.hypot(dx, dy);
      if (dist < 1) { eyeTo(0, 0); return; }
      const near = Math.min(1, dist / (at.s * 0.9));
      eyeTo((dx / dist) * near * at.reach[0] * face, (dy / dist) * near * at.reach[1]);
    };

    /* ---------- One knight's move, when left alone ---------- */
    let tl = null, armed = false, moves = 0;
    const idle = gsap.delayedCall(QUIET, () => move()).pause();
    const arm = () => { if (moves < 2) { armed = true; idle.restart(true); } };
    // Anything you do starts the quiet spell again. Off screen it only notes it; the count starts on return.
    const activity = () => { if (!arrived || moving) return; if (paused) armed = true; else arm(); };
    const move = inScene(() => {
      if (!arrived || moving || paused || moves > 1 || level !== 'stand' || want !== 'stand' || S.d > 0.01 || !ctx.isLive()) return;
      if (svg.getAttribute('data-looking') === 'email') return;
      const to = posts[post === 0 ? 1 : 0], r = stage.getBoundingClientRect();
      if (ptr && Math.hypot(ptr.x - r.left - to.X, ptr.y - r.top - to.edge + (FOOT - 9) * at.k) < at.far) return; // never into your hand
      armed = false;
      drop();
      moving = true;
      moves++;
      dest = post === 0 ? 1 : 0;
      rises[dest] = riseOf(posts[dest]);
      mark('pose', 'move');
      const A = posts[post], B = posts[dest];
      const dir = B.X > A.X ? 1 : -1;
      const dur = Math.min(1.6, Math.max(1, 0.95 + Math.abs(B.X - A.X) / 1300));
      eyeHeld = true; faceHeld = true;
      if (backing) { backing = false; turnBack.pause(); }
      tl = gsap.timeline({ onComplete: land, onUpdate: paint })
        .call(() => { turn(dir); aim = [at.reach[0] * 0.7, 0.15]; eyeX(aim[0]); eyeY(aim[1]); }, null, 0) // it looks where it goes
        .to(S, { up: at.lift, duration: 0.45, ease: 'power2.out' }, 0.5)                           // lifted
        .to(S, { cx: 1, duration: dur, ease: 'power2.inOut' }, 0.68)                               // carried two letters over
        .to(S, { up: 0, duration: 0.42, ease: 'power1.inOut' }, 0.68 + dur - 0.2);                 // and set down
    });
    const land = () => {
      post = dest; dest = -1;
      S.cx = 0; S.up = 0;
      tl = null;
      moving = false;
      level = 'stand';
      mark('post', posts[post].ch); mark('pose', 'stand');
      paint();
      // A hand may have come close while it was carried: it ducks or peeks here as it would anywhere.
      dirty = false;
      think();
      settle();
      // It glances back at the post it left, then keeps watch from here.
      const back = posts[post === 0 ? 1 : 0].X > posts[post].X ? 1 : -1;
      later(0.3, () => { turn(back); aim = [at.reach[0] * 0.8, 0.1]; eyeX(aim[0]); eyeY(aim[1]); });
      later(1.6, () => { eyeHeld = false; faceHeld = false; turn(1); dirty = true; });
    };

    /* ---------- Arrival: once the name has risen it comes up from behind the H ---------- */
    // Counted on GSAP's clock, not the ticker's, so a frame-stepped recording waits exactly as a reader does.
    let waited = 0, calm = 0, clock = -1;
    const arrive = () => {
      arrived = true;
      scanNext = true;
      mark('arrived', '');
      dirty = false;
      think();
      settle();
    };

    const offs = [];
    if (!flags.reduce) {
      offs.push(ctx.tick(() => {
        // Follow the rise (the letters it stands on) and the light on the steel; look again if something moved.
        let moved = false;
        posts.forEach((p, i) => { const r = riseOf(p); if (Math.abs(r - rises[i]) > 0.05) { rises[i] = r; moved = true; } });
        if (moved) dirty = true;
        if (moved || greyAt(where().X) !== last.g) paint();
        if (played && !arrived && !paused) {
          // Once the name has risen and the page is at rest (or after a while, if the reader stops halfway).
          const now = gsap.globalTimeline.time(), dt = clock < 0 ? 0 : Math.min(0.1, Math.max(0, now - clock));
          clock = now;
          waited += dt;
          calm = moved || rises[0] > 1 ? 0 : calm + dt;
          if (calm > 0.6 || waited > 3.2) arrive();
        }
        if (arrived && dirty) { dirty = false; think(); }
      }));
      const interactive = (t) => !!(t && t.closest && t.closest(INTERACTIVE));
      offs.push(
        ctx.on(window, 'pointermove', (e) => {
          if (e.pointerType === 'touch') return;
          touch = false; lastType = e.pointerType;
          ptr = { x: e.clientX, y: e.clientY };
          dirty = true; activity();
        }),
        ctx.on(window, 'pointerdown', (e) => {
          lastType = e.pointerType;
          if (e.pointerType === 'mouse' || paused) return;
          touch = true; ptr = null;
          activity();
          if (interactive(e.target)) return; // a press on a link or the knight belongs to it
          tapAt = { x: e.clientX, y: e.clientY };
          tapTimer.restart(true);
          const H = headAt();
          fingerNear = Math.hypot(e.clientX - H.x, e.clientY - H.y) < at.tap;
          dirty = true;
        }),
        ctx.on(window, 'pointerup', (e) => { if (e.pointerType !== 'mouse' && fingerNear) { fingerNear = false; dirty = true; } }),
        ctx.on(window, 'pointercancel', () => { if (fingerNear) { fingerNear = false; dirty = true; } }),
        ctx.on(document, 'mouseout', (e) => { if (!e.relatedTarget) { ptr = null; dirty = true; } }),
        ctx.on(window, 'scroll', () => { dirty = true; calm = 0; activity(); }), // it waits for the page to come to rest
        ctx.on(window, 'keydown', () => { lastType = 'key'; activity(); }),
      );
      if (email) {
        offs.push(
          ctx.on(email, 'pointerenter', (e) => { if (e.pointerType !== 'touch') { hovered = true; dirty = true; } }),
          ctx.on(email, 'pointerleave', () => { hovered = false; dirty = true; }),
          // Only a keyboard's focus counts: a tap that focuses the link is the link's press.
          ctx.on(email, 'focus', () => {
            let ring = false;
            try { ring = email.matches(':focus-visible'); } catch (e) { ring = lastType === 'key'; }
            focused = ring;
            dirty = true; activity();
          }),
          ctx.on(email, 'blur', () => { focused = false; dirty = true; }),
        );
      }
    }

    // Out of view it goes back behind its letter; back in view it looks over the edge again before it stands.
    const hideNow = () => {
      if (tl) tl.progress(1); // a move in flight lands at once
      clearCalls();
      idle.pause(); tapTimer.pause(); turnBack.pause();
      gsap.killTweensOf(S);
      fingerNear = false; tapAt = null; eyeHeld = false; faceHeld = false; backing = false;
      Object.assign(S, { d: at.hide, up: 0, cx: 0, lean: 0 });
      face = 1; aim = [0, 0]; turnTo(1, 1); eyeX(0, 0); eyeY(0, 0);
      level = 'hide';
      mark('pose', 'hide'); mark('face', 1);
      paint();
    };

    const offResize = ctx.onResize((next) => {
      geo = next;
      if (tl) tl.progress(1);
      layout();
      rises = posts.map(riseOf);
      gsap.killTweensOf(S, 'd,lean');
      S.d = DEPTH()[level];
      S.lean = level === 'peek' ? 1 : 0;
      paint();
      dirty = true;
    });

    return {
      play: () => { played = true; waited = 0; calm = 0; clock = -1; },
      pause: () => { paused = true; if (arrived) hideNow(); },
      resume: () => {
        paused = false;
        if (!arrived) { clock = -1; return; }
        scanNext = true; // back up head first, with a look each way
        dirty = false;
        think();
        settle();
        if (armed) idle.restart(true);
      },
      still: () => {
        // Standing on the H, facing out, eye at rest. Ticks never run here, so paint it once.
        Object.assign(S, { d: 0, up: 0, cx: 0, lean: 0 });
        Object.assign(E, { f: 1, ex: 0, ey: 0 });
        post = 0; dest = -1; level = 'stand';
        rises = posts.map(riseOf);
        paint();
        mark('pose', 'stand'); mark('post', posts[post].ch); mark('arrived', '');
      },
      destroy: () => {
        offResize();
        offs.forEach((off) => off());
        if (tl) tl.kill();
        clearCalls();
        [idle, tapTimer, turnBack].forEach((t) => t.kill());
        gsap.killTweensOf([S, E]);
        svg.remove();
      },
    };
  },
};
