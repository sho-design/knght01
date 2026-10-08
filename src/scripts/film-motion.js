/* The film's drawn scenes, on one canvas above the footage. Scenes with footage leave the canvas clear
   (the first draws its flare over the genesis shot as it ends); drawn scenes fill it. The drawing is
   sized from the diagram itself, so the rings, the window and the nine worlds land under it exactly. */
import { DIRS, frame } from './film-scenes.js';
export const PLAN = ['spark-end', 'ember-rings', 'ember-carry', 'hall-dust', 'embers', 'ascend'];
// Drawn over its footage, not instead of it: the canvas stays see-through for these.
const OVER = new Set(['spark-end', 'ember-carry', 'hall-dust']);
// A footage scene that starts to dim before it ends, so the next drawn scene can come in over it slowly:
// the hall begins to darken 1.4s before the cut (to 25%), and the darkness finishes over the embers' first 2.8s.
// Genesis doesn't dim early (to: 0); its entry in LEAD only gives the rings a slow dark coming in, under the cloud
// as it condenses into the core.
// The forge settles too: it darkens over its last 1.7s (to 50%), so the spark storm calms before the hall.
const LEAD = { 'hall-dust': { at: 6.6, dur: 1.4, to: 0.25 }, 'spark-end': { at: 99, dur: 1, to: 0 }, 'ember-carry': { at: 6.3, dur: 1.7, to: 0.5 } }, BGIN = 2.8;
// Footage into footage through the dark: the forge goes down into shadow and the hall comes up out of it,
// its beam of light first (a soft column cut through the dark), then the arches.
const DIP = { 'hall-dust': { peak: 0.94, at: 0.5, end: 2.8 } };
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
    // The column of light in the hall shot (scene 4), where it falls on screen: the shot covers the screen and is
    // shifted sideways and enlarged (film.js align(), its _place) so the beam falls on the core. Its dust becomes
    // scene 5's embers.
    const hall = gfx.closest('.film').querySelector('.film__plate[data-i="3"]'), va = hall && hall.videoWidth ? hall.videoWidth / hall.videoHeight : 16 / 9;
    const pl = hall && hall._place, k = pl ? pl.k : 1.04;
    const vh = Math.max(r.height, r.width / va) * k * dpr, mid = (r.height / 2 + (pl ? pl.y : 0)) * dpr;
    // Measured against the footage: the beam is about 7% of the shot's height wide, widening to 10% at the floor,
    // the floor is 33% of the shot's height below its middle, and the pool of light sits a little right of the beam.
    const beam = { x: (r.width / 2 + (pl ? pl.x : 0)) * dpr, top: mid - vh / 2, floor: mid + 0.331 * vh, fw0: 0.07 * vh, fwm: 0.006 * vh, fwf: 0.024 * vh, pool: 0.25 * vh, poolDx: 0.03 * vh };
    // Where the six layer badges are on screen (centre and radius), for the check in scene 4. A function, so it is
    // only measured when a scene asks.
    const badges = () => [...gfx.querySelectorAll('.reel__badge .reel__chip')].map((c) => { const b = c.getBoundingClientRect(); return [(b.left - r.left + b.width / 2) * dpr, (b.top - r.top + b.height / 2) * dpr, (b.width / 2) * dpr]; });
    // The world group's live scale (it breathes, holds at 0.94 from scene 4, and shrinks into the core in scene 6),
    // so drawn rings land on the diagram's rings rather than beside them.
    const wm = /scale\(([\d.]+)\)/.exec((gfx.querySelector('.reel__world') || gfx).getAttribute('transform') || ''), ws = wm ? +wm[1] : 1;
    // Each world chip's live scale (they grow in as their sparks land), so a landing flash sits on the chip's outline.
    const wb = [...gfx.querySelectorAll('.reel__wl .reel__wb')].map((el) => { const m = /scale\(([\d.]+)\)/.exec(el.getAttribute('transform') || ''); return m ? +m[1] : 1; });
    return { beam, badges, ws, wb, cx, cy, U: u * 12.5, ring: (k) => ring(k) * u * ws, nine: seats.slice(0, SEATS - 1), seat: seats[SEATS - 1], nineAt: (i) => 1.9 + i * 0.16, shrink: (t) => 1 - 0.7 * inout((t - 0.4) / 1.4), tw: 1.7, glass: 0.55 }; // the glass a little darker, so the diagram's labels read over it
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
  // The vignette only changes with the canvas size, so it is drawn once and reused.
  const vig = document.createElement('canvas'); let vigKey = '';
  const vignette = (W, H, x) => {
    const key = `${W}x${H}@${Math.round(x)}`; if (key === vigKey) return vig;
    vig.width = W; vig.height = H; const c = vig.getContext('2d'), g = c.createRadialGradient(x, H / 2, Math.min(W, H) * 0.3, x, H / 2, Math.max(W, H) * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); c.fillStyle = g; c.fillRect(0, 0, W, H); vigKey = key; return vig;
  };
  const look = (f, amount, t, bloom = 1) => {
    const { ctx, W, H } = f;
    small.width = Math.max(1, W >> 3); small.height = Math.max(1, H >> 3); tiny.width = Math.max(1, W >> 5); tiny.height = Math.max(1, H >> 5);
    const sx = small.getContext('2d'), tx = tiny.getContext('2d');
    sx.drawImage(canvas, 0, 0, small.width, small.height); tx.drawImage(small, 0, 0, tiny.width, tiny.height);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45 * amount * bloom; ctx.drawImage(small, 0, 0, W, H);
    ctx.globalAlpha = 0.5 * amount * bloom; ctx.drawImage(tiny, 0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.35 * amount;
    const g = ctx.createPattern(grain, 'repeat'); ctx.translate((Math.random() * 160) | 0, (Math.random() * 160) | 0); ctx.fillStyle = g; ctx.fillRect(-160, -160, W + 160, H + 160);
    ctx.restore();
    ctx.globalAlpha = amount; ctx.drawImage(vignette(W, H, f.cx), 0, 0); ctx.globalAlpha = 1;
    const flick = 0.03 + 0.025 * Math.sin(t * 23) * Math.sin(t * 7.3);
    ctx.fillStyle = `rgba(0,0,0,${flick * amount})`; ctx.fillRect(0, 0, W, H);
  };
  // Draw one frame. When a scene has just begun, the last one fades out beneath it.
  const draw = (i, local, prev, prevLocal, mix) => {
    const f = frame(canvas, layout), { ctx, W, H } = f;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.clearRect(0, 0, W, H);
    const cur = PLAN[i], was = prev != null && mix < 1 ? PLAN[prev] : undefined;
    const before = i > 0 ? PLAN[i - 1] : undefined, lead = LEAD[cur], led = LEAD[before];
    const dip = DIP[cur], from = led ? led.to : 0;
    const dipBg = !dip ? 0 : local < dip.at ? from + (dip.peak - from) * inout(local / dip.at) : dip.peak * (1 - inout((local - dip.at) / (dip.end - dip.at)));
    const bg = solid(cur)
      ? (led ? led.to + (1 - led.to) * inout(local / BGIN) : was !== undefined && !solid(was) ? mix : 1)
      : solid(was) ? 1 - mix : Math.max(dipBg, lead ? lead.to * inout((local - lead.at) / lead.dur) : 0);
    if (bg > 0) { ctx.fillStyle = `rgba(0,0,0,${bg})`; ctx.fillRect(0, 0, W, H); }
    if (dipBg > 0.01 && f.beam) {
      // The beam shows through first.
      const b = f.beam, h = inout((local - 0.1) / 0.9) * 0.95, fw = b.fw0 * 1.6 + b.fwf * 0.5;
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      const g = ctx.createLinearGradient(b.x - 2.2 * fw, 0, b.x + 2.2 * fw, 0);
      [[0, 0], [0.25, 0.14], [0.36, 0.5], [0.44, 0.84], [0.5, 1], [0.56, 0.84], [0.64, 0.5], [0.75, 0.14], [1, 0]].forEach(([o, m]) => g.addColorStop(o, `rgba(0,0,0,${h * m})`));
      ctx.fillStyle = g; ctx.fillRect(b.x - 2.2 * fw, 0, 4.4 * fw, H);
      ctx.translate(b.x + b.poolDx, b.floor); ctx.scale(1, 0.18);
      const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, b.pool); pg.addColorStop(0, `rgba(0,0,0,${h * 0.85})`); pg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pg; ctx.fillRect(-b.pool, -b.pool, b.pool * 2, b.pool * 2);
      ctx.restore();
    }
    if (was === undefined) { if (cur) DIRS[cur](f, local); }
    else {
      if (was) { ctx.globalAlpha = 1 - mix; ctx.drawImage(into(f, 0, DIRS[was], prevLocal), 0, 0); }
      if (cur) { ctx.globalAlpha = mix; ctx.drawImage(into(f, 1, DIRS[cur], local), 0, 0); }
      ctx.globalAlpha = 1;
    }
    // Less bloom on the close, so its light stays on the sparks and the outlines rather than spreading into discs.
    if (bg > 0) look(f, bg, local, cur === 'ascend' ? 0.4 : 1);
  };
  return { draw, resize: () => {} };
}
