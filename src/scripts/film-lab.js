/* The directions page: each canvas loops one drawn direction. Only the ones on screen run. */
import { DIRS, D, frame } from './film-scenes.js';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
/* ---------- Running them ---------- */
const cards = [...document.querySelectorAll('canvas[data-dir]')].map((c) => ({ c, fn: DIRS[c.dataset.dir], bar: c.parentElement.querySelector('.fl__bar'), on: false, t0: performance.now() + Math.random() * 1000 }));
const io = new IntersectionObserver((es) => es.forEach((e) => { const k = cards.find((x) => x.c === e.target); if (k) k.on = e.isIntersecting; }), { rootMargin: '100px' });
cards.forEach((k) => io.observe(k.c));
const paint = (k, now) => {
  const f = frame(k.c), t = (((now - k.t0) / 1000) % (D + 0.6) + D + 0.6) % (D + 0.6);
  const { ctx, W, H } = f; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  try { k.fn(f, Math.min(t, D)); } catch (err) { console.error(k.c.dataset.dir, err); }
  const fade = t > D ? 1 - (t - D) / 0.6 : clamp(t / 0.3);
  if (fade < 1) { ctx.globalAlpha = 1; ctx.fillStyle = `rgba(0,0,0,${1 - fade})`; ctx.fillRect(0, 0, W, H); }
  if (k.bar) k.bar.style.width = `${(Math.min(t, D) / D) * 100}%`;
};
// ?t=3 holds every direction at that second, for stills.
const hold = new URLSearchParams(location.search).get('t');
const loop = (now) => { cards.forEach((k) => { if (hold != null) { k.t0 = now - +hold * 1000; } if (k.on || hold != null) paint(k, now); }); requestAnimationFrame(loop); };
requestAnimationFrame(loop);
