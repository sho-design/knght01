/* The way down (README.md). Fetched only when someone follows the white rabbit: the hole in the footer line, the
   codex's "Follow the rabbit", or the address #down-the-rabbit-hole. It owns the overlay and everything about the
   page behind it (scroll, Lenis, focus, history), plays the fall, hands the board to the game at the bottom, and
   plays the fall backwards on the way out. Both run on the wall clock (drive()). */
import { gsap } from 'gsap';
import { RABBIT, toronto } from './watch.js';
import { makeFall, hands } from './fall.js';
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
// The time in Toronto, for the watches. A browser that cannot tell gets its own clock.
const now = () => {
  try { return toronto(); } catch (e) { const d = new Date(); return { h: d.getHours(), m: d.getMinutes(), open: false }; }
};

// The wall clock. A paused timeline is moved, every frame, to the real time since it started (never past hold()), so
// a slow frame never stretches it, and its .call()s still fire in order across a long jump. GSAP's lagSmoothing (the
// site's own animations use it) never touches it. A hidden tab gets no frames: on its return the time jumps to the
// wall clock. pause(), resume() and seek(t) keep the time: a resume carries on from where it stopped.
const drive = (tl, hold = () => Infinity) => {
  let t0 = performance.now(), t = 0, held = false, over = false, raf = 0;
  const tick = () => {
    raf = 0;
    if (held || over) return;
    t = Math.min((performance.now() - t0) / 1000, hold());
    if (!tl.paused()) tl.pause(); // only this clock moves it
    tl.time(t);
    if (t >= tl.duration()) over = true;
    else if (!held && !raf) raf = requestAnimationFrame(tick);
  };
  const go = () => { if (!held && !over && !raf) raf = requestAnimationFrame(tick); };
  const C = {
    get t() { return t; },
    pause() { held = true; cancelAnimationFrame(raf); raf = 0; },
    resume() { if (held) { held = false; t0 = performance.now() - t * 1000; go(); } },
    seek(x) {
      t = Math.max(0, x);
      t0 = performance.now() - t * 1000;
      over = t >= tl.duration();
      tl.time(t);
      go();
    },
    stop() { over = true; cancelAnimationFrame(raf); raf = 0; },
  };
  tick();
  return C;
};

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

// The bar's rabbit, its watch at the time in Toronto.
const glyph = (T) => `<svg class="wl-bar__glyph" viewBox="2.5 0 20 20" aria-hidden="true" focusable="false"><path d="${RABBIT.outline}"/>`
  + `<g class="w"><path d="${RABBIT.watch}"/>${hands(T)}</g><circle cx="${RABBIT.eye[0]}" cy="${RABBIT.eye[1]}" r=".7" fill="#000" stroke="none"/></svg>`;

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
  const T = now();
  const s = S = {
    from, reduce, lenis, returnFocus, T,
    y: scrollY,
    weStopped: !!lenis && !lenis.isStopped,
    overflow: [body.style.overflow, root.style.overflow],
    origin: origin || { x: innerWidth / 2, y: innerHeight / 2 },
    game: new AbortController(), // the game's listeners: aborted with destroy(), once the board has sunk
    own: new AbortController(), // the portal's: aborted once it is gone
    state: 'open', pushed: false, inerted: [], controller: null, failed: false, waiting: false, then: null,
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
    + `<header class="wl-bar"><p class="wl-bar__where" id="wl-title">${glyph(T)}<span class="wl-bar__words">Down the rabbit hole</span></p>`
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
  // On the way up, Escape, Enter or Space (or a tap, below) skips to the top.
  const skipKey = (e) => { if (/^(Escape|Enter| )$/.test(e.key) && skip(s)) e.preventDefault(); };
  // Tab goes round the overlay. Escape climbs, unless the game used it. No key pressed in here reaches the page's
  // own handlers (the knght's move on the arrow keys, the menu's Escape).
  wl.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') trap(e);
    else if (s.state !== 'open') skipKey(e);
    else if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); climb(); }
    e.stopPropagation();
  }, sig);
  // A key that starts outside the overlay (focus lost to the body) belongs to it all the same.
  doc.addEventListener('keydown', (e) => {
    if (wl.contains(e.target)) return;
    e.stopImmediatePropagation();
    if (s.state !== 'open') skipKey(e);
    else if (e.key === 'Escape') { e.preventDefault(); climb(); } else if (S === s) wl.focus({ preventScroll: true });
  }, { capture: true, signal: s.own.signal });
  wl.addEventListener('pointerdown', () => { if (s.state !== 'open') skip(s); }, sig);
  s.climbBtn.addEventListener('click', () => climb(), sig);

  if (/[?&]wl-qa\b/.test(location.search)) {
    // QA only: the timelines and the clock that moves them (pause, resume, seek), a climb, and the game.
    window.KNGHT_WL = {
      gsap,
      get tl() { return S && S.tl; },
      get fall() { return S && S.fall; },
      get phase() { return S ? S.el.dataset.phase : 'closed'; },
      get clock() { return S && S.clock; },
      climb: (stage) => climb(stage),
      get game() { return S && S.controller; },
    };
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
  const F = s.fall = makeFall(s.fallLayer, s.T);
  gsap.set(s.bar, { opacity: 0 });
  const tl = s.tl = gsap.timeline({ paused: true, onUpdate: I.paint });
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
  // On the wall clock, and never past the core without a board.
  s.clock = drive(tl, () => (s.controller || s.failed ? Infinity : 4.6));
};

// 4.6 s: the core. Without a board yet, the fall holds here and the core breathes, for up to 12 s.
const atCore = (s) => {
  if (s.controller) return;
  s.clock.pause();
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
  if (s.failed) fail(s); else s.clock.resume(); // from 4.6, not from the time spent waiting
};

// 4.9 s: the board rises out of the core, tilted as the world is.
const handOff = (s) => { if (s.controller) land(s, { from: s.fall.core() }); };

const land = (s, arg) => {
  s.el.dataset.phase = 'land';
  let p;
  try { p = Promise.resolve(s.controller.land(arg)); } catch (e) { p = Promise.reject(e); }
  p.then(() => { if (S === s && s.state === 'open') s.el.dataset.phase = 'play'; }, (e) => { console.error('KNGHT wonderland:', e); fail(s); });
};

const loadGame = (s) => {
  const load = loaders['./game/index.js'];
  const opts = { reduce: s.reduce, signal: s.game.signal, onClimb: () => climb('end'), onCodex: () => climb('codex'), track, bookHref: '/book/' };
  (load ? load() : Promise.reject(new Error('there is no game in this build')))
    .then((m) => { if (S === s && s.state === 'open') s.controller = m.mount(s.host, opts); })
    .catch((e) => { console.error('KNGHT wonderland:', e); s.failed = true; })
    .then(() => ready(s));
};

const fail = (s) => {
  if (S !== s || s.state !== 'open' || s.failedShown) return;
  s.failedShown = true;
  clearTimeout(s.waitT);
  if (s.clock) s.clock.pause();
  if (s.fall) { s.fall.breathe(false); gsap.to(s.fallLayer, { opacity: 0.12, duration: 0.4 }); }
  if (s.I) { s.I.on = false; s.iris.style.visibility = 'hidden'; }
  endGame(s);
  if (s.el.dataset.phase === 'iris') s.el.dataset.phase = 'fall';
  root.classList.add('wl-hide');
  gsap.set(s.bar, { opacity: 1 });
  s.msg.textContent = SAY.fail;
  s.msg.hidden = false;
  say(s, SAY.fail);
  s.climbBtn.focus({ preventScroll: true });
};

const endGame = (s) => {
  try { if (s.controller) s.controller.destroy(); } catch (e) { console.error('KNGHT wonderland:', e); }
  s.controller = null;
};

/* ---------- Climb back up ---------- */
// From the bar's button, Escape, an ending's buttons (the game's onClimb, and onCodex for the knght's move) or a
// failed board. stage 'codex': the codex opens once the page is back.
const climb = (stage) => {
  const s = S;
  if (!s || s.state !== 'open' || s.climbing) return;
  s.climbing = true;
  if (stage === 'codex') s.then = 'codex';
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
  // The game stops first: no more input or timers, and her thinking ends.
  try { s.controller?.leaving?.(); } catch (e) { /* it is going anyway */ }
  s.state = 'closing';
  clearTimeout(s.backT);
  clearTimeout(s.waitT);
  clearTimeout(s.sayT);
  if (location.hash === HASH) history.replaceState(history.state, '', location.pathname + location.search);
  if (s.fall) s.fall.breathe(false);
  // The board takes no more input, but stays drawn while it sinks.
  s.host.inert = true;
  if (s.reduce || !s.tl) { endGame(s); s.game.abort(); restore(s); finish(s); return; }
  rise(s);
}

// The climb plays the fall backwards on its own clock (c, seconds), moving the fall's timeline (F) with its events
// suppressed and doing the steps itself. Fall-seconds per climb-second: the tunnel (F 4.9 to 1.45 in 1.2 s), the
// mouth (1.45 to 0.85 in 0.45 s), the iris (0.85 to 0 in 0.6 s).
const TUNNEL = 3.45 / 1.2, MOUTH = 0.6 / 0.45, IRIS = 0.85 / 0.6;
const rise = (s) => {
  const F = s.fall, I = s.I, tl = s.tl, el = s.el;
  s.clock.stop();
  const landed = /^(land|play)$/.test(el.dataset.phase), hidden = root.classList.contains('wl-hide');
  const P = { F: landed ? Math.min(tl.time(), 5.4) : tl.time() };
  const c = s.ctl = gsap.timeline({ paused: true, onUpdate: () => { if (!s.gone) { tl.time(P.F, true); I.paint(); F.draw(); } } });
  el.dataset.phase = hidden ? 'rise' : 'climb';
  // The bar (and the board's message) fade; then the bar is hidden, so the fall's own bar tween cannot bring it
  // back. The fall shows again. Standing on the core, the rabbit checks its watch and says its line.
  gsap.killTweensOf([s.fallLayer, s.bar, s.msg]);
  s.fallLayer.hidden = false;
  c.to([s.bar, s.msg], { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0)
    .set(s.bar, { visibility: 'hidden' }, 0.25)
    .fromTo(s.fallLayer, { opacity: landed ? 0 : +gsap.getProperty(s.fallLayer, 'opacity') }, { opacity: 1, duration: 0.25, ease: 'none' }, 0)
    .add(F.climb(P.F >= 4.45), 0);
  let at = 0, f = P.F;
  if (landed) {
    // The board sinks back into the core, and the ring that grew past it closes onto it.
    c.to(s.host, { opacity: 0, scale: 0.94, duration: 0.25, ease: 'power1.in' }, 0)
      .to(P, { F: Math.min(f, 4.9), duration: 0.25, ease: 'none' }, 0);
    at = 0.25;
    f = Math.min(f, 4.9);
  }
  // The game ends once the board has sunk (at once from the fall). Focus waits on the dialog.
  const leave = () => { endGame(s); s.game.abort(); el.focus({ preventScroll: true }); };
  if (landed) c.call(leave, null, at); else leave();
  if (!hidden) restore(s); // from the iris: the page was never hidden, so it is given back at once
  // The tunnel: up through the hoops, slow off the core and faster as it goes (F = 4.9 - 3.45 u², GSAP's power1.in).
  if (f > 1.45) {
    const d = landed ? 1.2 : (f - 1.45) / TUNNEL;
    c.to(P, { F: 1.45, duration: d, ease: landed || f > 4.2 ? 'power1.in' : 'none' }, at);
    at += d;
    f = 1.45;
  }
  // The mouth: the iris is on again, inside it black; it shrinks to the hole and glides back to where you went in.
  // At F 1.1 the page is put back behind it (turn()); from F 1.05 the page shows inside the mouth.
  if (f > 0.85) {
    const d = (f - 0.85) / MOUTH, black = f > 1.05;
    if (hidden) {
      c.call(() => { I.on = true; if (black) I.fill = 1; s.iris.style.visibility = 'visible'; I.paint(); }, null, at)
        .call(() => turn(s), null, at + Math.max(0, f - 1.1) / MOUTH);
    }
    c.to(P, { F: 0.85, duration: d, ease: 'none' }, at);
    at += d;
    f = 0.85;
  } else if (hidden) c.call(() => turn(s), null, at);
  // The iris opens on the page as it turns back into place (0.7 s, turn()), and the rim fades.
  const d = f / IRIS;
  s.turnAt = at;
  c.to(P, { F: 0, duration: d, ease: 'none' }, at)
    .to(I, { rim: 0, duration: Math.min(0.25, d), ease: 'none' }, at + d - Math.min(0.25, d))
    .call(() => finish(s), null, hidden ? at + Math.max(d, 0.7) : at + d);
  s.clock = drive(c);
};

// On the way up, a key or a tap while the page is still hidden skips to the end. The steps still run in order: the
// game ends, the page is put back (without the turn), and the overlay goes.
const skip = (s) => {
  if (s.skipping || !s.ctl || s.el.dataset.phase !== 'rise') return false;
  s.skipping = true;
  s.clock.seek(s.ctl.duration());
  return true;
};

// F 1.1 on the way up: the page is put back behind the closing mouth, turned -6 degrees, and turns back into place
// as the iris opens. A same-document view transition does the turning, so no element of the page is ever
// transformed (the nav, the hall, .totop and ScrollTrigger pins stay as they are): the page's new snapshot turns,
// while the overlay (its own group, 'wl') stays live above it. Without view transitions the page is just put back.
const turn = (s) => {
  s.el.dataset.phase = 'climb';
  // From F 1.1 down the fall has nothing left to draw (and a canvas inside a view transition can show a stale frame).
  s.fallLayer.hidden = true;
  if (s.skipping || !doc.startViewTransition || doc.hidden) { restore(s); return; }
  const named = [...doc.querySelectorAll('[style*="view-transition-name"]')].filter((e) => e !== s.el).map((e) => [e, e.style.viewTransitionName]);
  const done = () => {
    named.forEach(([e, v]) => { e.style.viewTransitionName = v; });
    s.el.style.viewTransitionName = '';
    root.classList.remove('wl-turn');
    s.vt = null;
  };
  named.forEach(([e]) => { e.style.viewTransitionName = 'none'; });
  s.el.style.viewTransitionName = 'wl';
  root.classList.add('wl-turn');
  try {
    const vt = s.vt = doc.startViewTransition(() => restore(s));
    vt.ready.then(() => {
      const o = `${s.origin.x}px ${s.origin.y}px`;
      root.animate([{ transform: 'rotate(-6deg)', transformOrigin: o }, { transform: 'none', transformOrigin: o }], {
        pseudoElement: '::view-transition-new(root)', duration: 700, delay: Math.max(0, (s.turnAt - s.clock.t) * 1000),
        easing: 'cubic-bezier(.33,0,.15,1)', fill: 'backwards',
      });
    }).catch(() => {});
    vt.finished.then(done, done);
  } catch (e) { done(); restore(s); }
};

// The page as it was: visible, scrollable, Lenis running, at the same place. Once.
const restore = (s) => {
  if (s.restored) return;
  s.restored = true;
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
  if (s.gone) return;
  if (s.vt) s.vt.skipTransition();
  restore(s);
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
  s.gone = true;
  if (back) back.focus({ preventScroll: true });
  if (s.clock) s.clock.stop();
  if (s.fall) s.fall.destroy();
  setTimeout(() => { if (s.ctl) s.ctl.kill(); if (s.tl) s.tl.kill(); });
  s.el.remove();
  s.own.abort();
  S = null;
  doc.dispatchEvent(new CustomEvent('knght:wonderland', { detail: { state: 'closed' } }));
  // The knght's move: the codex opens on the page, once the overlay has gone.
  if (s.then === 'codex') doc.dispatchEvent(new CustomEvent('knght:codex', { detail: { from: 'wonderland' } }));
};
