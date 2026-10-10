/* Checkmate. The position is set on the name: the knght stands in the H, on its crossbar, and the king of the set
   stands on the T. Once the reader has reached the end of the page (or, with a mouse, points at the name) the knght
   makes one move. Its route draws first as a fine dotted line, the business card's line, long leg first: two across
   and one down. The knght is lifted, carried over the H's stem and set down under the T's left arm. From there it
   checks the king: a second dotted line, two up and one across. The king feels it, rocks, and lies down along the
   top of the T, toward the knght. Under them: "Your move.", a link to sho@knght.com.

   Both pieces are hairlines from the set (pieces.js): the B knight and the king, at one scale, sized to the room
   the letters leave (the H's upper counter, the gap under the T's arm, the room over the T). Where each one stands is
   read from the letters as drawn, so it holds on any font. Everything happens between the H and the T: nothing goes
   near the gap between the N and the G. The scene keeps the shared base (the rise and the steel) and never touches
   the letters. The pieces and dots are drawn on the overlay, which blends by difference, so a line that crosses a
   letter reads dark on the steel and light on the black. It plays once. At rest it draws nothing.
   Reduced motion: the end of the game, drawn at once. Ported from the sketch ride/checkmate. */
// The king and the knight of the set, copied from pieces.js so this ending imports nothing a rotation ending
// or the host shares (a shared module would split into its own chunk and change what other visits download).
// Copy them again if pieces.js changes.
const PIECES = {
  king: { outline: "M7 19.4C8.2 18.35 9.85 15.55 10 10.9L9.05 10.9Q8.6 10.9 8.6 10.45Q8.6 10 9.05 10L10.4 10C10.35 8.7 8.3 7.25 8.05 5.6Q8 5.15 8.45 5.15L8.85 5.15C8.85 4.08 10.016 3.672 11.55 3.609V2.34H10.25H12V1.64A0.42 0.42 0 1 1 12 0.8A0.42 0.42 0 1 1 12 1.64A0.42 0.42 0 1 1 12 0.8A0.42 0.42 0 1 1 12 1.64V2.34H13.75H12.45V3.609C12.303 3.603 12.153 3.6 12 3.6C11.847 3.6 11.697 3.603 11.55 3.609C11.697 3.603 11.847 3.6 12 3.6C12.153 3.6 12.303 3.603 12.45 3.609C13.984 3.672 15.15 4.08 15.15 5.15L15.55 5.15Q16 5.15 15.95 5.6C15.7 7.25 13.65 8.7 13.6 10L14.95 10Q15.4 10 15.4 10.45Q15.4 10.9 14.95 10.9L14 10.9C14.15 15.55 15.8 18.35 17 19.4Z", details: "M8.803 6.4H15.197", plinth: "M5.6 19.4H18.2M4.6 21.5H19.2" },
  knight: { outline: "M7 19.4Q5.6 18.9 4.9 17.4Q5.8 17.5 6.4 16.8Q5 16 4.7 14.2Q5.6 14.5 6.3 13.9Q5 12.8 5 10.9Q5.9 11.4 6.6 11Q5.8 9.6 6.1 7.9Q6.9 8.6 7.6 8.4Q7.3 6.8 8.1 5.4Q8.6 6.2 9.5 6.2L10.8 2.4L12.1 4.3C12.3 3.3 13.4 3.0 14.8 3.55Q14.05 4.0 13.9 4.8Q15.05 4.25 15.9 5.05Q15.15 5.35 14.85 5.95C16.52 6.90 17.79 8.33 18.6 10.6C19 11.8 18.6 13.2 17.3 13.2L15.6 12.7C14.6 12.4 13.8 12.9 13.8 13.9C14 15.9 16 17.4 16.9 19.4Z", plinth: "M5.6 19.4H18.2M4.6 21.5H19.2", eye: { cx: 14.6, cy: 8.4, r: 0.6 } },
};

const ID = 'checkmate';
const SAY = 'Your move.';
const AXIS = 11.9;            // the plinth's centre on the 24 grid (the set shares one plinth)
const FOOT = 21.5;            // the plinth's lowest line
const HALF = 7.3;             // half the plinth
const PIVOT = [4.6, 21.5];    // the plinth's left end: the king tips over it
const KNIGHT_TOP = 2.4, KING_TOP = 0.8;
const NOSE = 19;              // the knight's furthest point to the right
const MID = 10.5;             // a piece's middle, where the dotted lines meet it
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const f2 = (n) => (Math.round(n * 100) / 100).toString();

// The king's outline as points (the path sampled), from the left end of his plinth, to find how he lies.
// Made on the first mount, with gsap's path parser from the host (ctx.plugins.MotionPathPlugin).
let KING = null;
const kingPoints = (stringToRawPath) => {
  const pts = [];
  stringToRawPath(PIECES.king.outline).forEach((seg) => {
    for (let i = 0; i + 7 < seg.length; i += 6) {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = seg.slice(i, i + 8);
      for (let n = 0; n < 5; n++) {
        const t = n / 5, u = 1 - t;
        pts.push([
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3 - PIVOT[0],
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3 - PIVOT[1],
        ]);
      }
    }
  });
  return pts;
};

// Cormorant Garamond 500, in 1/1000 em from each letter's top-left, read from the live font at 1440 x 900, for a
// letter that cannot be read. H: the upper counter (top, crossbar, inner left and right) and the right foot.
// T: the bar's ends, the flat of its top between the upturned tips, the top's height, the foot serif's left end.
const CORMORANT = {
  H: { top: 73.8, bar: 361.7, il: 196.8, ir: 562.1, right: 727.7 },
  T: { barL: 47.7, barR: 597.5, flatL: 106, flatR: 534, top: 76, footL: 183.7 },
};

export default {
  id: ID,
  name: 'Checkmate',
  takesOver: false,

  mount(ctx) {
    if (!KING) KING = kingPoints(ctx.plugins.MotionPathPlugin.stringToRawPath);
    const { gsap, stage, letters, flags } = ctx;
    const F = `.footer[data-ending="${ID}"]`;
    ctx.css(`
${F} .footer__layer--over{mix-blend-mode:difference}
${F} .checkmate__say{position:absolute;z-index:3;left:0;top:0;white-space:nowrap;font-family:var(--serif);font-style:italic;font-weight:400;line-height:1.15;letter-spacing:.01em;color:#cfcfcf;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.2em;text-decoration-color:var(--rule-strong);visibility:hidden;opacity:0;transition:color .3s,text-decoration-color .3s;-webkit-tap-highlight-color:transparent}
${F} .checkmate__say:hover{color:var(--argent);text-decoration-color:var(--argent)}
${F} .checkmate__say:focus-visible{outline:1px solid var(--argent);outline-offset:3px}
`);

    /* ---------- Nodes: one svg on the overlay (dots, king, knight), and the last line in the stage ---------- */
    const svg = ctx.svg({ className: 'checkmate' });
    const line = { fill: 'none', stroke: 'currentColor', 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    const routeG = ctx.make('g', { parent: svg, className: 'checkmate__route', attrs: { fill: '#fff' } });
    const checkG = ctx.make('g', { parent: svg, className: 'checkmate__check', attrs: { fill: '#fff' } });
    const king = ctx.make('g', { parent: svg, className: 'checkmate__king', attrs: { color: 'rgb(214,214,214)' } });
    const kingBody = ctx.make('g', { parent: king });
    const kingOutline = ctx.make('path', { parent: kingBody, attrs: { ...line, d: PIECES.king.outline } });
    const kingCross = ctx.make('path', { parent: kingBody, attrs: { ...line, d: PIECES.king.details } });
    const kingPlinth = PIECES.king.plinth.split('M').filter(Boolean).map((p) => ctx.make('path', { parent: kingBody, attrs: { ...line, d: `M${p}` } }));
    const knight = ctx.make('g', { parent: svg, className: 'checkmate__knight', attrs: { color: 'rgb(236,236,236)' } });
    const knightOutline = ctx.make('path', { parent: knight, attrs: { ...line, d: PIECES.knight.outline } });
    const knightPlinth = PIECES.knight.plinth.split('M').filter(Boolean).map((p) => ctx.make('path', { parent: knight, attrs: { ...line, d: `M${p}` } }));
    const E = PIECES.knight.eye;
    const eye = ctx.make('circle', { parent: knight, attrs: { cx: E.cx, cy: E.cy, r: E.r, fill: 'currentColor', opacity: 0 } });
    const strokes = [kingOutline, kingCross, ...kingPlinth, knightOutline, ...knightPlinth];
    const say = ctx.make('a', { parent: stage, className: 'checkmate__say', text: SAY, attrs: { href: 'mailto:sho@knght.com' } });

    /* ---------- Reading the H and the T as drawn ---------- */
    // Each letter drawn once on a canvas in its live face and size (2x), then read where the pieces need it.
    const raster = (i) => {
      const L = geo.letters[i], el = letters[i];
      const cs = getComputedStyle(el);
      const d = 2, pad = 6, w = Math.ceil(L.w) + pad * 2, h = Math.ceil(L.h) + pad;
      if (!L.w || !L.h) return null;
      try {
        const cv = document.createElement('canvas');
        cv.width = w * d; cv.height = h * d;
        const c = cv.getContext('2d', { willReadFrequently: true });
        c.scale(d, d);
        c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        c.fillText(L.ch, pad, geo.baseline - L.y);
        const px = c.getImageData(0, 0, w * d, h * d).data, W = w * d, R = h * d;
        // in stage pixels
        const ink = (x, y) => {
          const X = Math.round((x - L.x + pad) * d), Y = Math.round((y - L.y) * d);
          return X >= 0 && Y >= 0 && X < W && Y < R && px[(Y * W + X) * 4 + 3] > 120;
        };
        const x0 = L.x - pad, x1 = L.x + L.w + pad, y0 = L.y, y1 = L.y + h, st = 1 / d;
        const rowSpan = (y) => { // leftmost and rightmost ink on a row
          let l = null, r = null;
          for (let x = x0; x < x1; x += st) if (ink(x, y)) { if (l == null) l = x; r = x; }
          return l == null ? null : [l, r + st];
        };
        const bandSpan = (ya, yb) => {
          let l = Infinity, r = -Infinity;
          for (let y = ya; y <= yb; y += st) { const s = rowSpan(y); if (s) { l = Math.min(l, s[0]); r = Math.max(r, s[1]); } }
          return l === Infinity ? null : [l, r];
        };
        const topAt = (x) => { for (let y = y0; y < y1; y += st) if (ink(x, y)) return y; return null; };
        return { ink, rowSpan, bandSpan, topAt, st, y0, y1 };
      } catch (e) {
        return null;
      }
    };
    const readH = () => {
      const g = raster(3);
      if (!g) return null;
      const L = geo.letters[3], cap = geo.capHeight, b = geo.baseline;
      const cx = L.cx;
      let top = null;
      for (let y = g.y0; y < b; y += g.st) if (g.rowSpan(y)) { top = y; break; }
      if (top == null) return null;
      let bar = top;
      while (bar < b && !g.ink(cx, bar)) bar += g.st; // down the middle to the crossbar
      if (bar >= b || bar - top < cap * 0.2) return null;
      const row = (top + bar) / 2;
      let il = cx, ir = cx;
      while (il > L.x && !g.ink(il, row)) il -= g.st;
      while (ir < L.x + L.w && !g.ink(ir, row)) ir += g.st;
      const foot = g.bandSpan(b - cap * 0.06, b - g.st); // down to the last row: a serif is widest at its tip
      if (!foot) return null;
      return { top, bar, il: il + g.st, ir, right: foot[1] };
    };
    // The T: its bar's ends, the top of the bar column by column (what the king stands and lies on), the flat of
    // that top between the upturned tips, and the left end of the foot serif.
    const profileOf = (x0, x1, st, topAt) => {
      const tops = [];
      for (let x = x0; x <= x1 + 1e-6; x += st) tops.push(topAt(x));
      return (x) => { const i = Math.round((x - x0) / st); return i >= 0 && i < tops.length ? tops[i] : null; };
    };
    const readT = () => {
      const g = raster(4);
      if (!g) return null;
      const cap = geo.capHeight, b = geo.baseline;
      const bar = g.bandSpan(geo.capTop + cap * 0.02, geo.capTop + cap * 0.1);
      const stem = g.rowSpan(b - cap * 0.45);
      const foot = g.bandSpan(b - cap * 0.05, b - g.st);
      if (!bar || !stem || !foot) return null;
      const lim = geo.capTop + cap * 0.3; // only the bar counts as the top: not a serif hanging under it
      const top = profileOf(bar[0] - 1, bar[1] + 1, g.st, (x) => { const t = g.topAt(x); return t != null && t < lim ? t : null; });
      const mid = (stem[0] + stem[1]) / 2, level = top(mid), tol = Math.max(1, cap * 0.008);
      if (level == null) return null;
      let flatL = mid, flatR = mid;
      while (flatL > bar[0] && top(flatL - g.st) != null && top(flatL - g.st) >= level - tol) flatL -= g.st;
      while (flatR < bar[1] && top(flatR + g.st) != null && top(flatR + g.st) >= level - tol) flatR += g.st;
      return { barL: bar[0], barR: bar[1], flatL, flatR, footL: foot[0], top };
    };
    const cormorantT = (LT, em) => {
      const at = (v) => LT.x + v * em, C = CORMORANT.T, y = LT.y + C.top * em;
      return { barL: at(C.barL), barR: at(C.barR), flatL: at(C.flatL), flatR: at(C.flatR), footL: at(C.footL), top: (x) => (x >= at(C.barL) && x <= at(C.barR) ? y : null) };
    };

    // Where the king comes to rest, tipped over the left end of his plinth (px, py) toward the knght: the first angle
    // at which a point of his outline would pass into the top of the T. Then how far left he reaches. No contact
    // (he would go over the end of the bar) gives null.
    const restOn = (top, px, py, k, sw) => {
      const hits = (a) => {
        const r = (-a * Math.PI) / 180, s = Math.sin(r), c = Math.cos(r);
        for (let i = 0; i < KING.length; i++) {
          const [x, y] = KING[i], t = top(px + (x * c - y * s) * k);
          if (t != null && py + (x * s + y * c) * k + sw * 0.6 > t) return true;
        }
        return false;
      };
      let a = 70; // two degrees at a time, then a quarter to place the contact
      if (hits(a)) return null;
      while (a < 128 && !hits(a + 2)) a += 2;
      if (a >= 128) return null;
      while (!hits(a + 0.25)) a += 0.25;
      const r = (-a * Math.PI) / 180;
      return { rest: -a, reach: Math.min(...KING.map(([x, y]) => x * Math.cos(r) - y * Math.sin(r))) * k };
    };

    /* ---------- Geometry, in stage coordinates ---------- */
    let geo, P = null;
    // The letters are read again only when they change (a new size, a font landing), not for every layout.
    let readKey = '', HT = null;
    const kingAt = { key: '' };
    const layout = () => {
      geo = ctx.measure();
      const em = geo.fontSize / 1000;
      const [, , , LH, LT] = geo.letters;
      const at = (L, v) => L.x + v * em;
      const key = [geo.fontSize, geo.baseline, getComputedStyle(LH.el).fontFamily, LH.x, LH.w, LT.x, LT.w].join('|');
      if (key !== readKey || !HT) {
        readKey = key;
        HT = {
          H: readH() || { top: LH.y + CORMORANT.H.top * em, bar: LH.y + CORMORANT.H.bar * em, il: at(LH, CORMORANT.H.il), ir: at(LH, CORMORANT.H.ir), right: at(LH, CORMORANT.H.right) },
          T: readT() || cormorantT(LT, em),
        };
      }
      const { H, T } = HT;
      const cap = geo.capHeight;
      const phone = cap < 120;

      // One scale for both pieces: about a third of the cap height, never under 30 px (a phone), and as large as
      // the room allows: the H's upper counter, the gap between the H and the T's foot, the room over the T.
      const roomUp = geo.capTop - geo.linksBottom;
      const clear = phone ? 6 : 14;
      const s = Math.max(12, Math.min(Math.max(cap * 0.34, 30),
        ((H.bar - H.top) * 0.9) / ((FOOT - KNIGHT_TOP) / 24),
        ((H.ir - H.il) * 0.86) / ((2 * HALF) / 24),
        (T.footL - H.right - 6) / ((2 * HALF) / 24),
        (roomUp - clear) / ((FOOT - KING_TOP) / 24)));
      const k = s / 24;
      const sw = phone ? 1.1 : 1.3;

      // The knght: on the crossbar, in the middle of the counter. Then one square down, two across: on the baseline,
      // under the T's left arm, clear of the H's foot and of the T's.
      const x0 = (H.il + H.ir) / 2;
      const foot0 = H.bar - sw / 2 - Math.max(1, s * 0.012);
      const foot1 = geo.baseline - sw / 2;
      const gap = Math.max(2, s * 0.05);
      const lo = H.right + HALF * k + gap, hi = T.footL - HALF * k - Math.max(gap, s * 0.14); // air before the T's foot
      const x1 = lo <= hi ? clamp(x0 + 2 * (foot1 - foot0), lo, hi) : (lo + hi) / 2;

      // The king: on the flat of the T's top, one across and two up from the knght. When he goes over he must come
      // to rest on the bar, his crown on it (or on its upturned tip), not over its end: if he would, he stands
      // further right, as far as the flat allows.
      const footAt = (x) => {
        let top = Infinity;
        for (let dx = -HALF * k; dx <= HALF * k; dx += 0.5) { const t = T.top(x + dx); if (t != null) top = Math.min(top, t); }
        return (top === Infinity ? geo.capTop : top) - sw / 2;
      };
      const standLo = T.flatL + gap + HALF * k, standHi = Math.max(standLo, T.flatR - HALF * k - (phone ? 0 : gap));
      const want = clamp(x1 + (foot1 - footAt(x1 + cap / 2)) / 2, standLo, standHi);
      const kingKey = `${readKey}|${k.toFixed(4)}|${want.toFixed(2)}|${sw}`;
      if (kingKey !== kingAt.key) {
        const tryAt = (x) => {
          const f = restOn(T.top, x + (PIVOT[0] - AXIS) * k, footAt(x), k, sw);
          return f && { x, f, ok: x + (PIVOT[0] - AXIS) * k + f.reach >= T.barL + gap }; // his crown over the bar
        };
        let best = tryAt(want);
        if (!best || !best.ok) {
          const far = tryAt(standHi);
          if (far && far.ok) { // the nearest place to the one he wants where he lies on the bar
            let lo = want, hi = standHi;
            best = far;
            for (let i = 0; i < 7; i++) { const m = tryAt((lo + hi) / 2); if (m && m.ok) { hi = m.x; best = m; } else lo = (lo + hi) / 2; }
          } else best = best || far;
        }
        // no bar to lie on (a font without one): he lies level where he stands
        Object.assign(kingAt, { key: kingKey, x: best ? best.x : want, fall: best ? best.f : { rest: -96, reach: -21 * k } });
      }
      const x2 = kingAt.x, fall = kingAt.fall;
      const foot2 = footAt(x2);

      // The dotted lines: round dots at an even pitch, the long leg first.
      const pitch = phone ? 4.4 : clamp(cap * 0.037, 5, 8.5);
      const dot = phone ? 0.85 : clamp(cap * 0.006, 0.9, 1.35);
      const dots = (corners, w) => {
        const out = [];
        for (let c = 0; c < corners.length - 1; c++) {
          const [ax, ay] = corners[c], [bx, by] = corners[c + 1];
          const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / pitch));
          for (let j = c === 0 ? 0 : 1; j <= n; j++) {
            const x = ax + ((bx - ax) * j) / n, y = ay + ((by - ay) * j) / n;
            out.push({ x, y, w: w(x, c) });
          }
        }
        return out;
      };
      const y0 = foot0 - (FOOT - MID) * k;
      const route = dots([
        [x0 + (NOSE - AXIS) * k + pitch * 1.6, y0],
        [x1, y0],
        [x1, foot1 - (FOOT - KNIGHT_TOP) * k - pitch * 1.4],
      ], (x, c) => (c === 0 ? clamp((x - x0) / (x1 - x0 || 1), 0, 1) : 1));
      const yk = foot2 - (FOOT - MID) * k;
      const check = dots([
        [x1, foot1 - (FOOT - KNIGHT_TOP) * k - pitch * 1.4],
        [x1, yk],
        [x2 - 4.2 * k - pitch * 1.2, yk],
      ], () => 1);

      // The last line: in the room under the letters, under the knght, starting where its plinth starts. Where that
      // runs past the T's arm (a phone) it ends with the arm instead. Kept out of the back-to-top button's column
      // when that button comes up beside it at the end of the page (wide screens), so the two never stack.
      const size = clamp(cap * 0.105, 15, 24);
      say.style.fontSize = `${size}px`;
      const lineH = size * 1.15;
      const sayTop = geo.baseline + Math.max(1, (geo.floor - lineH) / 2 + (phone ? -0.5 : geo.floor * 0.04));
      const width = say.offsetWidth;
      let limit = Math.min(T.barR, geo.width - 2);
      const totop = document.querySelector('.totop');
      if (totop && totop.offsetWidth) {
        const cs = getComputedStyle(totop);
        const topAtEnd = window.innerHeight - (parseFloat(cs.bottom) || 0) - totop.offsetHeight; // fixed to the screen
        const ruleAtEnd = window.innerHeight - (geo.footer.y + geo.footer.height - geo.baseTop);
        const left = totop.getBoundingClientRect().left - stage.getBoundingClientRect().left;
        if (cs.position === 'fixed' && topAtEnd < ruleAtEnd + 12) limit = Math.min(limit, left - 16);
      }
      const knightLeft = x1 - HALF * k;
      const sayLeft = knightLeft + width <= limit ? knightLeft : limit - width;
      say.style.left = `${f2(sayLeft)}px`;
      say.style.top = `${f2(sayTop)}px`;

      P = { k, s, sw, x0, x1, x2, foot0, foot1, foot2, rest: fall.rest, route, check, dot, rise: phone ? 0 : 5 };
      strokes.forEach((p) => p.setAttribute('stroke-width', sw));
      eye.setAttribute('r', f2(Math.max(E.r, 1.05 / k)));
      // One circle per dot, made again only when the count changes.
      const fill = (g, list) => {
        while (g.childNodes.length < list.length) ctx.make('circle', { parent: g, attrs: { r: 0 } });
        while (g.childNodes.length > list.length) g.lastChild.remove();
        list.forEach((d, i) => { const c = g.childNodes[i]; c.setAttribute('cx', f2(d.x)); c.setAttribute('r', f2(dot)); });
      };
      fill(routeG, route);
      fill(checkG, check);
      shown = {};
    };

    /* ---------- Drawing: everything from one small record, written only when it changed ---------- */
    // route: how much of the move is dotted (0 to 1); routeA its strength. kx, ky: the knight's way across and down
    // (0 to 1); hop: how high it is lifted (grid units). check, checkA: the same for the check. trem: the king's rock
    // (degrees); fall: how far he has gone over (1 lying); grey: his line. eye, say: the knight's eye, the last line.
    const S = { route: 0, routeA: 1, kx: 0, ky: 0, hop: 0, check: 0, checkA: 1, trem: 0, fall: 0, grey: 214, eye: 0, say: 0 };
    let lifts = [0, 0];
    let shown = {};
    const put = (key, el, attr, v) => {
      if (shown[key] === v) return;
      shown[key] = v;
      el.setAttribute(attr, v);
    };
    const paintDots = (g, list, amount, alpha, key) => {
      const n = list.length, [lh, lt] = lifts;
      const stamp = `${amount.toFixed(4)}|${alpha.toFixed(3)}|${lh.toFixed(2)}|${lt.toFixed(2)}`;
      if (shown[key] === stamp) return;
      shown[key] = stamp;
      const head = amount * (n + 1.5);
      list.forEach((d, i) => {
        const c = g.childNodes[i];
        if (!c) return;
        c.setAttribute('cy', f2(d.y + lh + (lt - lh) * d.w));
        c.setAttribute('opacity', (clamp((head - i) / 1.5, 0, 1) * alpha).toFixed(3));
      });
    };
    const render = () => {
      if (!P) return;
      const { k } = P, [lh, lt] = lifts;
      const kx = P.x0 + (P.x1 - P.x0) * S.kx;
      const kf = P.foot0 + lh + (P.foot1 + lt - P.foot0 - lh) * S.ky - S.hop * k;
      put('knight', knight, 'transform', `translate(${f2(kx - AXIS * k)} ${f2(kf - FOOT * k)}) scale(${k.toFixed(5)})`);
      put('eye', eye, 'opacity', S.eye.toFixed(3));
      put('king', king, 'transform', `translate(${f2(P.x2 - AXIS * k)} ${f2(P.foot2 + lt - FOOT * k)}) scale(${k.toFixed(5)})`);
      put('fall', kingBody, 'transform', `rotate(${(P.rest * S.fall).toFixed(2)} ${PIVOT[0]} ${PIVOT[1]}) rotate(${S.trem.toFixed(2)} ${AXIS} ${FOOT})`);
      const g = Math.round(S.grey);
      put('grey', king, 'color', `rgb(${g},${g},${g})`);
      paintDots(routeG, P.route, S.route, S.routeA, 'route');
      paintDots(checkG, P.check, S.check, S.checkA, 'check');
      const sv = S.say > 0.001 ? 'visible' : 'hidden';
      if (shown.sayV !== sv) { shown.sayV = sv; say.style.visibility = sv; }
      if (shown.say !== S.say) {
        shown.say = S.say;
        say.style.opacity = S.say.toFixed(3);
        say.style.transform = S.say < 1 ? `translateY(${f2((1 - S.say) * P.rise)}px)` : '';
      }
    };

    // The letters' own offset (the shared rise): the knght rides the H, the king the T.
    const lift = (i) => (+gsap.getProperty(letters[i], 'y') || 0) + ((+gsap.getProperty(letters[i], 'yPercent') || 0) / 100) * geo.letters[i].h;
    const readLifts = () => { lifts = [lift(3), lift(4)]; };

    layout();
    readLifts();
    gsap.set(strokes, { drawSVG: '0%' });
    render();
    // The last line is placed by its width in its own face (the italic), which may land after the upright.
    let dead = false;
    const relayout = () => { if (dead) return; layout(); readLifts(); render(); };
    if (document.fonts && document.fonts.load) {
      document.fonts.load(`italic 400 ${Math.round(parseFloat(say.style.fontSize) || 16)}px "Cormorant Garamond"`).then(relayout, () => {});
    }

    /* ---------- The game ---------- */
    // The pieces are drawn in on first view: the position is set.
    const intro = gsap.timeline({ paused: true, onComplete: () => { introDone = true; svg.setAttribute('data-set', ''); } })
      .fromTo(knightPlinth, { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: 0.55, ease: 'power2.out', stagger: 0.1 }, 0)
      .fromTo(knightOutline, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.15, ease: 'power2.inOut' }, 0.15)
      .to(S, { eye: 1, duration: 0.35, ease: 'power1.out', onUpdate: render }, 1.15)
      .fromTo(kingPlinth, { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: 0.55, ease: 'power2.out', stagger: 0.1 }, 0.35)
      .fromTo(kingOutline, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.15, ease: 'power2.inOut' }, 0.45)
      .fromTo(kingCross, { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: 0.35, ease: 'power2.out' }, 1.4)
      .set(strokes, { strokeDasharray: 'none', strokeDashoffset: 0 }, 1.8); // whole lines from here

    // The move, the check, the fall. Starts a beat after the position is set, once the end of the page is in view.
    const move = gsap.timeline({ paused: true, onUpdate: render, onComplete: () => svg.setAttribute('data-mate', '') })
      .to(S, { route: 1, duration: 0.8, ease: 'none' }, 0.3)
      // lifted, carried over the H's stem, set down under the T's arm
      .to(S, { hop: 2.6, duration: 0.26, ease: 'power2.out' }, 1.2)
      .to(S, { kx: 1, duration: 0.74, ease: 'power2.inOut' }, 1.35)
      .to(S, { ky: 1, duration: 0.52, ease: 'sine.inOut' }, 1.57)
      .to(S, { hop: 0, duration: 0.46, ease: 'power2.inOut' }, 1.63)
      .to(S, { routeA: 0.3, duration: 0.6, ease: 'power1.inOut' }, 2.15)
      // check: two up, one across
      .to(S, { check: 1, duration: 0.55, ease: 'none' }, 2.25)
      // the king feels it: his line brightens and he rocks once, then he goes over toward the knght
      .to(S, { grey: 255, duration: 0.25, ease: 'power1.out' }, 2.75)
      .to(S, { keyframes: [{ trem: 3, duration: 0.12, ease: 'power1.out' }, { trem: -2.2, duration: 0.16, ease: 'power1.inOut' }, { trem: 0, duration: 0.14, ease: 'power1.in' }] }, 2.8)
      .to(S, { fall: 1, duration: 0.78, ease: 'power3.in' }, 3.25)
      .to(S, { fall: 0.955, duration: 0.11, ease: 'power1.out' }, 4.03)
      .to(S, { fall: 1, duration: 0.16, ease: 'power1.in' }, 4.14)
      .to(S, { grey: 196, duration: 0.8, ease: 'power1.inOut' }, 4.35)
      .to(S, { checkA: 0, duration: 0.75, ease: 'power1.inOut' }, 3.3) // the check is over as he goes
      .to(S, { say: 1, duration: 1, ease: 'power2.out' }, 4.55);

    let played = false, introDone = false, moved = false, eager = false;
    // The end of the page: the room under the letters is on screen.
    const ready = () => stage.getBoundingClientRect().top + geo.baseline + geo.floor * 0.6 <= window.innerHeight;
    const go = () => {
      if (moved) return;
      moved = true;
      move.play(0);
    };

    if (!flags.reduce) {
      ctx.tick(() => {
        const was = lifts;
        readLifts();
        if (was[0] !== lifts[0] || was[1] !== lifts[1]) render();
        if (played && introDone && !moved && (eager || ready())) go();
      });
      // With a mouse, pointing at the name starts the move at once (once the position is set).
      ctx.onPointer((p) => {
        if (p.pointerType === 'mouse' && p.type === 'pointermove' && p.inside && !p.interactive) eager = true;
      });
    }

    ctx.onResize(relayout);

    return {
      play() {
        played = true;
        intro.play(0);
      },
      pause() {
        intro.pause();
        if (moved) move.pause();
      },
      resume() {
        if (!introDone) intro.resume();
        if (moved) move.resume();
      },
      still() {
        // The end of the game: the knght under the T's arm, the king lying on the T, the move faint, the last line.
        played = true; introDone = true; moved = true;
        intro.progress(1).pause();
        move.progress(1).pause();
        svg.setAttribute('data-set', '');
        svg.setAttribute('data-mate', '');
        render();
      },
      destroy() {
        dead = true;
        intro.kill();
        move.kill();
        svg.remove();
        say.remove();
      },
    };
  },
};
