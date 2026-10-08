/* The film: what KNGHT does, in six scenes. It runs on its own clock (not the scroll):
   it plays when it comes into view, pauses when it leaves, and can be paused, scrubbed by
   chapter, or watched again. Underneath, three scenes are black-and-white footage and three are drawn live (film-motion.js). */
import filmMotion, { PLAN } from './film-motion.js';
import { STRIKE, FORGE_RATE } from './film-scenes.js';
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
  const T = (el, s = 1, r = 0) => {
    const p = { s, r, apply() { el.setAttribute('transform', `rotate(${p.r.toFixed(2)}) scale(${p.s.toFixed(4)})`); } };
    p.apply();
    return p;
  };
  // The rings and spokes draw themselves by their shape (an arc that grows from three o'clock, a line that lengthens
  // from the core), not by stroke dashes. Their strokes keep one width on screen (vector-effect in site.css), and
  // Safari and Firefox then measure dashes in screen pixels where Chrome measures them in the drawing's units, which
  // left part of every ring missing. v is how much is drawn, 0 to 1.
  const arc = (el) => {
    const R = +el.dataset.r;
    const p = { v: 0, apply() {
      const v = Math.max(0, Math.min(1, p.v)), a = v * 2 * Math.PI;
      el.setAttribute('d', v >= 0.9999 ? `M ${R} 0 A ${R} ${R} 0 1 1 ${-R} 0 A ${R} ${R} 0 1 1 ${R} 0`
        : v <= 0 ? `M ${R} 0` : `M ${R} 0 A ${R} ${R} 0 ${v > 0.5 ? 1 : 0} 1 ${(R * Math.cos(a)).toFixed(2)} ${(R * Math.sin(a)).toFixed(2)}`);
    } };
    p.apply();
    return p;
  };
  const reach = (el) => {
    const X = +el.getAttribute('x2'), Y = +el.getAttribute('y2');
    const p = { v: 0, apply() { const v = Math.max(0, Math.min(1, p.v)); el.setAttribute('x2', (X * v).toFixed(2)); el.setAttribute('y2', (Y * v).toFixed(2)); } };
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

  const coreT = T(core, 0.001), haloT = T(halo, 0.4), pulseT = T(pulse, 1), lawT = T(law, 1), worldT = T(world, 1);
  const orbitT = orbits.map((o) => T(o, 1, 0));
  const badgeT = badges.map((b) => T(b, 0.4, 0));
  const ringT = rings.map((r) => T(r, 1));
  const ringD = rings.map(arc), spokeD = spokes.map(reach);
  // Seeking (chapter ticks, Watch again) moves these proxies without running their onUpdate, so re-apply them all.
  const applyAll = () => [coreT, haloT, pulseT, lawT, worldT, ...orbitT, ...badgeT, ...ringT, ...ringD, ...spokeD, ...wbT].forEach((p) => p.apply());
  const wbT = wbs.map((b) => T(b, 0));
  const layerText = $$('.reel__layer text, .reel__name--core');
  gsap.set([halo, pulse], { opacity: 0 });
  gsap.set([badges, law, wls], { autoAlpha: 0 });

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
    tl.to(ringD[i], { v: 1, duration: 1.1, ease: 'power2.inOut', onUpdate: up(ringD[i]) }, at)
      .to(badges[i], { autoAlpha: 1, duration: 0.3 }, at + 0.45)
      .to(badgeT[i], { s: 1, duration: 0.6, ease: 'back.out(2.2)', onUpdate: up(badgeT[i]) }, at + 0.45);
  });
  leave(1, 16.3);

  // 3 · Built in order: the strike lights each ring from the core outward
  enter(2, 17.1);
  // The hammer meets the metal 1.375s into the forge shot (its flash frame). The shot plays at FORGE_RATE from the
  // scene's start, so the strike is STRIKE into the scene; the drawn sound waves use the same moment.
  const HIT = START[2] + STRIKE;
  tl.fromTo(pulseT, { s: 1 }, { s: 1.8, duration: 0.9, ease: 'power1.out', onUpdate: up(pulseT) }, HIT)
    .fromTo(pulse, { opacity: 1 }, { opacity: 0, duration: 0.9 }, HIT)
    .to(worldT, { s: 1.06, duration: 6, ease: 'none', onUpdate: up(worldT) }, 17.1);
  rings.forEach((r, i) => {
    // Each ring swells a little as the sound of the strike passes through it (the waves are drawn in film-scenes.js).
    const at = HIT + 0.2 + i * 0.32;
    tl.to(ringT[i], { s: 1.035, duration: 0.24, ease: 'power2.out', onUpdate: up(ringT[i]) }, at)
      .to(ringT[i], { s: 1, duration: 0.9, ease: 'power2.inOut', onUpdate: up(ringT[i]) }, at + 0.24);
    tl.to(r, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 1.6, duration: 0.3, ease: 'power2.out' }, at)
      .to(r, { stroke: 'rgba(255,255,255,.32)', strokeWidth: 1.1, duration: 0.9 }, at + 0.22);
  });
  leave(2, 24.3);

  // 4 · All of it inside your rules: the boundary closes round the world
  enter(3, 25.1);
  tl.to(worldT, { s: 0.94, duration: 2, ease: 'power2.inOut', onUpdate: up(worldT) }, 25.3)
    .to(law, { autoAlpha: 1, duration: 1.2 }, 25.8)
    // The boundary arrives at its full size: the strike's last wave already drew it there (film-scenes.js).
    .to(lawT, { r: 30, duration: 7, ease: 'power1.out', onUpdate: up(lawT) }, 25.8)
    .fromTo(path, { attr: { startOffset: '0%' } }, { attr: { startOffset: '-24%' }, duration: 7.2 }, 25.8);
  leave(3, 32.3);

  // 5 · Most worlds are missing layers: two break, the Verdict, the Build and the Keep rebuild them
  enter(4, 33.1);
  const steps = $$('.film__steps li', scenes[4]);
  gsap.set(steps, { autoAlpha: 0, x: -16 });
  [2, 5].forEach((k, j) => {
    const r = rings[k], d = ringD[k];
    tl.to(d, { v: 0.36, duration: 0.6, ease: 'power2.in', onUpdate: up(d) }, 34.4 + j * 0.25)
      .to(r, { opacity: 0.3, duration: 0.6, ease: 'power2.in' }, 34.4 + j * 0.25)
      .to(badges[k], { autoAlpha: 0.2, duration: 0.5 }, 34.4 + j * 0.25)
      .to(d, { v: 1, duration: 1, ease: 'power2.out', onUpdate: up(d) }, 38.6 + j * 0.3)
      .to(r, { opacity: 1, stroke: 'rgba(255,255,255,1)', duration: 1, ease: 'power2.out' }, 38.6 + j * 0.3)
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
  spokeD.forEach((d, i) => tl.to(d, { v: 1, duration: 0.7, ease: 'power2.out', onUpdate: up(d) }, 43.6 + i * 0.16));
  // Each world appears as its spark reaches it (the sparks are drawn in film-scenes.js: they leave the core at
  // max(1.75, 1.5 + 0.16i) into the scene and take about 0.4s to arrive).
  wbT.forEach((b, i) => tl.to(b, { s: 1, duration: 0.6, ease: 'back.out(2.4)', onUpdate: up(b) }, START[5] + Math.max(1.75, 1.5 + i * 0.16) + 0.4));
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
  // Six-second shots, stretched over each scene: footage seconds per timeline second. Genesis, the forge and the
  // hall run a little slower so they are still moving while they fade into the next scene.
  const RATES = [0.55, 0.75, FORGE_RATE, 0.6, 0.75, 0.75];
  // Where each shot starts. Genesis is black for its first second, so the film opens on its spark already lit.
  const OFFSET = [1, 0, 0, 0, 0, 0];
  // Each scene plays at its own pace: the timeline is laid out in long scenes, then run faster where it can be.
  // About 42 seconds in all, with the hall the longest and the nine worlds given time to land.
  const SPEED = [1.3, 1.4, 1.3, 1.0, 1.35, 1.15];
  const motion = canvas && gfx ? filmMotion(canvas, gfx) : null, MIX = 1.2;
  let scene = -1, playing = false, visible = false, userPaused = false;
  const shot = (i) => plates.find((v) => +v.dataset.i === i);
  // Each shot is H.264 (plays almost everywhere), with a VP9 WebM beside it for browsers built without H.264.
  const probe = document.createElement('video');
  const pick = (src) => (!probe.canPlayType('video/mp4; codecs="avc1.640028"') && probe.canPlayType('video/webm; codecs="vp9"') ? src.replace(/\.mp4$/, '.webm') : src);
  const load = (i) => { const v = shot(i); if (v && !v.src && v.dataset.src) { v.src = pick(v.dataset.src); v.preload = 'auto'; } };
  // If a shot cannot load, say so (for us), and keep the film running on its graphics alone.
  plates.forEach((v) => {
    v.addEventListener('error', () => { console.warn(`KNGHT film: shot ${+v.dataset.i + 1} did not load`, v.currentSrc || v.dataset.src, v.error && v.error.code); sec.dataset.missing = ((sec.dataset.missing || '') + ' ' + (+v.dataset.i + 1)).trim(); });
    // What keepTime needs to be patient: whether the shot is stalled waiting for data, and how long its seeks take.
    v.addEventListener('waiting', () => { v._wait = true; });
    ['playing', 'canplay'].forEach((e) => v.addEventListener(e, () => { v._wait = false; }));
    v.addEventListener('seeking', () => { v._t0 = performance.now(); });
    v.addEventListener('seeked', () => { if (v._t0) v._lat = Math.min(2, (performance.now() - v._t0) / 1000); });
  });
  const sceneAt = (t) => { let i = 0; START.forEach((s, k) => { if (t >= s) i = k; }); return i; };
  const paint = () => {
    if (!motion) return;
    const t = tl.time(), i = sceneAt(t), local = t - START[i];
    if (i > 0 && local < MIX) motion.draw(i, local, i - 1, t - START[i - 1], local / MIX);
    else motion.draw(i, local);
  };
  // Some shots have a point that belongs under the diagram's core: the heart of the genesis cloud, the hammer's
  // impact in the forge. Shift and enlarge those shots so that point lands on the core, still covering the frame.
  const align = () => {
    if (!canvas || !gfx) return;
    const st = canvas.getBoundingClientRect(), g = gfx.getBoundingClientRect(), W = st.width, H = st.height;
    if (!W || !H) return;
    const tx0 = g.left - st.left + g.width / 2, ty0 = g.top - st.top + g.height / 2;
    plates.forEach((v) => {
      if (!v.dataset.anchor) return;
      // Anchor "x y max": the point, and the most the shot may be enlarged to reach the core. Past that it gets as
      // close as it can while still covering the frame (on phones the forge would otherwise lose its hammer).
      const [fx, fy, kmax = 1.5] = v.dataset.anchor.split(' ').map(Number), va = v.videoWidth ? v.videoWidth / v.videoHeight : 16 / 9;
      const dw = Math.max(W, H * va), dh = dw / va, ax = (W - dw) / 2 + fx * dw - W / 2, ay = (H - dh) / 2 + fy * dh - H / 2;
      let k = 1.04, x = 0, y = 0;
      for (let n = 0; n < 4; n++) { x = tx0 - W / 2 - k * ax; y = ty0 - H / 2 - k * ay; k = Math.min(kmax, Math.max(1.04, (W + 2 * Math.abs(x)) / dw + 0.01, (H + 2 * Math.abs(y)) / dh + 0.01)); }
      const mx = Math.max(0, (k * dw - W) / 2), my = Math.max(0, (k * dh - H) / 2);
      x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y));
      v._place = { x, y, k, cx: tx0 - W / 2, cy: ty0 - H / 2 };
      place(v, v._f || 1);
    });
  };
  // Draw a placed shot, contracted by f toward the diagram's core (1 = as placed).
  const place = (v, f) => {
    const p = v._place; if (!p) return; v._f = f;
    const X = p.cx * (1 - f) + f * p.x, Y = p.cy * (1 - f) + f * p.y;
    v.style.transform = `translate(${X.toFixed(1)}px, ${Y.toFixed(1)}px) scale(${(p.k * f).toFixed(3)})`;
  };
  // Genesis to the rings: the cloud doesn't just go dark, it condenses into the core over the rings' first seconds,
  // still moving, while it fades (its fade is slower too, see .film__plate[data-i="0"] in site.css). It slows as it
  // condenses, which also keeps the shot from running out before it has faded.
  const COLLAPSE = 2.6, inout3 = (v) => { v = Math.max(0, Math.min(1, v)); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
  const collapse = () => {
    const v = shot(0); if (!v || !v._place) return;
    const local = tl.time() - START[1], f = local <= 0 ? 1 : 1 - 0.82 * inout3(local / COLLAPSE);
    if (Math.abs(f - (v._f || 1)) > 0.0005) place(v, f);
    if (local > 0 && local < COLLAPSE + 1 && !v.paused) v.playbackRate = RATES[0] * SPEED[0] * (1 - 0.8 * inout3(local / 1.4));
  };
  plates.forEach((v) => v.addEventListener('loadedmetadata', align));
  if (canvas && 'ResizeObserver' in window) new ResizeObserver(() => { align(); paint(); }).observe(canvas);
  const syncPlate = (force) => {
    const t = tl.time(), i = sceneAt(t);
    if (i !== scene || force) {
      scene = i;
      tl.timeScale(SPEED[i]);
      load(i); for (let k = i + 1; k < START.length; k++) if (shot(k)) { load(k); break; }
      // An outgoing shot keeps playing while it fades (the hall fades slowly), then stops.
      plates.forEach((v) => {
        const on = +v.dataset.i === i; v.classList.toggle('is-on', on); clearTimeout(v._stop);
        if (!on && !v.paused) v._stop = setTimeout(() => { if (!v.classList.contains('is-on')) v.pause(); }, 3000);
      });
      const v = shot(i);
      if (v && v.src) {
        v.playbackRate = RATES[i] * SPEED[i];
        // Seek only when the shot is clearly somewhere else: after a pause the shot and the clock stopped together.
        const want = OFFSET[i] + Math.max(0, (t - START[i]) * RATES[i]);
        if (Math.abs(want - v.currentTime) > 0.1) { try { v.currentTime = want; } catch (e) {} }
        if (playing) v.play().catch(() => {});
      }
      ticks.forEach((b, k) => b.classList.toggle('is-on', k <= i));
    }
    paint();
  };
  // The bar in real seconds: each scene's share is its length at its own pace.
  const REAL = START.map((s, i) => ((START[i + 1] ?? END) - s) / SPEED[i]), TOTAL = REAL.reduce((a, b) => a + b, 0);
  const AT = REAL.map((_, i) => REAL.slice(0, i).reduce((a, b) => a + b, 0) / TOTAL);
  ticks.forEach((b, i) => b.style.setProperty('--p', AT[i].toFixed(4)));
  const realProgress = (t) => { const i = sceneAt(t); return AT[i] + (t - START[i]) / SPEED[i] / TOTAL; };
  // Keep the shot on the film's clock: a shot can start late (decoding) or drift, which would put moments like
  // the hammer strike out of step with the drawing. It is patient: nothing while the shot is stalled for data;
  // drift is eased out with the playback rate (up to 30% faster or slower); only a large drift is cut, at most
  // once every 1.5s, and the cut aims ahead by however long this shot's seeks have been taking.
  const keepTime = () => {
    const v = shot(scene);
    if (!v || !v.src || !playing || v.paused || v.seeking || v._wait || v.readyState < 3) return;
    const want = OFFSET[scene] + (tl.time() - START[scene]) * RATES[scene], drift = want - v.currentTime, base = RATES[scene] * SPEED[scene], now = performance.now();
    if (Math.abs(drift) > 0.6 && !(now - (v._cut || 0) < 1500)) {
      v._cut = now; v.playbackRate = base;
      try { v.currentTime = Math.min(v.duration || Infinity, want + (v._lat || 0.1) * base); } catch (e) {}
    } else v.playbackRate = base * (1 + Math.max(-0.3, Math.min(0.3, drift * 0.9)));
  };
  tl.eventCallback('onUpdate', () => {
    fill.style.transform = `scaleX(${Math.min(1, realProgress(tl.time())).toFixed(4)})`;
    syncPlate(false);
    keepTime();
    collapse();
  });
  tl.eventCallback('onComplete', () => { setPlaying(false); sec.classList.add('is-ended'); holdOn(); });
  // After the last scene the night keeps living while it is on screen: the stars drift and twinkle and the empty
  // seat keeps breathing. The last scene is simply drawn on past its end, at about 30 frames a second.
  let held = 0, last = 0, raf = 0;
  const hold = (now) => {
    raf = 0;
    if (!motion || !sec.classList.contains('is-ended') || !visible || document.hidden) return;
    const dt = last ? (now - last) / 1000 : 0;
    if (!last || dt > 0.03) { held += Math.min(0.1, dt); last = now; motion.draw(5, END - START[5] + held * SPEED[5]); }
    raf = requestAnimationFrame(hold);
  };
  const holdOn = () => { if (!raf) { last = 0; raf = requestAnimationFrame(hold); } };

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
    sec.classList.remove('is-ended'); held = 0;
    syncPlate(true);
    setPlaying(true);
  };

  playBtn.addEventListener('click', () => {
    if (tl.progress() >= 1) { replayFilm(); return; }
    userPaused = playing;
    if (playing) setPlaying(false); else start();
  });
  const replayFilm = () => { userPaused = false; tl.pause(0); applyAll(); scene = -1; syncPlate(true); start(); };
  replay.addEventListener('click', replayFilm);
  ticks.forEach((b, i) => b.addEventListener('click', () => {
    userPaused = false;
    sec.classList.remove('is-ended');
    tl.pause(START[i] + 0.01); applyAll(); scene = -1; syncPlate(true); start();
  }));

  // Play when it is on screen, pause when it is not.
  load(0); paint();
  new IntersectionObserver(([e]) => {
    visible = e.intersectionRatio >= 0.55;
    root.classList.toggle('in-reel', e.intersectionRatio > 0.3);
    if (visible && !userPaused && !playing) start();
    else if (!visible && playing) setPlaying(false);
    if (visible && sec.classList.contains('is-ended')) holdOn();
  }, { threshold: [0, 0.3, 0.55] }).observe(sec);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) setPlaying(false); else if (!document.hidden && visible && !userPaused) start();
    if (!document.hidden && visible && sec.classList.contains('is-ended')) holdOn();
  });
}
