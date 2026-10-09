/* Outline. A PLACEHOLDER, to be replaced by a designed ending.
   The letters draw in as hairline outlines, then fill. It exists to prove the host end to end: a layer over the
   wordmark, DrawSVG, a timeline that pauses and resumes, a still state, and a destroy that leaves nothing behind.
   It keeps the shared base: the outlines follow the letters as they rise, and the steel arrives with the fill. */
import { LETTERS } from '../letters.js';

export default {
  id: 'outline',
  name: 'Outline',
  takesOver: false,

  mount(ctx) {
    const { gsap, letters } = ctx;
    let geo = ctx.measure();

    // One hairline path per letter, laid over its span (the outlines are in 1/1000 em from the span's top-left).
    const svg = ctx.svg({ className: 'outline' });
    const marks = letters.map((el) => {
      const g = ctx.make('g', { parent: svg });
      const path = ctx.make('path', {
        parent: g,
        attrs: { d: LETTERS[el.textContent.trim()].d, fill: 'none', stroke: '#fff', 'stroke-linejoin': 'round' },
      });
      return { el, g, path };
    });
    const place = () => {
      const k = geo.fontSize / 1000;
      marks.forEach(({ el, g, path }, i) => {
        const at = geo.letters[i];
        // Follow the shared rise: the letter's own offset, in pixels.
        const lift = (+gsap.getProperty(el, 'y') || 0) + ((+gsap.getProperty(el, 'yPercent') || 0) / 100) * at.h;
        g.setAttribute('transform', `translate(${at.x.toFixed(2)} ${(at.y + lift).toFixed(2)}) scale(${k.toFixed(5)})`);
        path.setAttribute('stroke-width', (1 / k).toFixed(3)); // one screen pixel
      });
    };
    place();
    const offResize = ctx.onResize((next) => { geo = next; place(); });

    const paths = marks.map((m) => m.path);
    const tl = gsap.timeline({ paused: true })
      .fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut', stagger: 0.14 })
      .fromTo(letters, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out', stagger: 0.12 }, '-=0.7')
      .fromTo(svg, { opacity: 1 }, { opacity: 0, duration: 0.9, ease: 'power1.out' }, '-=0.6');
    // Keep the outlines on the letters while it plays (the rise may still be moving them).
    const offTick = ctx.tick(() => { if (tl.isActive()) place(); });

    return {
      play: () => tl.play(0),
      pause: () => tl.pause(),
      resume: () => tl.resume(),
      still: () => tl.progress(1).pause(), // the letters filled, the outlines gone
      destroy: () => {
        offTick();
        offResize();
        tl.revert(); // kills the timeline and gives the letters back their own opacity
        svg.remove();
      },
    };
  },
};
