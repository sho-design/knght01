/* The missing I. The one ending that uses the gap between N and G: the place of the missing I.
   The I rises there, out of the line the letters stand on, and for a moment the name reads KNIGHT. Then it sinks
   back into the line, and the blade (the mark's own sword, as under the header's wordmark) is drawn under the name
   from the point where the I fell, out both ways. The sword stays: the resting state is the full mark.
   It plays once. No caption, no replay.

   The letters never move and never change: the I fits the gap as it is (Cormorant's I, its serifs trimmed to 55% of
   their reach, with the same air to N and to G), and the sword is scaled into the room that is already under the
   letters, between their lowest ink and the footer line. It keeps the shared base: the I follows the rise, and the
   sword steps aside while the letters are lowered (they would stand on it) and comes back when they rise. */

// The I of Cormorant Garamond 500, serifs at 55% of their reach, in 1/1000 em from the top-left of a letter span
// (the space of letters.js). Stem 128 to 208, ink 81.25 to 253.75 across, 73.5 to 698.25 down.
const I_D = 'M208 617.5Q208 646.5 211.03 661.5Q214.05 676.5 223.68 681.5Q233.3 686.5 252.55 686.5Q253.65 686.5 253.65 692.5Q253.65 698.5 252.55 698.5Q238.8 698.5 222.03 697.5Q203 696.5 167 696.5Q132 696.5 113.15 697.5Q96.1 698.5 82.35 698.5Q81.25 698.5 81.25 692.5Q81.25 686.5 82.35 686.5Q101.6 686.5 111.5 681.5Q121.4 676.5 124.7 661.5Q128 646.5 128 617.5V154.5Q128 125.5 124.7 111Q121.4 96.5 111.5 91Q101.6 85.5 82.35 85.5Q81.25 85.5 81.25 79.5Q81.25 73.5 82.35 73.5Q96.1 73.5 113.15 75Q132 76.5 167 76.5Q203 76.5 222.3 75Q239.35 73.5 252.55 73.5Q253.65 73.5 253.65 79.5Q253.65 85.5 252.55 85.5Q233.3 85.5 223.95 91.5Q214.6 97.5 211.3 112.5Q208 127.5 208 156.5Z';
const I_INK = { left: 81.25, right: 253.75, top: 73.5, bottom: 698.25, stem: 168 };
// How far the I reaches into N and into G when its origin sits on N's origin (in units, measured row by row from
// the outlines): N's top right serif against the I's top left serif, and G's bowl against the I's stem.
// The I stands where the air on both sides is the same: origin = (G.x - N.x in units + FIT_N - FIT_G) / 2.
const FIT_N = 630.75, FIT_G = 159;
const INK_LOW = 714; // the lowest ink of the letters (N's foot), in units: the sword stays below it
const K_LEFT = 31, T_RIGHT = 601; // the name's ink from end to end, in units of K and T

let uid = 0;

export default {
  id: 'missing-i',
  name: 'The missing I',
  takesOver: false,

  mount(ctx) {
    const { gsap, letters, flags } = ctx;
    const id = `knght-mi-${++uid}`;
    let geo = ctx.measure();

    /* ---------- Nodes: one SVG over the letters ---------- */
    const svg = ctx.svg({ className: 'mi' });
    const make = (tag, attrs, parent = svg) => ctx.make(tag, { parent, attrs });
    const defs = make('defs', {});
    const stops = (grad, list) => list.map(([o, c, a = 1]) => make('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, grad));
    // The I's steel: the same light as the letters (site.css, .has-hall .footer__word .sheen), along its own box.
    const steelI = make('linearGradient', { id: `${id}-steel`, gradientUnits: 'userSpaceOnUse', y1: 0, y2: 0 }, defs);
    const steelIStops = stops(steelI, [[0, '#9c9c9c'], [0.28, '#dcdcdc'], [0.5, '#fff'], [0.72, '#dcdcdc'], [1, '#8f8f8f']]);
    // A band of light that runs up the I once it stands.
    const band = make('linearGradient', { id: `${id}-band`, gradientUnits: 'userSpaceOnUse', x1: 0, x2: 0 }, defs);
    stops(band, [[0, '#fff', 0], [0.5, '#fff', 0.9], [1, '#fff', 0]]);
    // The sword's steel, along its length.
    const steelS = make('linearGradient', { id: `${id}-sword`, gradientUnits: 'userSpaceOnUse', y1: 0, y2: 0 }, defs);
    const steelSStops = stops(steelS, [[0, '#8e8e8e'], [0.4, '#c8c8c8'], [0.5, '#fff'], [0.6, '#c8c8c8'], [1, '#8e8e8e']]);
    // The slit of light the I rises through, and the glints that run out along the blade.
    stops(make('linearGradient', { id: `${id}-slit` }, defs), [[0, '#fff', 0], [0.5, '#fff', 1], [1, '#fff', 0]]);
    stops(make('linearGradient', { id: `${id}-gr` }, defs), [[0, '#fff', 0], [1, '#fff', 1]]);
    stops(make('linearGradient', { id: `${id}-gl` }, defs), [[0, '#fff', 1], [1, '#fff', 0]]);
    // The I is seen only above the line the letters stand on: it rises out of it and sinks back into it.
    const clip = make('clipPath', { id: `${id}-floor`, clipPathUnits: 'userSpaceOnUse' }, defs);
    const clipRect = make('rect', {}, clip);

    const iClip = make('g', { 'clip-path': `url(#${id}-floor)` });
    const iMove = make('g', { visibility: 'hidden' }, iClip);
    make('path', { d: I_D, fill: `url(#${id}-steel)` }, iMove);
    make('path', { d: I_D, fill: `url(#${id}-band)` }, iMove);
    const slit = make('rect', { fill: `url(#${id}-slit)`, opacity: 0 });

    const sword = make('g', { fill: 'none', stroke: `url(#${id}-sword)`, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 1 });
    const seg = () => make('path', { 'vector-effect': 'non-scaling-stroke', visibility: 'hidden' }, sword);
    // Drawn from the point where the I fell: two edges out to the tip, two back to the guard, then the hilt.
    const P = { tr: seg(), br: seg(), tl: seg(), bl: seg(), gu: seg(), gd: seg(), grip: seg(), rt: seg(), rb: seg() };
    const glints = make('g', { opacity: 0 });
    const gR = [make('rect', { fill: `url(#${id}-gr)`, opacity: 0.3 }, glints), make('rect', { fill: `url(#${id}-gr)` }, glints)];
    const gL = [make('rect', { fill: `url(#${id}-gl)`, opacity: 0.3 }, glints), make('rect', { fill: `url(#${id}-gl)` }, glints)];

    /* ---------- Geometry: where the I stands, and the sword in the room under the letters ---------- */
    let L = null;
    const layout = () => {
      const k = geo.fontSize / 1000;
      const [K, N, G, , T] = geo.letters;
      const D = (G.x - N.x) / k;
      const o = (D + FIT_N - FIT_G) / 2; // the I's origin from N's, in units
      const ix = N.x + o * k, iy = N.y;
      const xi = ix + I_INK.stem * k; // the stem's centre: where the I falls, where the blade starts
      const line = iy + 699.5 * k; // just under the I's foot: the line it rises out of
      // The sword: the header mark's own drawing (viewBox 0 27 600 66: ring r16 at 30, grip to 120, guard 30 to 90,
      // blade 136 to 530 at 51 and 69, tip at 594), its hilt and point at one scale, its blade as long as the name.
      const inkLow = N.y + INK_LOW * k;
      const room = geo.baseTop - inkLow;
      const H = Math.min(geo.capHeight * 0.2, room * 0.6); // the guard's height
      const s = H / 60;
      const cy = inkLow + room / 2;
      const xL = K.x + K_LEFT * k, xR = T.x + T_RIGHT * k;
      const h = 9 * s; // half the blade
      const xg = xL + 106 * s, xb = xL + 122 * s, xs = xR - 64 * s, rr = 16 * s;
      const diag = Math.hypot(xR - xs, h);
      const sw = Math.max(1, Math.min(1.5, H / 30));
      L = {
        k, ix, iy, xi, line, cy, H, s, h, xL, xR, xg, xb, xs, sw, inkLow,
        iBox: [I_INK.left - 60, I_INK.right + 60],
        slitW: (I_INK.right - I_INK.left) * k * 1.5,
        drop: (line - (iy + I_INK.top * k)) + 2, // far enough down to be hidden
        // The two pens: to the right along both edges to the tip, to the left along both edges to the guard,
        // across the gap, then the guard both ways, the grip and the ring.
        right: (xs - xi) + diag,
        left: (xi - xb) + h + 16 * s + 74 * s + Math.PI * rr,
        edgeL: xi - xb,
        edgeR: xs - xi,
        diag,
        glint: Math.max(18, Math.min(120, (xR - xL) * 0.07)),
        gh: geo.fontSize > 200 ? 1.6 : 1.1,
      };
      const lines = {
        tr: [`M${xi} ${cy - h}H${xs}L${xR} ${cy}`, 0, xs - xi + diag, 'R'],
        br: [`M${xi} ${cy + h}H${xs}L${xR} ${cy}`, 0, xs - xi + diag, 'R'],
        tl: [`M${xi} ${cy - h}H${xb}V${cy}`, 0, xi - xb + h, 'L'],
        bl: [`M${xi} ${cy + h}H${xb}V${cy}`, 0, xi - xb + h, 'L'],
        gu: [`M${xg} ${cy}V${cy - 30 * s}`, xi - xb + h + 16 * s, 30 * s, 'L'],
        gd: [`M${xg} ${cy}V${cy + 30 * s}`, xi - xb + h + 16 * s, 30 * s, 'L'],
        grip: [`M${xg} ${cy}H${xL + 32 * s}`, xi - xb + h + 16 * s, 74 * s, 'L'],
        rt: [`M${xL + 2 * rr} ${cy}A${rr} ${rr} 0 0 0 ${xL} ${cy}`, xi - xb + h + 90 * s, Math.PI * rr, 'L'],
        rb: [`M${xL + 2 * rr} ${cy}A${rr} ${rr} 0 0 1 ${xL} ${cy}`, xi - xb + h + 90 * s, Math.PI * rr, 'L'],
      };
      L.segs = Object.entries(lines).map(([key, [d, from, len, side]]) => {
        const p = P[key];
        p.setAttribute('d', d);
        p.setAttribute('stroke-width', sw);
        return { p, from, len, side, last: -1 };
      });
      steelI.setAttribute('x1', L.iBox[0]);
      steelI.setAttribute('x2', L.iBox[1]);
      steelS.setAttribute('x1', xL);
      steelS.setAttribute('x2', xR);
      [...gR, ...gL].forEach((r, n) => {
        const tall = n % 2 === 0 ? L.gh * 4 : L.gh;
        r.setAttribute('height', tall);
        r.setAttribute('y', cy - tall / 2);
        r.setAttribute('width', L.glint);
      });
      slit.setAttribute('height', L.gh * 0.75);
      last.light = null;
    };

    /* ---------- State, drawn by one function from the timeline, the tick and a resize ---------- */
    // i: the I standing (0 below the line, 1 up). slit: the slit drawn, slitO its opacity. band: the light up the I.
    // pen: the sword drawn (0 to 1). glint: the light along the blade.
    const st = { i: 0, slit: 0, slitO: 1, band: 0, pen: 0, glint: 0 };
    const last = { light: null, lift: null, fade: null };
    const liftOf = (el, h) => ((+gsap.getProperty(el, 'yPercent') || 0) / 100) * h + (+gsap.getProperty(el, 'y') || 0);
    const lifts = () => geo.letters.map((l) => liftOf(l.el, l.h));

    // Where the hall light is, in stage x, from the letters' own --gx (site.js): null when there is none.
    const lightX = () => {
      for (const l of geo.letters) {
        const v = parseFloat(l.el.style.getPropertyValue('--gx'));
        if (Number.isFinite(v) && v > -59.5 && v < 159.5) return l.x + (v / 100) * l.w;
      }
      const a = parseFloat(letters[0].style.getPropertyValue('--gx'));
      if (Number.isFinite(a) && a <= -59.5) return geo.letters[0].x - 0.6 * geo.letters[0].w;
      const z = parseFloat(letters[4].style.getPropertyValue('--gx'));
      if (Number.isFinite(z) && z >= 159.5) return geo.letters[4].x + 1.6 * geo.letters[4].w;
      return null;
    };
    const setStops = (list, f, spread) => {
      const at = [0, f - spread, f, f + spread, 1].map((v) => Math.min(1, Math.max(0, v)));
      list.forEach((n, j) => n.setAttribute('offset', at[j].toFixed(4)));
    };
    const light = () => {
      const x = flags.reduce ? null : lightX();
      const iUp = st.i > 0.0005;
      const key = `${x == null ? 'none' : Math.round(x * 2)}:${iUp}`;
      if (key === last.light) return;
      last.light = key;
      // The sword: the brightest point under the light, or in the middle when there is no light.
      const fs = x == null ? 0.5 : (x - L.xL) / (L.xR - L.xL);
      setStops(steelSStops, fs, 0.11);
      if (!iUp) return;
      // The I: as a letter, its gradient across its own box (gx - 22%, gx, gx + 22%).
      const u = x == null ? (L.iBox[0] + L.iBox[1]) / 2 : (x - L.ix) / L.k;
      const fi = Math.max(-0.6, Math.min(1.6, (u - L.iBox[0]) / (L.iBox[1] - L.iBox[0])));
      setStops(steelIStops, fi, 0.22);
    };

    const draw = () => {
      const lift = flags.reduce ? [0, 0, 0, 0, 0] : lifts();
      const li = (lift[1] + lift[2]) / 2; // between N and G
      // The I and its line, following the rise.
      const up = st.i > 0.0005;
      iMove.setAttribute('visibility', up ? 'visible' : 'hidden');
      if (up) {
        const y = L.iy + li + (1 - st.i) * L.drop;
        iMove.setAttribute('transform', `translate(${L.ix.toFixed(2)} ${y.toFixed(2)}) scale(${L.k.toFixed(5)})`);
        const by = I_INK.bottom + 120 - st.band * (I_INK.bottom - I_INK.top + 240);
        band.setAttribute('y1', (by + 110).toFixed(1));
        band.setAttribute('y2', (by - 110).toFixed(1));
      }
      clipRect.setAttribute('x', (L.xi - L.slitW * 2).toFixed(1));
      clipRect.setAttribute('width', (L.slitW * 4).toFixed(1));
      clipRect.setAttribute('y', (L.line + li - geo.height * 2).toFixed(1));
      clipRect.setAttribute('height', (geo.height * 2).toFixed(1));
      const sw = st.slit * L.slitW;
      slit.setAttribute('opacity', sw > 0.5 ? (st.slitO * 0.85).toFixed(3) : 0);
      slit.setAttribute('x', (L.xi - sw / 2).toFixed(2));
      slit.setAttribute('width', sw.toFixed(2));
      slit.setAttribute('y', (L.line + li - L.gh * 0.375).toFixed(2));

      // The sword, drawn by two pens from the I's point; it steps aside while the letters are lowered onto it.
      const dR = st.pen * L.right, dL = st.pen * L.left;
      L.segs.forEach((g) => {
        const done = Math.max(0, Math.min(g.len, (g.side === 'R' ? dR : dL) - g.from));
        const q = done >= g.len - 0.05 ? g.len : Math.round(done * 4) / 4;
        if (q === g.last) return;
        g.last = q;
        g.p.setAttribute('visibility', q > 0 ? 'visible' : 'hidden');
        g.p.setAttribute('stroke-dasharray', q >= g.len ? 'none' : `${q} ${g.len + 10}`);
      });
      const low = Math.max(0, Math.max(...lift) - 0.5); // half a pixel of the scrub still settling is at rest
      const fade = Math.max(0, Math.min(1, 1 - low / Math.max(2, (L.cy - L.H / 2 - L.inkLow) * 0.8)));
      if (fade !== last.fade) { last.fade = fade; sword.setAttribute('opacity', fade.toFixed(3)); }

      // The glints ride the pens along the middle of the blade, and go out as the pens leave it.
      const gOn = st.glint > 0.001 && st.pen > 0 && st.pen < 1;
      glints.setAttribute('opacity', gOn ? (st.glint * fade).toFixed(3) : 0);
      if (gOn) {
        const xr = L.xi + Math.min(dR, L.edgeR) + Math.max(0, dR - L.edgeR) * ((L.xR - L.xs) / L.diag);
        const xl = L.xi - Math.min(dL, L.edgeL);
        const aR = Math.max(0, Math.min(1, (L.right - dR) / (L.glint * 1.5)));
        const aL = Math.max(0, Math.min(1, (L.edgeL - dL) / (L.glint * 0.8) + 0.0001));
        const wR = Math.min(L.glint, xr - L.xi), wL = Math.min(L.glint, L.xi - xl);
        gR.forEach((r) => { r.setAttribute('x', (xr - wR).toFixed(2)); r.setAttribute('width', Math.max(0, wR).toFixed(2)); });
        gL.forEach((r) => { r.setAttribute('x', xl.toFixed(2)); r.setAttribute('width', Math.max(0, wL).toFixed(2)); });
        gR.forEach((r, n) => r.setAttribute('opacity', ((n ? 1 : 0.3) * aR).toFixed(3)));
        gL.forEach((r, n) => r.setAttribute('opacity', ((n ? 1 : 0.3) * aL).toFixed(3)));
      }
      light();
    };

    layout();
    draw();
    const offResize = ctx.onResize((next) => { geo = next; layout(); L.segs.forEach((g) => { g.last = -1; }); draw(); });

    /* ---------- The moment, once ---------- */
    const tl = gsap.timeline({ paused: true, onUpdate: draw });
    tl.to(st, { slit: 1, duration: 0.5, ease: 'power2.out' }, 0.3)
      .to(st, { i: 1, duration: 1.3, ease: 'power3.out' }, 0.5)
      .to(st, { slitO: 0, duration: 0.7, ease: 'power1.out' }, 1.0)
      .to(st, { band: 1, duration: 1.1, ease: 'power2.inOut' }, 1.45)
      // KNIGHT, held. Then the I sinks into the line, and the blade is drawn out of the point where it fell.
      .to(st, { i: 0, duration: 0.75, ease: 'power3.in' }, 3.7)
      .to(st, { pen: 1, duration: 2.0, ease: 'power3.out' }, 4.32)
      .to(st, { glint: 1, duration: 0.12, ease: 'none' }, 4.32)
      .to(st, { glint: 0, duration: 0.9, ease: 'power1.in' }, 5.1);

    // It starts once the letters have finished their rise (at once after a swap: they are already up).
    let armed = false, started = false, paused = false;
    const risen = () => lifts().every((v) => Math.abs(v) < 1.5);
    const offTick = ctx.tick(() => {
      if (armed && !started && !paused && risen()) {
        started = true;
        tl.play(0);
      }
      if (tl.isActive()) return; // the timeline draws while it plays
      // Otherwise follow the rise (only when the letters move) and the light (only when it moves).
      const key = lifts().map((v) => Math.round(v * 4)).join(',');
      if (key !== last.lift) { last.lift = key; draw(); } else light();
    });

    return {
      play: () => { armed = true; },
      pause: () => { paused = true; if (started) tl.pause(); },
      resume: () => { paused = false; if (started && tl.progress() < 1) tl.resume(); },
      // Reduced motion: the end, at once: KNGHT on its sword. No I, no light running.
      still: () => {
        armed = false;
        tl.progress(1).pause();
        draw();
      },
      destroy: () => {
        offTick();
        offResize();
        tl.kill();
        svg.remove();
      },
    };
  },
};
