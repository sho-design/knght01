/* Hero mock-up, ?hero=chips: the italic turn follows the category.
   The headline keeps its one italic phrase. Choosing a chip swaps only that phrase, in the
   "get the ___ wrong." shape: the old phrase leaves upward and the new one rises in on the
   headline's own curve. With no chip it reads "get it wrong." as today. Reduced motion swaps
   it instantly. Screen readers hear the new headline once, from a hidden polite copy.
   Runs only when the head script has set data-hero="chips" (src/pages/index.astro). */

// One phrase per category, each from the rule the site reads that category against
// (src/data/categories.json, src/content/for, src/content/rules).
const TURNS = {
  '': 'get it wrong.',
  clinic: 'get the claim wrong.', // CPSO: advertising must be factual and verifiable
  dental: 'get the title wrong.', // RCDSO: say general practitioner or registered specialist
  medspa: 'get the post wrong.', // Health Canada: no prescription drug promoted by brand name
  law: 'get the word wrong.', // Law Society: specialist is a title you earn, not a word you choose
  spirits: 'get the ad wrong.', // AGCO advertising standards and the CRTC alcohol code
  food: 'get the label wrong.', // CFIA labelling and allergen rules
};

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const title = root.dataset.hero === 'chips' ? document.querySelector('.hero__title') : null;
const em = title && title.querySelector('em');

// The category the page opens on, read the way features.js reads it (?for=, then the last visit),
// because this runs before features.js does. If features.js settles on another, the headline swaps.
const firstCat = () => {
  if (root.hasAttribute('data-cat')) return root.dataset.cat;
  let c = new URLSearchParams(location.search).get('for');
  if (!c) { try { c = localStorage.getItem('knght-cat'); } catch (e) {} }
  if (c === 'coffee') c = 'food';
  return c && Object.hasOwn(TURNS, c) ? c : '';
};

const start = () => {
  const line = em.parentNode; // the last line: "to <em>get it wrong.</em>"
  const said = title.textContent.replace(/\s+/g, ' ').trim();
  const stem = said.slice(0, said.lastIndexOf(em.textContent.trim())); // "We build brand worlds ... afford to "

  // <em class="hero__turn"><span class="sr-only">phrase</span><span class="hero__turn-w sheen" aria-hidden="true">phrase</span></em>
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  const phrase = (text) => {
    const w = document.createElement('span');
    w.className = 'hero__turn-w sheen';
    w.setAttribute('aria-hidden', 'true');
    w.textContent = text;
    return w;
  };
  // The full new headline, said once the choice settles (quick clicks through the chips say only
  // the last one). It is emptied a while later, so reading on past the heading does not meet the
  // same sentence twice.
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  title.after(live);
  let hush = 0;
  const say = (text) => {
    clearTimeout(hush);
    hush = setTimeout(() => {
      live.textContent = text;
      hush = setTimeout(() => { live.textContent = ''; }, 7000);
    }, 300);
  };

  // The headline's own rise (--ease-out), out of and into the line's mask. The new phrase lands in about
  // 0.4s so it settles beside "to" crisply; the old one accelerates away just before it.
  const RISE = 'cubic-bezier(.16,1,.3,1)';
  const LEAVE = 'cubic-bezier(.5,0,.75,0)';
  // The phrase travels the whole mask, 105% of the .9em line plus the .24em pad: 1.185em, so it is hidden at either end.
  // (The lines' own intro is shorter: they paint at once and settle .08em, site.css.)
  const BELOW = 'translateY(1.185em)';
  const ABOVE = 'translateY(-1.185em)';
  const OUT_MS = 380, IN_AT = 220, IN_MS = 1000;
  const motion = new WeakMap(); // each phrase's own rise, kept apart from its CSS sheen

  let cur = null;
  const show = (cat, animate) => {
    const text = TURNS[cat] || TURNS[''];
    sr.textContent = text;
    if (cur && cur.textContent === text) return;
    const next = phrase(text);
    if (!cur || !animate || reduce) {
      if (cur) cur.remove();
      em.append(next);
      cur = next;
      return;
    }
    const old = cur;
    const rise = motion.get(old);
    if (rise && rise.currentTime < IN_AT) {
      rise.cancel(); old.remove(); // replaced before it ever showed: nothing to leave
    } else {
      // Leave from wherever it is now, even mid-rise.
      if (rise) { try { rise.commitStyles(); } catch (e) {} rise.cancel(); }
      const out = old.animate([{ transform: old.style.transform || 'none' }, { transform: ABOVE }], { duration: OUT_MS, easing: LEAVE, fill: 'forwards' });
      out.onfinish = () => old.remove();
    }
    em.append(next);
    motion.set(next, next.animate([{ transform: BELOW }, { transform: 'none' }], { duration: IN_MS, delay: IN_AT, easing: RISE, fill: 'backwards' }));
    cur = next;
  };

  // Keep the last line on one line: if the longest phrase cannot fit (very narrow phones),
  // the headline steps down just enough. Screens 360px wide and up never need it.
  const fit = () => {
    title.style.fontSize = '';
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;pointer-events:none';
    line.append(probe);
    let widest = 0;
    for (const t of Object.values(TURNS)) {
      probe.replaceChildren(line.firstChild.textContent, Object.assign(document.createElement('em'), { textContent: t }));
      widest = Math.max(widest, probe.getBoundingClientRect().width);
    }
    probe.remove();
    const size = parseFloat(getComputedStyle(title).fontSize);
    const room = line.clientWidth - size * 0.1; // the italic's overhang (the sheen's .06em padding) stays inside the mask
    if (widest > room) title.style.fontSize = `${Math.floor(size * (room / widest) * 2) / 2}px`;
  };

  em.className = 'hero__turn';
  em.replaceChildren(sr);
  let last = firstCat();
  show(last, false);
  root.classList.add('hero-turn'); // the last line may rise now (index.astro holds it until then)
  // Measure once the headline's face is in: a fallback font is wider and would shrink it for nothing.
  const faces = document.fonts ? Promise.all(['400', 'italic 400'].map((f) => document.fonts.load(`${f} 16px "Cormorant Garamond"`))) : Promise.resolve();
  faces.then(fit, fit);
  let raf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });

  // features.js owns the chips and sets data-cat on <html>; the headline follows it.
  new MutationObserver(() => {
    const cat = root.dataset.cat || '';
    if (cat === last) return;
    last = cat;
    show(cat, true);
    say(stem + (TURNS[cat] || TURNS['']));
  }).observe(root, { attributes: true, attributeFilter: ['data-cat'] });
};

// A module runs once the page is parsed. This one is placed before the other page scripts
// (src/pages/index.astro), so the opening phrase is in place before the headline rises.
if (em) start();
