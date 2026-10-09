/* The spotlight. A black chess knight stands where the missing I would be, between the N and the G, on the floor the
   letters stand on. As the giant name comes into view a spotlight snaps on over it, and as the reader goes on down the
   camera pushes in, slowly, and comes to rest exactly as the page ends. Scrolling back up runs the film backward; back
   above the letters, the light goes out again.

   The film is public/footage/knght-footer (the owner's footage, graded with the film's other shots: see the note at the
   end). It is drawn on the backdrop, behind every word, and only where no word is: in the band from the bottom of the
   links down to the footer line (its floor reflection meets that line), and in the clear column above the knight
   between the words on either side, where the beam comes down. The knight's floor stays on the letters' baseline all
   the way through the push-in, and the knight is sized to the letters (1.6 cap heights tall at the end of the
   push-in, never under 150 px, so it reads on a phone).

   Time is mapped from the scroll, read from Lenis (window.KNGHT.lenis) when smooth scrolling is on:
     - nothing is spent on the black lead-in: before the snap there is no film at all;
     - the snap (frames 24 to 33) plays the moment a third of the letters is in view, at the film's own speed, or up
       to twice that when the reader is already deep into the push-in, so the light is never still coming on at the
       bottom of the page;
     - the push-in (frames 33 to 144) runs from there to the end of the page, eased in and out: the camera starts
       gently as the light settles and comes to rest exactly as the page ends;
     - what is shown follows that target closely (Lenis has already smoothed the scroll: a 40 ms ease and a high top
       speed), so the camera stops when the reader stops.
   After a swap, or when the reader arrives already at the bottom, the snap and the push-in play once to the scroll's
   place. Reduced motion: the last frame, still.

   Why frames and not the video: scrubbed by the scroll, a <video> has to seek on every change, and in Chromium each
   seek is a full trip through the media pipeline whatever the keyframe spacing: measured on the same scroll-like
   scrub, 15 to 19 new pictures a second at best (a keyframe every 2 or 4 frames, or all-intra). WebP frames decoded
   off the main thread (createImageBitmap) and drawn on a canvas gave 47, exact to the frame, and crossfaded between
   neighbours, so the push-in can run at every other frame (66 frames). Two cuts: 960 wide for phones (about 0.53 MB,
   what a 390 px screen at 2x draws) and 1600 for larger screens (about 1.1 MB), each decoded at its own size (a
   resize in createImageBitmap costs two to four times the decode). Fetched only once this ending mounts, the snap
   first. Only the frames around the playhead are decoded, and nothing is decoded or drawn while the film is off
   screen. While a frame decodes, the nearest decoded one the playhead has already passed stands in, so the picture
   never steps back against the scroll.

   The footage: knght-footer.mp4 (H.264 High, 8-bit 4:2:0, a keyframe every 4 frames and no B-frames, metadata first)
   and knght-footer.webm (VP9) replace the upload (HEVC Main 10); knght-footer.jpg is the first fully lit frame (33), a
   one-channel JPEG, so it has no colour to carry. Graded in black and white with no colour at all (chroma exactly
   neutral), blacks at the family's floor (code 20, as genesis), highlights below 235. The frames here carry the film's
   display treatment (the forge plate's contrast 1.06 and brightness 0.92, which takes that floor to true black) and a
   vignette to black. They are drawn as light only: WebGL writes each grey (the red channel) as white at that opacity,
   which over any background is exactly a screen blend, so the film adds its light to the footer and to the hall light
   behind the page (which a CSS blend inside the isolated footer cannot reach) and leaves no edge. Without WebGL a 2D
   canvas draws them, and an SVG colour matrix makes the same light-only picture. */

const ID = 'spotlight';
let uid = 0;
const DIR = '/footage/knght-footer/';
const FPS = 24;
// The frames on disk: the spark and the snap at every frame, the push-in at every other frame, and the last.
const FRAMES = [24, 25, 26, 27, 28, 29, 30, 31, 32, 33];
for (let f = 35; f < 144; f += 2) FRAMES.push(f);
FRAMES.push(144);
const DARK = 24, LIT = 33, END = 144;
// The two cuts on disk (public/footage/knght-footer/<w>/NNN.webp): the top 0.86 of the 16:9 picture. A screen that
// draws the film no wider than about 1000 device pixels (a phone) gets the 960 cut.
const SETS = [{ w: 960, h: 464 }, { w: 1600, h: 774 }];
const CROP = 0.86;
// The push-in, measured from the footage: the camera's zoom against frame 33, every 8 frames.
const ZOOM = [[33, 1], [41, 1.002], [49, 1.006], [57, 1.014], [65, 1.034], [73, 1.054], [81, 1.08], [89, 1.114], [97, 1.148],
  [105, 1.188], [113, 1.232], [121, 1.282], [129, 1.338], [137, 1.4], [144, 1.458]];
// The knight in the picture (fractions of the 16:9 frame): the middle of its plinth, and where it meets the floor,
// at frame 33 and at the end. Its height, ears to floor, at frame 33.
const KX = [0.485, 0.481], KY = [0.665, 0.742], KH = 0.39;
const SNAP_IN = 0.35;  // the snap: this much of the cap height in view
const SNAP_OUT = 0.1;  // the light goes out again only above this (no flicker on the line)
const EASE_S = 0.04;   // seconds: how closely the picture follows the scroll (Lenis has smoothed it already)
const TOP_SPEED = 500; // film frames a second at most, so a jump plays as a quick move, never a cut
const SNAP_RUSH = 2;   // the snap runs up to this much faster when the scroll is already deep into the push-in
const KEEP = 10;       // decoded frames kept at once
const NEAR = 0.25;     // decode and draw only while the film is within this much of a screen of the viewport
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const zoomAt = (f) => {
  if (f <= LIT) return 1;
  for (let i = 1; i < ZOOM.length; i++) {
    const [f1, z1] = ZOOM[i];
    if (f <= f1) { const [f0, z0] = ZOOM[i - 1]; return z0 + ((z1 - z0) * (f - f0)) / (f1 - f0); }
  }
  return ZOOM[ZOOM.length - 1][1];
};
const Z_END = zoomAt(END);
// The bracketing frames on disk for a playhead d, and how far between them it is.
const bracket = (d) => {
  if (d <= FRAMES[0]) return [0, 0, 0];
  for (let i = 1; i < FRAMES.length; i++) {
    if (d <= FRAMES[i]) return [i - 1, i, (d - FRAMES[i - 1]) / (FRAMES[i] - FRAMES[i - 1])];
  }
  return [FRAMES.length - 1, FRAMES.length - 1, 0];
};

// WebGL that paints a grey frame as light only: white at the grey's opacity, premultiplied, so the canvas composites
// over the page exactly as a screen blend would. Two frames crossfade by adding their weighted light.
const VERT = 'attribute vec2 p;uniform vec4 r;varying vec2 v;void main(){v=p;vec2 q=r.xy+p*r.zw;gl_Position=vec4(q.x*2.0-1.0,1.0-q.y*2.0,0.0,1.0);}';
const FRAG = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform sampler2D t;uniform float k;varying vec2 v;void main(){float l=texture2D(t,v).r*k;gl_FragColor=vec4(l,l,l,l);}';
function makeGL(canvas) {
  let gl = null;
  try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }); } catch (e) { gl = null; }
  if (!gl) return null;
  const tex = new Map(); // frame -> texture (the few around the playhead)
  let prog, loc;
  const api = {
    lost: false,
    init() {
      tex.clear();
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      loc = { r: gl.getUniformLocation(prog, 'r'), k: gl.getUniformLocation(prog, 'k'), p: gl.getAttribLocation(prog, 'p') };
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc.p);
      gl.vertexAttribPointer(loc.p, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE); // a crossfade adds up the two frames' light
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      api.lost = false;
      return !!gl.getProgramParameter(prog, gl.LINK_STATUS);
    },
    clear(w, h) {
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    draw(f, img, x, y, w, h, k) {
      let t = tex.get(f);
      if (!t) {
        t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
        tex.set(f, t);
      } else gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform4f(loc.r, x, y, w, h);
      gl.uniform1f(loc.k, k);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    // Keep the textures of the frames on screen and their neighbours; let the rest go.
    keep(frames) {
      if (tex.size <= 6) return;
      tex.forEach((t, f) => { if (!frames.includes(f) && tex.size > 4) { gl.deleteTexture(t); tex.delete(f); } });
    },
    // Another cut of the frames: every texture goes.
    reset() {
      tex.forEach((t) => gl.deleteTexture(t));
      tex.clear();
    },
    destroy() {
      tex.forEach((t) => gl.deleteTexture(t));
      tex.clear();
      const x = gl.getExtension('WEBGL_lose_context');
      if (x) x.loseContext();
    },
  };
  return api.init() ? api : null;
}

export default {
  id: ID,
  name: 'The spotlight',
  takesOver: false,

  mount(ctx) {
    const { gsap, footer, stage, flags } = ctx;
    // The canvas covers only the part of the backdrop the film can reach, at the frames' own resolution (no finer
    // than the screen's, and never more than 2x), so it costs as few pixels as the picture needs.
    const box = { x: 0, y: 0, w: 0, h: 0, res: 1 };
    let el = ctx.make('canvas', { parent: ctx.backdrop, className: 'spotlight__film' });
    const gpu = makeGL(el);
    if (!gpu) { el.remove(); el = ctx.make('canvas', { parent: ctx.backdrop, className: 'spotlight__film' }); } // a canvas that tried WebGL cannot draw 2D
    const g = gpu ? null : el.getContext('2d');
    if (!gpu) {
      // The 2D fallback makes the same light-only picture through an SVG colour matrix on the canvas: white, at the
      // opacity of the red channel (so a stray code of chroma in a lossy WebP never shows). Over anything that is a
      // screen blend, so it reaches the hall light behind the page with no box around the film.
      const fid = `spotlight-light-${++uid}`;
      const defs = ctx.make('svg', { parent: ctx.backdrop, attrs: { width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' } });
      const filter = ctx.make('filter', { parent: defs, attrs: { id: fid, 'color-interpolation-filters': 'sRGB' } });
      ctx.make('feColorMatrix', { parent: filter, attrs: { type: 'matrix', values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0' } });
      el.style.filter = `url(#${fid})`;
    }
    if (gpu) {
      ctx.on(el, 'webglcontextlost', (e) => { e.preventDefault(); gpu.lost = true; }, { passive: false });
      ctx.on(el, 'webglcontextrestored', () => { gpu.init(); dirty = true; shown = null; });
    }

    /* ---------- Geometry: where the film sits, and where the words are ---------- */
    let geo, place, set = null;
    const layout = () => {
      geo = ctx.measure();
      const L = geo.letters;
      const X = (L[1].x + L[1].w + L[2].x) / 2; // between the N and the G
      // The clear column above the knight: from the band upward, row by row, between the words beside it, until a
      // word crosses it or would squeeze it narrower than the knight's head.
      const s0 = stage.getBoundingClientRect();
      const rects = [];
      const wrap = footer.querySelector('.wrap');
      if (wrap) {
        const walk = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          if (!n.textContent.trim()) continue;
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) if (r.width > 1) rects.push(r);
        }
        wrap.querySelectorAll('a, button, svg, img').forEach((n) => { const r = n.getBoundingClientRect(); if (r.width > 1) rects.push(r); });
      }
      const rows = rects.map((r) => ({ l: r.left - s0.left, r: r.right - s0.left, t: r.top - s0.top, b: r.bottom - s0.top }))
        .filter((r) => r.b <= geo.linksBottom + 2).sort((a, b) => b.b - a.b);
      const cap = geo.capHeight;
      // The knight at the end of the push-in: 1.6 cap heights tall, at least 150 px, and its head never more than
      // 60 px above the bottom of the links.
      const hEnd = Math.min(Math.max(cap * 1.6, 150), geo.baseline - geo.linksBottom + 60);
      const s = hEnd / (KH * Z_END); // the 16:9 frame's height, in CSS px
      const W = s * 16 / 9, H = s;
      const minW = Math.max(56, W * 0.09);
      let cl = 0, cr = geo.width, ctop = geo.back.y;
      for (const r of rows) {
        const nl = r.r <= X ? Math.max(cl, r.r) : cl, nr = r.l >= X ? Math.min(cr, r.l) : cr;
        if ((r.l < X && r.r > X) || nr - nl < minW) { ctop = r.b; break; }
        cl = nl; cr = nr;
      }
      const pad = Math.max(10, cap * 0.06);
      place = { X, Y: geo.baseline, W, H, cl: cl + pad, cr: cr - pad, ctop: ctop + pad };
      // The canvas: the frame's reach (through the whole push-in) inside the backdrop, from the top of the clear
      // column (or of the band) down to the footer line.
      const b = geo.back;
      const lefts = [KX[0], KX[1]].map((kx) => X - kx * W), tops = [KY[0], KY[1]].map((ky) => geo.baseline - ky * H);
      const x0 = Math.max(b.x, Math.floor(Math.min(...lefts))), x1 = Math.min(b.x + b.w, Math.ceil(Math.max(...lefts) + W));
      const y0 = Math.max(b.y, Math.floor(Math.max(Math.min(...tops), Math.min(place.ctop, geo.linksBottom)))), y1 = Math.min(b.y + b.h, Math.ceil(geo.baseTop));
      // The cut: the 960 frames when the film is drawn no wider than about 1000 device pixels, else the 1600.
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      const cut = W * dpr <= SETS[0].w * 1.05 ? SETS[0] : SETS[1];
      if (cut !== set) { const was = set; set = cut; if (was) recut(); }
      const res = clamp(Math.min(dpr, set.w / W), 1, 2);
      Object.assign(box, { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0), res });
      el.width = Math.round(box.w * res);
      el.height = Math.round(box.h * res);
      Object.assign(el.style, { left: `${x0 - b.x}px`, top: `${y0 - b.y}px`, width: `${box.w}px`, height: `${box.h}px` });
      if (g) g.setTransform(res, 0, 0, res, -x0 * res, -y0 * res); // draw in stage coordinates
      // The words never have film behind them: a mask on the canvas, in its own box. The band runs the canvas's width;
      // the column is soft at its sides.
      const fade = clamp(cap * 0.16, 14, 36), foot = clamp(geo.floor * 0.25, 6, 18);
      const bandTop = geo.linksBottom - y0, bandH = geo.baseTop - geo.linksBottom;
      const chW = Math.max(0, place.cr - place.cl), chH = Math.max(0, geo.linksBottom + fade - place.ctop);
      const edge = clamp(chW * 0.2, 12, 40);
      const px = (v) => `${v.toFixed(1)}px`;
      const masks = [`linear-gradient(180deg,transparent 0,#000 ${px(fade)},#000 ${px(bandH - foot)},transparent ${px(bandH)}) 0 ${px(bandTop)}/100% ${px(bandH)} no-repeat`];
      if (chW > 0 && chH > 0) masks.push(`linear-gradient(90deg,transparent 0,#000 ${px(edge)},#000 ${px(chW - edge)},transparent ${px(chW)}) ${px(place.cl - x0)} ${px(place.ctop - y0)}/${px(chW)} ${px(chH)} no-repeat`);
      el.style.setProperty('-webkit-mask', masks.join(','));
      el.style.setProperty('mask', masks.join(','));
      dirty = true;
      shown = null;
    };

    /* ---------- The frames: fetched once (the snap first), decoded only around the playhead ---------- */
    const blobs = new Map(), bitmaps = new Map(), decoding = new Set();
    let dead = false, dirty = true, cutNo = 0; // cutNo: a fetch or decode from an earlier cut is let go
    const queue = [], loading = new Set();
    const pump = () => {
      while (loading.size < 4 && queue.length && !dead) {
        const f = queue.shift();
        if (blobs.has(f) || loading.has(f)) continue;
        loading.add(f);
        const n = cutNo;
        fetch(`${DIR}${set.w}/${String(f).padStart(3, '0')}.webp`, { signal: ctx.signal })
          .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`))))
          .then((b) => { if (!dead && n === cutNo) { blobs.set(f, b); dirty = true; if (stillMode && f === END) decode(END); } })
          .catch((e) => { if (!dead && e.name !== 'AbortError') console.warn(`KNGHT footer: spotlight frame ${f} did not load`, e.message); })
          .finally(() => { if (n === cutNo) loading.delete(f); pump(); });
      }
    };
    const fetchAll = () => {
      queue.push(...FRAMES.filter((f) => f <= LIT), END, ...FRAMES.filter((f) => f > LIT && f < END));
      pump();
    };
    let stillMode = false;
    const canBitmap = typeof createImageBitmap === 'function';
    // Each frame is decoded at its own size: asking createImageBitmap to resize costs two to four times the decode.
    const decode = (f) => {
      if (dead || bitmaps.has(f) || decoding.has(f) || !blobs.has(f)) return;
      decoding.add(f);
      const n = cutNo;
      const done = (img) => {
        if (n === cutNo) decoding.delete(f);
        if (dead || n !== cutNo) { if (img && img.close) img.close(); return; }
        bitmaps.set(f, img);
        dirty = true;
        trim();
        if (stillMode && f === END) draw(END);
      };
      const fail = () => { if (n === cutNo) decoding.delete(f); };
      if (canBitmap) createImageBitmap(blobs.get(f)).then(done, fail);
      else {
        const img = new Image();
        const url = URL.createObjectURL(blobs.get(f));
        img.src = url;
        img.decode().then(() => { URL.revokeObjectURL(url); done(img); }, () => { URL.revokeObjectURL(url); fail(); });
      }
    };
    // Keep the frames nearest the playhead, let the rest go.
    let head = DARK;
    const trim = () => {
      if (bitmaps.size <= KEEP) return;
      [...bitmaps.keys()].sort((a, b) => Math.abs(b - head) - Math.abs(a - head)).slice(0, bitmaps.size - KEEP).forEach((f) => {
        const bm = bitmaps.get(f);
        if (bm && bm.close) bm.close();
        bitmaps.delete(f);
      });
    };
    function flush() {
      bitmaps.forEach((bm) => bm && bm.close && bm.close());
      bitmaps.clear();
      dirty = true;
    }
    // A new size that needs the other cut (a phone turned to landscape, a window made wide): start again with it.
    // What is on the canvas stays until the new frames land.
    function recut() {
      cutNo++;
      queue.length = 0;
      loading.clear();
      decoding.clear();
      flush();
      blobs.clear();
      if (gpu) gpu.reset();
      if (stillMode) still();
      else if (!flags.reduce) fetchAll();
    }

    /* ---------- Drawing one frame, or two crossfaded, at the knight's place ---------- */
    let shown = null; // what is on the canvas: 'dark', the playhead it shows, or the frame standing in for it
    const rectOf = (f) => {
      // The knight's floor stays on the baseline through the push-in: each frame is placed by its own zoom.
      const k = (zoomAt(f) - 1) / (Z_END - 1);
      const kx = KX[0] + (KX[1] - KX[0]) * k, ky = KY[0] + (KY[1] - KY[0]) * k;
      return [place.X - kx * place.W, place.Y - ky * place.H, place.W, place.H * CROP];
    };
    // Paint frames with weights (a crossfade adds up to one): WebGL as light only, or the 2D canvas (its filter makes
    // the light).
    const paint = (list) => {
      if (gpu) {
        if (gpu.lost) return;
        gpu.clear(el.width, el.height);
        list.forEach(([f, k]) => {
          const [x, y, w, h] = rectOf(f);
          gpu.draw(f, bitmaps.get(f), ((x - box.x) * box.res) / el.width, ((y - box.y) * box.res) / el.height, (w * box.res) / el.width, (h * box.res) / el.height, k);
        });
        gpu.keep(list.map(([f]) => f));
        return;
      }
      g.clearRect(box.x, box.y, box.w, box.h);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      list.forEach(([f, k], i) => {
        g.globalAlpha = i ? k : 1; // the second frame over the first, at its share
        g.drawImage(bitmaps.get(f), ...rectOf(f));
      });
      g.globalAlpha = 1;
    };
    let dir = 1; // the way the playhead last moved
    const draw = (d) => {
      if (d <= DARK + 0.02) {
        if (shown !== 'dark') { paint([]); shown = 'dark'; el.dataset.frame = 'dark'; el.dataset.head = d.toFixed(2); }
        return;
      }
      const [ia, ib, w] = bracket(d);
      const a = FRAMES[ia], b = FRAMES[ib];
      let list, at = d;
      if (bitmaps.has(a) && (a === b || w <= 0.004)) list = [[a, 1]];
      else if (bitmaps.has(b) && w >= 0.996) list = [[b, 1]];
      else if (bitmaps.has(a) && bitmaps.has(b)) list = [[a, 1 - w], [b, w]];
      else {
        // A stand-in while the frame decodes: the decoded frame nearest the playhead on the side it has come from,
        // and never one behind the picture already showing, so the film never steps back against the scroll.
        let best = null;
        bitmaps.forEach((_, f) => {
          if ((f - d) * dir > 0.001) return;
          if (typeof shown === 'number' && (f - shown) * dir < -0.001) return;
          if (best == null || Math.abs(f - d) < Math.abs(best - d)) best = f;
        });
        if (best == null || best === shown) return; // nothing better yet: leave the canvas as it is
        list = [[best, 1]];
        at = best;
      }
      paint(list);
      shown = at;
      // For QA: the frame showing most, and the playhead.
      el.dataset.frame = String(list.length > 1 ? (w >= 0.5 ? b : a) : list[0][0]);
      el.dataset.head = d.toFixed(2);
    };

    /* ---------- The scroll, read from Lenis, and the film's time ---------- */
    const scrollNow = () => {
      const l = window.KNGHT && window.KNGHT.lenis;
      const v = l && Number.isFinite(l.scroll) ? l.scroll : window.scrollY;
      return v;
    };
    const limitNow = () => {
      const l = window.KNGHT && window.KNGHT.lenis;
      if (l && Number.isFinite(l.limit) && l.limit > 0) return l.limit;
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    };
    // Where the reader is, against the letters: the scroll at which the snap happens, and the end of the page.
    const span = () => {
      const top = stage.getBoundingClientRect().top + window.scrollY; // the stage's place in the page
      const vh = window.innerHeight;
      const snap = top + geo.capTop + geo.capHeight * SNAP_IN - vh;
      const end = Math.max(snap + 1, Math.min(limitNow(), top + geo.footer.y + geo.footer.height - vh));
      return { snap, end, off: snap - geo.capHeight * (SNAP_IN - SNAP_OUT) };
    };
    // The push-in's place for a scroll progress p (0 at the snap, 1 at the end of the page): eased in and out, so the
    // camera moves off gently while the light settles (the snap takes its own time, and the reader keeps scrolling
    // through it) and comes to rest exactly as the page ends.
    const pushAt = (p) => LIT + (END - LIT) * (0.5 - 0.5 * Math.cos(clamp(p, 0, 1) * Math.PI));

    const st = { d: DARK };
    let lit = false, played = false, intro = null;
    const target = () => {
      const y = scrollNow(), sp = span();
      if (!lit && y >= sp.snap) lit = true;
      else if (lit && y < sp.off) lit = false;
      return lit ? pushAt((y - sp.snap) / (sp.end - sp.snap)) : DARK;
    };
    // The push-in follows its target closely (an exponential ease, with a top speed) and lands on it exactly.
    const follow = (d, to, dt) => {
      const move = clamp((to - d) * (1 - Math.exp(-dt / EASE_S)), -TOP_SPEED * dt, TOP_SPEED * dt);
      return Math.abs(to - d - move) < 0.01 ? to : d + move;
    };
    // The target is DARK (no light) or somewhere in the push-in (LIT to END); between them lies the snap, which runs
    // in time, not with the scroll: forward as the light comes on (at the film's own speed, up to twice that when the
    // reader is already deep into the push-in), backward (a little quicker) as it goes out.
    const step = (dt) => {
      const want = played ? target() : DARK;
      let d = st.d;
      if (want > d) {
        if (d < LIT) d = Math.min(LIT, d + FPS * (1 + (SNAP_RUSH - 1) * clamp((want - LIT) / (END - LIT), 0, 1)) * dt);
        else d = follow(d, want, dt);
      } else if (want < d) {
        // Going dark: the push-in eases back to the lit frame, and from about there the snap runs backward.
        const out = want < LIT && d < LIT + 1.5;
        d = d > LIT && !out ? follow(d, Math.max(want, LIT), dt) : Math.max(want, d - FPS * 1.25 * dt);
      }
      st.d = d;
    };
    // The two frames either side of the playhead, always; then a few ahead in the direction of travel, more the faster
    // it goes (about 0.15 s of travel, 2 to 6 frames on disk), but only while the decoder has room, so a flick never
    // queues frames it has already passed ahead of the ones it needs now.
    const decodeAround = (d, way, ahead) => {
      const [ia, ib] = bracket(d);
      decode(FRAMES[ia]);
      decode(FRAMES[ib]);
      for (let k = 1; k <= ahead && decoding.size < 4; k++) { const f = FRAMES[(way > 0 ? ib : ia) + k * way]; if (f != null) decode(f); }
    };
    // Whether the film is near enough the viewport to be worth decoding and drawing (the footer can be in view with
    // the film still below it, or already above it).
    const nearView = () => {
      const top = stage.getBoundingClientRect().top + box.y, vh = window.innerHeight;
      return top < vh * (1 + NEAR) && top + box.h > -vh * NEAR;
    };

    // The clock is GSAP's own (so a recorder that steps GSAP's time steps the film too).
    let last = -1, prevD = st.d;
    const render = () => {
      const now = gsap.globalTimeline.time();
      const dt = last < 0 ? 1 / 60 : clamp(now - last, 0, 0.1);
      last = now;
      if (!intro) step(dt);
      const d = st.d;
      if (Math.abs(d - prevD) > 1e-4) dir = d > prevD ? 1 : -1;
      const speed = dt > 0 ? Math.abs(d - prevD) / dt : 0; // film frames a second
      prevD = d;
      head = d;
      if (!nearView()) { dirty = true; return; } // time still moves, but nothing is decoded or drawn
      if (d > DARK) decodeAround(d, dir, clamp(Math.round((speed * 0.15) / 2), 2, 6));
      else decodeAround(DARK + 0.5, 1, 2); // in the dark: the snap's first frames, ready
      if (dirty || typeof shown !== 'number' || Math.abs(d - shown) > 0.002) {
        dirty = false;
        draw(d);
      }
    };

    layout();
    // A new size clears the canvas: paint the same moment again (time does not move for a resize).
    ctx.onResize(() => { layout(); if (flags.reduce) still(); else draw(st.d); });

    // The snap and the push-in once, to where the reader already is (after a swap, or arriving at the bottom).
    const playIn = ctx.add(() => {
      const want = target();
      if (want <= LIT + 6) return; // near the snap: the scroll itself will do it
      st.d = DARK;
      intro = gsap.timeline({ onComplete: () => { intro = null; } })
        .to(st, { d: LIT, duration: (LIT - DARK) / FPS, ease: 'none' })
        .to(st, { d: () => Math.max(LIT, target()), duration: 1.4 + 1.6 * ((want - LIT) / (END - LIT)), ease: 'power2.inOut' });
    });
    // The reader scrolls during it: hand the playhead back to the scroll.
    let introY = null;
    const watchIntro = () => {
      if (!intro) { introY = null; return; }
      const y = scrollNow();
      if (introY == null) introY = y;
      else if (Math.abs(y - introY) > 4 && intro.time() > (LIT - DARK) / FPS) { intro.kill(); intro = null; introY = null; }
    };

    let offTick = () => {};
    // Reduced motion: the last lit frame, as a still picture. Only that frame is fetched; it is drawn when it lands
    // (no tick runs under reduced motion), and again after a resize.
    const still = () => {
      stillMode = true;
      shown = null;
      if (bitmaps.has(END)) draw(END);
      else if (blobs.has(END)) decode(END);
      else { queue.unshift(END); pump(); }
    };

    if (!flags.reduce) {
      fetchAll();
      offTick = ctx.tick(() => { watchIntro(); render(); });
    }

    return {
      play() {
        played = true;
        last = -1;
        playIn();
      },
      pause() { if (intro) intro.pause(); },
      resume() {
        last = -1;
        if (intro) intro.resume();
        // Back from above the letters (the footer left the screen while the film was lit): start in the dark, not
        // on the frame it was left on, so the light never shows and then goes out as the reader comes back down.
        else if (played && target() <= DARK && st.d > DARK) { st.d = DARK; dirty = true; }
      },
      still,
      destroy() {
        dead = true;
        offTick();
        if (intro) intro.kill();
        intro = null;
        queue.length = 0;
        flush();
        blobs.clear();
        if (gpu) gpu.destroy();
        el.remove();
      },
    };
  },
};
