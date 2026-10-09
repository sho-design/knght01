/* The shared base under every ending: the wordmark rises letter by letter as it arrives (scrubbed by the scroll),
   and the steel sheen follows the light (public/assets/js/site.js and .has-hall .footer__word .sheen in site.css).
   A scene that sets takesOver: true switches both off for as long as it is mounted, and draws the letters itself.
   Under reduced motion there is no rise: CSS holds the letters at rest, which is the still state.

   apply() runs before every mount. It clears whatever transform the last scene left on the letters (even one made
   outside its GSAP context, which the context cannot revert), then rebuilds the rise at the scroll's current progress,
   so every scene starts from the same letters. */
const TRANSFORM = 'transform,translate,rotate,scale';

export function createBase({ gsap, stage, word, letters, reduce }) {
  let on = false, rise = null;

  const apply = (want) => {
    if (rise) {
      rise.revert(); // kills its ScrollTrigger and gives the letters back their own transform
      rise = null;
    }
    gsap.set(letters, { clearProps: TRANSFORM }); // and GSAP's record of it, so no scene's x, rotation or scale survives
    on = !!want;
    stage.classList.toggle('is-own', !on);
    if (!on || reduce) return;
    // Created after the page has settled, a scrubbed ScrollTrigger renders at the current scroll at once: no jump.
    rise = gsap.fromTo(letters, { yPercent: 18 }, {
      yPercent: 0, ease: 'power2.out', stagger: 0.12,
      scrollTrigger: { trigger: word, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 },
    });
  };

  return { apply, get on() { return on; } };
}
