/* KNGHT motion: GSAP ScrollTrigger and SplitText run every scroll-linked animation.
   The page scripts check window.KNGHT_MOTION and step aside. If this file never loads,
   they run their own simpler versions, so nothing is left hidden. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import film from './film.js';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  window.KNGHT_MOTION = true;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const EASE = 'expo.out';
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  const init = () => {
    // Smooth scroll and ScrollTrigger read the same position.
    const lenis = window.KNGHT && window.KNGHT.lenis;
    if (lenis) lenis.on('scroll', ScrollTrigger.update);

    /* Headlines: words rise out of masked lines, in reading order. */
    $$('[data-split]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines,words', mask: 'lines', linesClass: 'sl', wordsClass: 'sw', ignore: '.sheen', autoSplit: true,
        onSplit(self) {
          gsap.set(el, { visibility: 'visible' });
          return gsap.from([...self.words, ...$$('.sheen', el)], {
            yPercent: 115, rotate: 3, duration: 1.2, ease: EASE, stagger: 0.06,
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          });
        },
      });
    });

    /* Blocks that rise into place, staggered when several arrive together. */
    const reveals = $$('[data-reveal]');
    gsap.set(reveals, { autoAlpha: 0, y: 40 });
    ScrollTrigger.batch(reveals, {
      start: 'top 92%', once: true,
      onEnter: (els) => gsap.to(els, {
        autoAlpha: 1, y: 0, duration: 1.2, ease: EASE, stagger: 0.1, overwrite: true,
        onComplete: () => els.forEach((e) => { e.classList.add('in'); gsap.set(e, { clearProps: 'opacity,visibility,transform' }); }),
      }),
    });

    /* Hero plate sinks as you leave (when the film is not being scrubbed). */
    const hero = $('.hero');
    if (hero && !root.classList.contains('hero-scrub')) {
      const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.4 } });
      const media = $('.hero__media', hero), inner = $('.hero__inner', hero);
      if (media) tl.to(media, { yPercent: 18, scale: 1.12, opacity: 0.15, ease: 'none' }, 0);
      if (inner) tl.to(inner, { y: () => -innerHeight * 0.08, ease: 'none' }, 0);
    }

    /* The film: what KNGHT does, before the worlds. It runs on its own clock. */
    try { film(gsap); } catch (e) { document.documentElement.classList.add('film-failed'); console.error('KNGHT film:', e); }

    /* Worlds: vertical scroll drives the gallery sideways, with a little inertia. */
    const worlds = $('.worlds'), track = $('.worlds__track');
    if (worlds && track) {
      const bar = $('.worlds__bar i'), countNow = $('.worlds__count b');
      const cards = $$('.world', track);
      const travel = () => {
        const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        return Math.max(0, track.scrollWidth - innerWidth + pad);
      };
      ScrollTrigger.matchMedia({
        '(min-width: 901px)': () => {
          gsap.timeline({
            scrollTrigger: {
              trigger: worlds, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true,
              onUpdate: (st) => {
                if (countNow && cards.length) countNow.textContent = ROMAN[Math.round(st.progress * (cards.length - 1))];
              },
            },
          })
            .to(track, { x: () => -travel(), ease: 'none' }, 0)
            .fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0);
        },
      });
    }

    /* The white pages (the offer and the self-check) open edge to edge. */
    $$('.engage, .score').forEach((sec) => {
      gsap.fromTo(sec,
        { '--clip-x': () => `${Math.min(innerWidth * 0.06, 90)}px`, '--clip-r': '36px' },
        { '--clip-x': '0px', '--clip-r': '0px', ease: 'power2.out',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 25%', scrub: 0.3, invalidateOnRefresh: true } });
    });

    /* Chapter openers: the numeral drifts against the scroll, the title steps in. */
    $$('.chap').forEach((band) => {
      const num = $('.chap__num', band), meta = $('.chap__meta', band);
      if (num) gsap.fromTo(num, { yPercent: 22 }, { yPercent: -22, ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: true } });
      if (meta) {
        const parts = [...meta.children];
        gsap.set(meta, { opacity: 1, transform: 'none' });
        gsap.from(parts, { autoAlpha: 0, y: 18, duration: 0.9, ease: EASE, stagger: 0.09, scrollTrigger: { trigger: band, start: 'top 75%', once: true } });
      }
      band.classList.add('is-in');
    });

    /* The offer ladder: three steps climb in order, the links draw, the price counts up. */
    const ladder = $('[data-ladder]');
    if (ladder) {
      const rungs = $$('.rung', ladder);
      gsap.set(rungs, { opacity: 0, y: 60, rotateX: -8, transformPerspective: 1400 });
      const n = $('[data-count]', ladder);
      ScrollTrigger.create({
        trigger: ladder, start: 'top 80%', once: true,
        onEnter: () => {
          ladder.classList.add('is-in');
          gsap.to(rungs, { opacity: 1, y: 0, rotateX: 0, duration: 1.1, ease: EASE, stagger: 0.16,
            onComplete: () => gsap.set(rungs, { clearProps: 'opacity,transform' }) });
          if (n) {
            const to = +n.dataset.count, obj = { v: 0 };
            gsap.to(obj, { v: to, duration: 1.6, ease: 'power3.out', delay: 0.3,
              onUpdate: () => { n.textContent = Math.round(obj.v).toLocaleString('en-CA'); } });
          }
        },
      });
    }

    /* The footer wordmark rises letter by letter. */
    const foot = $('.footer__word');
    if (foot) {
      gsap.fromTo($$('span', foot), { yPercent: 18 }, { yPercent: 0, ease: 'power2.out', stagger: 0.12,
        scrollTrigger: { trigger: foot, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } });
    }

    // Late layout changes (fonts, the hero pin, film posters) move every trigger.
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh());
    // Opening a drawer pushes everything below it down.
    document.addEventListener('toggle', () => ScrollTrigger.refresh(), true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
