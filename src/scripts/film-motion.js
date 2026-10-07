/* The film's drawn scenes, on one canvas above the footage. Scenes with footage leave the canvas clear
   (the first draws its flare over the genesis shot as it ends); drawn scenes fill it. The drawing is
   sized from the diagram itself, so the rings, the window and the nine worlds land under it exactly. */
import { DIRS, frame } from './film-scenes.js';
export const PLAN = ['spark-end', 'ember-rings', null, null, 'embers', 'ascend'];
// Drawn over its footage, not instead of it: the canvas stays see-through for these.
const OVER = new Set(['spark-end']);
const solid = (id) => !!id && !OVER.has(id);
export default function filmMotion(canvas, gfx) {
  const SEATS = gfx.querySelectorAll('.reel__wl').length || 10;
  const inout = (v) => { v = Math.max(0, Math.min(1, v)); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
  const ring = (k) => 64 + (k + 1) * 50; // the diagram's own ring radii: Law 114 ... Machinery 364
  const layout = (r, dpr) => {
    const g = gfx.getBoundingClientRect(), u = (g.width / 1000) * dpr;
    const cx = (g.left - r.left + g.width / 2) * dpr, cy = (g.top - r.top + g.height / 2) * dpr;
    // The worlds sit on ten seats; the last one is empty, waiting for the viewer's.
    const seats = Array.from({ length: SEATS }, (_, i) => { const a = ((-90 + (i * 360) / SEATS) * Math.PI) / 180; return [cx + Math.cos(a) * 372 * u, cy + Math.sin(a) * 372 * u]; });
    // The column of light in the hall shot (scene 4), where it falls on screen: the shot is centred and cropped
    // to cover, slightly enlarged. Its dust becomes scene 5's embers.
    const hall = gfx.closest('.film').querySelector('.film__plate[data-i="3"]'), va = hall && hall.videoWidth ? hall.videoWidth / hall.videoHeight : 16 / 9;
    const vh = Math.max(r.height, r.width / va) * 1.04 * dpr, mid = (r.height * dpr) / 2;
    const beam = { x: (r.width * dpr) / 2, top: mid - vh / 2, floor: mid + 0.31 * vh, w0: 0.052 * vh, w1: 0.12 * vh };
    return { beam, cx, cy, U: u * 12.5, ring: (k) => ring(k) * u, nine: seats.slice(0, SEATS - 1), seat: seats[SEATS - 1], nineAt: (i) => 1.9 + i * 0.16, shrink: (t) => 1 - 0.7 * inout((t - 0.4) / 1.4), tw: 1.7, glass: 0.55 }; // the glass a little darker, so the diagram's labels read over it
  };
  const bufs = [document.createElement('canvas'), document.createElement('canvas')];
  const into = (f, k, fn, t) => {
    const b = bufs[k]; if (b.width !== f.W || b.height !== f.H) { b.width = f.W; b.height = f.H; }
    const bx = b.getContext('2d'); bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'source-over'; bx.globalAlpha = 1; bx.clearRect(0, 0, f.W, f.H);
    fn({ ...f, ctx: bx }, t); return b;
  };
  // The look of the footage laid over the drawn scenes, so all six feel shot on one camera:
  // a soft bloom on the bright parts, a vignette, grain and a faint flicker of exposure.
  const small = document.createElement('canvas'), tiny = document.createElement('canvas');
  const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), d = x.createImageData(160, 160); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; })();
  const look = (f, amount, t) => {
    const { ctx, W, H } = f;
    small.width = Math.max(1, W >> 3); small.height = Math.max(1, H >> 3); tiny.width = Math.max(1, W >> 5); tiny.height = Math.max(1, H >> 5);
    const sx = small.getContext('2d'), tx = tiny.getContext('2d');
    sx.drawImage(canvas, 0, 0, small.width, small.height); tx.drawImage(small, 0, 0, tiny.width, tiny.height);
    ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45 * amount; ctx.drawImage(small, 0, 0, W, H);
    ctx.globalAlpha = 0.5 * amount; ctx.drawImage(tiny, 0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.35 * amount;
    const g = ctx.createPattern(grain, 'repeat'); ctx.translate((Math.random() * 160) | 0, (Math.random() * 160) | 0); ctx.fillStyle = g; ctx.fillRect(-160, -160, W + 160, H + 160);
    ctx.restore();
    const v = ctx.createRadialGradient(f.cx, H / 2, Math.min(W, H) * 0.3, f.cx, H / 2, Math.max(W, H) * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${0.6 * amount})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    const flick = 0.03 + 0.025 * Math.sin(t * 23) * Math.sin(t * 7.3);
    ctx.fillStyle = `rgba(0,0,0,${flick * amount})`; ctx.fillRect(0, 0, W, H);
  };
  // Draw one frame. When a scene has just begun, the last one fades out beneath it.
  const draw = (i, local, prev, prevLocal, mix) => {
    const f = frame(canvas, layout), { ctx, W, H } = f;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.clearRect(0, 0, W, H);
    const cur = PLAN[i], was = prev != null && mix < 1 ? PLAN[prev] : undefined;
    const bg = solid(cur) ? (was !== undefined && !solid(was) ? mix : 1) : solid(was) ? 1 - mix : 0;
    if (bg > 0) { ctx.fillStyle = `rgba(0,0,0,${bg})`; ctx.fillRect(0, 0, W, H); }
    if (was === undefined) { if (cur) DIRS[cur](f, local); }
    else {
      if (was) { ctx.globalAlpha = 1 - mix; ctx.drawImage(into(f, 0, DIRS[was], prevLocal), 0, 0); }
      if (cur) { ctx.globalAlpha = mix; ctx.drawImage(into(f, 1, DIRS[cur], local), 0, 0); }
      ctx.globalAlpha = 1;
    }
    if (bg > 0) look(f, bg, local);
  };
  return { draw, resize: () => {} };
}
