/* Candle. A small light stands in front of the name, and the letters cast long soft shadows across the floor
   behind them. Hold the light in the gap between the N and the G, where the I is missing, and the shadows of the N
   and the G lean together, like two hands making a shadow puppet, and cast the knght: the missing I as a shadow,
   its stem on the floor in the gap and the knght's head over the name.

   On arrival the light is lit beside the T and walks in by itself, the shadows swinging round as it passes, and it
   comes to rest in the gap. On a desktop the pointer then carries the light while it is on the name; when it goes
   up to the links, down to the footer line or out of the footer, the light walks back to the gap. On a phone a
   sideways drag along the name carries it (a scroll is left alone), and it walks back a moment after the finger lifts.

   The shadows are honest: each one is the live glyph, traced from the font as it is drawn, projected from a point
   light onto a floor seen in perspective. The figure is traced too: the font's own I, standing in the gap, with the
   knght's head where its top serif would be. The floor stays black. The light makes a faint grey pool around itself,
   and all of it, pool and shadows, lives in one band on the backdrop, behind every word: from under the links and
   the email down to the footer line. Nothing is drawn over a link, the email or the swap knght.
   It keeps the shared base: the shadows rise with the letters. It draws only while something moves, with no blur
   filter. Reduced motion: the light rests in the gap and the knght stands, drawn once. */

const M = 200;           // points on every outline, so any outline can become any other
const TMAX = 40;         // how far a shadow may run before it reaches the horizon
const AXIS = 11.9;       // the knght's centre line on the 24 grid (ctx.knight)
const EAR = 2.4, JAW = 13.2, CUT = 15; // on the grid: its ear tip, its jaw, and where its neck meets the stem
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- Outlines, traced from pixels, so a shadow is cast by whatever font is on screen ---------- */
const DX = [-1, -1, 0, 1, 1, 1, 0, -1], DY = [0, -1, -1, -1, 0, 1, 1, 1];
const dirOf = (dx, dy) => { for (let i = 0; i < 8; i++) if (DX[i] === dx && DY[i] === dy) return i; return 0; };
// Moore-neighbour tracing of the outer edge of the first shape found.
const trace = (data, w, h) => {
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 127;
  let x0 = -1, y0 = -1;
  for (let y = 0; y < h && x0 < 0; y++) for (let x = 0; x < w; x++) if (on(x, y)) { x0 = x; y0 = y; break; }
  if (x0 < 0) return [];
  const pts = [[x0, y0]];
  let cx = x0, cy = y0, b = 0;
  for (let it = 0; it < w * h; it++) {
    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const d = (b + k) % 8, nx = cx + DX[d], ny = cy + DY[d];
      if (!on(nx, ny)) continue;
      const pd = (d + 7) % 8;
      b = dirOf(cx + DX[pd] - nx, cy + DY[pd] - ny);
      cx = nx; cy = ny; moved = true;
      break;
    }
    if (!moved || (cx === x0 && cy === y0)) break;
    pts.push([cx, cy]);
  }
  return pts;
};
// The same edge as n points evenly spaced along it, lightly smoothed.
const resample = (pts, n) => {
  const L = [0];
  for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], c = pts[i % pts.length]; L.push(L[i - 1] + Math.hypot(c[0] - a[0], c[1] - a[1])); }
  const total = L[pts.length], out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / n) * total;
    while (j < pts.length - 1 && L[j + 1] < s) j++;
    const a = pts[j], c = pts[(j + 1) % pts.length], f = (s - L[j]) / ((L[j + 1] - L[j]) || 1);
    out.push([a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f]);
  }
  for (let p = 0; p < 2; p++) {
    const o = out.map((q) => q.slice());
    for (let i = 0; i < n; i++) {
      const a = o[(i + n - 1) % n], c = o[(i + 1) % n];
      out[i][0] = (a[0] + 2 * o[i][0] + c[0]) / 4; out[i][1] = (a[1] + 2 * o[i][1] + c[1]) / 4;
    }
  }
  return out;
};
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], c = p[(i + 1) % p.length]; s += a[0] * c[1] - c[0] * a[1]; } return s / 2; };
// Draw a shape into a small canvas of its own (never added to the page) and trace it: n points, clockwise on screen.
const outline = (draw, w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  draw(g);
  const raw = trace(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
  if (raw.length < 8) return null;
  const pts = resample(raw.map(([x, y]) => [x + 0.5, y + 0.5]), M);
  return area(pts) < 0 ? pts.reverse() : pts;
};
// The cyclic offset that pairs the points of a with those of b most closely (each scaled to its own box).
const pairing = (a, b) => {
  const norm = (A) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    A.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    return A.map(([x, y]) => [(x - x0) / (x1 - x0 || 1), (y - y0) / (y1 - y0 || 1)]);
  };
  const p = norm(a), q = norm(b);
  let best = 0, bestD = Infinity;
  for (let o = 0; o < M; o++) {
    let d = 0;
    for (let j = 0; j < M; j += 2) { const u = p[j], v = q[(j + o) % M]; d += (u[0] - v[0]) ** 2 + (u[1] - v[1]) ** 2; }
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
};

export default {
  id: 'candle',
  name: 'Candle',
  takesOver: false,

  mount(ctx) {
    const { gsap, letters, flags } = ctx;
    const uid = `candle-${Math.random().toString(36).slice(2, 8)}`;

    /* ---------- Nodes: the floor on the backdrop (behind every word), the flame on the overlay ---------- */
    const floor = ctx.make('canvas', { parent: ctx.backdrop, className: 'candle__floor' });
    const g = floor.getContext('2d');
    const near = document.createElement('canvas'); // the shadows where they leave their letters (never in the page)
    const gn = near.getContext('2d');
    const far = document.createElement('canvas'); // the same shadows, softer, for where they end
    const gf = far.getContext('2d');
    const hasFilter = !!gn && 'filter' in gn;

    const svg = ctx.svg({ className: 'candle__flame' });
    const defs = ctx.make('defs', { parent: svg });
    const glow = ctx.make('radialGradient', { parent: defs, attrs: { id: `${uid}-glow` } });
    [[0, 0.5], [0.18, 0.2], [0.5, 0.05], [1, 0]].forEach(([o, a]) => ctx.make('stop', { parent: glow, attrs: { offset: o, 'stop-color': '#fff', 'stop-opacity': a } }));
    const flame = ctx.make('g', { parent: svg, attrs: { opacity: 0 } });
    const halo = ctx.make('circle', { parent: flame, attrs: { cx: 0, cy: 0, r: 20, fill: `url(#${uid}-glow)` } });
    const core = ctx.make('circle', { parent: flame, attrs: { cx: 0, cy: 0, r: 1.6, fill: '#fff' } });

    /* ---------- Geometry ---------- */
    let geo = null, B = null, q = 1, qs = 0.75, qf = 0.2, ready = false, phone = false;
    let shapes = [], figure = null, pairs = [0, 0];
    const cam = { vx: 0, Hc: 0, D: 0, Lz: 0 };
    const fig = { kk: 1, earY: 0, eye: [0, 0], head: [0, 0], r: 1, shift: -1.2 };
    const gap = { x: 0, half: 0, rest: { x: 0, y: 0 } };
    const range = { x0: 0, x1: 0, y0: 0, y1: 0 }; // where the light may stand
    const fontOf = (px) => { const cs = getComputedStyle(letters[0]); return `${cs.fontStyle} ${cs.fontWeight} ${px}px ${cs.fontFamily}`; };

    // Each letter as it is drawn: in em, from its pen, y up from the baseline.
    const traceLetters = () => {
      const R = 240, pad = R * 0.3, top = R * 1.1;
      return letters.map((el) => {
        const pts = outline((c) => {
          c.font = fontOf(R);
          c.textBaseline = 'alphabetic';
          c.fillText(el.textContent, pad, top);
        }, Math.round(R * 1.6), Math.round(R * 1.4));
        return pts && pts.map(([x, y]) => [(x - pad) / R, (top - y) / R]);
      });
    };

    // The figure the N and the G become, in stage pixels: the I that is missing, as the font draws it, standing in
    // the gap, with the knght's head in place of its top serif. The head fills the room over the letters.
    const traceFigure = () => {
      const C = geo.capHeight, base = geo.baseline, S = 2; // traced at twice the size, for a clean edge
      const { kk, earY } = fig;
      const hx = gap.x + fig.shift * kk; // the head sits a little toward the N, so its face clears the G
      const x0 = hx - 10 * kk - 8, x1 = hx + 10 * kk + 8, y0 = earY - 6, y1 = base + C * 0.05 + 4;
      const yCut = earY + (CUT - EAR) * kk;
      const pts = outline((c) => {
        c.scale(S, S);
        c.translate(-x0, -y0);
        // The head and the top of the neck.
        c.save();
        c.beginPath(); c.rect(x0, y0, x1 - x0, yCut - y0); c.clip();
        c.translate(hx - AXIS * kk, earY - EAR * kk);
        c.scale(kk, kk);
        c.fill(new Path2D(ctx.knight.d));
        c.restore();
        const edges = (y) => {
          const row = c.getImageData(0, Math.max(0, Math.round((y - y0) * S)), Math.round((x1 - x0) * S), 1).data;
          let l = -1, r = -1;
          for (let i = 0; i < row.length / 4; i++) if (row[i * 4 + 3] > 127) { if (l < 0) l = i; r = i; }
          return l < 0 ? null : [x0 + l / S, x0 + (r + 1) / S];
        };
        const neck = edges(yCut - 1.5);
        // The I, without its top serif.
        c.font = fontOf(geo.fontSize);
        c.textBaseline = 'alphabetic';
        const m = c.measureText('I');
        const pen = gap.x - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
        const yJoin = geo.capTop + C * 0.14;
        c.save();
        c.beginPath(); c.rect(x0, yJoin, x1 - x0, y1 - yJoin); c.clip();
        c.fillText('I', pen, base);
        c.restore();
        const stem = edges(base - C * 0.5) || [gap.x - C * 0.05, gap.x + C * 0.05];
        if (!neck) return;
        // The neck narrows into the stem.
        const yT = Math.max(yCut + C * 0.28, yJoin + 2), L = yT - yCut;
        c.beginPath();
        c.moveTo(neck[0], yCut - 2);
        c.bezierCurveTo(neck[0], yCut + L * 0.5, stem[0], yT - L * 0.45, stem[0], yT);
        c.lineTo(stem[0], yT + 4); c.lineTo(stem[1], yT + 4); c.lineTo(stem[1], yT);
        c.bezierCurveTo(stem[1], yT - L * 0.45, neck[1], yCut + L * 0.5, neck[1], yCut - 2);
        c.closePath();
        c.fill();
      }, Math.ceil((x1 - x0) * S), Math.ceil((y1 - y0) * S));
      fig.eye = [hx + (ctx.knight.eye.cx - AXIS) * kk, earY + (ctx.knight.eye.cy - EAR) * kk];
      fig.head = [hx + 0.6 * kk, earY + 5.6 * kk];
      fig.r = Math.max(ctx.knight.eye.r * kk * 1.15, 1.3);
      return pts && pts.map(([x, y]) => [x0 + x / S, y0 + y / S]);
    };

    const layout = () => {
      geo = ctx.measure();
      const C = geo.capHeight;
      phone = geo.fontSize < 160;
      // The band: from just under the links and the email to the footer line, the whole footer wide.
      const top = geo.linksBottom + (phone ? 4 : 8);
      B = { x: geo.back.x, y: top, w: geo.back.w, h: Math.max(1, geo.baseTop - top) };
      const dpr = window.devicePixelRatio || 1;
      // A phone's knght is small, so its floor is drawn sharp; a desktop's shadows are big and soft and need fewer pixels.
      q = phone ? Math.min(dpr, 2) : Math.min(dpr, 1.5) * 0.75;
      qs = q; // the shadows are drawn at the floor's own size
      floor.width = Math.round(B.w * q); floor.height = Math.round(B.h * q);
      Object.assign(floor.style, { left: `${(B.x - geo.back.x).toFixed(2)}px`, top: `${(B.y - geo.back.y).toFixed(2)}px`, width: `${B.w}px`, height: `${B.h}px` });
      qf = phone ? 0.4 : 0.2; // the far half: small, so it is soft when enlarged
      near.width = Math.max(1, Math.round(B.w * qs)); near.height = Math.max(1, Math.round(B.h * qs));
      far.width = Math.max(1, Math.round(B.w * qf)); far.height = Math.max(1, Math.round(B.h * qf));
      // The camera: the horizon well above the name, so the floor behind it is seen from above.
      cam.vx = geo.width / 2; cam.Hc = 3 * C; cam.D = 4 * C;
      // The light stands just in front of the name: its foot on the floor falls just under the letters.
      const foot = 0.18 * C;
      cam.Lz = (foot * cam.D) / (cam.Hc + foot);
      // The gap between the N and the G, from the ink.
      const k = geo.fontSize, N = shapes[1], G = shapes[2];
      const nR = N ? Math.max(...N.map((p) => p[0])) * k + geo.letters[1].x : geo.letters[1].x + geo.letters[1].w;
      const gL = G ? Math.min(...G.map((p) => p[0])) * k + geo.letters[2].x : geo.letters[2].x;
      gap.x = (nR + gL) / 2; gap.half = Math.max(4, (gL - nR) / 2);
      gap.rest = { x: gap.x, y: geo.baseline - C * 0.56 };
      // The knght's head: its ears under the links, its jaw a little under the cap line, its face clear of the G.
      const room = geo.capTop - B.y;
      fig.earY = B.y + room * (phone ? 0.22 : 0.18);
      // On a phone the room over the letters is small, so the head reaches a little further down past the cap line.
      fig.kk = (geo.capTop + C * (phone ? 0.26 : 0.13) - fig.earY) / (JAW - EAR);
      fig.shift = phone ? -2.8 : -1.2;
      range.x0 = geo.letters[0].x; range.x1 = geo.letters[4].x + geo.letters[4].w;
      range.y0 = geo.capTop - room * 0.25; range.y1 = geo.baseline - C * 0.04;
      halo.setAttribute('r', (C * (phone ? 0.3 : 0.16)).toFixed(2));
      core.setAttribute('r', phone ? 1.3 : 1.7);
    };
    const build = () => {
      shapes = traceLetters();
      layout();
      figure = shapes.every(Boolean) ? traceFigure() : null;
      ready = !!figure;
      if (ready) pairs = [1, 2].map((i) => pairing(shapes[i], figure));
    };

    /* ---------- State: the light where the walk puts it, where the pointer puts it, and how much it is the pointer's ---------- */
    const st = { wx: 0, wy: 0, px: 0, py: 0, own: 0, on: 0, w: 0 };
    const at = () => ({ x: lerp(st.wx, st.px, st.own), y: lerp(st.wy, st.py, st.own) });
    const lift = (i) => ((+gsap.getProperty(letters[i], 'yPercent') || 0) / 100) * geo.letters[i].h + (+gsap.getProperty(letters[i], 'y') || 0);

    /* ---------- One frame ---------- */
    const K = new Float32Array(M * 2);
    const draw = () => {
      if (!geo) return;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, floor.width, floor.height);
      if (!ready || st.on <= 0.001) { flame.setAttribute('opacity', 0); return; }
      const C = geo.capHeight, base = geo.baseline, k = geo.fontSize;
      const { vx, Hc, D, Lz } = cam;
      const L = at();
      // The light in the room: the screen point is where we see it, a little in front of the name.
      const sL = D / (D - Lz);
      const Lx = vx + (L.x - vx) / sL;
      const Ly = Math.max(C * 0.04, Hc + ((base - L.y) - Hc) / sL);
      const offs = letters.map((_, i) => lift(i));

      // The figure sways a little against the light, as a shadow would, and rises with the N and the G.
      const w = st.w;
      const dx = -(L.x - gap.rest.x) * 0.2;
      const lean = clamp((gap.rest.x - L.x) / (C * 9), -0.1, 0.1);
      const rise = (offs[1] + offs[2]) / 2, span = base - fig.earY;
      const place = (x, y) => [x + dx + (base - y) * lean, y + rise * ((y - fig.earY) / span)];
      if (w > 0.001) for (let j = 0; j < M; j++) { const [x, y] = place(figure[j][0], figure[j][1]); K[2 * j] = x; K[2 * j + 1] = y; }

      const path = new Path2D();
      for (let i = 0; i < 5; i++) {
        const pts = shapes[i], Lt = geo.letters[i], off = offs[i];
        const morph = (i === 1 || i === 2) && w > 0.001;
        const o = morph ? pairs[i - 1] : 0;
        for (let j = 0; j < M; j++) {
          const x = Lt.x + pts[j][0] * k, h = Math.max(0, pts[j][1] * k);
          let t = h < Ly - 1e-3 ? Ly / (Ly - h) : TMAX;
          if (t > TMAX) t = TMAX;
          const z = Lz * (t - 1), s = D / (D + z);
          let sx = vx + (Lx + t * (x - Lx) - vx) * s, sy = base + off - Hc * (1 - s);
          if (morph) { const m = (j + o) % M; sx += (K[2 * m] - sx) * w; sy += (K[2 * m + 1] - sy) * w; }
          if (j) path.lineTo(sx, sy); else path.moveTo(sx, sy);
        }
        path.closePath();
      }

      // Sharp where a shadow leaves its letter, soft where it ends. No blur filter, which is slow without a GPU:
      // the near half is drawn sharp, the far half small and enlarged, which softens it; while the knght takes shape
      // the two shadows melt in the soft half, and once it stands it is laid over sharp.
      const eye = place(fig.eye[0], fig.eye[1]);
      const ramp = (c, isNear) => {
        const gr = c.createLinearGradient(0, base, 0, base - C * 1.3);
        gr.addColorStop(0, isNear ? '#000' : 'rgba(0,0,0,0)');
        gr.addColorStop(1, isNear ? 'rgba(0,0,0,0)' : '#000');
        return gr;
      };
      const fill = (cv, c, s, style) => {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, cv.width, cv.height);
        c.setTransform(s, 0, 0, s, -B.x * s, -B.y * s);
        c.fillStyle = style;
        c.fill(path);
      };
      const melt = Math.sin(Math.PI * w);
      fill(near, gn, qs, ramp(gn, true)); // the near half, faded as it is filled
      fill(far, gf, qf, '#000');
      if (hasFilter && melt > 0.02) {
        // While they melt into one another, a little more softness (cheap at this size).
        gf.filter = `blur(${(melt * C * 0.03 * qf).toFixed(2)}px)`;
        gf.setTransform(1, 0, 0, 1, 0, 0);
        gf.globalCompositeOperation = 'copy';
        gf.drawImage(far, 0, 0);
        gf.globalCompositeOperation = 'source-over';
        gf.filter = 'none';
        gf.setTransform(qf, 0, 0, qf, -B.x * qf, -B.y * qf);
      }
      gf.globalCompositeOperation = 'destination-in';
      gf.fillStyle = ramp(gf, false); gf.fillRect(B.x, B.y, B.w, B.h);
      gf.globalCompositeOperation = 'source-over';
      // The two halves add up to one shadow: alpha added, not laid over, so there is no seam where they meet.
      gn.setTransform(1, 0, 0, 1, 0, 0);
      gn.globalCompositeOperation = 'lighter';
      gn.imageSmoothingEnabled = true;
      gn.drawImage(far, 0, 0, near.width, near.height);
      gn.globalCompositeOperation = 'source-over';
      gn.setTransform(qs, 0, 0, qs, -B.x * qs, -B.y * qs);
      if (w > 0.5) {
        // The knght, sharp, over its own soft edge.
        const fp = new Path2D();
        for (let j = 0; j < M; j++) { if (j) fp.lineTo(K[2 * j], K[2 * j + 1]); else fp.moveTo(K[2 * j], K[2 * j + 1]); }
        fp.closePath();
        gn.globalAlpha = smooth(0.5, 1, w);
        gn.fillStyle = '#000';
        gn.fill(fp);
        // Light through its eye.
        gn.globalCompositeOperation = 'destination-out';
        gn.beginPath(); gn.arc(eye[0], eye[1], fig.r, 0, Math.PI * 2); gn.fill();
        gn.globalCompositeOperation = 'source-over';
        gn.globalAlpha = 1;
      }

      // The floor: a faint pool of light around the candle, and the shadows taking it away.
      g.setTransform(q, 0, 0, q, -B.x * q, -B.y * q);
      const ell = (x, y, R, sy, peak) => {
        const Rmax = R * 3.2;
        g.save();
        g.translate(x, y);
        g.scale(1, sy);
        const pool = g.createRadialGradient(0, 0, 0, 0, 0, Rmax);
        for (let n = 0; n <= 10; n++) {
          const r = (n / 10) * Rmax, e = Math.pow(1 + (r / R) ** 2, -1.4) * (1 - n / 10);
          pool.addColorStop(n / 10, `rgba(255,255,255,${(peak * e).toFixed(4)})`);
        }
        g.fillStyle = pool;
        g.fillRect(-Rmax, -Rmax, Rmax * 2, Rmax * 2);
        g.restore();
      };
      // Seen from above, the floor behind the name takes more of the light than the strip in front of it.
      const deep = base - B.y;
      ell(L.x, L.y - deep * 0.16, deep * 0.62, 0.78, (phone ? 0.14 : 0.11) * st.on);
      // Through the gap the light reaches the floor behind the name: the knght stands in it.
      // Brightest just behind the head, so its outline reads (on a phone, where it is small, all the way round).
      if (w > 0.001) {
        const [hx, hy] = phone ? place(fig.head[0], fig.head[1]) : [eye[0] - fig.kk * 0.6, eye[1] + fig.kk * 1.2];
        ell(hx, hy, fig.kk * (phone ? 4.6 : 3.6), 1, (phone ? 0.15 : 0.08) * w * st.on);
      }
      g.globalAlpha = 0.9 * st.on;
      g.drawImage(near, B.x, B.y, B.w, B.h);
      g.globalAlpha = 1;
      // The band: nothing reaches the links above or the footer line below.
      const room = geo.capTop - B.y;
      const band = g.createLinearGradient(0, B.y, 0, B.y + B.h);
      const f = (y) => clamp((y - B.y) / B.h, 0, 1);
      band.addColorStop(0, 'rgba(0,0,0,0)');
      band.addColorStop(f(B.y + room * 0.06), 'rgba(0,0,0,0)');
      band.addColorStop(f(B.y + room * 0.2), 'rgba(0,0,0,0.5)');
      band.addColorStop(f(B.y + room * 0.38), '#000');
      band.addColorStop(f(base), '#000');
      band.addColorStop(f(base + geo.floor * 0.4), 'rgba(0,0,0,0.35)');
      band.addColorStop(f(base + geo.floor * 0.8), 'rgba(0,0,0,0)');
      band.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = band; g.fillRect(B.x, B.y, B.w, B.h);
      g.globalCompositeOperation = 'source-over';

      // The flame itself, in front of the letters.
      flame.setAttribute('transform', `translate(${L.x.toFixed(2)} ${L.y.toFixed(2)})`);
      flame.setAttribute('opacity', st.on.toFixed(3));
      svg.toggleAttribute('data-knght', w > 0.98);
    };

    build();

    /* ---------- Motion: tweens only, so time can be held and stepped ---------- */
    let dirty = true;
    const lastOffs = [NaN, NaN, NaN, NaN, NaN];
    const touchUp = () => { dirty = true; };
    const followX = gsap.quickTo(st, 'px', { duration: 0.45, ease: 'power3.out', onUpdate: touchUp });
    const followY = gsap.quickTo(st, 'py', { duration: 0.45, ease: 'power3.out', onUpdate: touchUp });
    const gather = gsap.quickTo(st, 'w', { duration: 0.9, ease: 'power2.inOut', onUpdate: touchUp });
    let wGoal = -1;
    const aim = () => {
      // How close the light is to the missing I: anywhere up the gap counts.
      const L = at(), C = geo.capHeight;
      const r0 = Math.max(gap.half * 0.9, C * 0.1), r1 = r0 + C * 0.55;
      const d = Math.hypot(L.x - gap.x, Math.max(0, Math.abs(L.y - gap.rest.y) - C * 0.3) * 0.5);
      const goal = 1 - smooth(r0, r1, d);
      if (Math.abs(goal - wGoal) > 0.004) { wGoal = goal; gather(goal); }
    };

    // The arrival: lit beside the T, it walks in along the name and comes to rest in the gap.
    const startX = () => geo.letters[4].x + geo.letters[4].w * 0.92;
    const arrival = gsap.timeline({ paused: true, onUpdate: touchUp })
      .fromTo(st, { on: 0 }, { on: 1, duration: 0.9, ease: 'power1.inOut' }, 0)
      .fromTo(st, { wx: () => startX() }, { wx: () => gap.rest.x, duration: 3.4, ease: 'power2.inOut' }, 0.35)
      .fromTo(st, { wy: () => geo.baseline - geo.capHeight * 0.2 }, { wy: () => gap.rest.y, duration: 3.4, ease: 'sine.inOut' }, 0.35);

    let own = null;
    const setOwn = ctx.add((v, dur, delay = 0) => {
      if (own) own.kill();
      own = gsap.to(st, { own: v, duration: dur, delay, ease: 'power2.inOut', onUpdate: touchUp });
    });

    /* ---------- Input ---------- */
    let played = false, stilled = false, client = null, owned = false;
    const toLight = (sx, sy) => {
      followX(clamp(sx, range.x0, range.x1));
      followY(clamp(sy, range.y0, range.y1));
    };
    const take = () => {
      if (owned) return;
      owned = true;
      if (st.own < 0.01) { const L = at(); st.px = L.x; st.py = L.y; }
      setOwn(1, 0.6);
    };
    const release = (delay) => { if (!owned) return; owned = false; setOwn(0, 2.2, delay); };
    // The pointer holds the light while it is on the name (from just over the letters down to the footer line).
    // Up among the links, or down on the footer line and its knght, it lets go and the light walks back to the gap.
    const onName = (y) => y > geo.capTop - (geo.capTop - B.y) * 0.6 && y < geo.baseTop;
    const fromClient = () => {
      if (!client) return;
      const r = ctx.stage.getBoundingClientRect();
      const x = client.x - r.left, y = client.y - r.top;
      if (!onName(y)) { release(0.4); return; }
      take();
      toLight(x, y);
    };
    const live = () => played && !stilled;
    if (!flags.reduce) {
      ctx.onPointer((p) => {
        if (!live() || p.pointerType === 'touch') return;
        if (p.type === 'pointermove') {
          client = { x: p.event.clientX, y: p.event.clientY };
          fromClient();
        } else if (p.type === 'pointerleave') { client = null; release(0.4); }
      });
      ctx.on(window, 'scroll', () => { if (client) fromClient(); });
      // A finger: a sideways drag along the name carries the light; a scroll is left alone.
      let drag = null;
      ctx.onTouch((t) => {
        if (!live()) return;
        const touch = t.event.changedTouches[0];
        if (t.type === 'touchstart') {
          const inBand = t.y > B.y && t.y < geo.baseTop;
          drag = !t.interactive && t.touches === 1 && inBand ? { cx: touch.clientX, cy: touch.clientY, horiz: false, dead: false } : null;
          return;
        }
        if (!drag) return;
        const ddx = touch.clientX - drag.cx, ddy = touch.clientY - drag.cy;
        if (t.type === 'touchmove' && !drag.dead) {
          if (!drag.horiz) {
            if (Math.abs(ddy) > 10 && Math.abs(ddy) > Math.abs(ddx)) { drag.dead = true; return; }
            if (Math.abs(ddx) > 8) { drag.horiz = true; take(); }
          }
          if (drag.horiz) toLight(t.x, t.y);
        } else if (t.type === 'touchend' || t.type === 'touchcancel') {
          if (t.type === 'touchend' && !drag.horiz && !drag.dead && Math.hypot(ddx, ddy) < 10) { take(); toLight(t.x, t.y); }
          if (owned) release(1.8);
          drag = null;
        }
      });
      ctx.tick(() => {
        if (!geo) return;
        for (let i = 0; i < 5; i++) { const o = lift(i); if (Math.abs(o - lastOffs[i]) > 0.05) { lastOffs[i] = o; dirty = true; } }
        if (!dirty) return;
        dirty = false;
        aim();
        draw();
      });
    }

    const offResize = ctx.onResize(() => { build(); dirty = true; if (stilled) draw(); });
    draw();

    return {
      play() { played = true; arrival.play(0); },
      pause() { arrival.pause(); },
      resume() { if (arrival.progress() < 1) arrival.resume(); },
      still() {
        stilled = true;
        arrival.progress(1).pause();
        Object.assign(st, { wx: gap.rest.x, wy: gap.rest.y, own: 0, on: 1, w: 1 });
        draw();
      },
      destroy() {
        offResize();
        arrival.kill();
        if (own) own.kill();
        gsap.killTweensOf(st);
        floor.remove();
        svg.remove();
        // Let the canvases' pixels go now, not when they are collected (phones hold little canvas memory).
        [floor, near, far].forEach((c) => { c.width = 0; c.height = 0; });
      },
    };
  },
};
