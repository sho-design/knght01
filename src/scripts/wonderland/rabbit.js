/* The white rabbit. Every page with a footer loads this small watcher, and nothing else of Wonderland.
   When the reader reaches the footer line, a rabbit hops along it and dives into a hole. The hole stays open:
   tap it (or the rabbit while it checks its watch) to follow. The codex's "Follow the rabbit" and the address
   #down-the-rabbit-hole lead to the same place. The overlay, the fall and the game load only then (README.md).
   This file sits in the Motion chunk on every page, so it is kept small (README.md, "Budget"). */
import { gsap } from 'gsap';

// The White Rabbit, drawn as a seventh piece of the KNGHT Story set on its 24 grid: the king's collar and skirt,
// a rabbit's head facing right with its ears swept back, and a pocket watch held out on a short chain.
export const RABBIT = {
  outline: 'M7 19.4c1.2-1.05 2.85-3.85 3-8.5h-.95q-.45 0-.45-.45 0-.45.45-.45h1.35c-.3-.6-.5-1.4-.4-2.2.1-.8.4-1.4.9-1.8C10 4.9 8.7 3 8.7 1.4c0-.4.4-.4.7-.1 1.2 1.1 2 2.6 2.4 4.1-.2-1.5-.5-3.4-.1-4.6.15-.4.5-.4.7 0 .7 1.4.9 3 .8 4.7 1.1.3 2 1.2 2.3 2.2.2.7-.2 1.3-.9 1.4-.6.1-1 .4-1 .9h1.35q.45 0 .45.45 0 .45-.45.45h-.95c.15 4.65 1.8 7.45 3 8.5z',
  watch: 'M14.95 10.9q1.45.1 1.45 1.5m0 0a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 1 1 0-2.9z',
  hands: 'M16.4 13.85v-.8m0 .8l.6.35',
  eye: [13.85, 7.3],
};

const doc = document;
let portal;

const load = () => portal || (portal = import('./portal.js').catch((e) => { portal = 0; throw e; }));
const warm = () => load().catch(() => {}); // fetch ahead of the press
const follow = (from, origin, returnFocus) => load().then((m) => m.open({ from, origin, returnFocus })).catch(console.error);
const on = (t, type, fn, o) => t.addEventListener(type, fn, o);
const up = () => doc.querySelector('.wl'); // the overlay, while it is open or closing

/* ---------- The ways in that are not the hole ---------- */
// The one public door: site.js's codex dispatches it, and a later page (the 404) can too.
on(doc, 'knght:rabbit', (e) => follow(e.detail?.from || 'codex', null, doc.activeElement));
// A pointer or focus on the codex's button fetches the portal ahead of the press.
const toCodex = (e) => { if (e.target.closest?.('[data-codex-rabbit]')) warm(); };
on(doc, 'pointerover', toCodex);
on(doc, 'focusin', toCodex);
// The address. No element has this id, so the browser never scrolls to it. Back and Forward change the hash too.
// At load this runs after site.js (deferred scripts run before DOMContentLoaded), so Lenis exists by then.
const onHash = () => {
  if (location.hash === '#down-the-rabbit-hole') { if (!up()) follow('hash'); } else if (up() && portal) portal.then((m) => m.close('history'));
};
on(window, 'hashchange', onHash);
on(doc, 'DOMContentLoaded', onHash);

/* ---------- The rabbit on the footer line ---------- */
const CSS = '.wl-rb{position:absolute;width:100%;z-index:60;pointer-events:none}.wl-rb *{position:absolute;left:0;top:0}.wl-rb>div{width:100%;overflow:hidden}'
  + '.wl-rb svg{overflow:visible;stroke:#fff;stroke-linecap:round;stroke-linejoin:round}.wl-rb path,.wl-rb ellipse{vector-effect:non-scaling-stroke}'
  + '.wl-rb>div svg{fill:#fff;stroke-width:1.1;filter:drop-shadow(0 0 1.5px #000);transform-origin:50% 80.8%}.wl-rb .w{fill:#000}.wl-rb .t{pointer-events:auto}'
  + '.wl-rb button{all:unset;position:absolute;width:48px;height:44px;border-radius:50%;cursor:pointer;pointer-events:auto;-webkit-tap-highlight-color:transparent}'
  + '.wl-rb button:focus-visible{outline:1px solid #fff;outline-offset:2px;--s:1.12;--o:.9}@media (hover:hover){.wl-rb button:hover{--s:1.12;--o:.9}}'
  + '.wl-rb .l{stroke-opacity:var(--o,.55);transition:.25s}.wl-rb .o{transform:scale(var(--s,1));transition:.25s}';
const RIM = '<path d="M-11 0A11 2.86 0 0 ';

const watch = (line) => {
  const footer = line.closest('footer'), born = performance.now();
  let full, ran, timer, run, still, layer, fig, btn, hole, sig;

  // Where the hole and the run go, laid out in the layer's own coordinates. Nothing in the footer is covered: its
  // links, the email, LinkedIn and the knght button, with 8 px to spare, and the back-to-top column at every height.
  // When the line has moved (a new width, the page above changing height) a run jumps to its end first.
  const place = () => {
    const r = line.getBoundingClientRect(), desk = innerWidth >= 900, F = desk ? 40 : 32, hop = desk ? 46 : 34, ly = r.top + 0.5;
    const top = doc.querySelector('.totop');
    const obs = [...footer.querySelectorAll('a,button,input,select,textarea,summary,[tabindex]')].map((el) => el.getBoundingClientRect())
      .filter((b) => b.width).map((b) => [b.left - 8, b.top - 8, b.right + 8, b.bottom + 8]);
    if (top) obs.push([top.getBoundingClientRect().left - 12, -1e6, 1e6, 1e6]);
    const clear = (a, b, c, d) => obs.every((o) => c <= o[0] || a >= o[2] || d <= o[1] || b >= o[3]);
    for (let i = 0, x, x0, n, L, bh, key; i * 4 < r.width; i++) {
      x = r.left + r.width * 0.7 + (i % 2 ? 8 : -8) * Math.ceil(i / 2);
      if (x >= r.left + 48 && x <= r.right - 40 && clear(x - 24, ly - 32, x + 24, ly + 12)) {
        for (x0 = Math.max(x - 9 * hop, r.left + 4 + F / 2); x - x0 > 2 * hop - 1 && !clear(x0 - F / 2, ly - F * 1.3, x, ly);) x0 += hop;
        n = x - x0 > 2 * hop - 1 ? Math.round((x - x0) / hop) : 0;
        key = [r.left, r.width, ly + scrollY].map(Math.round) + '';
        if (key === sig) return;
        if (run) run.progress(1);
        sig = key;
        if (still == null) still = matchMedia('(prefers-reduced-motion: reduce)').matches || !n;
        L = layer.getBoundingClientRect();
        bh = 2 * F;
        layer.hidden = false;
        // A still rabbit stands just left of the hole, facing it.
        Object.assign(fig.parentNode.style, { top: `${ly - L.top - bh}px`, height: `${bh}px` });
        Object.assign(fig.style, { left: `${(still ? x - F * 0.45 : x0) - L.left - F / 2}px`, top: `${bh - F * 0.808}px`, width: `${F}px`, height: `${F}px` });
        Object.assign(btn.style, { left: `${x - L.left - 24}px`, top: `${ly - L.top - 32}px` });
        gsap.set(hole, { scale: desk ? 14 / 11 : 1, svgOrigin: '0 0' });
        return { F, step: (x - x0) / n, n };
      }
    }
    layer.hidden = true;
    sig = 0;
  };

  // The run, about 4 s: the hole opens, the rabbit hops in from the left, stops to check its watch at 60% of the
  // way (a tap on it then follows), and dives into the hole. Nothing loops; the hole stays open.
  const hop = (p) => {
    const k = Math.round(p.n * 0.6), arc = p.F * 0.3, w = fig.querySelector('.w'), P = { p: 0 }, q = gsap.quickSetter(fig, 'css');
    // At hop P.p: along the line, a parabola up and down, and a squash just after each landing.
    const u = () => {
      const f = P.p % 1, s = f && f < 0.1 ? 0.92 + 0.8 * f : 1;
      q({ x: P.p * p.step, y: -4 * arc * f * (1 - f), scaleY: s, scaleX: 1.6 - 0.6 * s });
    };
    gsap.set(w, { svgOrigin: '14.95 10.9' });
    return gsap.timeline({ onComplete: () => { fig.style.display = 'none'; run = 0; } })
      .from(hole, { scale: 0, duration: 0.35, ease: 'power2.out' })
      .from(fig, { opacity: 0, duration: 0.28 }, 0.15)
      .to(P, { p: k, duration: k * 0.28, ease: 'none', onUpdate: u }, 0.15)
      // The watch swings out from its chain and the body bobs twice.
      .call(() => fig.classList.add('t'))
      .to(w, { keyframes: { rotation: [0, -14, 10, 0], easeEach: 'sine.inOut' }, duration: 0.8 })
      .to(fig, { scaleY: 0.96, duration: 0.2, yoyo: true, repeat: 3, ease: 'sine.inOut' }, '<')
      .call(() => fig.classList.remove('t'))
      .to(P, { p: p.n - 1, duration: (p.n - 1 - k) * 0.22, ease: 'none', onUpdate: u })
      // The dive: a higher hop onto the hole, down through the line, and a ripple.
      .to(fig, { x: p.n * p.step, duration: 0.22, ease: 'none' })
      .to(fig, { keyframes: [{ y: -arc * 1.6, duration: 0.11, ease: 'power1.out' }, { y: p.F * 0.85, duration: 0.39, ease: 'power2.in' }] }, '<')
      .fromTo(hole.nextSibling, { scale: 1, opacity: 0.6 }, { scale: 2.2, opacity: 0, svgOrigin: '0 0', duration: 0.5, immediateRender: false }, '>0.1');
  };

  const start = () => {
    ran = 1;
    layer = doc.createElement('div');
    layer.className = 'wl-rb';
    // Its own small style travels with it (start() runs once per page).
    layer.innerHTML = `<style id="wl-rabbit-css">${CSS}</style><div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${RABBIT.outline}"/><g class="w"><path d="${RABBIT.watch}"/><path d="${RABBIT.hands}"/></g>`
      + `<circle cx="${RABBIT.eye[0]}" cy="${RABBIT.eye[1]}" r=".6" fill="#000" stroke="none"/></svg></div>`
      + '<button type="button" aria-label="Follow the white rabbit"><svg viewBox="-24 -32 48 44" width="48" height="44" fill="none"><g class="o"><g>'
      + `<ellipse rx="11" ry="2.86" fill="#000" stroke="none"/>${RIM}1 11 0" stroke-opacity=".16"/>${RIM}0 11 0" class="l"/></g><ellipse rx="11" ry="2.86" opacity="0"/></g></svg></button>`;
    doc.body.appendChild(layer);
    [fig, btn] = layer.querySelectorAll('div>svg,button');
    hole = btn.querySelector('g g');
    const go = () => {
      if (run) run.progress(1);
      const b = btn.getBoundingClientRect();
      follow('rabbit', { x: b.left + 24, y: b.top + 32 }, btn);
    };
    on(btn, 'click', go);
    on(fig, 'click', go);
    for (const t of ['pointerenter', 'focus', 'touchstart']) on(btn, t, warm, { passive: true });
    const p = place();
    if (!p) still = 1;
    else if (!still) run = hop(p);
    new ResizeObserver(() => requestAnimationFrame(place)).observe(doc.body);
  };

  // The rabbit comes once per page view: when the whole footer line has been in view for 0.7 s, at least 1.5 s
  // after the page loaded, in a visible tab, with no codex, phone menu or overlay open.
  const ready = () => {
    if (full && !ran) {
      if (doc.hidden || doc.querySelector('.menu-open,.codex,.wl')) timer = setTimeout(ready, 400);
      else start();
    }
  };
  new IntersectionObserver(([e]) => {
    full = e.intersectionRatio > 0.99;
    clearTimeout(timer);
    if (!e.isIntersecting && run) run.progress(1);
    if (full) timer = setTimeout(ready, Math.max(700, 1500 - performance.now() + born));
  }, { threshold: [0, 1] }).observe(line);
};

const lines = doc.querySelectorAll('footer .footer__base');
if (lines.length) watch(lines[lines.length - 1]);
