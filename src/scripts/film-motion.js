/* The film's backgrounds, drawn live in line instead of played from footage. One canvas, six scenes,
   driven by the film's own clock: draw(scene, seconds into it, previous scene for the crossfade).
   0 The nave: walking into a cathedral toward the rose window. 1 Ripples: the seven layers.
   2 Ink: Lore spreading from the core. 3 Guilloché: the rules. 4 The blueprint: missing layers. 5 Constellation: nine worlds. */
export default function filmMotion(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, S = 1;
  const resize = () => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    // The backgrounds centre on the diagram: right of the type on wide screens, near the top on phones.
    const wide = r.width > 900;
    const g = Math.min(r.height * 0.8, r.width * 0.5);
    cx = wide ? (r.width - r.width * 0.03 - g / 2) * dpr : W / 2;
    cy = wide ? H / 2 : (r.height * 0.3) * dpr;
    S = Math.min(W, H) / 900;
  };
  const rnd = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = (v) => 1 - Math.pow(1 - clamp(v), 3);
  const line = (a, lw = 1) => { ctx.strokeStyle = `rgba(255,255,255,${clamp(a)})`; ctx.lineWidth = lw * dpr; };

  /* 0. The nave */
  const dust = (() => { const r = rnd(7); return Array.from({ length: 90 }, () => ({ x: r(), y: r(), s: 0.4 + r() * 1.4, p: r() * 6.28, v: 0.2 + r() * 0.6 })); })();
  const nave = (t, A) => {
    const f = H * 0.85, vx = cx, vy = cy - H * 0.04;
    const cam = 0.6 + t * 1.15 + ease(t / 2) * 0.6;            // walking in
    const light = ease(t / 3.5);                                 // the window brightens as you enter
    const P = (x, y, z) => [vx + (x * f) / z, vy + (y * f) / z];
    const fog = (z) => clamp(1 - z / 20) * clamp((z - 0.3) * 2.5);
    const Wn = 1.35, floor = 1.05, spring = -0.75, apex = -2.25, step = 2;
    // The rose window, far ahead, with its glow and the light falling from it.
    const rz = 15, [rx, ry] = P(0, -1.35, rz), rr = (1.15 * f) / rz;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr * 5); g.addColorStop(0, `rgba(255,255,255,${0.28 * light * A})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    [[-0.5, 0.11], [-0.18, 0.08], [0.22, 0.1], [0.55, 0.06]].forEach(([dx, a]) => {
      const x2 = rx + dx * W * 0.5 - W * 0.1, y2 = H;
      const gr = ctx.createLinearGradient(rx, ry, x2, y2); gr.addColorStop(0, `rgba(255,255,255,${a * light * A})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(rx - rr * 0.3, ry); ctx.lineTo(rx + rr * 0.3, ry); ctx.lineTo(x2 + W * 0.06, y2); ctx.lineTo(x2 - W * 0.06, y2); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
    line(0.8 * light * A, 1.1);
    ctx.beginPath(); ctx.arc(rx, ry, rr, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.arc(rx, ry, rr * 0.62, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.arc(rx, ry, rr * 0.22, 0, 6.283); ctx.stroke();
    for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283; ctx.beginPath(); ctx.moveTo(rx + Math.cos(a) * rr * 0.22, ry + Math.sin(a) * rr * 0.22); ctx.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr); ctx.stroke(); ctx.beginPath(); ctx.arc(rx + Math.cos(a + 0.26) * rr * 0.8, ry + Math.sin(a + 0.26) * rr * 0.8, rr * 0.13, 0, 6.283); ctx.stroke(); }
    // The floor: stone joints running to the window, crossing lines passing underfoot.
    for (let x = -Wn; x <= Wn + 0.01; x += Wn / 4) {
      const [ax, ay] = P(x, floor, 0.45), [bx, by] = P(x, floor, 18);
      const gr = ctx.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, `rgba(255,255,255,${0.22 * A})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gr; ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    for (let k = Math.floor(cam / 0.7) + 1, z; (z = k * 0.7 - cam) < 18; k++) { if (z < 0.45) continue; const [ax, ay] = P(-Wn, floor, z), [bx] = P(Wn, floor, z); line(0.2 * fog(z) * A, 0.8); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, ay); ctx.stroke(); }
    // The bays: pillars, pointed arches, the arcades along each side, the ribs overhead.
    const bays = [];
    for (let k = Math.floor(cam / step) + 1, z; (z = k * step - cam) < 22; k++) if (z > 0.32) bays.push(z);
    bays.forEach((z, i) => {
      const a = fog(z) * A, lw = Math.max(0.6, 2.4 / z);
      line(0.85 * a, lw);
      for (const s of [-1, 1]) {
        const [px, py0] = P(s * Wn, floor, z), [, py1] = P(s * Wn, spring, z);
        ctx.beginPath(); ctx.moveTo(px, py0); ctx.lineTo(px, py1); ctx.stroke();
        const [qx] = P(s * (Wn - 0.12), floor, z); ctx.beginPath(); ctx.moveTo(qx, py0); ctx.lineTo(qx, py1); ctx.stroke();
      }
      // The great arch across the nave, a pointed one, and its moulding.
      for (const m of [1, 0.9]) {
        const [lx, ly] = P(-Wn * m, spring, z), [ax, ay] = P(0, apex + (1 - m) * 1.4, z), [rx2, ry2] = P(Wn * m, spring, z), [c1x, c1y] = P(-Wn * m, apex * 0.75, z), [c2x, c2y] = P(Wn * m, apex * 0.75, z);
        line((m === 1 ? 0.85 : 0.45) * a, m === 1 ? lw : lw * 0.6);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(c1x, c1y, ax, ay); ctx.quadraticCurveTo(c2x, c2y, rx2, ry2); ctx.stroke();
      }
      // The arcade to the next bay on each side, and the ribs of the vault.
      const zn = bays[i + 1];
      if (zn) {
        const an = fog((z + zn) / 2) * A, zm = (z + zn) / 2;
        line(0.55 * an, Math.max(0.5, 1.6 / z));
        for (const s of [-1, 1]) {
          const [x1, y1] = P(s * Wn, -0.1, z), [xc, yc] = P(s * Wn, -1.05, zm), [x2, y2] = P(s * Wn, -0.1, zn);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(xc, yc, x2, y2); ctx.stroke();
          const [sx, sy] = P(s * Wn, spring, z), [kx, ky] = P(0, apex - 0.2, zm), [ex, ey] = P(-s * Wn, spring, zn);
          line(0.35 * an, Math.max(0.5, 1.2 / z)); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(kx, ky, ex, ey); ctx.stroke();
        }
        const [ax, ay] = P(0, apex, z), [bx, by] = P(0, apex, zn); line(0.4 * an, Math.max(0.5, 1.2 / z)); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    });
    // Dust turning in the light.
    ctx.fillStyle = '#fff';
    dust.forEach((d) => {
      const x = rx + (d.x - 0.5) * W * 0.55 + Math.sin(t * 0.3 * d.v + d.p) * 18 * dpr, y = (d.y * H + t * 9 * d.v * dpr) % H;
      if (y < ry) return;
      ctx.globalAlpha = clamp((0.25 + 0.35 * Math.sin(t * 1.5 * d.v + d.p)) * light * A);
      ctx.beginPath(); ctx.arc(x, y, d.s * dpr, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  /* 1. Ripples: rings going out from the core */
  const ripples = (t, A) => {
    const R = 760 * S * dpr;
    for (let n = 0; n < 9; n++) {
      const r = ((t * 70 * S * dpr + n * R / 9) % R);
      line((1 - r / R) * 0.5 * A, 1); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
    }
    for (let k = 1; k <= 7; k++) { line(0.07 * A, 1); ctx.beginPath(); ctx.arc(cx, cy, (64 + k * 50) * S * dpr * 1.55, 0, 6.283); ctx.stroke(); }
  };

  /* 2. Ink: fibres reaching out from the core */
  const fibres = (() => { const r = rnd(11); return Array.from({ length: 150 }, () => ({ a: r() * 6.283, L: 0.35 + r() * 0.75, c: (r() - 0.5) * 1.6, w: 0.4 + r() * 1.1, d: r() * 0.4 })); })();
  const ink = (t, A) => {
    const R = Math.max(W, H) * 0.7, p = ease((t - 0.2) / 6.5);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.35 * p + 1); g.addColorStop(0, `rgba(255,255,255,${0.14 * A})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    fibres.forEach((fb) => {
      const len = R * fb.L * clamp((p - fb.d) / (1 - fb.d));
      if (len < 2) return;
      line(0.28 * A, fb.w);
      ctx.beginPath(); ctx.moveTo(cx, cy);
      for (let s = 1; s <= 24; s++) { const u = (s / 24) * len, a = fb.a + fb.c * (u / R) + Math.sin(u * 0.012 + fb.a) * 0.08; ctx.lineTo(cx + Math.cos(a) * u, cy + Math.sin(a) * u); }
      ctx.stroke();
    });
  };

  /* 3. Guilloché: the engraved lattice of a banknote, drawing in and closing to a boundary */
  const guilloche = (t, A) => {
    const tight = 1.25 - 0.3 * ease(t / 7), rot = t * 0.04;
    [[0.42, 0.13, 0.28, 9], [0.36, 0.09, 0.22, 13], [0.5, 0.07, 0.3, 17]].forEach(([R0, r0, d0, n], j) => {
      const R = R0 * Math.min(W, H) * tight, r = R * (r0 / R0) * 2.6, d = R * d0;
      line((0.3 - j * 0.05) * A, 0.9);
      ctx.beginPath();
      const steps = 900, sweep = clamp(t / 4) * 6.283 * n / 3;
      for (let s = 0; s <= steps; s++) {
        const u = (s / steps) * Math.max(0.01, sweep), k = (R - r) / r;
        const x = (R - r) * Math.cos(u + rot) + d * Math.cos(k * u + rot), y = (R - r) * Math.sin(u + rot) - d * Math.sin(k * u + rot);
        s ? ctx.lineTo(cx + x, cy + y) : ctx.moveTo(cx + x, cy + y);
      }
      ctx.stroke();
    });
  };

  /* 4. The blueprint: a grid with pieces missing, filling in */
  const cells = (() => { const r = rnd(23); return Array.from({ length: 12 * 8 }, () => ({ miss: r() < 0.42, fill: 1 + r() * 5.5, fl: r() * 6.28 })); })();
  const blueprint = (t, A) => {
    const cs = 74 * S * dpr * 1.4, cols = 12, rows = 8, x0 = cx - (cols * cs) / 2, y0 = cy - (rows * cs) / 2;
    line(0.08 * A, 1);
    for (let i = 0; i <= cols; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * cs, y0 - cs); ctx.lineTo(x0 + i * cs, y0 + (rows + 1) * cs); ctx.stroke(); }
    for (let j = 0; j <= rows; j++) { ctx.beginPath(); ctx.moveTo(x0 - cs, y0 + j * cs); ctx.lineTo(x0 + (cols + 1) * cs, y0 + j * cs); ctx.stroke(); }
    cells.forEach((c, k) => {
      const i = k % cols, j = Math.floor(k / cols), x = x0 + i * cs + cs * 0.12, y = y0 + j * cs + cs * 0.12, s = cs * 0.76;
      const dist = Math.hypot(x + s / 2 - cx, y + s / 2 - cy) / (cols * cs * 0.6), a = A * clamp(1.1 - dist);
      if (c.miss && t < c.fill) {
        // Missing: a dashed outline that flickers.
        ctx.setLineDash([4 * dpr, 5 * dpr]); line((0.12 + 0.12 * Math.abs(Math.sin(t * 5 + c.fl))) * a, 1); ctx.strokeRect(x, y, s, s); ctx.setLineDash([]);
      } else {
        const p = c.miss ? ease((t - c.fill) / 0.8) : 1;
        line(0.32 * a * p + (c.miss ? 0.4 * a * (1 - p) : 0), c.miss ? 1.4 : 1); ctx.strokeRect(x, y, s, s);
        if (c.miss) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, s, s); ctx.clip(); line(0.18 * a * p, 1); for (let q = -s; q < s; q += 7 * dpr) { ctx.beginPath(); ctx.moveTo(x + q, y + s); ctx.lineTo(x + q + s, y); ctx.stroke(); } ctx.restore(); }
      }
    });
  };

  /* 5. Constellation: nine lights joined to the core */
  const stars = (() => { const r = rnd(31); return Array.from({ length: 220 }, () => ({ x: r(), y: r(), s: 0.3 + r() * 1.2, p: r() * 6.28 })); })();
  const constellation = (t, A) => {
    ctx.fillStyle = '#fff';
    stars.forEach((s) => { ctx.globalAlpha = clamp((0.2 + 0.25 * Math.sin(t * 1.3 + s.p)) * A); ctx.beginPath(); ctx.arc(((s.x * W + t * 4 * dpr) % W), s.y * H, s.s * dpr, 0, 6.283); ctx.fill(); });
    ctx.globalAlpha = 1;
    const R = Math.min(W, H) * 0.36, rot = t * 0.03, pts = Array.from({ length: 9 }, (_, i) => { const a = -Math.PI / 2 + (i / 9) * 6.283 + rot; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
    const p = ease(t / 4);
    pts.forEach(([x, y], i) => {
      const q = clamp(p * 9 - i * 0.6);
      line(0.22 * A * q, 1); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (x - cx) * q, cy + (y - cy) * q); ctx.stroke();
      const [nx, ny] = pts[(i + 1) % 9]; line(0.1 * A * q, 1); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26 * dpr); g.addColorStop(0, `rgba(255,255,255,${0.35 * A * q})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 26 * dpr, y - 26 * dpr, 52 * dpr, 52 * dpr);
    });
  };

  const SCENES = [nave, ripples, ink, guilloche, blueprint, constellation];
  // Draw one frame. When a scene has just begun, the last one fades out beneath it.
  const draw = (i, local, prev, prevLocal, mix) => {
    if (!W) resize();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (prev != null && mix < 1) SCENES[prev](prevLocal, 1 - mix);
    SCENES[i](local, prev != null ? mix : 1);
  };
  resize();
  return { draw, resize };
}
