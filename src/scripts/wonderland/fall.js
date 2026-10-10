/* The fall: down the KNGHT world, from the mouth of the hole to the board, and back up it (README.md has the timing).
   One paused GSAP timeline holds it all; the portal nests it in its own and moves that by the wall clock:
   - a canvas tunnel: the boundary and six layers as equal hoops, outside in the way the world diagram reads from
     its edge, each layer with its sigil on a chip, and Lore at the core;
   - the world rolls as you fall, one slow sway each way (roll()), and the hoops turn back against it, the near
     wall more than the deep end, so it reads as falling down a well;
   - the rabbit's watch (Toronto time) and the knght falling past, as inline SVG in a layer that rolls with the
     tunnel, moved by transform and opacity only;
   - four lines in Cormorant italic, one at a time. Words never roll.
   On the way back up (climb()) the portal plays the same timeline backwards, and the White Rabbit stands on Lore,
   checks its watch and says its line.
   The canvas is a function of the timeline's time, so a paused or stepped timeline shows any moment exactly. */
import { gsap } from 'gsap';
import { SIGILS, MARKS } from '../../lib/sigils.ts';
import { RABBIT } from './watch.js';

// After the boundary, outside in, with the angle each chip holds on the world diagram.
const LAYERS = [['machinery', 'Machinery', 200], ['artifacts', 'Artifacts', -28], ['ground', 'Ground', 112], ['map', 'Map', -150], ['language', 'Language', 28], ['law', 'Law', -64]];
const TOP = 'CHECKED AGAINST YOUR REGULATOR';
const BOTTOM = 'EVERY WORD · EVERY SIGN · EVERY SYSTEM';
// [words, in, out]. Only one is on screen at a time.
const LINES = [['Down, down, down.', 0.95, 1.95], ['Strategy first, then the sword.', 1.95, 3], ['We say what we can prove.', 3, 3.95], ['No layer is built before Lore.', 3.95, 4.9]];
// The rabbit's line on the way back up. Wednesday and Friday from 1 to 5 pm, Toronto time, it is not late.
const LATE = "I'm late.", OPEN = 'Right on time. Calls are open until 5.';
const SANS = '"Hanken Grotesk","Helvetica Neue",Helvetica,Arial,sans-serif';
const PLINTH = 'M5.6 19.4H18.2M4.6 21.5H19.2';
const CORE_Z = 7.73; // Lore: its ring ends 0.42 of the short side across when the board takes over
const SPIN = 8; // degrees a second

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const D2R = Math.PI / 180;

// The roll in degrees, clockwise positive: one slow sway each way, never a spin. Nothing before 1.1 s; it eases in,
// is +15 as the boundary passes (2.0 s) and -15 at 3.8 s, and holds at +5.1 from the hand-off (4.9 s), where the
// board takes it over and rights itself.
export const roll = (t) => {
  t = Math.min(t, 4.9);
  const s = clamp01((t - 1.1) / 0.7);
  return 15 * s * s * (3 - 2 * s) * Math.sin((2 * Math.PI * (t - 1.1)) / 3.6);
};
// How much a hoop dz spacings deep turns back against the roll: 0.5 for the near wall, 0.15 at the deep end.
const against = (dz) => 0.15 + 0.35 * clamp01((6 - dz) / 5);

// The watch's two hands at Toronto time T ({ h, m }), on the rabbit's 24 grid.
export const hands = (T) => `<path d="${RABBIT.minute}" transform="rotate(${T.m * 6} 16.4 13.85)"/>`
  + `<path d="${RABBIT.hour}" transform="rotate(${(T.h % 12) * 30 + T.m / 2} 16.4 13.85)"/>`;

// A mark's SVG (paths and circles on the 24 grid) as one Path2D.
const toPath = (svg) => {
  const p = new Path2D();
  for (const [, tag, attrs] of svg.matchAll(/<(path|circle)\s([^>]*?)\/?>/g)) {
    const a = (n) => { const m = new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(attrs); return m ? m[1] : '0'; };
    if (tag === 'path') p.addPath(new Path2D(a('d')));
    else { const cx = +a('cx'), cy = +a('cy'), r = +a('r'); p.moveTo(cx + r, cy); p.arc(cx, cy, r, 0, Math.PI * 2); }
  }
  return p;
};

// The camera's place along the hole at time t (in hoop spacings). It eases in as the mouth opens, passes the
// boundary at 2.0 s and one layer every 0.4 s after it (Law at 4.4 s), then slows onto the core by 4.9 s.
const cam = (t) => {
  if (t <= 1.3) return -1.3;
  if (t <= 2) return -1.3 + 0.9 * ((t - 1.3) / 0.7) ** 1.944;
  if (t <= 4.4) return -0.4 + (t - 2) * 2.5;
  const u = clamp01((t - 4.4) / 0.5);
  return 5.6 + 0.4167 * (1 - (1 - u) ** 3);
};

// The big watch: its minute hand points up and its hour hand to 3 o'clock at rest.
const watchSvg = (sw) => `<svg class="wl-fall__fig wl-fall__watch" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">`
  + `<path d="M12 3.9C9.4 2.4 6.3 3.4 5.1 6.4S4.3 13.8 1.8 18.2" stroke-dasharray="0 ${(sw * 2.4).toFixed(2)}"/>`
  + '<circle cx="12" cy="5" r="1.1"/><path d="M12 6.1V7.6"/><circle cx="12" cy="14" r="6.4" fill="#000"/>'
  + '<path d="M12 8.7V9.4M17.3 14H16.6M12 19.3V18.6M6.7 14H7.4"/>'
  + '<g class="m"><path d="M12 14V9.9"/></g><g class="h"><path d="M12 14H14.7"/></g><circle cx="12" cy="14" r=".5" fill="#fff" stroke="none"/></svg>';

const knghtSvg = (sw) => `<svg class="wl-fall__fig wl-fall__knght" viewBox="0 0 24 24" aria-hidden="true" fill="#000" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">`
  + `${MARKS.knght}<path d="${PLINTH}" fill="none"/><circle cx="14.6" cy="8.4" r=".6" fill="#fff" stroke="none"/></svg>`;

// The White Rabbit as the footer draws it, its watch at Toronto time. Only the climb shows it.
const rabbitSvg = (T) => `<svg class="wl-fall__rabbit" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${RABBIT.outline}"/>`
  + `<g class="w"><path d="${RABBIT.watch}"/>${hands(T)}</g><circle cx="${RABBIT.eye[0]}" cy="${RABBIT.eye[1]}" r=".6" fill="#000" stroke="none"/></svg>`;

// T: the time in Toronto at open ({ h, m, open }), for the watch's hands and the rabbit's line.
export function makeFall(layer, T = { h: 0, m: 0, open: false }) {
  const desk = innerWidth >= 900;
  const ws = desk ? 100 : 64, ks = desk ? 120 : 72;
  layer.innerHTML = '<canvas></canvas><div class="wl-fall__fg"><div class="wl-fall__world">'
    + watchSvg(((1.2 * 24) / ws).toFixed(3)) + knghtSvg(((1.2 * 24) / ks).toFixed(3)) + rabbitSvg(T)
    + '</div><div class="wl-fall__words">'
    + LINES.map(([w]) => `<p class="wl-fall__line">${w}</p>`).join('') + `<p class="wl-fall__say">${T.open ? OPEN : LATE}</p>`
    + '</div></div>';
  const cv = layer.querySelector('canvas');
  const g2 = cv.getContext('2d');
  const fg = layer.querySelector('.wl-fall__fg');
  const world = layer.querySelector('.wl-fall__world');
  const [watch, knght] = layer.querySelectorAll('.wl-fall__fig');
  const rabbit = layer.querySelector('.wl-fall__rabbit');
  const lines = layer.querySelectorAll('.wl-fall__line');
  const say = layer.querySelector('.wl-fall__say');
  const sigils = Object.fromEntries(['lore', ...LAYERS.map((l) => l[0])].map((k) => [k, toPath(SIGILS[k])]));
  const B = { s: 1, p: 0 }; // the core's breath while it waits for the board
  const R = { a: 0 }; // the climbing rabbit's own fade
  let W = 0, H = 0, M = 0, R0 = 0, VX = 0, VY = 0, dpr = 1, reach = 0, breath = null, climbing = false;

  const size = () => {
    W = innerWidth; H = innerHeight; M = Math.min(W, H); R0 = 0.36 * M; VX = W / 2; VY = H / 2;
    reach = Math.hypot(W, H) / 2 + 40;
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };

  const ring = (r, alpha, width) => {
    g2.globalAlpha = alpha;
    g2.lineWidth = width;
    g2.beginPath(); g2.arc(VX, VY, r, 0, Math.PI * 2); g2.stroke();
  };
  const sigil = (key, x, y, s, alpha) => {
    const k = s / 24;
    g2.save();
    g2.globalAlpha = alpha;
    g2.translate(x - 12 * k, y - 12 * k); g2.scale(k, k);
    g2.lineWidth = 1 / k;
    g2.stroke(sigils[key]);
    g2.restore();
  };
  // Words round an arc, each letter upright to the circle. dir 1: over the top, clockwise; -1: under, left to right.
  const arcText = (str, r, fs, mid, dir) => {
    g2.font = `500 ${fs}px ${SANS}`;
    const track = 0.34 * fs, R = r + 0.8 * fs;
    const w = [...str].map((ch) => g2.measureText(ch).width);
    const total = w.reduce((a, b) => a + b + track, -track);
    let th = mid - (dir * total) / 2 / R;
    [...str].forEach((ch, i) => {
      const a = th + (dir * w[i]) / 2 / R;
      g2.save();
      g2.translate(VX + R * Math.cos(a), VY + R * Math.sin(a));
      g2.rotate(a + (dir * Math.PI) / 2);
      g2.fillText(ch, 0, 0);
      g2.restore();
      th += (dir * (w[i] + track)) / R;
    });
  };

  const coreR = (t) => (R0 / (CORE_Z - cam(Math.min(t, 4.9)))) * B.s;

  const draw = (t) => {
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    g2.clearRect(0, 0, W, H);
    if (t < 1.1) return;
    const G = clamp01((t - 1.1) / 0.5) * (1 - clamp01((t - 4.9) / 0.4));
    const c = cam(t), rl = roll(t);
    // The whole well rolls about its centre.
    g2.translate(VX, VY); g2.rotate(rl * D2R); g2.translate(-VX, -VY);
    g2.strokeStyle = '#fff';
    g2.fillStyle = '#fff';
    g2.textAlign = 'center';
    g2.textBaseline = 'middle';
    // A faint light at the bottom of the hole, on a square big enough that no corner shows empty as it rolls.
    if (G > 0) {
      const glow = g2.createRadialGradient(VX, VY, 0, VX, VY, M * 0.45);
      glow.addColorStop(0, `rgba(255,255,255,${0.06 * G})`);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      g2.globalAlpha = 1;
      g2.fillStyle = glow;
      g2.fillRect(VX - reach, VY - reach, 2 * reach, 2 * reach);
      g2.fillStyle = '#fff';
    }
    // Lore, at the core: it rises toward you and slows; at the hand-off its ring grows past the board and fades.
    // On the way back up the rabbit stands on it instead of the sigil.
    if (t >= 4.2) {
      const on = clamp01((t - 4.2) / 0.25), out = clamp01((t - 4.9) / 0.5);
      const r = coreR(t) * (1 + 2.2 * (1 - (1 - out) ** 2));
      if (out === 0) {
        g2.globalAlpha = on;
        g2.fillStyle = '#000';
        g2.beginPath(); g2.arc(VX, VY, r, 0, Math.PI * 2); g2.fill();
        g2.fillStyle = '#fff';
      }
      ring(r, on * (1 - out), 1.4);
      const sa = climbing ? 0 : on * (1 - clamp01((t - 4.9) / 0.15));
      if (sa > 0) sigil('lore', VX, VY, r * 1.05, sa);
    }
    if (G <= 0) { g2.globalAlpha = 1; return; }
    // The hoops, far to near, so the nearer chips cover the farther.
    for (let k = 6; k >= 0; k--) {
      const dz = k - c;
      if (dz <= 0.02) continue;
      const r = R0 / dz;
      if (r > reach) continue;
      const near = clamp01((7 - dz) / 1.5); // out of the dark, from dz 7 to 5.5
      const a = G * near * (0.45 + 0.15 * clamp01(1 - dz / 4));
      if (a <= 0.004) continue;
      ring(r, a, 1);
      const n = a / 0.6;
      const back = against(dz) * rl;
      if (k === 0) {
        // The boundary: its two lines round the top and the bottom, turned back against the roll like a chip.
        const fs = Math.min(22, r * 0.085);
        const ta = n * 0.6 * clamp01((fs - 6.5) / 2.5);
        if (ta > 0) {
          g2.globalAlpha = ta;
          arcText(TOP, r, Math.max(8, fs), (-90 - back) * D2R, 1);
          arcText(BOTTOM, r, Math.max(8, fs), (90 - back) * D2R, -1);
        }
        continue;
      }
      const [key, name, deg] = LAYERS[k - 1];
      const th = (deg + SPIN * t * (k % 2 ? 1 : -1) - back) * D2R;
      const x = VX + r * Math.cos(th), y = VY + r * Math.sin(th);
      const cr = Math.min(44, r * 0.12);
      if (cr < 2.5) continue;
      g2.globalAlpha = n;
      g2.fillStyle = '#000';
      g2.beginPath(); g2.arc(x, y, cr, 0, Math.PI * 2); g2.fill();
      g2.fillStyle = '#fff';
      g2.globalAlpha = n * 0.85;
      g2.lineWidth = 1;
      g2.beginPath(); g2.arc(x, y, cr, 0, Math.PI * 2); g2.stroke();
      sigil(key, x, y, cr * 1.3, n * 0.95);
      if (cr >= 14) {
        const fs = Math.max(9, Math.min(13, cr * 0.3));
        g2.globalAlpha = n * 0.8 * clamp01((cr - 14) / 6);
        g2.font = `500 ${fs}px ${SANS}`;
        if ('letterSpacing' in g2) g2.letterSpacing = `${(fs * 0.16).toFixed(1)}px`;
        g2.fillText(name.toUpperCase(), x, y + cr + 6 + fs / 2);
        if ('letterSpacing' in g2) g2.letterSpacing = '0px';
      }
    }
    g2.globalAlpha = 1;
  };

  // One moment: the canvas, the figures' layer rolled with it, and the climbing rabbit standing on the core
  // (1.15 r tall, its feet 0.55 r below the centre), fading with it.
  const frame = (t) => {
    draw(t);
    world.style.transform = `rotate(${roll(t).toFixed(3)}deg)`;
    if (!climbing) return;
    const r = coreR(t), k = (1.15 * r) / 18.4; // the drawing is 18.4 grid units from its ears to its feet
    rabbit.style.width = rabbit.style.height = `${(24 * k).toFixed(2)}px`;
    rabbit.style.transform = `translate(${(VX - 12.4 * k).toFixed(2)}px,${(VY + 0.55 * r - 19.4 * k).toFixed(2)}px)`;
    rabbit.style.opacity = (R.a * clamp01((t - 4.2) / 0.25)).toFixed(3);
  };

  size();
  const tl = gsap.timeline({ paused: true, onUpdate: () => frame(tl.time()) });
  const set = (el, v) => gsap.set(el, { xPercent: -50, yPercent: -50, ...v });
  // The hands keep Toronto time: the minute hand goes round three times and ends on the real minute.
  const MIN = T.m * 6, HOUR = (T.h % 12) * 30 + T.m / 2;

  // The watch rises past from lower left: we are falling, so everything else goes up. The figures start and end
  // far enough out that a 15 degree roll never shows them early.
  set(watch, { width: ws, height: ws, x: 0.16 * W, y: 1.25 * H, rotation: -28 });
  tl.to(watch, { x: 0.34 * W, y: -0.3 * H, duration: 2.6, ease: 'none' }, 1.1)
    .to(watch, { keyframes: { rotation: [-28, 32, -22, 24], easeEach: 'sine.inOut' }, duration: 2.6, ease: 'none' }, 1.1)
    .fromTo(watch.querySelector('.m'), { rotation: MIN - 1080, svgOrigin: '12 14' }, { rotation: MIN, svgOrigin: '12 14', duration: 2.6, ease: 'none' }, 1.1)
    .fromTo(watch.querySelector('.h'), { rotation: HOUR - 180, svgOrigin: '12 14' }, { rotation: HOUR - 90, svgOrigin: '12 14', duration: 2.6, ease: 'none' }, 1.1);
  // The knght tumbles past from lower right, close enough to grow.
  set(knght, { width: ks, height: ks, x: 0.82 * W, y: 1.25 * H, rotation: 0, scale: 0.9 });
  tl.to(knght, { x: 0.6 * W, y: -0.3 * H, rotation: 414, scale: 1.2, duration: 2.7, ease: 'none' }, 2.3);
  // The lines: in over 0.3 s, a slow drift up, out over 0.35 s. The last one waits above the core.
  lines.forEach((p, i) => {
    const [, a, b] = LINES[i], last = i === LINES.length - 1;
    set(p, last ? { x: VX, y: VY - 0.21 * M - 18, yPercent: -100, opacity: 0 } : { x: VX, y: 0.46 * H, opacity: 0 });
    tl.to(p, { opacity: 1, duration: 0.3, ease: 'power1.out' }, a)
      .to(p, { y: `-=${(last ? 0.03 : 0.1) * H}`, duration: b - a, ease: 'none' }, a)
      .to(p, { opacity: 0, duration: 0.35, ease: 'power1.in' }, b - 0.35);
  });
  // The hand-off: the figures and words go with the tunnel.
  tl.to(fg, { opacity: 0, duration: 0.4, ease: 'power1.out' }, 4.9).set({}, {}, 5.4);
  gsap.set(rabbit.querySelector('.w'), { svgOrigin: '14.95 10.9' });

  const onResize = () => { size(); frame(tl.time()); };
  addEventListener('resize', onResize);

  return {
    tl,
    // The core now, for the board to rise out of: its centre and diameter (viewport px) and the world's roll.
    core: () => { const t = tl.time(); return { x: VX, y: VY, d: 2 * coreR(t), roll: roll(t) }; },
    // While the board is not ready the fall holds at the core, which breathes ±2% every 1.6 s.
    breathe(on) {
      if (breath) { breath.kill(); breath = null; B.s = 1; }
      if (on) breath = gsap.fromTo(B, { p: 0 }, { p: 1, duration: 1.6, ease: 'none', repeat: -1, onUpdate: () => { B.s = 1 + 0.02 * Math.sin(B.p * Math.PI * 2); frame(tl.time()); } });
      frame(tl.time());
    },
    // The moment the timeline is at. The portal calls it after moving the timeline with its events suppressed.
    draw: () => frame(tl.time()),
    // Climb mode: the four lines stay hidden and the Lore sigil gives way to the rabbit. With rabbit (the climb
    // starts at the core), returns the rabbit's beats to nest at the climb's start: it fades in (0.05 to 0.25 s),
    // checks its watch (0.15 to 0.65 s), and says its line above the core (0.3 to 1.2 s).
    climb(withRabbit) {
      climbing = true;
      layer.classList.add('is-climb');
      const beats = gsap.timeline();
      if (withRabbit) {
        gsap.set(say, { xPercent: -50, yPercent: -100, x: VX, y: VY - 0.21 * M - 18, opacity: 0 });
        beats.to(R, { a: 1, duration: 0.2, ease: 'power1.out' }, 0.05)
          .to(rabbit.querySelector('.w'), { keyframes: { rotation: [0, -14, 10, 0], easeEach: 'sine.inOut' }, duration: 0.5, ease: 'none' }, 0.15)
          .to(say, { opacity: 1, duration: 0.25, ease: 'power1.out' }, 0.3)
          .to(say, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0.9);
      }
      frame(tl.time());
      return beats;
    },
    destroy() {
      removeEventListener('resize', onResize);
      if (breath) breath.kill();
      tl.kill();
      g2.clearRect(0, 0, cv.width, cv.height);
    },
  };
}
