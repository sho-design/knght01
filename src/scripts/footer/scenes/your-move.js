/* Your move. The letters are squares on one rank. Point at a letter (or tap it on a phone) and a small B knight
   stands on it, and a single knight's move runs out in the dotted line from the business card: round dots, the long
   leg first. Two squares across is the next letter; one square up or down lands just above or below it. The move
   lands, holds, and fades. Only one move shows at a time: a new letter takes the knight over.

   On arrival the knight makes one move by itself, and its move ends on the last line of the ending, "Your move.",
   a real link to sho@knght.com, set in Cormorant italic in the room above the letters that is already there
   (absolutely placed in the stage, so nothing in the footer moves).

   The gap between N and G belongs to another ending: no move here crosses it, lands in it or draws near it. N only
   moves toward K, G only toward H. The scene keeps the shared base (the rise and the steel) and never touches the
   letters: the dots and the knight are drawn on the overlay, which blends by difference, so they read black on the
   steel and white on the black around it. */

const NS = 'http://www.w3.org/2000/svg';
const ID = 'your-move';
// The moves a knight can make on this rank: to the letter beside it. N to G and G to N would cross the gap.
const PAIRS = [[0, 1], [1, 0], [2, 3], [3, 2], [3, 4], [4, 3]];
// Where the knight makes its first move, best first. The one used is the first whose "Your move." sits well clear
// of every link (the links above differ between a phone and a desktop).
const ARRIVALS = [[2, 3], [3, 4], [4, 3], [3, 2], [0, 1]];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default {
  id: ID,
  name: 'Your move',
  takesOver: false,

  mount(ctx) {
    const { gsap, letters, stage, flags } = ctx;
    const F = `.footer[data-ending="${ID}"]`;
    ctx.css(`
${F} .footer__layer--over{mix-blend-mode:difference}
${F} .yourmove__link{position:absolute;z-index:3;left:0;bottom:0;padding:5px 8px;white-space:nowrap;font:italic 400 clamp(1rem,1.65vw,1.5rem)/1.15 var(--serif);letter-spacing:.01em;color:var(--argent);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.24em;text-decoration-color:var(--rule-strong);transition:text-decoration-color .3s;-webkit-tap-highlight-color:transparent}
${F} .yourmove__link:hover{text-decoration-color:var(--argent)}
${F} .yourmove__link:focus-visible{outline:1px solid var(--argent);outline-offset:2px}
${F} .yourmove__link[data-hidden]{opacity:0;pointer-events:none}
`);

    /* ---------- Nodes: one svg on the overlay (knight, dots, landing ring), and the link in the stage ---------- */
    const svg = ctx.svg({ className: 'yourmove' });
    const g = ctx.make('g', { parent: svg, attrs: { opacity: 0 } });
    // Each piece in two groups: the outer one placed here (and moved with the rise), the inner one animated by GSAP.
    const kPos = ctx.make('g', { parent: g });
    const knight = ctx.make('g', { parent: kPos, className: 'yourmove__knight' });
    const kPath = ctx.make('path', { parent: knight, attrs: { d: ctx.knight.d, fill: 'none', stroke: '#fff', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' } });
    ctx.make('circle', { parent: knight, attrs: { cx: ctx.knight.eye.cx, cy: ctx.knight.eye.cy, r: ctx.knight.eye.r, fill: '#fff' } });
    const dotsG = ctx.make('g', { parent: g, attrs: { fill: '#fff' } });
    const rPos = ctx.make('g', { parent: g });
    const ring = ctx.make('circle', { parent: rPos, attrs: { cx: 0, cy: 0, fill: 'none', stroke: '#fff', 'vector-effect': 'non-scaling-stroke', opacity: 0 } });

    const link = ctx.make('a', { parent: stage, className: 'yourmove__link', text: 'Your move.', attrs: { href: 'mailto:sho@knght.com', 'data-hidden': '' } });

    /* ---------- Geometry ---------- */
    let geo, cy, unit, pool = [], arrival, label = null;
    const lift = (i) => ((+gsap.getProperty(letters[i], 'yPercent') || 0) / 100) * geo.letters[i].h + (+gsap.getProperty(letters[i], 'y') || 0);

    // A move from letter a to the letter b beside it, v = -1 up or 1 down: two squares across, one square up or down.
    // The square is half the distance between the two letters' centres, so the L is a true knight's move.
    // A move up onto the letter under "Your move." ends on the words, as on the card: the dots stop just under them.
    const plan = (a, b, v) => {
      const A = geo.letters[a], B = geo.letters[b];
      const dx = B.cx - A.cx, dir = Math.sign(dx), S = Math.abs(dx) / 2;
      const end = { x: B.cx, y: cy + v * S };
      const toLabel = !!label && v < 0 && b === label.b;
      const clear = unit.knight * 0.5 + unit.pitch * 0.9; // the dots start clear of the knight
      const stopY = toLabel ? label.bottom + unit.pitch * 0.5 : end.y - v * (unit.ring + unit.pitch * 0.8); // and stop short
      const dots = [];
      const l1 = Math.abs(dx) - clear, n1 = Math.max(1, Math.round(l1 / unit.pitch)), p1 = l1 / n1;
      for (let i = 0; i <= n1; i++) {
        const x = A.cx + dir * (clear + i * p1);
        dots.push({ x, y: cy, w: (x - A.cx) / dx });
      }
      const l2 = Math.abs(stopY - cy), n2 = Math.max(1, Math.round(l2 / unit.pitch)), p2 = l2 / n2;
      for (let j = 1; j <= n2; j++) dots.push({ x: B.cx, y: cy + v * j * p2, w: 1 });
      return { a, b, v, S, end, dots, toLabel };
    };
    // A move is allowed when it stays inside the stage and between the links and the footer line, rise included.
    const fits = (m) => {
      const r = unit.ring + 2;
      const y = m.end.y + Math.max(lift(m.b), 0);
      return m.end.x - r > 0 && m.end.x + r < geo.width && y - r > geo.linksBottom + 4 && y + r < geo.baseTop - 4;
    };

    const rectOf = (n) => {
      const s = stage.getBoundingClientRect(), r = n.getBoundingClientRect();
      return { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top };
    };
    const apart = (p, q) => Math.hypot(Math.max(0, p.l - q.r, q.l - p.r), Math.max(0, p.t - q.b, q.t - p.b));

    const layout = () => {
      geo = ctx.measure();
      cy = geo.baseline - geo.capHeight / 2;
      label = null;
      const S = Math.min(...PAIRS.map(([a, b]) => Math.abs(geo.letters[b].cx - geo.letters[a].cx) / 2));
      const phone = geo.fontSize < 160;
      unit = {
        S,
        knight: clamp(S * 0.36, 18, 54),          // the knight's 24-grid box, in px
        pitch: clamp(S * 0.052, 3.6, 7.6),        // dot to dot
        dot: clamp(S * 0.0105, 0.95, 1.55),       // dot radius
        ring: clamp(S * 0.045, 3.2, 6.5),         // the landing ring
        stroke: phone ? 1 : 1.25,
      };
      kPath.setAttribute('stroke-width', unit.stroke);
      ring.setAttribute('stroke-width', unit.stroke);
      ring.setAttribute('r', unit.ring);

      // "Your move." is the square the first move lands on: centred on the letter it lands above, in the room the
      // footer already has between the links and the letters, a little nearer the letters than the links.
      const w = link.offsetWidth, h = link.offsetHeight;
      const L0 = geo.letters[0], L4 = geo.letters[geo.letters.length - 1];
      const links = [...ctx.footer.querySelectorAll('a, button')].filter((n) => n !== link && n.offsetWidth).map(rectOf)
        .filter((r) => r.b <= geo.capTop + 1); // the links and the email above (the footer line is below)
      const gapL = geo.letters[1].x + geo.letters[1].w, gapR = geo.letters[2].x;
      const above = phone ? 2 : 10; // the least air between the words' box and the cap line
      let best = null;
      ARRIVALS.forEach(([a, b], rank) => {
        const m = plan(a, b, -1);
        const x = clamp(m.end.x, L0.x + w / 2, L4.x + L4.w - w / 2);
        const mid = Math.min(m.end.y, geo.capTop - above - h / 2);
        const box = { l: x - w / 2, r: x + w / 2, t: mid - h / 2, b: mid + h / 2 };
        if (box.t < geo.linksBottom + 2) return;
        if (!(box.r < gapL - 24 || box.l > gapR + 24)) return; // never near the gap between N and G
        const air = links.length ? Math.min(...links.map((o) => apart(box, o))) : 99;
        const score = Math.min(air, 40) - rank * 2; // past 40 px of air, the order above decides
        if (!best || score > best.score) best = { score, b, x, box, a };
      });
      if (!best) {
        const m = plan(3, 4, -1), x = Math.min(m.end.x, L4.x + L4.w - w / 2);
        best = { a: 3, b: 4, x, box: { b: m.end.y } };
      }
      label = { b: best.b, x: best.x, bottom: best.box.b };
      arrival = plan(best.a, best.b, -1);
      // Placed by its box, centred by GSAP's xPercent (so a late font cannot push it off centre).
      link.style.left = `${label.x.toFixed(2)}px`;
      link.style.bottom = `${(geo.height - label.bottom).toFixed(2)}px`;
      gsap.set(link, { xPercent: -50 });

      // One pool of dots, as many as the longest move needs.
      const most = Math.max(...PAIRS.flatMap(([a, b]) => [plan(a, b, -1).dots.length, plan(a, b, 1).dots.length]));
      while (pool.length < most) {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('r', 0);
        dotsG.appendChild(c);
        pool.push(c);
      }
      pool.forEach((c) => c.setAttribute('r', 0));
      lifts = [NaN, NaN, NaN];
    };
    let lifts = [NaN, NaN, NaN];
    layout();

    /* ---------- Drawing one move ---------- */
    let shown = null;    // the move on screen: { m, used }
    let tl = null;       // its timeline
    let pending = null;  // the next move, waiting for this one to leave

    // Keep the drawing on the letters while they rise: the knight goes with its letter, the landing with the other,
    // and each dot of the long leg in between. Written only when a letter has moved.
    const follow = (force) => {
      const la = shown ? lift(shown.m.a) : 0, lb = shown ? lift(shown.m.b) : 0, lab = lift(arrival.b);
      if (!force && Math.abs(la - lifts[0]) < 0.05 && Math.abs(lb - lifts[1]) < 0.05 && Math.abs(lab - lifts[2]) < 0.05) return;
      lifts = [la, lb, lab];
      gsap.set(link, { xPercent: -50, y: lab });
      if (!shown) return;
      const { m, used } = shown;
      const k = unit.knight, A = geo.letters[m.a];
      kPos.setAttribute('transform', `translate(${(A.cx - k / 2).toFixed(2)} ${(cy - k / 2 + la).toFixed(2)}) scale(${(k / 24).toFixed(4)})`);
      used.forEach((c, i) => c.setAttribute('cy', (m.dots[i].y + la + (lb - la) * m.dots[i].w).toFixed(2)));
      rPos.setAttribute('transform', `translate(${m.end.x.toFixed(2)} ${(m.end.y + lb).toFixed(2)})`);
    };
    const place = (m) => {
      const used = pool.slice(0, m.dots.length);
      used.forEach((c, i) => { c.setAttribute('cx', m.dots[i].x.toFixed(2)); c.setAttribute('r', 0); });
      pool.slice(m.dots.length).forEach((c) => c.setAttribute('r', 0));
      gsap.set(ring, { opacity: 0 });
      shown = { m, used };
      svg.dataset.move = `${geo.letters[m.a].ch}${geo.letters[m.b].ch}${m.v < 0 ? 'up' : 'down'}`; // for QA
      follow(true);
    };

    // The move: the knight steps on, the dots run (the long leg, then the short one), the landing, a beat, and away.
    const build = (m, { hold = 1, onLand } = {}) => {
      place(m);
      const used = shown.used, n = used.length;
      const run = clamp(n * 0.0125, 0.45, 0.75);
      const t = gsap.timeline({ paused: true });
      t.set(g, { opacity: 1 }, 0)
        .fromTo(knight, { opacity: 0, scale: 0.82, transformOrigin: '50% 60%' }, { opacity: 1, scale: 1, duration: 0.32, ease: 'power2.out' }, 0)
        .fromTo(used, { attr: { r: 0 }, opacity: 1 }, { attr: { r: unit.dot }, duration: 0.14, ease: 'power1.out', stagger: run / n }, 0.16);
      const land = 0.16 + run;
      if (m.toLabel) {
        if (onLand) t.call(onLand, null, land - 0.05);
      } else {
        t.fromTo(ring, { opacity: 0, scale: 0.2, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.34, ease: 'back.out(2.2)' }, land - 0.04);
      }
      const out = land + 0.3 + hold;
      t.to(knight, { opacity: 0, duration: 0.45, ease: 'power1.in' }, out)
        .to(used, { opacity: 0, duration: 0.3, ease: 'power1.in', stagger: 0.32 / n }, out + 0.05)
        .to(ring, { opacity: 0, duration: 0.35, ease: 'power1.in' }, out + 0.4)
        .set(g, { opacity: 0 })
        .call(() => { if (tl === t) { tl = null; shown = null; } start(); });
      return t;
    };

    // One move at a time. A new one asks the one on screen to leave first (quickly), then starts.
    const start = ctx.add(() => {
      if (!pending || tl) return;
      const { m, opts = {} } = pending;
      pending = null;
      tl = build(m, opts);
      if (opts.delay) tl.delay(opts.delay);
      tl.restart(true);
    });
    let leaving = null;
    const leave = ctx.add(() => {
      if (!tl || leaving) return;
      const old = tl;
      old.pause();
      if (old.data === 'arrival') reveal(false); // the first move, cut short by the reader: the last line still comes
      leaving = gsap.to(g, {
        opacity: 0, duration: 0.18, ease: 'power1.in',
        onComplete: () => { leaving = null; old.kill(); if (tl === old) { tl = null; shown = null; } start(); },
      });
    });
    const request = (m, opts) => {
      pending = { m, opts };
      if (tl) leave(); else start();
    };

    /* ---------- "Your move." ---------- */
    let revealed = false, labelTween = null;
    const reveal = ctx.add((now) => {
      if (revealed) return;
      revealed = true;
      link.removeAttribute('data-hidden');
      if (now || flags.reduce) { gsap.set(link, { opacity: 1 }); return; }
      labelTween = gsap.fromTo(link, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' });
    });

    /* ---------- The reader: hover (mouse) or tap (touch and pen) ---------- */
    const letterAt = (x, y) => {
      for (let i = 0; i < geo.letters.length; i++) {
        const L = geo.letters[i], dy = lift(i);
        if (x >= L.x && x <= L.x + L.w && y >= L.y + dy && y <= L.y + L.h + dy) return i;
      }
      return -1;
    };
    // From letter i: across in the direction asked if it can, else the other way; up or down as asked if it fits.
    const choose = (i, h, v) => {
      const options = PAIRS.filter(([a]) => a === i).map(([a, b]) => b);
      if (!options.length) return null;
      const want = options.find((b) => Math.sign(b - i) === h) ?? options[0];
      const tries = [[want, v], [want, -v], ...options.filter((b) => b !== want).flatMap((b) => [[b, v], [b, -v]])];
      for (const [b, vv] of tries) {
        const m = plan(i, b, vv);
        if (fits(m)) return m;
      }
      return null;
    };
    const go = (i, h, v) => {
      const m = choose(i, h, v);
      if (m) request(m);
    };

    let over = -1, lastX = null, dirX = 1, down = null, played = false;
    if (!flags.reduce) {
      ctx.onPointer((p) => {
        if (!played) return;
        if (p.pointerType === 'mouse') {
          if (p.type === 'pointerleave') { over = -1; lastX = null; return; }
          if (p.type !== 'pointermove') return;
          if (lastX != null && Math.abs(p.x - lastX) > 0.5) dirX = Math.sign(p.x - lastX);
          lastX = p.x;
          const i = p.interactive ? -1 : letterAt(p.x, p.y);
          if (i === over) return;
          over = i;
          if (i >= 0) go(i, dirX, p.y < cy + lift(i) ? -1 : 1);
          return;
        }
        // Touch or pen: a tap, not a scroll. Never a press that belongs to a link or the knight.
        if (p.type === 'pointerdown') { down = p.interactive ? null : { x: p.x, y: p.y, t: performance.now(), id: p.event.pointerId }; return; }
        if (p.type === 'pointercancel') { down = null; return; }
        if (p.type !== 'pointerup' || !down || p.event.pointerId !== down.id) return;
        const tap = Math.hypot(p.x - down.x, p.y - down.y) < 12 && performance.now() - down.t < 700;
        down = null;
        if (!tap || p.interactive) return;
        const i = letterAt(p.x, p.y);
        if (i < 0) return;
        go(i, p.x >= geo.letters[i].cx ? 1 : -1, p.y < cy + lift(i) ? -1 : 1);
      });
      // Point at "Your move.", or reach it with the keyboard, and the knight makes the move that ends on it.
      // Unless the move that is (or is about to be) on screen already ends on it. A move on its way out does not count.
      const toLabel = ctx.add(() => {
        reveal(true);
        const next = pending ? pending.m : leaving ? null : shown && shown.m;
        if (!next || !next.toLabel) request(arrival, { hold: 0.9 });
      });
      ctx.on(link, 'pointerenter', (e) => { if (played && e.pointerType === 'mouse') toLabel(); });
      ctx.on(link, 'focus', () => { if (played) toLabel(); else reveal(true); });
      ctx.tick(() => follow(false));
    }

    ctx.onResize(() => {
      if (leaving) { leaving.kill(); leaving = null; }
      if (tl) { if (tl.data === 'arrival') reveal(true); tl.kill(); tl = null; }
      pending = null;
      shown = null;
      gsap.set(g, { opacity: 0 });
      layout();
      if (flags.reduce) still();
    });

    // The finished picture: the knight on its letter, its move drawn, and "Your move." where it lands.
    const still = () => {
      place(arrival);
      gsap.set(g, { opacity: 1 });
      gsap.set(knight, { opacity: 1, scale: 1 });
      gsap.set(shown.used, { attr: { r: unit.dot }, opacity: 1 });
      reveal(true);
    };

    return {
      play() {
        played = true;
        // A beat after the name arrives, the knight makes the first move, and it lands on the last line.
        request(arrival, { hold: 1.1, delay: ctx.reason === 'swap' ? 0.35 : 0.9, onLand: () => reveal(false) });
        if (tl) tl.data = 'arrival';
      },
      pause() {
        if (tl) tl.pause();
        if (leaving) leaving.pause();
        if (labelTween) labelTween.pause();
      },
      resume() {
        if (leaving) leaving.resume();
        else if (tl) tl.resume();
        if (labelTween) labelTween.resume();
      },
      still,
      destroy() {
        if (leaving) leaving.kill();
        if (tl) tl.kill();
        if (labelTween) labelTween.kill();
        leaving = null; tl = null; pending = null; shown = null;
        svg.remove();
        link.remove();
      },
    };
  },
};
