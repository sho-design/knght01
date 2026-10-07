/* The film's drawn scenes, on one canvas above the footage. Scenes with footage leave the canvas clear
   (the first draws its flare over the genesis shot as it ends); drawn scenes fill it. The drawing is
   sized from the diagram itself, so the rings, the window and the nine worlds land under it exactly. */
import { DIRS, frame } from './film-scenes.js';
export const PLAN = ['spark-end', 'sphere', null, null, 'embers', 'ascend'];
// Drawn over its footage, not instead of it: the canvas stays see-through for these.
const OVER = new Set(['spark-end']);
const solid = (id) => !!id && !OVER.has(id);
export default function filmMotion(canvas, gfx) {
  const ring = (k) => 64 + (k + 1) * 50; // the diagram's own ring radii: Law 114 ... Machinery 364
  const layout = (r, dpr) => {
    const g = gfx.getBoundingClientRect(), u = (g.width / 1000) * dpr;
    const cx = (g.left - r.left + g.width / 2) * dpr, cy = (g.top - r.top + g.height / 2) * dpr;
    const nine = Array.from({ length: 9 }, (_, i) => { const a = ((-90 + i * 40) * Math.PI) / 180; return [cx + Math.cos(a) * 372 * u, cy + Math.sin(a) * 372 * u]; });
    return { cx, cy, U: u * 12.5, ring: (k) => ring(k) * u, nine, nineAt: (i) => 1.9 + i * 0.16, tw: 1.7, glass: 0.55 }; // the glass a little darker, so the diagram's labels read over it
  };
  const bufs = [document.createElement('canvas'), document.createElement('canvas')];
  const into = (f, k, fn, t) => {
    const b = bufs[k]; if (b.width !== f.W || b.height !== f.H) { b.width = f.W; b.height = f.H; }
    const bx = b.getContext('2d'); bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'source-over'; bx.globalAlpha = 1; bx.clearRect(0, 0, f.W, f.H);
    fn({ ...f, ctx: bx }, t); return b;
  };
  // Draw one frame. When a scene has just begun, the last one fades out beneath it.
  const draw = (i, local, prev, prevLocal, mix) => {
    const f = frame(canvas, layout), { ctx, W, H } = f;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.clearRect(0, 0, W, H);
    const cur = PLAN[i], was = prev != null && mix < 1 ? PLAN[prev] : undefined;
    const bg = solid(cur) ? (was !== undefined && !solid(was) ? mix : 1) : solid(was) ? 1 - mix : 0;
    if (bg > 0) { ctx.fillStyle = `rgba(0,0,0,${bg})`; ctx.fillRect(0, 0, W, H); }
    if (was === undefined) { if (cur) DIRS[cur](f, local); return; }
    if (was) { ctx.globalAlpha = 1 - mix; ctx.drawImage(into(f, 0, DIRS[was], prevLocal), 0, 0); }
    if (cur) { ctx.globalAlpha = mix; ctx.drawImage(into(f, 1, DIRS[cur], local), 0, 0); }
    ctx.globalAlpha = 1;
  };
  return { draw, resize: () => {} };
}
