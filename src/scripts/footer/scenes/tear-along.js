/* The blade in the line. The footer's base rule is a sheath with the mark's sword inside it.
   On arrival the seam parts along its first stretch by itself and shows the pommel and the grip. Hover along the rule,
   tap it or drag along it, and the blade is drawn out to its point. It stays drawn: nothing closes again by itself.

   It lives on the base rule only. It is drawn on the backdrop, behind every word and the knight, and keeps inside a
   band a few pixels high around the rule, so it passes over the swap knight without touching it and changes no
   height. The point never comes to rest under the place of the missing I, between N and G: that gap is not this
   ending's. The rule's own border turns transparent (colour only) and the scene draws the same hairline in its place.
   Ported from the standalone sketch cut/tear-along, with the judges' fixes: a clean seam, no perforation, no teeth. */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const f2 = (n) => (Math.round(n * 100) / 100).toString();

export default {
  id: 'tear-along',
  name: 'The blade in the line',
  takesOver: false,

  mount(ctx) {
    const { gsap, footer, stage, letters } = ctx;
    const base = footer.querySelector('.footer__base');
    const none = () => {};
    if (!base) return { play: none, pause: none, resume: none, still: none, destroy: none };

    // The rule's own colour, read before it is hidden, so the drawn hairline is the same line.
    const ruleColour = getComputedStyle(base).borderTopColor || 'rgba(255, 255, 255, 0.16)';
    ctx.css('.footer[data-ending="tear-along"] .footer__base{border-top-color:transparent}');

    /* ---------- Nodes: one SVG on the backdrop, behind all text ---------- */
    const uid = `knght-blade-${Math.random().toString(36).slice(2, 8)}`;
    const svg = ctx.svg({ layer: 'back', className: 'blade-line' });
    const mk = (tag, attrs, parent = svg) => ctx.make(tag, { parent, attrs });
    const defs = mk('defs', {});
    const steel = mk('linearGradient', { id: `${uid}-steel`, gradientUnits: 'userSpaceOnUse', x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
    const STEEL = ['#9c9c9c', '#dcdcdc', '#ffffff', '#dcdcdc', '#8f8f8f'];
    const stops = STEEL.map((c) => mk('stop', { offset: 0, 'stop-color': c }, steel));
    const glintG = mk('linearGradient', { id: `${uid}-glint`, gradientUnits: 'userSpaceOnUse', x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
    [[0, 0], [0.5, 0.9], [1, 0]].forEach(([o, a]) => mk('stop', { offset: o, 'stop-color': '#fff', 'stop-opacity': a }, glintG));
    const clip = mk('clipPath', { id: `${uid}-open` }, defs);
    const clipPath = mk('path', { d: '' }, clip);

    // The inside of the sheath, then the steel (seen only through the opening), then the seam's two lips on top.
    const voidPath = mk('path', { class: 'blade-line__void', d: '', fill: '#000', 'fill-opacity': 0.72 });
    const inside = mk('g', { 'clip-path': `url(#${uid}-open)` });
    const pommel = mk('path', { class: 'blade-line__pommel', d: '', fill: `url(#${uid}-steel)`, 'fill-rule': 'evenodd' }, inside);
    const hilt = mk('path', { class: 'blade-line__hilt', d: '', fill: `url(#${uid}-steel)` }, inside);
    const gripShade = mk('path', { d: '', fill: '#000', 'fill-opacity': 0.34 }, inside);
    const blade = mk('path', { class: 'blade-line__blade', d: '', fill: `url(#${uid}-steel)` }, inside);
    const bladeShade = mk('path', { d: '', fill: '#000', 'fill-opacity': 0.3 }, inside);
    const ridge = mk('path', { d: '', fill: 'none', stroke: '#fff', 'stroke-opacity': 0.42, 'stroke-width': 0.6, 'vector-effect': 'non-scaling-stroke' }, inside);
    const glint = mk('path', { d: '', fill: `url(#${uid}-glint)`, opacity: 0 }, inside);
    const seamRule = mk('path', { class: 'blade-line__rule', d: '', fill: 'none', stroke: ruleColour, 'stroke-width': 1, 'shape-rendering': 'crispEdges', 'vector-effect': 'non-scaling-stroke' });
    const seam = mk('path', { class: 'blade-line__lips', d: '', fill: 'none', stroke: ruleColour, 'stroke-width': 1, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' });

    /* ---------- Geometry, in stage coordinates ---------- */
    let G = null;
    const layout = () => {
      const s = stage.getBoundingClientRect(), r = base.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const x0 = r.left - s.left, x1 = r.right - s.left;
      // The 1px line where the browser paints the border: its top snapped to the device pixel, the hairline centred on it.
      const ry = Math.round(r.top * dpr) / dpr - s.top + 0.5;
      const W = x1 - x0;
      const k = clamp((W - 350) / (1313 - 350), 0, 1); // 0 on a phone's rule, 1 on a desktop's
      const P = {
        rp: lerp(4.6, 7, k), grip: lerp(1.2, 1.7, k), guard: lerp(9.5, 15, k), gw: lerp(2.6, 3.6, k),
        hb: lerp(3.1, 5, k), m: lerp(1.5, 2, k), T: lerp(14, 30, k),
      };
      const step = dpr > 1 ? 0.5 : 1;
      // The point stops short of the rule's end: the back-to-top button sits over it on wide screens.
      const tip = x1 - lerp(26, 64, k);
      const pc = x0 + P.m + P.rp + 0.5;
      // The mark's own proportions (Base.astro): pommel at 30, guard at 120, the point from 530 to 594.
      const X = (mx) => pc + ((mx - 30) * (tip - pc)) / (594 - 30);
      const g1 = X(120);
      const b0 = g1 + P.gw / 2;
      const point = Math.min(X(594) - X(530), P.hb * 17);
      // The place of the missing I: the point never comes to rest under it.
      const geo = ctx.measure();
      const Nl = geo.letters[1], Gl = geo.letters[2];
      const pad = geo.fontSize * 0.06;
      const gap = [Nl.x + Nl.w - pad, Gl.x + pad];
      const N = Math.floor((x1 - x0) / step) + 1;
      const xs = new Float32Array(N), H = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const x = x0 + i * step;
        xs[i] = x;
        let h = 0;
        const dx = x - pc;
        if (Math.abs(dx) < P.rp) h = Math.sqrt(P.rp * P.rp - dx * dx);
        if (x >= pc && x <= g1) h = Math.max(h, P.grip);
        if (Math.abs(x - g1) <= P.gw / 2) h = Math.max(h, P.guard);
        H[i] = x < b0 ? h : 0;
      }
      const K = Math.floor(P.m / step);
      const disk = [];
      for (let j = -K; j <= K; j++) disk.push(Math.sqrt(Math.max(0, P.m * P.m - (j * step) * (j * step))));
      G = {
        x0, x1, ry, tip, pc, g1, b0, point, gap, N, step, xs, H, K, disk, P,
        V: new Float32Array(N), U: new Float32Array(N), len: tip - x0,
        hiltStop: (g1 - P.gw / 2 - 1 - x0) / (tip - x0), // the arrival opens up to the guard: pommel and grip
        letters: geo.letters,
      };
      // The steel in place (it is only ever seen through the opening).
      const { rp, grip, guard, gw, hb } = P;
      const ri = rp * 0.42;
      pommel.setAttribute('d', `M${f2(pc + rp)} ${f2(ry)}A${f2(rp)} ${f2(rp)} 0 1 0 ${f2(pc - rp)} ${f2(ry)}A${f2(rp)} ${f2(rp)} 0 1 0 ${f2(pc + rp)} ${f2(ry)}Z`
        + `M${f2(pc + ri)} ${f2(ry)}A${f2(ri)} ${f2(ri)} 0 1 0 ${f2(pc - ri)} ${f2(ry)}A${f2(ri)} ${f2(ri)} 0 1 0 ${f2(pc + ri)} ${f2(ry)}Z`);
      const gs = pc + Math.sqrt(rp * rp - grip * grip) - 0.4;
      hilt.setAttribute('d', `M${f2(gs)} ${f2(ry - grip)}H${f2(g1 - gw / 2)}V${f2(ry + grip)}H${f2(gs)}Z`
        + `M${f2(g1 - gw / 2)} ${f2(ry - guard)}H${f2(g1 + gw / 2)}V${f2(ry + guard)}H${f2(g1 - gw / 2)}Z`);
      gripShade.setAttribute('d', `M${f2(gs)} ${f2(ry)}H${f2(g1 - gw / 2)}V${f2(ry + grip)}H${f2(gs)}Z`);
      steel.setAttribute('x1', f2(x0)); steel.setAttribute('x2', f2(x1));
      lightX = null;
    };

    /* ---------- State: how far the blade is drawn, as a share of the way from the rule's start to the point ---------- */
    const state = { fa: 0, fq: 0, glint: 0 };
    let goal = 0, done = false, played = false, stilled = false, ruleSeen = false, arrived = false, lightX = null;
    let gone = false; // set by destroy: the context's revert still calls onUpdate, which must then draw nothing
    const front = () => G.x0 + clamp(Math.max(state.fa, state.fq), 0, 1) * G.len;

    // The opening: the sword's silhouette as far as it is drawn, and the seam's lips just clear of it.
    const render = () => {
      if (gone || !G) return;
      const { N, xs, H, V, U, K, disk, P, ry, b0, point, step } = G;
      const F = front();
      for (let i = 0; i < N; i++) {
        const x = xs[i];
        let v = 0;
        if (x < b0) v = H[i] * smooth((F - x) / P.T);
        else if (x <= F) v = P.hb * Math.min(1, (F - x) / point);
        V[i] = v > 0.03 ? v : 0;
      }
      let last = -1;
      const runs = [];
      for (let i = 0; i < N; i++) {
        let u = 0;
        for (let j = -K; j <= K; j++) {
          const n = i + j;
          if (n >= 0 && n < N && V[n] > 0) u = Math.max(u, V[n] + disk[j + K]);
        }
        U[i] = u;
        if (u > 0) {
          if (last !== i - 1 || !runs.length) runs.push([i, i]);
          else runs[runs.length - 1][1] = i;
          last = i;
        }
      }
      // The closed rule, crisp like the border it stands in for; the lips where it has parted, one path for both.
      let rule = '', lips = '', at = xs[0];
      const lip = (i, j, sign) => {
        let d = `M${f2(xs[Math.max(0, i - 1)])} ${f2(ry)}`;
        for (let n = i; n <= j; n++) {
          const bend = n > i && n < j ? (U[n + 1] - U[n]) - (U[n] - U[n - 1]) : 1;
          if (Math.abs(bend) > 0.004) d += `L${f2(xs[n])} ${f2(ry + sign * U[n])}`;
        }
        return `${d}L${f2(xs[Math.min(N - 1, j + 1)])} ${f2(ry)}`;
      };
      runs.forEach(([i, j]) => {
        if (xs[i] - at > 0.75) rule += `M${f2(at)} ${f2(ry)}H${f2(xs[Math.max(0, i - 1)])}`;
        lips += lip(i, j, -1) + lip(i, j, 1);
        at = xs[Math.min(N - 1, j + 1)];
      });
      if (xs[N - 1] - at > 0.75) rule += `M${f2(at)} ${f2(ry)}H${f2(xs[N - 1])}`;
      seamRule.setAttribute('d', rule);
      seam.setAttribute('d', lips);
      // The inside: each open run, its edge half a pixel inside the lips.
      let d = '';
      for (let i = 0; i <= last; i++) {
        if (U[i] <= 0.5) continue;
        let j = i;
        while (j + 1 <= last && U[j + 1] > 0.5) j++;
        let up = `M${f2(xs[i] - step)} ${f2(ry)}`, dn = '';
        for (let n = i; n <= j; n++) {
          const bend = n > i && n < j ? (U[n + 1] - U[n]) - (U[n] - U[n - 1]) : 1;
          if (Math.abs(bend) > 0.004) {
            up += `L${f2(xs[n])} ${f2(ry - (U[n] - 0.5))}`;
            dn = `L${f2(xs[n])} ${f2(ry + (U[n] - 0.5))}` + dn;
          }
        }
        d += `${up}L${f2(xs[j] + step)} ${f2(ry)}${dn}Z`;
        i = j;
      }
      clipPath.setAttribute('d', d);
      voidPath.setAttribute('d', d);
      // The blade, its point at the front.
      if (F > b0 + 0.5) {
        const run = F - b0, w = P.hb * Math.min(1, run / point), sh = Math.max(b0, F - point);
        blade.setAttribute('d', `M${f2(b0)} ${f2(ry - w)}L${f2(sh)} ${f2(ry - P.hb * (sh > b0 ? 1 : run / point))}L${f2(F)} ${f2(ry)}L${f2(sh)} ${f2(ry + P.hb * (sh > b0 ? 1 : run / point))}L${f2(b0)} ${f2(ry + w)}Z`);
        bladeShade.setAttribute('d', `M${f2(b0)} ${f2(ry)}L${f2(F)} ${f2(ry)}L${f2(sh)} ${f2(ry + P.hb * (sh > b0 ? 1 : run / point))}L${f2(b0)} ${f2(ry + w)}Z`);
        glint.setAttribute('d', blade.getAttribute('d'));
        const r1 = Math.max(b0 + 2, F - point * 0.55);
        ridge.setAttribute('d', r1 > b0 + 4 ? `M${f2(b0 + 2)} ${f2(ry)}H${f2(r1)}` : '');
      } else {
        blade.setAttribute('d', ''); bladeShade.setAttribute('d', ''); glint.setAttribute('d', ''); ridge.setAttribute('d', '');
      }
      if (!done && F >= G.tip - 0.5) { done = true; if (!stilled) runGlint(); }
    };

    /* ---------- The light: the steel catches the hall light at the same place the letters do ---------- */
    const light = (x) => {
      if (gone || !G || (lightX != null && Math.abs(x - lightX) < 0.5)) return;
      lightX = x;
      const span = G.x1 - G.x0, c = (x - G.x0) / span, w = clamp(0.24 * (G.letters[2].w || 200), 40, 160) / span * 2.2;
      [0, c - w, c, c + w, 1].forEach((o, i) => stops[i].setAttribute('offset', clamp(o, 0, 1).toFixed(4)));
    };
    const readLight = () => {
      // Each letter carries the light's place as --gx (a share of its own width, held between -60% and 160%).
      for (let i = 0; i < letters.length; i++) {
        const gx = parseFloat(letters[i].style.getPropertyValue('--gx'));
        if (!Number.isFinite(gx)) return null;
        if (gx < 159.5 || i === letters.length - 1) {
          const L = G.letters[i];
          return L.x + (gx / 100) * L.w;
        }
      }
      return null;
    };

    /* ---------- Motion: tweens only, so time can be held and stepped ---------- */
    const follow = gsap.quickTo(state, 'fq', { duration: 0.9, ease: 'power2.out', onUpdate: render });
    const arrival = gsap.timeline({ paused: true })
      .to(state, { fa: () => G.hiltStop, duration: 1.6, ease: 'power2.inOut', onUpdate: render }, 0.35);
    let glintTween = null;
    const runGlint = ctx.add(() => {
      if (glintTween && glintTween.isActive()) return;
      state.glint = 0;
      glintTween = gsap.to(state, {
        glint: 1, duration: 1.15, ease: 'power1.inOut',
        onUpdate: () => {
          if (gone) return;
          const u = state.glint, a = G.b0 - 140, b = G.tip + 140, x = a + (b - a) * u;
          glintG.setAttribute('x1', f2(x - 110)); glintG.setAttribute('x2', f2(x + 110));
          glint.setAttribute('opacity', Math.sin(Math.PI * u).toFixed(3));
        },
        onComplete: () => { if (!gone) glint.setAttribute('opacity', 0); },
      });
    });
    let auto = null;
    const drawAll = ctx.add(() => {
      if (done) { runGlint(); return; }
      if (auto && auto.isActive()) return;
      // The reader got there before the arrival: it has nothing left to show.
      arrived = true;
      arrival.kill();
      const from = Math.max(state.fa, state.fq);
      goal = 1;
      state.fa = from;
      auto = gsap.to(state, { fa: 1, duration: 0.55 + 1.35 * (1 - from), ease: 'power2.inOut', overwrite: 'auto', onUpdate: render });
    });
    // Hover or drag: the point comes out to meet the pointer, never back. It does not rest under the N-G gap.
    const reach = (x) => {
      if (gone || !G || done) return;
      let F = x >= G.tip - 20 ? G.tip : x;
      if (F > G.gap[0] && F < G.gap[1]) F = G.gap[1];
      const f = clamp((F - G.x0) / G.len, 0, 1);
      if (f <= goal + 0.002) return;
      goal = f;
      follow(f);
    };

    /* ---------- Input: along the rule only, never on a link or the knight ---------- */
    const near = (x, y, band) => !gone && !!G && Math.abs(y - G.ry) <= band && x >= G.x0 - 12 && x <= G.x1 + 12;
    const live = () => played && !stilled;
    ctx.onPointer((p) => {
      if (!live() || p.pointerType === 'touch' || p.interactive) return;
      if (!near(p.x, p.y, 24)) return;
      if (p.type === 'pointermove') reach(p.x);
      else if (p.type === 'pointerdown' && p.event.button === 0) drawAll();
    });
    let drag = null;
    ctx.onTouch((t) => {
      if (!live()) return;
      const touch = t.event.changedTouches[0];
      if (t.type === 'touchstart') {
        drag = !t.interactive && t.touches === 1 && near(t.x, t.y, 22)
          ? { cx: touch.clientX, cy: touch.clientY, t0: t.event.timeStamp, horiz: false, dead: false } : null;
        return;
      }
      if (!drag) return;
      const dx = touch.clientX - drag.cx, dy = touch.clientY - drag.cy;
      if (t.type === 'touchmove' && !drag.dead) {
        if (!drag.horiz) {
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag.dead = true; return; } // a scroll: let it be
          if (Math.abs(dx) > 8) drag.horiz = true;
        }
        if (drag.horiz) reach(t.x);
      } else if (t.type === 'touchend') {
        if (!drag.horiz && !drag.dead && Math.hypot(dx, dy) < 10 && t.event.timeStamp - drag.t0 < 600) drawAll();
        drag = null;
      } else if (t.type === 'touchcancel') drag = null;
    });

    /* ---------- When ---------- */
    const arrive = () => {
      if (arrived || !played || !ruleSeen) return;
      arrived = true;
      arrival.play(0);
    };
    if ('IntersectionObserver' in window) {
      const io = ctx.observe(new IntersectionObserver((entries) => {
        ruleSeen = entries[entries.length - 1].isIntersecting;
        arrive();
      }, { rootMargin: '0px 0px -24px 0px' }));
      io.observe(base);
    } else ruleSeen = true;
    const offTick = ctx.tick(() => { const x = readLight(); if (x != null) light(x); });
    const offResize = ctx.onResize(() => { layout(); light(readLight() ?? lerp(G.x0, G.tip, 0.38)); render(); });

    layout();
    light(lerp(G.x0, G.tip, 0.38));
    render();

    return {
      play() { played = true; arrive(); },
      pause() {},
      resume() {},
      still() {
        stilled = true;
        state.fa = 1; goal = 1;
        render();
      },
      destroy() {
        gone = true;
        offTick(); offResize();
        arrival.kill(); follow.tween && follow.tween.kill();
        if (glintTween) glintTween.kill();
        if (auto) auto.kill();
        svg.remove();
      },
    };
  },
};
