/* The reel: six scenes on one pinned stage, driven by scroll.
   1 a point of light becomes a world · 2 seven layers arrive · 3 they light in order
   4 the regulator's boundary closes around them · 5 two layers break and are rebuilt
   6 the world folds into the nine worlds KNGHT has built. */
export default function reel(gsap) {
  const sec = document.querySelector('.reel');
  if (!sec) return;
  const $ = (s, c = sec) => c.querySelector(s);
  const $$ = (s, c = sec) => [...c.querySelectorAll(s)];
  const mobile = matchMedia('(max-width: 900px)').matches;
  const caps = $$('.reel__cap'), counter = $('[data-reel-n]');
  const core = $('.reel__core'), pulse = $('.reel__pulse'), halo = $('.reel__halo');
  const layers = $$('.reel__layer');
  const rings = layers.map((l) => $('.reel__ring', l));
  const badges = layers.map((l) => $('.reel__badge', l));
  const orbits = layers.map((l) => $('.reel__orbit', l));
  const law = $('.reel__law'), path = $('[data-reel-path]');
  const world = $('.reel__world');
  const wls = $$('.reel__wl'), spokes = wls.map((w) => $('.reel__spoke', w)), wbs = wls.map((w) => $('.reel__wb', w));
  const C = (el) => 2 * Math.PI * +el.getAttribute('r');
  // SVG groups are drawn around their own 0,0, so they are turned and scaled through the transform attribute.
  const T = (el, s = 1, r = 0) => {
    const p = { s, r, el, apply() { el.setAttribute('transform', `rotate(${p.r.toFixed(2)}) scale(${p.s.toFixed(4)})`); } };
    p.apply();
    return p;
  };
  const up = (p) => () => p.apply();

  // The boundary names the visitor's regulator once they pick a category.
  const regOut = $('[data-reel-reg]');
  const setReg = () => {
    const src = document.querySelector('[data-cat-reg]');
    const t = src && document.documentElement.dataset.cat ? src.textContent.trim() : '';
    if (regOut) regOut.textContent = t || 'your regulator';
    const up = (t || 'your regulator').toUpperCase();
    if (path) path.textContent = `CHECKED AGAINST ${up} · EVERY WORD · EVERY SIGN · EVERY SYSTEM · `.repeat(2);
  };
  setReg();
  new MutationObserver(() => setTimeout(setReg, 30)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-cat'] });

  // Starting state: a single point of light.
  gsap.set(caps, { autoAlpha: 0, y: 30 });
  gsap.set(caps[0], { autoAlpha: 1, y: 0 });
  const coreT = T(core, 0.12), haloT = T(halo, 0.5), pulseT = T(pulse, 1), lawT = T(law, 0.9), worldT = T(world, 1);
  gsap.set(halo, { opacity: 0.25 });
  gsap.set(pulse, { opacity: 0 });
  rings.forEach((r) => gsap.set(r, { strokeDasharray: C(r), strokeDashoffset: C(r) }));
  // Each badge: its orbit turns it round the core; the badge turns back so it stays upright.
  const orbitT = orbits.map((o) => T(o, 1, 0));
  const badgeT = badges.map((b) => T(b, 0.4, 0));
  gsap.set(badges, { autoAlpha: 0 });
  gsap.set(law, { autoAlpha: 0 });
  gsap.set(wls, { autoAlpha: 0 });
  spokes.forEach((sp) => { const L = Math.hypot(+sp.getAttribute('x2'), +sp.getAttribute('y2')); gsap.set(sp, { strokeDasharray: L, strokeDashoffset: L }); });
  const wbT = wbs.map((b) => T(b, 0));
  const layerText = $$('.reel__layer text, .reel__name--core');

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: sec, start: 'top top', end: () => '+=' + Math.round(innerHeight * (mobile ? 5.4 : 6.4)),
      pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: () => {
        let best = 0, bi = 0;
        caps.forEach((c, i) => { const a = +gsap.getProperty(c, 'opacity'); if (a > best) { best = a; bi = i; } });
        if (counter) counter.textContent = String(bi + 1).padStart(2, '0');
      },
      onToggle: (st) => { spins.forEach((t) => t.paused(!st.isActive)); document.documentElement.classList.toggle('in-reel', st.isActive); },
    },
  });
  const capTo = (i, at) => {
    tl.to(caps[i - 1], { autoAlpha: 0, y: -30, duration: 0.28, ease: 'power2.in' }, at)
      .to(caps[i], { autoAlpha: 1, y: 0, duration: 0.34, ease: 'power2.out' }, at + 0.24);
  };

  // 1 · Every business is a world
  tl.to(coreT, { s: 1, duration: 1, ease: 'power2.out', onUpdate: up(coreT) }, 0)
    .to(haloT, { s: 1, duration: 1.1, ease: 'power2.out', onUpdate: up(haloT) }, 0)
    .to(halo, { opacity: 1, duration: 1.1 }, 0)
    .fromTo(pulseT, { s: 1 }, { s: 2.6, duration: 0.7, ease: 'power1.out', onUpdate: up(pulseT) }, 0.55)
    .fromTo(pulse, { opacity: 0.7 }, { opacity: 0, duration: 0.7 }, 0.55);

  // 2 · Seven layers arrive, one ring at a time
  capTo(1, 1.2);
  rings.forEach((r, i) => {
    const at = 1.5 + i * 0.42;
    tl.to(r, { strokeDashoffset: 0, duration: 0.5, ease: 'power1.inOut' }, at)
      .to(badges[i], { autoAlpha: 1, duration: 0.2 }, at + 0.22)
      .to(badgeT[i], { s: 1, duration: 0.3, ease: 'back.out(2)', onUpdate: up(badgeT[i]) }, at + 0.22);
  });

  // 3 · Built in order: light runs out from the core
  capTo(2, 4.3);
  tl.fromTo(pulseT, { s: 1 }, { s: 1.6, duration: 0.45, ease: 'power1.out', onUpdate: up(pulseT) }, 4.55)
    .fromTo(pulse, { opacity: 0.8 }, { opacity: 0, duration: 0.45 }, 4.55);
  rings.forEach((r, i) => {
    tl.to(r, { stroke: 'rgba(255,255,255,1)', duration: 0.14 }, 4.65 + i * 0.13)
      .to(r, { stroke: 'rgba(255,255,255,.3)', duration: 0.45 }, 4.79 + i * 0.13);
  });

  // 4 · All of it inside your rules
  capTo(3, 5.8);
  tl.to(law, { autoAlpha: 1, duration: 0.6 }, 6.0)
    .to(lawT, { s: 1, r: 24, duration: 1.4, ease: 'power1.out', onUpdate: up(lawT) }, 6.0)
    .fromTo(path, { attr: { startOffset: '0%' } }, { attr: { startOffset: '-18%' }, duration: 1.4 }, 6.0);

  // 5 · Most worlds are missing layers: two break, then the work rebuilds them
  capTo(4, 7.4);
  [2, 5].forEach((k, j) => {
    const r = rings[k];
    tl.to(r, { strokeDashoffset: C(r) * 0.64, opacity: 0.35, duration: 0.35, ease: 'power2.in' }, 7.6 + j * 0.12)
      .to(badges[k], { autoAlpha: 0.25, duration: 0.3 }, 7.6 + j * 0.12)
      .to(r, { strokeDashoffset: 0, opacity: 1, stroke: 'rgba(255,255,255,1)', duration: 0.5, ease: 'power2.out' }, 8.35 + j * 0.15)
      .to(badges[k], { autoAlpha: 1, duration: 0.3 }, 8.45 + j * 0.15)
      .to(r, { stroke: 'rgba(255,255,255,.3)', duration: 0.4 }, 8.9 + j * 0.15);
  });

  // 6 · The world folds into the nine worlds
  capTo(5, 9.3);
  tl.to(law, { autoAlpha: 0, duration: 0.4 }, 9.4)
    .to(layerText, { autoAlpha: 0, duration: 0.3 }, 9.4)
    .to(worldT, { s: 0.3, duration: 0.7, ease: 'power2.inOut', onUpdate: up(worldT) }, 9.45)
    .to(wls, { autoAlpha: 1, duration: 0.01 }, 9.95);
  spokes.forEach((s, i) => tl.to(s, { strokeDashoffset: 0, duration: 0.35, ease: 'power1.out' }, 10.0 + i * 0.05));
  wbT.forEach((b, i) => tl.to(b, { s: 1, duration: 0.3, ease: 'back.out(2.2)', onUpdate: up(b) }, 10.15 + i * 0.05));
  tl.to({}, { duration: 0.9 }, 10.9); // hold the last frame before the worlds arrive

  // The layers keep turning together, slowly, while the reel is on screen.
  const turn = { a: 0 };
  const spins = [gsap.to(turn, {
    a: 360, duration: 180, repeat: -1, ease: 'none', paused: true,
    onUpdate: () => {
      orbitT.forEach((o) => { o.r = turn.a; o.apply(); });
      badgeT.forEach((b) => { b.r = -turn.a; b.apply(); });
    },
  })];
}
