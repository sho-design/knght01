/* The film's drawn scenes, shared by the film (film-motion.js) and the directions page (/lab/film/).
   Each direction is draw(frame, seconds into its eight). A frame may carry ring(k), the radius of layer k,
   and nine, the positions of the nine worlds, so the drawing lands exactly under the diagram. */
export const D = 8;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (v) => 1 - Math.pow(1 - clamp(v), 3);
const inout = (v) => { v = clamp(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const rnd = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const W_ = (a) => `rgba(255,255,255,${clamp(a)})`;
const noise = (x, s = 0) => Math.sin(x * 1.7 + s) * 0.5 + Math.sin(x * 3.1 + s * 2.3) * 0.3 + Math.sin(x * 5.3 + s * 0.7) * 0.2;

// A canvas and its frame: centre of the subject right of the type, as in the film.
// A canvas and its frame. The layout puts the subject's centre and its unit (U) where the page wants them;
// by default right of the type, as in the film.
const frame = (c, layout) => {
  const ctx = c.getContext('2d'), dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const r = c.getBoundingClientRect(), W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const f = { ctx, W, H, dpr, cx: W * 0.64, cy: H * 0.5, U: Math.min(W, H) / 100 };
  if (layout) Object.assign(f, layout(r, dpr, f));
  // Methods read this.ctx, so a copy of the frame can draw into another canvas.
  f.glow = function (x, y, rad, a) { if (rad <= 0 || a <= 0) return; const c2 = this.ctx, g = c2.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, W_(a)); g.addColorStop(0.35, W_(a * 0.35)); g.addColorStop(1, W_(0)); c2.fillStyle = g; c2.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
  f.line = function (a, lw = 1) { this.ctx.strokeStyle = W_(a); this.ctx.lineWidth = lw * dpr; };
  f.dot = function (x, y, rad, a) { const c2 = this.ctx; c2.globalAlpha = clamp(a); c2.beginPath(); c2.arc(x, y, rad, 0, TAU); c2.fill(); c2.globalAlpha = 1; };
  return f;
};

/* ---------- Scene 1 endings ---------- */
const motes = (() => { const r = rnd(3); return Array.from({ length: 520 }, () => ({ a: r() * TAU, d: Math.pow(r(), 0.6), s: 0.3 + r() * 1.2, w: 0.5 + r(), p: r() * TAU })); })();
const cloud = (f, t, R, alpha, pull = 0) => {
  const { ctx, cx, cy, dpr } = f;
  ctx.fillStyle = '#fff';
  motes.forEach((m) => {
    const d = m.d * (1 - pull * (0.4 + 0.6 * m.d)), a = m.a + t * 0.08 * m.w / (0.25 + d);
    f.dot(cx + Math.cos(a) * d * R, cy + Math.sin(a) * d * R * 0.82, m.s * dpr, alpha * (0.25 + 0.5 * Math.abs(Math.sin(t * 0.9 * m.w + m.p))) * (1 - d * 0.5));
  });
};
const flare = (f, x, y, s, a) => {
  const { ctx, W, U } = f;
  f.glow(x, y, s * 26 * U, 0.55 * a); f.glow(x, y, s * 6 * U, 0.9 * a);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  [[1, 0, 0.5], [0, 1, 0.32]].forEach(([hx, vy, k]) => {
    const L = (hx ? W * 0.5 : 34 * U) * s, g = ctx.createLinearGradient(x - hx * L, y - vy * L, x + hx * L, y + vy * L);
    g.addColorStop(0, W_(0)); g.addColorStop(0.5, W_(k * a)); g.addColorStop(1, W_(0));
    ctx.fillStyle = g; const th = Math.max(1, 0.35 * U * s);
    hx ? ctx.fillRect(x - L, y - th / 2, L * 2, th) : ctx.fillRect(x - th / 2, y - L, th, L * 2);
  });
  ctx.restore();
};
export const DIRS = {};
DIRS['spark-flare'] = (f, t) => {
  const { cx, cy, U } = f, R = 38 * U;
  f.glow(cx, cy, R * 1.5, 0.22 * (1 - ease((t - 2) / 3) * 0.6));
  cloud(f, t, R, 1 - ease((t - 3) / 3) * 0.7, ease((t - 1.5) / 4) * 0.25);
  const g = ease((t - 1.6) / 2.4), pop = Math.exp(-Math.pow((t - 4.1) * 2.2, 2));
  flare(f, cx, cy, g * (0.7 + 0.5 * pop) * (1 + 0.04 * Math.sin(t * 3)), g);
  if (t > 4) { const p = clamp((t - 4) / 2.6); f.line(0.5 * (1 - p), 1.2); f.ctx.beginPath(); f.ctx.arc(cx, cy, p * 46 * U, 0, TAU); f.ctx.stroke(); }
};
DIRS['spark-gather'] = (f, t) => {
  const { cx, cy, U } = f, R = 40 * U, pull = inout(t / 5);
  f.glow(cx, cy, R * (1.4 - pull * 0.9), 0.18 + pull * 0.2);
  if (t < 5.4) cloud(f, t * (1 + pull * 3), R, 1 - ease((t - 4.6) / 0.8), pull);
  const s = ease((t - 4.4) / 1);
  flare(f, cx, cy, s * (0.8 + 0.6 * Math.exp(-Math.pow((t - 5.1) * 3, 2))), s);
  if (t > 5) [0, 0.35].forEach((o) => { const p = clamp((t - 5 - o) / 2.4); f.line(0.6 * (1 - p), 1.4 - o * 2); f.ctx.beginPath(); f.ctx.arc(cx, cy, ease(p) * 52 * U, 0, TAU); f.ctx.stroke(); });
};

// The film's version: only the flare, over the last seconds of the genesis footage.
DIRS['spark-end'] = (f, t) => {
  const { cx, cy, U, ctx } = f, g = ease((t - 4.9) / 1.5), pop = Math.exp(-Math.pow((t - 6.5) * 2.2, 2));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  flare(f, cx, cy, g * (0.7 + 0.5 * pop) * (1 + 0.04 * Math.sin(t * 3)), g);
  if (t > 6.4) { const p = clamp((t - 6.4) / 1.6); f.line(0.5 * (1 - p), 1.2); ctx.beginPath(); ctx.arc(cx, cy, p * 46 * U, 0, TAU); ctx.stroke(); }
  ctx.restore();
};

/* ---------- Scene 2: seven layers ---------- */
// A ring in three dimensions: tilt about x, then turn about y, with depth shading on the near side.
const ring3 = (f, r, tilt, turn, spin, a, lw, ticks = 0) => {
  const { ctx, cx, cy } = f, N = 96, cosT = Math.cos(tilt), sinT = Math.sin(tilt), cosY = Math.cos(turn), sinY = Math.sin(turn);
  const P = (u) => { let x = Math.cos(u) * r, y = Math.sin(u) * r, z = 0; const y1 = y * cosT - z * sinT, z1 = y * sinT + z * cosT; const x2 = x * cosY + z1 * sinY, z2 = -x * sinY + z1 * cosY; const k = 1 / (1 + z2 / (r * 6 + 1)); return [cx + x2 * k, cy + y1 * k, z2]; };
  for (let i = 0; i < N; i++) {
    const [x1, y1, z1] = P((i / N) * TAU + spin), [x2, y2] = P(((i + 1) / N) * TAU + spin);
    f.line(a * (0.45 + 0.55 * clamp(0.5 - z1 / (r * 2))), lw); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  for (let k = 0; k < ticks; k++) { const [x, y, z] = P((k / ticks) * TAU + spin); ctx.fillStyle = '#fff'; f.dot(x, y, 1.6 * f.dpr, a * clamp(0.6 - z / (r * 2))); }
};
DIRS.sphere = (f, t) => {
  const { cx, cy, U } = f, flat = inout((t - 6) / 1.8);
  f.glow(cx, cy, 30 * U, 0.2); flare(f, cx, cy, 0.5, 0.9);
  for (let k = 0; k < 7; k++) {
    const at = 0.4 + k * 0.62, p = ease((t - at) / 1.1); if (p <= 0) continue;
    const r = (f.ring ? f.ring(k) : (8 + k * 5.6) * U) * (1 + (1 - p) * 0.6), seed = k * 1.7 + 0.4;
    const tilt = (0.9 + 0.5 * Math.sin(seed)) * (1 - flat), turn = (seed + t * (0.25 + k * 0.04) * (k % 2 ? -1 : 1)) * (1 - flat);
    ring3(f, r, tilt, turn, t * 0.2, p * 0.85, 1.1, 3);
    if (p < 1) { const c = Math.exp(-Math.pow((t - at - 1) * 5, 2)); f.glow(cx, cy, r * 1.1, 0.12 * c); }
  }
};
DIRS.keep = (f, t) => {
  const { ctx, cx, U, H } = f, cy = f.cy + 12 * U, tilt = 0.42, orbit = t * 0.12;
  const fire = 0.8 + 0.2 * Math.sin(t * 9) * Math.sin(t * 5.3);
  f.glow(cx, cy - 3 * U, 30 * U, 0.3 * fire);
  for (let k = 6; k >= 0; k--) {
    const r = (7 + k * 5.2) * U, rise = ease((t - 0.5 - k * 0.65) / 1.3), h = (3 + (6 - k) * 0.7) * U * rise;
    if (rise <= 0) { f.line(0.12, 0.8); ctx.beginPath(); ctx.ellipse(cx, cy, r, r * tilt, 0, 0, TAU); ctx.stroke(); continue; }
    const lit = 0.35 + 0.5 * clamp(1 - k / 8);
    f.line(lit * 0.7, 1); ctx.beginPath(); ctx.ellipse(cx, cy, r, r * tilt, 0, 0, Math.PI); ctx.stroke();
    f.line(lit, 1.1); ctx.beginPath(); ctx.ellipse(cx, cy - h, r, r * tilt, 0, 0, TAU); ctx.stroke();
    // Courses of stone and the crenels along the top, turning with the slow orbit.
    const n = 18 + k * 6;
    for (let i = 0; i < n; i++) {
      const u = (i / n) * TAU + orbit * (k % 2 ? 1 : -1), x = cx + Math.cos(u) * r, y = cy + Math.sin(u) * r * tilt, front = Math.sin(u) > 0;
      f.line((front ? 0.4 : 0.15) * lit, 0.8); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
      if (i % 2 === 0) { const x2 = cx + Math.cos(u + TAU / n) * r, y2 = cy + Math.sin(u + TAU / n) * r * tilt; f.line((front ? 0.7 : 0.3) * lit, 1); ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y - h - 1.2 * U * rise); ctx.lineTo(x2, y2 - h - 1.2 * U * rise); ctx.lineTo(x2, y2 - h); ctx.stroke(); }
    }
  }
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 24; i++) { const s = (t * 0.6 + i / 24) % 1; f.dot(cx + Math.sin(i * 7.1 + t) * 3 * U * (1 - s), cy - 3 * U - s * 26 * U, 1.1 * f.dpr, (1 - s) * 0.8 * fire); }
  if (H) f.glow(cx, cy - 2 * U, 7 * U, 0.8 * fire);
};
DIRS.strata = (f, t) => {
  const { ctx, cx, cy, U, W } = f, R = 40 * U, show = ease(t / 1.5);
  const band = (k, rr) => { ctx.beginPath(); for (let i = 0; i <= 120; i++) { const u = (i / 120) * TAU, rad = rr * (1 + 0.06 * noise(u * 2, k * 3.1) + 0.02 * noise(u * 9, k)); i ? ctx.lineTo(cx + Math.cos(u) * rad, cy + Math.sin(u) * rad * 0.9) : ctx.moveTo(cx + Math.cos(u) * rad, cy + Math.sin(u) * rad * 0.9); } ctx.closePath(); };
  const sweep = inout((t - 0.3) / 5.2), sx = cx - R * 1.2 + sweep * R * 2.4;
  for (let k = 7; k >= 1; k--) {
    const rr = R * (0.16 + k * 0.12), d = Math.abs(sx - cx) / (R * 0.9), lit = 0.15 + 0.85 * Math.exp(-d * d * 2) * (0.6 + 0.4 * (k % 2)) + 0.3 * ease((t - 5.5) / 2);
    band(k, rr); const v = Math.round((k % 2 ? 18 : 40) * (0.4 + lit * 1.6)); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.globalAlpha = show; ctx.fill(); ctx.globalAlpha = 1;
    f.line(lit * 0.75 * show, 1); ctx.stroke();
    // Crystal grain catching the light.
    const r2 = rnd(k * 13);
    for (let i = 0; i < 30 + k * 10; i++) { const u = r2() * TAU, rad = rr * (0.9 + r2() * 0.1), x = cx + Math.cos(u) * rad, y = cy + Math.sin(u) * rad * 0.9, near = Math.exp(-Math.pow((x - sx) / (R * 0.5), 2)); if (near < 0.05) continue; f.line(near * 0.6 * show, 0.7); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(u) * 1.6 * U, y + Math.sin(u) * 1.6 * U); ctx.stroke(); }
  }
  const g = ctx.createLinearGradient(sx - 8 * U, 0, sx + 8 * U, 0); g.addColorStop(0, W_(0)); g.addColorStop(0.5, W_(0.1 * show)); g.addColorStop(1, W_(0));
  ctx.fillStyle = g; ctx.fillRect(sx - 8 * U, 0, 16 * U, f.H);
  f.glow(cx, cy, 10 * U, 0.6 * show); flare(f, cx, cy, 0.35 + 0.25 * ease((t - 5.5) / 2), show);
  if (W) return;
};

/* ---------- Scene 5: the missing layers ---------- */
// The rose window: a centre, twelve inner lights and twelve outer roundels. Each pane draws its own path.
const PANES = (() => {
  const p = [{ k: 'c' }];
  for (let i = 0; i < 12; i++) p.push({ k: 'w', i });
  for (let i = 0; i < 12; i++) p.push({ k: 'o', i });
  return p;
})();
const panePath = (ctx, x, y, R, p) => {
  ctx.beginPath();
  if (p.k === 'c') ctx.arc(x, y, R * 0.2, 0, TAU);
  else if (p.k === 'w') { const a0 = (p.i / 12) * TAU + 0.03, a1 = ((p.i + 1) / 12) * TAU - 0.03; ctx.arc(x, y, R * 0.5, a0, a1); ctx.arc(x, y, R * 0.25, a1, a0, true); ctx.closePath(); }
  else { const a = ((p.i + 0.5) / 12) * TAU; ctx.arc(x + Math.cos(a) * R * 0.74, y + Math.sin(a) * R * 0.74, R * 0.18, 0, TAU); }
};
const paneCentre = (x, y, R, p) => { if (p.k === 'c') return [x, y]; const a = ((p.i + 0.5) / 12) * TAU, d = p.k === 'w' ? 0.375 : 0.74; return [x + Math.cos(a) * R * d, y + Math.sin(a) * R * d]; };
const MISSING = [3, 8, 10, 15, 19, 22, 24];
const rose = (f, x, y, R, fillOf, lineA) => {
  const { ctx } = f;
  PANES.forEach((p, i) => { const a = fillOf(i); if (a > 0) { panePath(ctx, x, y, R, p); ctx.fillStyle = W_(a * (f.glass || 1)); ctx.fill(); } });
  f.line(lineA, 1.2); [1, 0.96, 0.52, 0.23].forEach((k) => { ctx.beginPath(); ctx.arc(x, y, R * k, 0, TAU); ctx.stroke(); });
  PANES.forEach((p) => { panePath(ctx, x, y, R, p); f.line(lineA * 0.8, 1); ctx.stroke(); });
};
DIRS.window = (f, t) => {
  const { ctx, cx, U, H } = f, cy = f.cy - 6 * U, R = 32 * U;
  const beam = -0.2 + inout((t - 0.8) / 3.6) * 1.4, bx = cx - R * 1.3 + beam * R * 2.6;
  const found = (i) => { const [px] = paneCentre(cx, cy, R, PANES[i]); return clamp((bx - px) / (R * 0.3)); };
  const fillAt = (i) => 4.6 + MISSING.indexOf(i) * 0.28;
  const full = ease((t - 6.6) / 1);
  // The window and the light coming through what glass there is.
  rose(f, cx, cy, R, (i) => {
    const miss = MISSING.includes(i);
    if (!miss) return 0.2 + 0.08 * Math.sin(i * 1.3 + t) + full * 0.25;
    return ease((t - fillAt(i)) / 0.5) * (0.45 + full * 0.0) - (t > fillAt(i) + 0.5 ? 0.25 * ease((t - fillAt(i) - 0.5) / 0.6) : 0);
  }, 0.75);
  MISSING.forEach((i) => {
    const p = PANES[i], [px, py] = paneCentre(cx, cy, R, p), fd = found(i), filled = t > fillAt(i);
    if (!filled) { ctx.setLineDash([3 * f.dpr, 4 * f.dpr]); panePath(ctx, cx, cy, R, p); f.line(0.25 + 0.5 * fd, 1); ctx.stroke(); ctx.setLineDash([]); }
    if (fd > 0 && !filled) { const s = (p.k === 'c' ? 0.27 : 0.12) * R * (1 + 0.08 * Math.sin(t * 6)); f.line(0.85 * fd, 1.3); ctx.beginPath(); ctx.arc(px, py, s, 0, TAU); ctx.stroke(); f.glow(px, py, s * 2, 0.15 * fd); }
    if (filled) f.glow(px, py, 8 * U, 0.5 * Math.exp(-(t - fillAt(i)) * 3));
  });
  // The beam that finds the gaps.
  if (t > 0.8 && t < 4.6) { const a = Math.sin(clamp((t - 0.8) / 3.8) * Math.PI); const g = ctx.createLinearGradient(bx - 3 * U, 0, bx + 3 * U, 0); g.addColorStop(0, W_(0)); g.addColorStop(0.5, W_(0.22 * a)); g.addColorStop(1, W_(0)); ctx.fillStyle = g; ctx.fillRect(bx - 3 * U, cy - R * 1.2, 6 * U, R * 2.4); }
  // Full light pouring down when the window is whole.
  const pour = ease((t - 6.4) / 1.4);
  if (pour > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, cy, 0, H); g.addColorStop(0, W_(0.22 * pour)); g.addColorStop(1, W_(0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - R * 0.8, cy); ctx.lineTo(cx + R * 0.8, cy); ctx.lineTo(cx + R * 1.8, H); ctx.lineTo(cx - R * 1.8, H); ctx.closePath(); ctx.fill();
    ctx.restore(); f.glow(cx, cy, R * 1.6, 0.25 * pour);
  }
};
const BRICKS = (() => { const r = rnd(41), b = []; for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) b.push({ i: i + (j % 2) * 0.5, j, miss: r() < 0.2, tone: 0.5 + r() * 0.5 }); return b; })();
DIRS.wall = (f, t) => {
  const { ctx, cx, cy, U } = f, bw = 9 * U, bh = 4.6 * U, x0 = cx - 4.5 * bw - bw * 0.25, y0 = cy - 4.5 * bh;
  const lx = x0 - bw + inout(t / 6.5) * bw * 11, ly = cy + Math.sin(t * 0.9) * bh * 1.5;
  const miss = BRICKS.filter((b) => b.miss);
  BRICKS.forEach((b) => {
    const x = x0 + b.i * bw, y = y0 + b.j * bh, d = Math.hypot(x + bw / 2 - lx, y + bh / 2 - ly) / (bw * 3.5), light = 0.12 + 0.75 * Math.exp(-d * d) * (t < 6.8 ? 1 : 1 - ease((t - 6.8) / 1)) + 0.25 * ease((t - 6.8) / 1);
    if (b.miss) {
      const passed = lx > x + bw * 1.2, rise = passed ? ease((lx - x - bw * 1.2) / (bw * 2.2)) : 0;
      if (rise < 1) { ctx.fillStyle = '#000'; ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2); ctx.setLineDash([3 * f.dpr, 3 * f.dpr]); f.line(0.15 + 0.6 * Math.exp(-d * d), 0.9); ctx.strokeRect(x + 2, y + 2, bw - 4, bh - 4); ctx.setLineDash([]); }
      if (rise > 0) { const yy = y + (1 - rise) * bh * 3; ctx.fillStyle = `rgb(${Math.round(40 * b.tone * (0.5 + light))},${Math.round(40 * b.tone * (0.5 + light))},${Math.round(40 * b.tone * (0.5 + light))})`; ctx.globalAlpha = rise; ctx.fillRect(x + 1, yy + 1, bw - 2, bh - 2); f.line(0.8 * light, 1); ctx.strokeRect(x + 1, yy + 1, bw - 2, bh - 2); ctx.globalAlpha = 1; }
      return;
    }
    const v = Math.round(48 * b.tone * (0.4 + light)); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    f.line(0.55 * light, 0.8); ctx.strokeRect(x + 1, y + 1, bw - 2, bh - 2);
  });
  if (t < 7) { const a = Math.sin(clamp(t / 7) * Math.PI); f.glow(lx, ly, 22 * U, 0.35 * a); ctx.fillStyle = '#fff'; f.dot(lx, ly, 0.9 * U, a); }
  if (miss.length && t > 6.8) f.glow(cx, cy, 40 * U, 0.12 * ease((t - 6.8) / 1));
};
const COAST = (() => { const pts = []; for (let i = 0; i <= 160; i++) { const u = (i / 160) * TAU, r = 1 + 0.18 * noise(u * 2, 1.2) + 0.08 * noise(u * 7, 4.4) + 0.03 * noise(u * 19, 2); pts.push([Math.cos(u) * r, Math.sin(u) * r * 0.72]); } return pts; })();
const GAPS = [[12, 34], [58, 76], [104, 130]];
DIRS.map = (f, t) => {
  const { ctx, cx, cy, U } = f, S = 36 * U;
  f.line(0.07, 0.8);
  for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 7 * U, cy - 32 * U); ctx.lineTo(cx + i * 7 * U, cy + 32 * U); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 44 * U, cy + i * 5.5 * U); ctx.lineTo(cx + 44 * U, cy + i * 5.5 * U); ctx.stroke(); }
  const P = (k) => [cx + COAST[k][0] * S, cy + COAST[k][1] * S];
  const inGap = (k) => GAPS.findIndex(([a, b]) => k >= a && k < b);
  // The coast as it stands, then the torn edges, then the ink coming back.
  for (let k = 0; k < 160; k++) {
    const g = inGap(k), [x1, y1] = P(k), [x2, y2] = P(k + 1);
    if (g < 0) { f.line(0.8, 1.3); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); continue; }
    const [a, b] = GAPS[g], p = ease((t - 3.6 - g * 0.9) / 1.4), upto = a + (b - a) * p;
    if (k < upto) { f.line(0.95, 1.6); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    else if (k % 3 === 0) { ctx.setLineDash([2 * f.dpr, 4 * f.dpr]); f.line(0.35 + 0.2 * Math.sin(t * 4 + k), 1); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(P(Math.min(k + 3, b))[0], P(Math.min(k + 3, b))[1]); ctx.stroke(); ctx.setLineDash([]); }
    if (k === Math.floor(upto) && p > 0 && p < 1) { f.glow(x1, y1, 4 * U, 0.8); }
  }
  // Hatching inside the land, and the compass rose.
  ctx.save(); ctx.beginPath(); COAST.forEach(([x, y], k) => (k ? ctx.lineTo(cx + x * S, cy + y * S) : ctx.moveTo(cx + x * S, cy + y * S))); ctx.clip();
  f.line(0.08 + 0.1 * ease((t - 6.2) / 1.2), 0.7); for (let q = -50; q < 50; q += 2.2) { ctx.beginPath(); ctx.moveTo(cx + q * U, cy - 40 * U); ctx.lineTo(cx + q * U + 30 * U, cy + 40 * U); ctx.stroke(); }
  ctx.restore();
  const kx = cx + 36 * U, ky = cy + 22 * U, kr = 6 * U, rot = t * 0.05;
  f.line(0.5, 1); ctx.beginPath(); ctx.arc(kx, ky, kr, 0, TAU); ctx.stroke();
  for (let i = 0; i < 8; i++) { const a = rot + (i / 8) * TAU, l = i % 2 ? 0.6 : 1.3; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx + Math.cos(a) * kr * l, ky + Math.sin(a) * kr * l); ctx.stroke(); }
};

/* ---------- Scene 6: the nine worlds ---------- */
const STARS = (() => { const r = rnd(77); return Array.from({ length: 260 }, () => ({ x: r(), y: r(), z: 0.2 + r(), p: r() * TAU })); })();
const world = (f, x, y, rad, a, light = -0.6) => {
  const { ctx } = f;
  f.glow(x, y, rad * 3.2, 0.25 * a);
  const g = ctx.createRadialGradient(x + Math.cos(light) * rad * 0.5, y + Math.sin(light) * rad * 0.5, rad * 0.05, x, y, rad);
  g.addColorStop(0, W_(0.95 * a)); g.addColorStop(0.6, W_(0.35 * a)); g.addColorStop(1, W_(0.04 * a));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
};
DIRS.through = (f, t) => {
  const { ctx, cx, cy, U, W, H, dpr } = f, tw = f.tw || 3.2;
  const z = inout(t / tw), R = (14 + z * z * 160) * U;
  if (t < tw + 0.2) {
    // Rising toward the window until we pass through it.
    rose(f, cx, cy, R, (i) => 0.3 + 0.1 * Math.sin(i + t), 0.85);
    f.glow(cx, cy, R * 1.4, 0.2 + z * 0.4);
  }
  const out = ease((t - tw + 0.4) / 1.6), flash = Math.exp(-Math.pow((t - tw) * 3, 2));
  if (out > 0) {
    ctx.fillStyle = '#fff';
    STARS.forEach((s) => { const k = 1 + (1 - out) * 2 / s.z; f.dot(cx + (s.x - 0.5) * W * k, cy + (s.y - 0.5) * H * k, s.z * 0.9 * dpr, out * (0.3 + 0.3 * Math.sin(t * 1.4 + s.p))); });
    const rot = t * 0.08;
    const order = Array.from({ length: 9 }, (_, i) => i).sort((a, b) => Math.sin(rot + (a / 9) * TAU) - Math.sin(rot + (b / 9) * TAU));
    // In the film the nine worlds are the diagram's own; they get their light from here.
    if (f.nine) f.nine.forEach(([x, y], i) => { const p = ease((t - f.nineAt(i)) / 0.6); f.glow(x, y, 9 * U * p, 0.32 * p * (0.85 + 0.15 * Math.sin(t * 2 + i))); });
    else f.line(0.12 * out, 1), ctx.beginPath(), ctx.ellipse(cx, cy, 34 * U, 11 * U, -0.18, 0, TAU), ctx.stroke();
    if (!f.nine) order.forEach((i) => {
      const a = rot + (i / 9) * TAU, d = Math.sin(a), p = ease((t - 3.4 - i * 0.22) / 0.8);
      const x = cx + Math.cos(a) * 34 * U * Math.cos(-0.18) - d * 11 * U * Math.sin(-0.18), y = cy + Math.cos(a) * 34 * U * Math.sin(-0.18) + d * 11 * U * Math.cos(-0.18);
      world(f, x, y, (1.6 + 0.7 * (d + 1)) * U * p, p * (0.55 + 0.45 * (d + 1) / 2), Math.atan2(cy - y, cx - x));
    });
    flare(f, cx, cy, 0.35, out);
  }
  if (flash > 0.01) { ctx.fillStyle = W_(flash * 0.7); ctx.fillRect(0, 0, W, H); }
};
DIRS.gallery = (f, t) => {
  const { ctx, cx, cy, U, H } = f, fl = H * 0.9, vy = cy;
  const cam = 1 + inout(t / 7.2) * 15.5, P = (x, y, z) => [cx + (x * fl) / z, vy + (y * fl) / z], fog = (z) => clamp(1.1 - z / 20) * clamp((z - 0.25) * 3);
  const Wd = 1.1, fy = 0.75, cyl = -1.05;
  // Floor and ceiling lines.
  [[-Wd, fy], [Wd, fy], [-Wd, cyl], [Wd, cyl]].forEach(([x, y]) => { const [ax, ay] = P(x, y, 0.4), [bx, by] = P(x, y, 22); const g = ctx.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, W_(0.3)); g.addColorStop(1, W_(0)); ctx.strokeStyle = g; ctx.lineWidth = f.dpr; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); });
  // The end door, where the corridor stops.
  const endZ = 19.5 - cam;
  if (endZ > 0.3) { const [a1, b1] = P(-0.45, fy, endZ), [a2, b2] = P(0.45, -0.55, endZ); const a = fog(endZ) * 0.5 + 0.5 * ease((t - 6) / 1.8); f.glow((a1 + a2) / 2, (b1 + b2) / 2, (a2 - a1) * 2.5, 0.35 * a); ctx.fillStyle = W_(0.55 * a); ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a1, b2); ctx.arc((a1 + a2) / 2, b2, (a2 - a1) / 2, Math.PI, 0); ctx.lineTo(a2, b1); ctx.closePath(); ctx.fill(); }
  // Nine doors along the walls, alternating sides.
  for (let i = 0; i < 9; i++) {
    const z = 2 + i * 2 - cam + 1.2; if (z < 0.3) continue;
    const s = i % 2 ? 1 : -1, a = fog(z), z0 = z - 0.35, z1 = z + 0.35;
    const [x0, yb0] = P(s * Wd, fy, z0), [x1, yb1] = P(s * Wd, fy, z1), [, yt0] = P(s * Wd, -0.35, z0), [, yt1] = P(s * Wd, -0.35, z1), [xa, ya] = P(s * Wd, -0.75, z);
    ctx.fillStyle = W_(0.28 * a); ctx.beginPath(); ctx.moveTo(x0, yb0); ctx.lineTo(x0, yt0); ctx.quadraticCurveTo(x0, ya, xa, ya); ctx.quadraticCurveTo(x1, ya, x1, yt1); ctx.lineTo(x1, yb1); ctx.closePath(); ctx.fill();
    f.line(0.8 * a, Math.max(0.6, 2 / z)); ctx.stroke();
    f.glow((x0 + x1) / 2, (yb0 + ya) / 2, Math.abs(x1 - x0) * 2, 0.18 * a);
  }
};
DIRS.beacons = (f, t) => {
  const { ctx, U, W, H, dpr } = f, hz = H * 0.6;
  const sky = ctx.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, W_(0)); sky.addColorStop(1, W_(0.09)); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz);
  [[0, 0.5, 0.35], [1, 0.8, 0.22], [2, 1.2, 0.14]].forEach(([s, amp, a]) => {
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8 * dpr) ctx.lineTo(x, hz + (s * 0.1 - 0.04) * H - amp * 3 * U * (0.6 + noise(x / W * 6, s * 5)));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = `rgb(${6 - s * 2},${6 - s * 2},${6 - s * 2})`; ctx.fill();
    ctx.beginPath(); for (let x = 0; x <= W; x += 8 * dpr) { const y = hz + (s * 0.1 - 0.04) * H - amp * 3 * U * (0.6 + noise(x / W * 6, s * 5)); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } f.line(a, 1); ctx.stroke();
  });
  for (let i = 0; i < 9; i++) {
    const k = i / 8, z = 1 + k * 7, x = W * (0.6 + 0.22 * Math.sin(k * 2.6 + 0.4) / (0.6 + k)), y = hz + (H * 0.2) / z - 1 * U, at = 0.5 + i * 0.65, p = ease((t - at) / 0.5);
    ctx.fillStyle = '#fff'; f.dot(x, y + 1.4 * U / z, 0.6 * U / z + dpr * 0.5, 0.4);
    if (p <= 0) continue;
    const fl = 0.8 + 0.2 * Math.sin(t * 11 + i * 3) * Math.sin(t * 7.3 + i);
    f.glow(x, y, (14 / z + 2) * U * p, 0.5 * p * fl);
    for (let e = 0; e < 6; e++) { const s = (t * 0.8 + e / 6 + i * 0.13) % 1; f.dot(x + Math.sin(e * 5 + t * 2) * U / z, y - s * 12 * U / z, (0.5 / z + 0.25) * U * (1 - s), p * (1 - s) * 0.9); }
    if (i < 8 && p > 0.5) { const fl2 = clamp((t - at - 0.2) / 0.5); const k2 = (i + 1) / 8, z2 = 1 + k2 * 7, x2 = W * (0.6 + 0.22 * Math.sin(k2 * 2.6 + 0.4) / (0.6 + k2)), y2 = hz + (H * 0.2) / z2 - 1 * U; f.line(0.12 * fl2, 0.8); ctx.setLineDash([2 * dpr, 5 * dpr]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (x2 - x) * fl2, y + (y2 - y) * fl2); ctx.stroke(); ctx.setLineDash([]); }
  }
};

export { frame, flare };
