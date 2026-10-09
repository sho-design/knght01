/* Dusk. The end of the page is the end of the day. The scroll sets a low sun behind the reader: the last light lies
   on the floor the name stands on, and the letters' shadows swing across it and grow long. In the gap between N and
   G, where no letter stands, a sixth shadow grows with them, with nothing there to cast it. By the time the footer is
   mostly in view it stands upright: the knght. Light comes through its eye, and it blinks once, slowly.

   Scroll back up and the day comes back: the shadows shorten and lean away, and the knight goes with them.
   Reduced motion: the last light, drawn once. The knight stands in the gap, its eye lit. Nothing moves.

   How it is drawn. One canvas on the backdrop, behind every word, cut to the band from just under the links to the
   footer line, so no light ever falls behind a link, the email or the line below. The light is a soft band on the
   floor under the name; it is dark where it meets the links and the line. The shadows are the letters' own outlines
   (letters.js) laid on the floor by one perspective: sharp where they leave a letter, soft where they end. The
   knight's shadow is worked back from where it must stand at the last light (fitted into the free space between the
   N and the G), so it swings and stretches with the letters on the way there. Drawn only when the sun or the rise
   has moved, never off screen, at a capped resolution. */
import { LETTERS } from '../letters.js';

// gsap's path parser, from the host's MotionPathPlugin (set in mount). Not imported: an import of gsap/utils/paths.js
// would make the host's chunk, which every visit loads, export it.
let stringToRawPath = null;

const ID = 'dusk';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- The knight on its 24 grid ---------- */
const AXIS = 11.9;   // the plinth's centre: it stands on the gap's middle
const BAR = 0.5;     // half the thickness of a plinth line, as a shadow
const FOOT = 21.5 + BAR; // its lowest point: on the floor
const EAR = 2.4;     // its highest
const BARS = [[5.6, 18.2, 19.4], [4.6, 19.2, 21.5]]; // the plinth's two lines: from x, to x, at y

// A path as polygons (each subpath a flat [x, y, x, y, ...] list), curves cut into short straight steps.
const flatten = (d, steps = 6) => stringToRawPath(d).map((seg) => {
  const out = [seg[0], seg[1]];
  for (let i = 2; i + 5 < seg.length; i += 6) {
    const x0 = seg[i - 2], y0 = seg[i - 1], x1 = seg[i], y1 = seg[i + 1], x2 = seg[i + 2], y2 = seg[i + 3], x3 = seg[i + 4], y3 = seg[i + 5];
    const len = Math.hypot(x3 - x0, y3 - y0) || 1;
    const off = (x, y) => Math.abs((x3 - x0) * (y0 - y) - (x0 - x) * (y3 - y0)) / len;
    const n = off(x1, y1) + off(x2, y2) < 0.02 * len + 0.05 ? 1 : steps;
    for (let s = 1; s <= n; s++) {
      const t = s / n, u = 1 - t;
      out.push(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
    }
  }
  return out;
});

// Every outline turning the same way, so shadows that cross add up instead of cutting holes (a letter's own
// inner contours keep turning the other way).
const area = (p) => { let a = 0; for (let i = 0; i < p.length; i += 2) { const j = (i + 2) % p.length; a += p[i] * p[j + 1] - p[j] * p[i + 1]; } return a / 2; };
const reverse = (p) => { const q = []; for (let i = p.length - 2; i >= 0; i -= 2) q.push(p[i], p[i + 1]); return q; };
const orient = (polys) => {
  const big = polys.reduce((m, p) => (Math.abs(area(p)) > Math.abs(area(m)) ? p : m), polys[0]);
  return area(big) < 0 ? polys.map(reverse) : polys;
};
const same = (polys) => polys.map((p) => (area(p) < 0 ? reverse(p) : p));

// A plinth line as a shadow: a bar with round ends, as a polygon on the grid.
const capsule = ([a, b, y]) => {
  const out = [];
  for (let i = 0; i <= 6; i++) { const t = Math.PI / 2 + (i / 6) * Math.PI; out.push(a + BAR * Math.cos(t), y - BAR * Math.sin(t)); }
  for (let i = 0; i <= 6; i++) { const t = -Math.PI / 2 + (i / 6) * Math.PI; out.push(b + BAR * Math.cos(t), y - BAR * Math.sin(t)); }
  return out;
};

export default {
  id: ID,
  name: 'Dusk',
  takesOver: false,

  mount(ctx) {
    const { gsap, letters, stage, flags } = ctx;
    stringToRawPath = ctx.plugins.MotionPathPlugin.stringToRawPath;
    const head = ctx.knight.d.slice(0, ctx.knight.d.indexOf('Z') + 1);
    const KNIGHT = same([...flatten(head, 8), ...BARS.map(capsule)]); // on the grid, one solid shape
    const EYE = ctx.knight.eye;

    /* ---------- Canvases: one on the page, three off it ---------- */
    const cv = ctx.make('canvas', { parent: ctx.backdrop, className: 'dusk' });
    const g = cv.getContext('2d');
    const off = () => { const c = document.createElement('canvas'); return [c, c.getContext('2d')]; };
    const [sc, sg] = off(); // the shadows, sharp
    const [bc, bg] = off(); // the shadows, small: drawn up large, they are soft
    const [tc, tg] = off(); // the soft shadows at full size

    /* ---------- Geometry: measured on mount and on every resize ---------- */
    let geo, band, dpr, soft, letterPolys, knightPhantom, eyeAt, eyeR, VX, HC, G1, ready = false;

    // The ink of the N and the G, row by row: drawn once into a small canvas and read back.
    const gapRows = () => {
      const k = geo.fontSize / 1000, N = geo.letters[1], G = geo.letters[2];
      const x0 = Math.floor(N.x), x1 = Math.ceil(G.x + G.w), y0 = Math.floor(geo.capTop - 4), y1 = Math.ceil(geo.baseline + 2);
      const w = x1 - x0, h = y1 - y0;
      if (w < 4 || h < 4) return null;
      try {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.fillStyle = '#f00';
        x.setTransform(k, 0, 0, k, N.x - x0, N.y - y0); x.fill(new Path2D(LETTERS.N.d));
        x.fillStyle = '#0f0';
        x.globalCompositeOperation = 'lighter';
        x.setTransform(k, 0, 0, k, G.x - x0, G.y - y0); x.fill(new Path2D(LETTERS.G.d));
        const px = x.getImageData(0, 0, w, h).data;
        const rows = [];
        for (let yy = h - 1; yy >= 0; yy--) {
          let nr = -1, gl = w;
          for (let xx = w - 1; xx >= 0; xx--) if (px[(yy * w + xx) * 4] > 100) { nr = xx; break; }
          for (let xx = 0; xx < w; xx++) if (px[(yy * w + xx) * 4 + 1] > 100) { gl = xx; break; }
          rows.push({ h: geo.baseline - (y0 + yy + 0.5), nr: x0 + nr + 1, gl: x0 + gl });
        }
        return rows; // from the floor up
      } catch (e) {
        return null;
      }
    };
    // The knight's width, row by row on the grid.
    let knightRows = null;
    const readKnight = () => {
      if (knightRows) return knightRows;
      const S = 10, c = document.createElement('canvas');
      c.width = 24 * S; c.height = 24 * S;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.scale(S, S);
      x.beginPath();
      KNIGHT.forEach((p) => { p.forEach((v, i) => { if (i % 2) return; if (i) x.lineTo(v, p[i + 1]); else x.moveTo(v, p[1]); }); x.closePath(); });
      x.fill();
      const px = x.getImageData(0, 0, 24 * S, 24 * S).data;
      knightRows = [];
      for (let gy = EAR; gy <= FOOT; gy += 0.25) {
        const yy = Math.round(gy * S);
        let l = -1, r = -1;
        for (let xx = 0; xx < 24 * S; xx++) if (px[(yy * 24 * S + xx) * 4 + 3] > 100) { if (l < 0) l = xx; r = xx; }
        if (l >= 0) knightRows.push({ gy, l: l / S, r: (r + 1) / S });
      }
      return knightRows;
    };

    // The biggest knight that stands in the gap with air on both sides, and where its axis goes.
    const fit = () => {
      const rows = gapRows();
      const kr = readKnight();
      const capH = geo.capHeight;
      const air = Math.max(2, capH * 0.045);
      const N = geo.letters[1], G = geo.letters[2];
      const fallback = { kk: (capH * 0.5) / (FOOT - EAR), xc: (N.x + N.w + G.x) / 2 + capH * 0.06 };
      if (!rows || !rows.length) return fallback;
      const at = (h) => rows[clamp(Math.round(h - rows[0].h), 0, rows.length - 1)] || rows[0];
      for (let kk = (capH * 0.64) / (FOOT - EAR); kk > (capH * 0.3) / (FOOT - EAR); kk *= 0.98) {
        let lo = -Infinity, hi = Infinity;
        for (const r of kr) {
          const row = at((FOOT - r.gy) * kk);
          lo = Math.max(lo, row.nr + air - (r.l - AXIS) * kk);
          hi = Math.min(hi, row.gl - air - (r.r - AXIS) * kk);
        }
        if (lo <= hi) return { kk, xc: (lo + hi) / 2 };
      }
      return fallback;
    };

    const layout = () => {
      geo = ctx.measure();
      const room = geo.capTop - geo.linksBottom;
      // The band the light may fall in: from just under the links to the footer line, the stage's width.
      band = { x: 0, y: Math.ceil(geo.linksBottom + Math.max(6, room * 0.12)), w: Math.round(geo.width), h: 0 };
      band.h = Math.floor(geo.baseTop) - band.y;
      const phone = geo.width < 700;
      // Half the screen's resolution (one canvas pixel per CSS pixel on a 2x phone): the light is a smooth gradient and a
      // shadow is soft, so the browser scales the canvas up for nothing and every pass touches a quarter of the pixels.
      dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
      soft = 0.5; // the soft shadows: half that again, scaled up, is the penumbra
      const back = geo.back;
      Object.assign(cv.style, { left: `${band.x - back.x}px`, top: `${band.y - back.y}px`, width: `${band.w}px`, height: `${band.h}px` });
      [[cv, dpr], [sc, dpr], [tc, dpr], [bc, dpr * soft]].forEach(([c, d]) => {
        c.width = Math.max(1, Math.round(band.w * d));
        c.height = Math.max(1, Math.round(band.h * d));
      });

      // The letters' outlines in stage pixels: x, and the height above the baseline.
      const k = geo.fontSize / 1000;
      letterPolys = geo.letters.map((L) => orient(flatten(LETTERS[L.ch].d)).map((p) => p.map((v, i) => (i % 2 ? geo.baseline - (L.y + v * k) : L.x + v * k))));

      // The floor in perspective: the horizon far above, the shadows leaning a little toward the knight.
      const f = fit();
      VX = f.xc;
      HC = geo.capHeight * 40;
      // At the last light the sun is right behind the reader: every shadow lies straight back behind its letter,
      // a little longer than the letter is tall, so the letters hide their own shadows. Only one stays in sight.
      const reach = geo.capHeight * 1.05;
      G1 = reach / (1 - reach / HC) / geo.capHeight;
      // Work back from the knight standing in the gap at the last light to the shape that would cast it.
      const unproject = (X, up) => {
        const s = 1 - up / HC, d = up / s;
        return [VX + (X - VX) / s, d / G1];
      };
      const to = (gx, gy) => unproject(f.xc + (gx - AXIS) * f.kk, (FOOT - gy) * f.kk);
      knightPhantom = KNIGHT.map((p) => {
        const q = [];
        for (let i = 0; i < p.length; i += 2) q.push(...to(p[i], p[i + 1]));
        return q;
      });
      eyeAt = to(EYE.cx, EYE.cy);
      eyeR = Math.max(EYE.r * f.kk * 1.1, phone ? 1.5 : 2);
      ready = true;
      last = '';
    };

    /* ---------- The sun, for a scroll progress p from 0 (the footer arriving) to 1 (the footer in view) ---------- */
    const sunAt = (p) => {
      const t = clamp(p / 0.84, 0, 1);
      const q = 1 - Math.pow(1 - t, 2); // it settles: the knight stands well before the end of the scroll
      return {
        gain: G1 * Math.pow(0.18, 1 - q), // the shadows' length: short in the afternoon, long at dusk
        lean: 0.9 * Math.pow(1 - q, 1.15), // they lean right at first, then swing round behind the letters
        knight: smooth(0.4, 0.76, p), // the shadow with no letter, growing while its feet are in view
        focus: 0.9 * smooth(0.52, 0.82, p), // soft while it grows, in focus once it stands (a shadow keeps a little blur)
        eye: smooth(0.74, 0.86, p),
        light: smooth(0, 0.9, p),
      };
    };

    /* ---------- One frame ---------- */
    const lift = (i) => ((+gsap.getProperty(letters[i], 'yPercent') || 0) / 100) * geo.letters[i].h + (+gsap.getProperty(letters[i], 'y') || 0);
    const state = { p: 0, blink: 1 };
    let last = '';
    const trace = (c, polys, base, sun, scale) => {
      for (const p of polys) {
        for (let i = 0; i < p.length; i += 2) {
          const h = Math.max(0, p[i + 1]), d = h * sun.gain, s = 1 / (1 + d / HC);
          const X = VX + (p[i] + h * sun.lean - VX) * s, Y = base - d * s;
          if (i) c.lineTo(X * scale, Y * scale); else c.moveTo(X * scale, Y * scale);
        }
        c.closePath();
      }
    };
    const begin = (c, d, clear) => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (clear) c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      c.setTransform(1, 0, 0, 1, -band.x * d, -band.y * d);
      c.fillStyle = '#000';
      c.beginPath();
    };
    const letterShadows = (c, d, sun, offs) => {
      begin(c, d, true);
      letterPolys.forEach((polys, i) => trace(c, polys, geo.baseline + offs[i], sun, d));
      c.fill();
    };
    const knightShadow = (c, d, sun, alpha, clear) => {
      begin(c, d, clear);
      trace(c, knightPhantom, geo.baseline, sun, d);
      c.globalAlpha = alpha;
      c.fill();
      c.globalAlpha = 1;
    };
    const render = () => {
      if (!ready) return;
      const offs = letters.map((_, i) => lift(i));
      const key = `${state.p.toFixed(4)}|${state.blink.toFixed(3)}|${offs.map((o) => o.toFixed(1)).join(',')}`;
      if (key === last) return; // nothing moved: draw nothing
      last = key;
      const sun = sunAt(state.p);
      const { capHeight: capH, baseline: base, baseTop, capTop } = geo;
      const top = band.y, bottom = band.y + band.h;

      // The letters' shadows: sharp and dark where they leave a letter, soft and paler where they end.
      letterShadows(sg, dpr, sun, offs);
      letterShadows(bg, dpr * soft, sun, offs);
      const fade = (c, up) => {
        c.setTransform(dpr, 0, 0, dpr, -band.x * dpr, -band.y * dpr);
        const gr = c.createLinearGradient(0, base, 0, base - capH * 1.1);
        gr.addColorStop(0, up ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
        gr.addColorStop(1, up ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)');
        c.globalCompositeOperation = 'destination-in';
        c.fillStyle = gr;
        c.fillRect(band.x, top, band.w, band.h);
        c.globalCompositeOperation = 'source-over';
      };
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.clearRect(0, 0, tc.width, tc.height);
      tg.imageSmoothingEnabled = true;
      tg.imageSmoothingQuality = 'high';
      tg.drawImage(bc, 0, 0, tc.width, tc.height);
      fade(tg, true);
      fade(sg, false);
      // The knight's shadow: soft while it grows, in focus once it stands.
      if (sun.knight > 0.002) {
        if (sun.focus > 0.002) knightShadow(sg, dpr, sun, sun.knight * sun.focus, false);
        if (sun.focus < 0.998) {
          knightShadow(bg, dpr * soft, sun, sun.knight * (1 - sun.focus), true);
          tg.setTransform(1, 0, 0, 1, 0, 0);
          tg.drawImage(bc, 0, 0, tc.width, tc.height);
        }
      }
      sg.setTransform(1, 0, 0, 1, 0, 0);
      sg.drawImage(tc, 0, 0);
      // Light through the knight's eye, once it stands.
      const eye = sun.eye * sun.knight;
      if (eye > 0.002) {
        const s = 1 / (1 + (eyeAt[1] * sun.gain) / HC);
        const ex = VX + (eyeAt[0] + eyeAt[1] * sun.lean - VX) * s, ey = base - eyeAt[1] * sun.gain * s;
        sg.setTransform(dpr, 0, 0, dpr, -band.x * dpr, -band.y * dpr);
        sg.globalCompositeOperation = 'destination-out';
        sg.globalAlpha = eye;
        sg.beginPath();
        sg.ellipse(ex, ey, eyeR, Math.max(0.05, eyeR * state.blink), 0, 0, Math.PI * 2);
        sg.fill();
        sg.globalAlpha = 1;
        sg.globalCompositeOperation = 'source-over';
      }

      // The light: a band on the floor under the name, dark long before the links and at the footer line.
      // At dusk it sinks and the far floor goes first.
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(dpr, 0, 0, dpr, -band.x * dpr, -band.y * dpr);
      const L = sun.light;
      const peak = lerp(0.2, 0.18, L);
      const yy = (y) => clamp((y - top) / band.h, 0, 1);
      const a = (v) => `rgba(255,255,255,${(peak * v).toFixed(4)})`;
      const gl = g.createLinearGradient(0, top, 0, bottom);
      gl.addColorStop(0, a(0));
      gl.addColorStop(yy(capTop), a(lerp(0.16, 0.04, L)));
      gl.addColorStop(yy(base - capH * 0.7), a(lerp(0.7, 0.5, L)));
      gl.addColorStop(yy(base - capH * 0.45), a(lerp(0.92, 0.84, L)));
      gl.addColorStop(yy(base - capH * 0.1), a(1));
      gl.addColorStop(yy(base + (baseTop - base) * 0.4), a(0.8));
      gl.addColorStop(yy(baseTop - 3), a(0)); // dark a little before the line, at any resolution
      gl.addColorStop(1, a(0));
      g.fillStyle = gl;
      g.fillRect(band.x, top, band.w, band.h);
      // Only under the name: it fades out past the K and the T.
      const L0 = geo.letters[0], L4 = geo.letters[4];
      const x0 = L0.x + L0.w * 0.1, x1 = L4.x + L4.w * 0.9, edge = Math.max(24, (x1 - x0) * 0.1);
      const hx = g.createLinearGradient(x0 - edge, 0, x1 + edge, 0);
      const w = x1 - x0 + 2 * edge;
      hx.addColorStop(0, 'rgba(0,0,0,0)');
      hx.addColorStop((edge * 1.6) / w, 'rgba(0,0,0,1)');
      hx.addColorStop(1 - (edge * 1.6) / w, 'rgba(0,0,0,1)');
      hx.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = hx;
      g.fillRect(band.x, top, band.w, band.h);
      // Where a shadow falls, the light is gone (a little skylight stays).
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'destination-out';
      g.globalAlpha = 0.9;
      g.drawImage(sc, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    };

    /* ---------- The scroll sets the sun ---------- */
    // 0 when a quarter of the letters has come up over the bottom of the screen, 1 when the footer line is in view.
    // The knight stands at about 0.82: its feet and the floor in view, some way before the end of the page.
    const target = () => {
      const r = stage.getBoundingClientRect(), vh = window.innerHeight;
      const a = r.top + geo.capTop + geo.capHeight * 0.25, b = r.top + geo.baseTop + 10;
      return clamp((vh - a) / Math.max(1, b - a), 0, 1);
    };
    let follow = null;
    let played = false, intro = null, aim = -1, blinked = false, blinkTl = null;
    const blink = ctx.add(() => {
      if (blinked) return;
      blinked = true;
      // The eye has opened with the last light; a beat, then one slow blink.
      blinkTl = gsap.timeline({ delay: 0.9 })
        .to(state, { blink: 0.04, duration: 0.32, ease: 'power2.in' })
        .to(state, { blink: 1, duration: 0.5, ease: 'power2.out' }, '>+0.12');
    });
    const sunset = ctx.add((to) => {
      // Arriving at the bottom at once (a swap, a jump): the sun sets in time, then follows the scroll.
      intro = gsap.fromTo(state, { p: 0 }, {
        p: to, duration: lerp(1.6, 3.4, to), ease: 'sine.inOut',
        onComplete: () => { intro = null; aim = -1; },
      });
    });

    layout();
    if (!flags.reduce) render(); // under reduced motion still() draws the one picture
    // The sun follows the scroll with a little weight, like a scrub. The tweens only move numbers: the tick draws, once a frame.
    follow = gsap.quickTo(state, 'p', { duration: geo.width < 700 ? 1.3 : 1.1, ease: 'power2.out' });
    const offResize = ctx.onResize(() => { layout(); render(); });
    const offTick = flags.reduce ? () => {} : ctx.tick(() => {
      if (played && !intro) {
        const t = target();
        if (Math.abs(t - aim) > 0.0004) { aim = t; follow(t); }
      }
      if (played && !blinked && state.p > 0.86) blink();
      render(); // writes only when the sun or a letter has moved
    });

    return {
      play() {
        played = true;
        const t = target();
        if (t > 0.45) sunset(t);
      },
      pause() {
        if (intro) intro.pause();
        if (blinkTl) blinkTl.pause();
      },
      resume() {
        if (intro) intro.resume();
        if (blinkTl) blinkTl.resume();
      },
      still() {
        // The last light, drawn once: the knight standing, its eye lit.
        blinked = true;
        state.p = 1;
        state.blink = 1;
        last = '';
        render();
      },
      destroy() {
        // Nothing draws from here on: the host reverts the tweens after this, and a revert calls their onUpdate.
        ready = false;
        offTick();
        offResize();
        if (intro) intro.kill();
        if (blinkTl) blinkTl.kill();
        gsap.killTweensOf(state);
        [sc, bc, tc].forEach((c) => { c.width = 0; c.height = 0; });
        cv.remove();
      },
    };
  },
};
