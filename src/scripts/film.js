/* The film: what KNGHT does, in six scenes. It runs on its own clock (not the scroll):
   it plays when it comes into view, pauses when it leaves, and can be paused, scrubbed by
   chapter, or watched again. Underneath, three scenes are black-and-white footage and three are drawn live (film-motion.js). */
import filmMotion, { PLAN } from './film-motion.js';
export default function film(gsap) {
  const sec = document.querySelector('.film');
  if (!sec) return;
  const $ = (s, c = sec) => c.querySelector(s);
  const $$ = (s, c = sec) => [...c.querySelectorAll(s)];
  const root = document.documentElement;

  const START = [0, 8, 17, 25, 33, 42], END = 52;
  const canvas = $('.film__canvas'), gfx = $('.film__gfx'), plates = $$('.film__plate'), scenes = $$('.film__scene');
  const playBtn = $('[data-film-play]'), fill = $('[data-film-fill]'), ticks = $$('[data-film-tick]'), replay = $('[data-film-replay]');

  /* ---------- Graphics: the same world as the diagram, turned and scaled about its own centre ---------- */
  const core = $('.reel__core'), pulse = $('.reel__pulse'), halo = $('.reel__halo');
  const layers = $$('.reel__layer');
  const rings = layers.map((l) => $('.reel__ring', l));
  const badges = layers.map((l) => $('.reel__badge', l));
  const orbits = layers.map((l) => $('.reel__orbit', l));
  const law = $('.reel__law'), path = $('[data-reel-path]'), world = $('.reel__world');
  const wls = $$('.reel__wl'), spokes = wls.map((w) => $('.reel__spoke', w)), wbs = wls.map((w) => $('.reel__wb', w));
  const C = (el) => 2 * Math.PI * +el.getAttribute('r');
  const T = (el, s = 1, r = 0) => {
    const p = { s, r, apply() { el.setAttribute('transform', `rotate(${p.r.toFixed(2)}) scale(${p.s.toFixed(4)})`); } };
    p.apply();
    return p;
  };
  const up = (p) => () => p.apply();

  // The boundary names the visitor's regulator once they pick a category.
  const regOut = $('[data-reel-reg]');
  const setReg = () => {
    const src = document.querySelector('[data-cat-reg]');
    const t = src && root.dataset.cat ? src.textContent.trim() : '';
    if (regOut) regOut.textContent = t || 'your regulator';
    if (path) path.textContent = `CHECKED AGAINST ${(t || 'your regulator').toUpperCase()} · EVERY WORD · EVERY SIGN · EVERY SYSTEM · `.repeat(2);
  };
  setReg();
  new MutationObserver(() => setTimeout(setReg, 30)).observe(root, { attributes: true, attributeFilter: ['data-cat'] });

  const coreT = T(core, 0.001), haloT = T(halo, 0.4), pulseT = T(pulse, 1), lawT = T(law, 0.9), worldT = T(world, 1);
  const orbitT = orbits.map((o) => T(o, 1, 0));
  const badgeT = badges.map((b) => T(b, 0.4, 0));
  const wbT = wbs.map((b) => T(b, 0));
  const layerText = $$('.reel__layer text, .reel__name--core');
  gsap.set([halo, pulse], { opacity: 0 });
  rings.forEach((r) => gsap.set(r, { strokeDasharray: C(r), strokeDashoffset: C(r) }));
  gsap.set([badges, law, wls], { autoAlpha: 0 });
  spokes.forEach((sp) => { const L = Math.hypot(+sp.getAttribute('x2'), +sp.getAttribute('y2')); gsap.set(sp, { strokeDasharray: L, strokeDashoffset: L }); });

  /* ---------- Type: each line rises out of its own mask ---------- */
  gsap.set(scenes, { autoAlpha: 0 });
  const enter = (i, at) => {
    const sc = scenes[i];
    tl.set(sc, { autoAlpha: 1 }, at)
      .fromTo($$('.film__in', sc), { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12 }, at)
      .fromTo($$('.eyebrow, .film__p, .film__cta', sc), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.1 }, at + 0.45);
  };
  const leave = (i, at) => {
    tl.to(scenes[i], { autoAlpha: 0, y: -18, duration: 0.6, ease: 'power2.in' }, at)
      .set(scenes[i], { y: 0 }, at + 0.62);
  };

  const tl = gsap.timeline({ paused: true });

  // 1 · Every business is a world: the ember blooms, then the core appears where it was
  enter(0, 0.4);
  tl.to(halo, { opacity: 1, duration: 2 }, 4.2)
    .to(haloT, { s: 1, duration: 2.4, ease: 'power2.out', onUpdate: up(haloT) }, 4.2)
    .to(coreT, { s: 1, duration: 1.6, ease: 'expo.out', onUpdate: up(coreT) }, 4.8)
    .fromTo(pulseT, { s: 1 }, { s: 2.8, duration: 1.4, ease: 'power1.out', onUpdate: up(pulseT) }, 5.2)
    .fromTo(pulse, { opacity: 0.8 }, { opacity: 0, duration: 1.4 }, 5.2);
  leave(0, 7.3);

  // 2 · Seven layers, one ring at a time, in time with the ripples
  enter(1, 8.1);
  rings.forEach((r, i) => {
    const at = 9.0 + i * 1.0;
    tl.to(r, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, at)
      .to(badges[i], { autoAlpha: 1, duration: 0.3 }, at + 0.45)
      .to(badgeT[i], { s: 1, duration: 0.6, ease: 'back.out(2.2)', onUpdate: up(badgeT[i]) }, at + 0.45);
  });
  leave(1, 16.3);

  // 3 · Built in order: the strike lights each ring from the core outward
  enter(2, 17.1);
  tl.fromTo(pulseT, { s: 1 }, { s: 1.8, duration: 0.9, ease: 'power1.out', onUpdate: up(pulseT) }, 18.6)
    .fromTo(pulse, { opacity: 1 }, { opacity: 0, duration: 0.9 }, 18.6)
    .to(worldT, { s: 1.06, duration: 6, ease: 'none', onUpdate: up(worldT) }, 17.1);
  rings.forEach((r, i) => {
    tl.to(r, { stroke: 'rgba(255,255,255,1)', strokeWidth: 2.2, duration: 0.22 }, 18.8 + i * 0.32)
      .to(r, { stroke: 'rgba(255,255,255,.32)', strokeWidth: 1.1, duration: 0.9 }, 19.02 + i * 0.32);
  });
  leave(2, 24.3);

  // 4 · All of it inside your rules: the boundary closes round the world
  enter(3, 25.1);
  tl.to(worldT, { s: 0.94, duration: 2, ease: 'power2.inOut', onUpdate: up(worldT) }, 25.3)
    .to(law, { autoAlpha: 1, duration: 1.2 }, 25.8)
    .to(lawT, { s: 1, r: 30, duration: 7, ease: 'power1.out', onUpdate: up(lawT) }, 25.8)
    .fromTo(path, { attr: { startOffset: '0%' } }, { attr: { startOffset: '-24%' }, duration: 7.2 }, 25.8);
  leave(3, 32.3);

  // 5 · Most worlds are missing layers: two break, the Verdict, the Build and the Keep rebuild them
  enter(4, 33.1);
  const steps = $$('.film__steps li', scenes[4]);
  gsap.set(steps, { autoAlpha: 0, x: -16 });
  [2, 5].forEach((k, j) => {
    const r = rings[k];
    tl.to(r, { strokeDashoffset: C(r) * 0.64, opacity: 0.3, duration: 0.6, ease: 'power2.in' }, 34.4 + j * 0.25)
      .to(badges[k], { autoAlpha: 0.2, duration: 0.5 }, 34.4 + j * 0.25)
      .to(r, { strokeDashoffset: 0, opacity: 1, stroke: 'rgba(255,255,255,1)', duration: 1, ease: 'power2.out' }, 38.6 + j * 0.3)
      .to(badges[k], { autoAlpha: 1, duration: 0.5 }, 38.9 + j * 0.3)
      .to(r, { stroke: 'rgba(255,255,255,.32)', duration: 1 }, 39.8 + j * 0.3);
  });
  steps.forEach((s, i) => tl.to(s, { autoAlpha: 1, x: 0, duration: 0.7, ease: 'expo.out' }, 35.6 + i * 1.1));
  leave(4, 41.3);

  // 6 · Nine worlds: the world folds into the centre of a star
  enter(5, 42.1);
  tl.to(law, { autoAlpha: 0, duration: 0.8 }, 42.2)
    .to(layerText, { autoAlpha: 0, duration: 0.6 }, 42.2)
    .to(worldT, { s: 0.3, duration: 1.4, ease: 'power3.inOut', onUpdate: up(worldT) }, 42.4)
    .to(wls, { autoAlpha: 1, duration: 0.01 }, 43.5);
  spokes.forEach((sp, i) => tl.to(sp, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }, 43.6 + i * 0.16));
  wbT.forEach((b, i) => tl.to(b, { s: 1, duration: 0.6, ease: 'back.out(2.4)', onUpdate: up(b) }, 43.9 + i * 0.16));
  tl.to({}, { duration: 1 }, END - 1);

  // The layers keep turning together, slowly, while the film is on screen.
  const turn = { a: 0 };
  const spin = gsap.to(turn, {
    a: 360, duration: 240, repeat: -1, ease: 'none', paused: true,
    onUpdate: () => {
      orbitT.forEach((o) => { o.r = turn.a; o.apply(); });
      badgeT.forEach((b) => { b.r = -turn.a; b.apply(); });
    },
  });

  /* ---------- Footage and motion: one per scene, crossfaded, kept in step with the clock ---------- */
  const RATE = 0.75; // six-second shots, stretched over each scene
  const motion = canvas && gfx ? filmMotion(canvas, gfx) : null, MIX = 1.2;
  let scene = -1, playing = false, visible = false, userPaused = false;
  const shot = (i) => plates.find((v) => +v.dataset.i === i);
  const load = (i) => { const v = shot(i); if (v && !v.src && v.dataset.src) { v.src = v.dataset.src; v.preload = 'auto'; } };
  // If a shot cannot load, say so (for us), and keep the film running on its graphics alone.
  plates.forEach((v) => {
    v.addEventListener('error', () => { console.warn(`KNGHT film: shot ${+v.dataset.i + 1} did not load`, v.currentSrc || v.dataset.src, v.error && v.error.code); sec.dataset.missing = ((sec.dataset.missing || '') + ' ' + (+v.dataset.i + 1)).trim(); });
  });
  const sceneAt = (t) => { let i = 0; START.forEach((s, k) => { if (t >= s) i = k; }); return i; };
  const paint = () => {
    if (!motion) return;
    const t = tl.time(), i = sceneAt(t), local = t - START[i];
    if (i > 0 && local < MIX) motion.draw(i, local, i - 1, t - START[i - 1], local / MIX);
    else motion.draw(i, local);
  };
  if (canvas && 'ResizeObserver' in window) new ResizeObserver(paint).observe(canvas);
  const syncPlate = (force) => {
    const t = tl.time(), i = sceneAt(t);
    if (i !== scene || force) {
      scene = i;
      load(i); for (let k = i + 1; k < START.length; k++) if (shot(k)) { load(k); break; }
      plates.forEach((v) => { const on = +v.dataset.i === i; v.classList.toggle('is-on', on); if (!on && !v.paused) v.pause(); });
      const v = shot(i);
      if (v && v.src) {
        v.playbackRate = RATE;
        try { v.currentTime = Math.max(0, (t - START[i]) * RATE); } catch (e) {}
        if (playing) v.play().catch(() => {});
      }
      ticks.forEach((b, k) => b.classList.toggle('is-on', k <= i));
    }
    paint();
  };
  tl.eventCallback('onUpdate', () => {
    fill.style.transform = `scaleX(${(tl.time() / END).toFixed(4)})`;
    syncPlate(false);
  });
  tl.eventCallback('onComplete', () => { setPlaying(false); sec.classList.add('is-ended'); });

  const setPlaying = (on) => {
    playing = on;
    sec.classList.toggle('is-playing', on);
    playBtn.setAttribute('aria-label', on ? 'Pause the film' : 'Play the film');
    const v = shot(scene);
    if (on) { tl.play(); spin.play(); if (v && v.src) v.play().catch(() => {}); }
    else { tl.pause(); spin.pause(); plates.forEach((p) => p.pause()); }
  };
  const start = () => {
    if (tl.progress() >= 1) return;
    sec.classList.remove('is-ended');
    syncPlate(true);
    setPlaying(true);
  };

  playBtn.addEventListener('click', () => {
    if (tl.progress() >= 1) { replayFilm(); return; }
    userPaused = playing;
    if (playing) setPlaying(false); else start();
  });
  const replayFilm = () => { userPaused = false; tl.pause(0); scene = -1; syncPlate(true); start(); };
  replay.addEventListener('click', replayFilm);
  ticks.forEach((b, i) => b.addEventListener('click', () => {
    userPaused = false;
    sec.classList.remove('is-ended');
    tl.pause(START[i] + 0.01); scene = -1; syncPlate(true); start();
  }));

  // Play when it is on screen, pause when it is not.
  load(0); paint();
  new IntersectionObserver(([e]) => {
    visible = e.intersectionRatio >= 0.55;
    root.classList.toggle('in-reel', e.intersectionRatio > 0.3);
    if (visible && !userPaused && !playing) start();
    else if (!visible && playing) setPlaying(false);
  }, { threshold: [0, 0.3, 0.55] }).observe(sec);
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) setPlaying(false); else if (!document.hidden && visible && !userPaused) start(); });
}
