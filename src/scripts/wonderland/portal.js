/* The way down (README.md). Fetched only when someone follows the white rabbit: the hole in the footer line, the
   codex's "Follow the rabbit", or the address #down-the-rabbit-hole. It owns the overlay and everything about the
   page behind it (scroll, Lenis, focus, history), plays the fall, and hands the board to the game at the bottom. */
import { gsap } from 'gsap';
import { RABBIT } from './rabbit.js';
import { makeFall } from './fall.js';
import css from './portal.css?inline';

// The game, if the build has it. A literal glob: without the file this is {}, and the fall ends on the error line.
const loaders = import.meta.glob('./game/index.js');

const HASH = '#down-the-rabbit-hole';
const doc = document, root = doc.documentElement;
const SAY = {
  open: 'Down the rabbit hole. Press Escape to climb back up.',
  wait: 'The board is being set.',
  fail: 'The board could not be set. Climb back up and try again.',
};
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

let S = null; // the visit, from open() until the overlay is gone

const track = (name, params) => {
  try { if (window.KNGHT_TRACK) window.KNGHT_TRACK(name, params); } catch (e) { /* analytics never stops the way down */ }
};
const far = (x, y) => Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
const mouth = () => (innerWidth >= 900 ? 17 : 13);
const shown = (el) => !el.closest('[inert]')
  && (el.checkVisibility ? el.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true }) : el.getClientRects().length > 0);
const usable = (el) => !!el && el.isConnected && typeof el.focus === 'function' && !el.closest('[inert]') && !el.disabled && el.getClientRects().length > 0;
const say = (s, text) => { s.live.textContent = text; };

// The iris: black over everything except a round hole with a white rim. I.fill blacks out the inside of the rim.
const makeIris = (svg) => {
  svg.innerHTML = '<path fill="#000" fill-rule="evenodd"/><circle fill="#000"/><circle fill="none" stroke="#fff" stroke-width="1"/>';
  const [cover, inside, rim] = svg.children;
  const I = { x: 0, y: 0, r: 0, fill: 0, rim: 0.7, on: true };
  I.paint = () => {
    if (!I.on) return;
    const w = innerWidth, h = innerHeight, r = Math.max(0, I.r), x = I.x, y = I.y;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    cover.setAttribute('d', `M-2 -2H${w + 2}V${h + 2}H-2ZM${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`);
    for (const c of [inside, rim]) { c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r); }
    inside.setAttribute('opacity', I.fill);
    rim.setAttribute('stroke-opacity', I.rim);
  };
  return I;
};

const glyph = `<svg class="wl-bar__glyph" viewBox="2.5 0 20 20" aria-hidden="true" focusable="false"><path d="${RABBIT.outline}"/>`
  + `<g class="w"><path d="${RABBIT.watch}"/><path d="${RABBIT.hands}"/></g><circle cx="${RABBIT.eye[0]}" cy="${RABBIT.eye[1]}" r=".7" fill="#000" stroke="none"/></svg>`;

export function open({ from = 'hash', origin = null, returnFocus = null } = {}) {
  if (S) return; // already open, or on its way out
  if (!doc.getElementById('wl-css')) {
    const st = doc.createElement('style');
    st.id = 'wl-css';
    st.textContent = css;
    doc.head.appendChild(st);
  }
  const body = doc.body;
  const lenis = (window.KNGHT && window.KNGHT.lenis) || null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const s = S = {
    from, reduce, lenis, returnFocus,
    y: scrollY,
    weStopped: !!lenis && !lenis.isStopped,
    overflow: [body.style.overflow, root.style.overflow],
    origin: origin || { x: innerWidth / 2, y: innerHeight / 2 },
    game: new AbortController(), // the game's listeners: aborted as the overlay starts to close
    own: new AbortController(), // the portal's: aborted once it is gone
    state: 'open', pushed: false, inerted: [], controller: null, failed: false, waiting: false,
  };

  // The page holds still: Lenis stops (site.css then clips the root), and the body stops scrolling too, which also
  // covers reduced motion, where there is no Lenis.
  if (s.weStopped) lenis.stop();
  body.style.overflow = 'hidden';

  const wl = s.el = doc.createElement('div');
  wl.className = 'wl';
  wl.setAttribute('role', 'dialog');
  wl.setAttribute('aria-modal', 'true');
  wl.setAttribute('aria-labelledby', 'wl-title');
  wl.setAttribute('tabindex', '-1');
  wl.setAttribute('data-lenis-prevent', ''); // Lenis leaves wheel and touch inside it to the browser
  wl.dataset.phase = reduce ? 'land' : 'iris';
  wl.innerHTML = '<svg class="wl-iris" aria-hidden="true" focusable="false"></svg><div class="wl-fall" aria-hidden="true"></div>'
    + `<header class="wl-bar"><p class="wl-bar__where" id="wl-title">${glyph}<span class="wl-bar__words">Down the rabbit hole</span></p>`
    + '<button type="button" class="btn btn--ghost btn--sm wl-climb">Climb back up</button></header>'
    + '<div class="wl-game"></div><p class="wl-msg" hidden></p><p class="sr-only" aria-live="polite" data-wl-live></p>';
  body.appendChild(wl);
  [s.iris, s.fallLayer, s.bar, s.climbBtn, s.host, s.msg, s.live] = ['.wl-iris', '.wl-fall', '.wl-bar', '.wl-climb', '.wl-game', '.wl-msg', '[data-wl-live]'].map((q) => wl.querySelector(q));

  // Everything else on the page is inert while the overlay is up: no Tab, no screen reader, no taps.
  for (const el of body.children) {
    if (el !== wl && !el.inert && !/^(SCRIPT|STYLE|TEMPLATE|LINK)$/.test(el.tagName)) { el.inert = true; s.inerted.push(el); }
  }

  // Back (or Climb back up) leaves the hole. Opened from the address, the address is already ours.
  if (location.hash !== HASH) {
    history.pushState(history.state, '', location.pathname + location.search + HASH);
    s.pushed = true;
  }

  wl.focus({ preventScroll: true });
  s.sayT = setTimeout(() => { if (S === s && !s.failedShown) say(s, SAY.open); }, 120);

  const sig = { signal: s.own.signal };
  // Tab goes round the overlay. Escape climbs, unless the game used it. No key pressed in here reaches the page's
  // own handlers (the knght's move on the arrow keys, the menu's Escape).
  wl.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') trap(e);
    else if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); climb(); }
    e.stopPropagation();
  }, sig);
  // A key that starts outside the overlay (focus lost to the body) belongs to it all the same.
  doc.addEventListener('keydown', (e) => {
    if (wl.contains(e.target)) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { e.preventDefault(); climb(); } else if (S === s && s.state === 'open') wl.focus({ preventScroll: true });
  }, { capture: true, signal: s.own.signal });
  s.climbBtn.addEventListener('click', () => climb(), sig);

  if (/[?&]wl-qa\b/.test(location.search)) {
    // QA only: the timeline, to pause and step the fall for stills.
    window.KNGHT_WL = { gsap, get tl() { return S && S.tl; }, get fall() { return S && S.fall; }, get phase() { return S ? S.el.dataset.phase : 'closed'; } };
  }

  if (reduce) {
    // No iris, no fall: black at once, the bar, and the board as soon as it is ready.
    s.iris.remove();
    s.fallLayer.remove();
    s.iris = s.fallLayer = null;
    root.classList.add('wl-hide');
    s.waitT = setTimeout(() => fail(s), 12000);
    setTimeout(() => { if (S === s && !s.controller && !s.failedShown) say(s, SAY.wait); }, 600);
  } else fall(s);
  loadGame(s);

  doc.dispatchEvent(new CustomEvent('knght:wonderland', { detail: { state: 'open' } }));
  track('rabbit_followed', { from });
}

const trap = (e) => {
  const f = [...S.el.querySelectorAll(FOCUSABLE)].filter(shown);
  const i = f.indexOf(doc.activeElement), last = f.length - 1;
  if (!f.length) { e.preventDefault(); return; }
  let to = null;
  if (i < 0) to = e.shiftKey ? f[last] : f[0];
  else if (!e.shiftKey && i === last) to = f[0];
  else if (e.shiftKey && i === 0) to = f[last];
  if (to) { e.preventDefault(); to.focus(); }
};

/* ---------- The fall (fall.js has the tunnel; the iris is here because the climb uses it too) ---------- */
const fall = (s) => {
  const w = innerWidth, h = innerHeight, o = s.origin;
  const I = s.I = makeIris(s.iris);
  Object.assign(I, { x: o.x, y: o.y, r: far(o.x, o.y), fill: 0, rim: 0.7 });
  I.paint();
  const F = s.fall = makeFall(s.fallLayer);
  gsap.set(s.bar, { opacity: 0 });
  const tl = s.tl = gsap.timeline({ onUpdate: I.paint });
  // 0 to 0.85 s: the page closes into the round hole. 0.85 s: inside the rim goes black. 1.0 to 1.45 s: the dive,
  // the mouth gliding to the centre and growing past the edges as the tunnel appears in it.
  tl.to(I, { r: mouth(), duration: 0.85, ease: 'power2.in' }, 0)
    .to(s.bar, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 0.35)
    .to(I, { fill: 1, duration: 0.2, ease: 'none' }, 0.85)
    .to(I, { x: w / 2, y: h / 2, duration: 0.45, ease: 'power2.inOut' }, 1)
    .to(I, { r: () => far(w / 2, h / 2) + 8, duration: 0.45, ease: 'power2.in' }, 1)
    .call(() => { s.el.dataset.phase = 'fall'; root.classList.add('wl-hide'); I.fill = 0; }, null, 1.1)
    .call(() => { I.on = false; s.iris.style.visibility = 'hidden'; }, null, 1.45)
    .add(F.tl.paused(false), 0)
    .call(() => atCore(s), null, 4.6)
    .call(() => handOff(s), null, 4.9)
    .call(() => { if (s.fallLayer) s.fallLayer.hidden = true; }, null, 5.45);
};

// 4.6 s: the core. Without a board yet, the fall holds here and the core breathes, for up to 12 s.
const atCore = (s) => {
  if (s.controller) return;
  s.tl.pause();
  if (s.failed) { fail(s); return; }
  s.waiting = true;
  s.fall.breathe(true);
  say(s, SAY.wait);
  s.waitT = setTimeout(() => fail(s), 12000);
};

// The game module arrived (or failed to).
const ready = (s) => {
  if (S !== s || s.state !== 'open') return;
  clearTimeout(s.waitT);
  if (s.reduce) { if (s.failed) fail(s); else land(s); return; }
  if (!s.waiting) return; // still falling: the core and the hand-off pick it up
  s.waiting = false;
  s.fall.breathe(false);
  if (s.failed) fail(s); else s.tl.resume();
};

// 4.9 s: the board rises out of the core.
const handOff = (s) => { if (s.controller) land(s, { from: s.fall.core() }); };

const land = (s, arg) => {
  s.el.dataset.phase = 'land';
  let p;
  try { p = Promise.resolve(s.controller.land(arg)); } catch (e) { p = Promise.reject(e); }
  p.then(() => { if (S === s && s.state === 'open') s.el.dataset.phase = 'play'; }, (e) => { console.error('KNGHT wonderland:', e); fail(s); });
};

const loadGame = (s) => {
  const load = loaders['./game/index.js'];
  const opts = { reduce: s.reduce, signal: s.game.signal, onClimb: () => climb('end'), track, bookHref: '/book/' };
  (load ? load() : Promise.reject(new Error('there is no game in this build')))
    .then((m) => { if (S === s && s.state === 'open') s.controller = m.mount(s.host, opts); })
    .catch((e) => { console.error('KNGHT wonderland:', e); s.failed = true; })
    .then(() => ready(s));
};

const fail = (s) => {
  if (S !== s || s.state !== 'open' || s.failedShown) return;
  s.failedShown = true;
  clearTimeout(s.waitT);
  if (s.tl) s.tl.pause();
  if (s.fall) { s.fall.breathe(false); gsap.to(s.fallLayer, { opacity: 0.12, duration: 0.4 }); }
  if (s.I) { s.I.on = false; s.iris.style.visibility = 'hidden'; }
  try { if (s.controller) s.controller.destroy(); } catch (e) { /* it is going anyway */ }
  s.controller = null;
  if (s.el.dataset.phase === 'iris') s.el.dataset.phase = 'fall';
  root.classList.add('wl-hide');
  gsap.set(s.bar, { opacity: 1 });
  s.msg.textContent = SAY.fail;
  s.msg.hidden = false;
  say(s, SAY.fail);
  s.climbBtn.focus({ preventScroll: true });
};

/* ---------- Climb back up ---------- */
// From the bar's button, Escape, an ending's button (the game's onClimb) or a failed board.
const climb = (stage) => {
  const s = S;
  if (!s || s.state !== 'open' || s.climbing) return;
  s.climbing = true;
  track('rabbit_climb', { stage: stage || (s.el.dataset.phase === 'play' ? 'game' : 'fall') });
  // Through history when we added the entry, so the phone's Back and this button do the same thing.
  if (s.pushed && location.hash === HASH) {
    history.back(); // popstate: rabbit.js calls close('history')
    s.backT = setTimeout(() => close('climb'), 400);
  } else close('climb');
};

export function close(reason = 'climb') {
  const s = S;
  if (!s || s.state !== 'open') return;
  s.state = 'closing';
  clearTimeout(s.backT);
  clearTimeout(s.waitT);
  clearTimeout(s.sayT);
  if (location.hash === HASH) history.replaceState(history.state, '', location.pathname + location.search);
  s.game.abort();
  if (s.tl) s.tl.kill();
  if (s.fall) s.fall.breathe(false);
  s.host.inert = true;
  const putBack = () => {
    try { if (s.controller) s.controller.destroy(); } catch (e) { console.error('KNGHT wonderland:', e); }
    s.controller = null;
    if (s.fall) s.fall.destroy();
    restore(s);
  };
  if (s.reduce) { putBack(); finish(s); return; }
  const wasIris = s.el.dataset.phase === 'iris';
  // The game (or the fall) fades, the page is put back behind, and the iris opens on it from where you went in.
  gsap.to([s.host, s.bar, s.fallLayer, s.msg].filter(Boolean), {
    opacity: 0, duration: 0.2, ease: 'power1.out', overwrite: true,
    onComplete: () => {
      putBack();
      s.el.dataset.phase = 'climb';
      const I = s.I || (s.I = makeIris(s.iris));
      if (!wasIris) Object.assign(I, { x: s.origin.x, y: s.origin.y, r: mouth(), fill: 0, rim: 0.7 });
      I.on = true;
      s.iris.style.visibility = 'visible';
      I.paint();
      gsap.timeline({ onUpdate: I.paint, onComplete: () => finish(s) })
        .to(I, { r: far(I.x, I.y) + 8, fill: 0, duration: 0.65, ease: 'power2.out' }, 0)
        .to(I, { rim: 0, duration: 0.25, ease: 'none' }, 0.4);
    },
  });
}

// The page as it was: visible, scrollable, Lenis running, at the same place.
const restore = (s) => {
  root.classList.remove('wl-hide');
  s.inerted.forEach((el) => { el.inert = false; });
  s.inerted = [];
  doc.body.style.overflow = s.overflow[0];
  root.style.overflow = s.overflow[1];
  if (s.weStopped && s.lenis) s.lenis.start();
  if (Math.abs(scrollY - s.y) > 1) {
    if (s.lenis) s.lenis.scrollTo(s.y, { immediate: true, force: true });
    else scrollTo(0, s.y);
  }
};

const finish = (s) => {
  // Focus goes back where it was before the rabbit (the hole, the element under the codex), without scrolling.
  const hole = doc.querySelector('.wl-rb button');
  const r = hole && hole.getBoundingClientRect();
  const back = usable(s.returnFocus) ? s.returnFocus
    : usable(hole) && r.bottom > 0 && r.top < innerHeight ? hole : null;
  // The page behind can take a frame or two to be visible again (under reduced motion the site gives every change a
  // tiny transition), and a hidden element cannot take focus: wait for it, a few frames at most.
  if (back && (s.waited = (s.waited || 0) + 1) < 12 && getComputedStyle(back).visibility !== 'visible') {
    requestAnimationFrame(() => finish(s));
    return;
  }
  if (back) back.focus({ preventScroll: true });
  s.el.remove();
  s.own.abort();
  S = null;
  doc.dispatchEvent(new CustomEvent('knght:wonderland', { detail: { state: 'closed' } }));
};
