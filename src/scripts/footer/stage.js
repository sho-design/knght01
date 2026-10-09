/* KNGHT footer stage: the homepage ends a different way on each visit.
   The host picks a scene (an "ending") from a shuffle bag, mounts it as the footer comes near, plays it on first view,
   pauses it out of view, and swaps it when the small knight in the footer line is pressed.
   Each scene is one module in ./scenes, loaded on demand (one chunk each). The contract is in SCENES.md.
   Loaded only on pages with [data-footer-stage] (src/components/Motion.astro), so inner pages never fetch it. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import SPRITE from '../../assets/knght-chess.svg?no-inline';
import { SCENES } from './scenes/index.js';
import { createBag } from './bag.js';
import { createBase } from './base.js';
import { KNIGHT_D, KNIGHT_EYE, KNIGHT_VIEWBOX, KNIGHT_SVG } from './knight.js';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin);

const NS = 'http://www.w3.org/2000/svg';
const PLUGINS = Object.freeze({ ScrollTrigger, SplitText, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin });
const KNIGHT = Object.freeze({ d: KNIGHT_D, eye: KNIGHT_EYE, viewBox: KNIGHT_VIEWBOX, svg: KNIGHT_SVG });
const LAYERS = ['over', 'under', 'back'];
// Inline styles on the letters that the base rise and the hall light own. A scene's clean-up never puts these back
// (the base resets the transforms itself before every mount, base.js).
const OWNED = new Set(['transform', 'translate', 'rotate', 'scale', '--gx', '--ga']);
const NONE = new Set();
const INTERACTIVE = 'a,button,input,select,textarea,label,summary,[tabindex]';
const VIEW = 0.35; // how much of the wordmark must show before a scene plays
const ENDLESS = 1e6; // seconds: a repeat: -1 animation reports a total duration far past this
const report = (what, e) => console.error(`KNGHT footer: ${what}`, e);

const el = document.querySelector('[data-footer-stage]');
if (el) start(el);

function start(stage) {
  const footer = stage.closest('footer') || stage.parentElement;
  const word = stage.querySelector('.footer__word');
  if (!word) return;
  const letters = [...word.children].filter((n) => n.tagName === 'SPAN');
  const button = footer.querySelector('[data-footer-swap]');
  const glyph = button && button.querySelector('svg');
  const live = footer.querySelector('[data-footer-live]');
  const ids = Object.keys(SCENES);
  if (!ids.length) return;

  const mq = (q) => matchMedia(q).matches;
  const flags = Object.freeze({
    reduce: mq('(prefers-reduced-motion: reduce)'),
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    coarse: mq('(pointer: coarse)'),
    fine: mq('(hover: hover) and (pointer: fine)'),
  });

  // ?ending=<id> forces a scene for QA and recordings, and leaves the bag alone.
  // Only the registry's own ids count ("constructor" or "__proto__" are not endings); case and spaces are forgiven.
  let forced = null;
  try { forced = new URLSearchParams(location.search).get('ending'); } catch (e) { forced = null; }
  if (forced != null) {
    const asked = forced.trim();
    forced = ids.find((id) => id.toLowerCase() === asked.toLowerCase()) || null;
    if (!forced && asked) console.warn(`KNGHT footer: there is no ending called "${asked}". The endings are: ${ids.join(', ')}.`);
  }
  const bag = createBag(ids, forced);
  const base = createBase({ gsap, stage, word, letters, reduce: flags.reduce });
  base.apply(true); // the shared rise is on from the start; each mount applies it again, on or off

  /* ---------- Loading: one chunk per scene, fetched once ---------- */
  const modules = new Map();
  const load = (id) => {
    if (!modules.has(id)) {
      modules.set(id, SCENES[id]().then((m) => m.default || m).catch((e) => { modules.delete(id); throw e; }));
    }
    return modules.get(id);
  };
  const fontsReady = () => (document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))])
    : Promise.resolve());

  /* ---------- Geometry, in stage coordinates (the stage is the wordmark's box) ---------- */
  const metrics = document.createElement('canvas').getContext('2d');
  // Each layer's box in stage coordinates: over and under are the stage, back is the whole footer.
  const boxOf = (where) => {
    if (where !== 'back') return { x: 0, y: 0, w: stage.clientWidth, h: stage.clientHeight };
    const s = stage.getBoundingClientRect(), f = footer.getBoundingClientRect();
    return { x: f.left + footer.clientLeft - s.left, y: f.top + footer.clientTop - s.top, w: footer.clientWidth, h: footer.clientHeight };
  };
  const measure = () => {
    const s = stage.getBoundingClientRect();
    const f = footer.getBoundingClientRect();
    const cs = getComputedStyle(word);
    const fontSize = parseFloat(cs.fontSize);
    metrics.font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
    const m = metrics.measureText('H');
    const ox = word.offsetLeft, oy = word.offsetTop;
    const first = letters[0];
    const lineH = first.offsetHeight;
    // The alphabetic baseline: the line box top, plus half the leading, plus the font's ascent.
    const baseline = oy + first.offsetTop + (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
    const capHeight = m.actualBoundingBoxAscent;
    const above = stage.previousElementSibling, below = stage.nextElementSibling;
    const baseTop = below ? below.getBoundingClientRect().top - s.top : s.height;
    return {
      width: stage.clientWidth,
      height: stage.clientHeight,
      fontSize,
      baseline,
      capHeight,
      capTop: baseline - capHeight,
      // Each letter at rest (layout only: the rise and any scene transforms are not included).
      letters: letters.map((n) => {
        const x = ox + n.offsetLeft, y = oy + n.offsetTop, w = n.offsetWidth, h = n.offsetHeight;
        return { el: n, ch: n.textContent, x, y, w, h, cx: x + w / 2 };
      }),
      footer: { x: f.left - s.left, y: f.top - s.top, width: f.width, height: f.height },
      back: boxOf('back'), // the backdrop layer's box: the footer inside its top rule
      // Keep drawings over the text between these two lines: the links and the email live above, the footer line below.
      linksBottom: above ? above.getBoundingClientRect().bottom - s.top : 0,
      baseTop,
      floor: baseTop - baseline, // the room under the letters, down to the footer line
    };
  };

  /* ---------- Clean-up bookkeeping for one mounted scene ---------- */
  const snapshot = (els) => new Map(els.map((n) => {
    const style = new Map();
    for (let i = 0; i < n.style.length; i++) {
      const p = n.style[i];
      style.set(p, [n.style.getPropertyValue(p), n.style.getPropertyPriority(p)]);
    }
    return [n, { cls: new Set(n.classList), style, hadStyle: n.hasAttribute('style') }];
  }));
  const restore = (marks) => marks.forEach((m, n) => {
    const owned = letters.includes(n) ? OWNED : NONE;
    [...n.classList].forEach((c) => { if (!m.cls.has(c)) n.classList.remove(c); });
    m.cls.forEach((c) => n.classList.add(c));
    for (let i = n.style.length - 1; i >= 0; i--) {
      const p = n.style[i];
      if (!owned.has(p) && !m.style.has(p)) n.style.removeProperty(p);
    }
    m.style.forEach(([v, pr], p) => {
      if (!owned.has(p) && (n.style.getPropertyValue(p) !== v || n.style.getPropertyPriority(p) !== pr)) n.style.setProperty(p, v, pr);
    });
    if (!m.hadStyle && !n.style.length) n.removeAttribute('style');
  });

  const createScope = (id) => {
    const scope = {
      id,
      g: gsap.context(() => {}),
      ac: new AbortController(),
      offs: new Set(), nodes: new Set(), ticks: new Set(), timers: new Set(), observers: new Set(),
      fits: new Set(), resizers: new Set(), gls: new Set(), layers: {},
      marks: snapshot([footer, stage, word, ...letters]),
      before: new Set(footer.querySelectorAll('*')),
    };
    scope.dispose = () => {
      scope.ac.abort();
      scope.offs.forEach((off) => off());
      scope.ticks.forEach((fn) => { gsap.ticker.remove(fn); liveTicks--; });
      scope.timers.forEach((t) => clearTimeout(t));
      scope.observers.forEach((o) => o.disconnect());
      // A WebGL context is let go at once, not when the canvas is collected: browsers allow only a few at a time.
      scope.gls.forEach((gl) => { try { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { /* gone already */ } });
      [scope.offs, scope.ticks, scope.timers, scope.observers, scope.fits, scope.resizers, scope.gls].forEach((s) => s.clear());
      try { scope.g.revert(); } catch (e) { report(`${id} did not revert cleanly`, e); }
      scope.nodes.forEach((n) => n.remove());
      scope.nodes.clear();
      // Anything else the scene left in the footer goes too, so ten swaps leave the page as they found it.
      let stray = 0;
      footer.querySelectorAll('*').forEach((n) => { if (!scope.before.has(n) && n.isConnected) { n.remove(); stray++; } });
      if (stray) console.warn(`KNGHT footer: the ${id} ending left ${stray} element(s) behind. The host removed them.`);
      restore(scope.marks);
    };
    return scope;
  };

  /* ---------- What a scene receives ---------- */
  const toStage = (cx, cy) => {
    const r = stage.getBoundingClientRect();
    return { x: cx - r.left, y: cy - r.top, inside: cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom };
  };
  const isInteractive = (t) => !!(t && t.closest && t.closest(INTERACTIVE));

  const makeCtx = (id, scope, reason) => {
    const on = (target, type, fn, opts) => {
      const o = typeof opts === 'boolean' ? { capture: opts } : { passive: true, ...(opts || {}) };
      target.addEventListener(type, fn, o);
      const off = () => { target.removeEventListener(type, fn, o); scope.offs.delete(off); };
      scope.offs.add(off);
      return off;
    };
    const many = (target, types, fn) => {
      const offs = types.map((t) => on(target, t, fn));
      return () => offs.forEach((off) => off());
    };
    const layer = (where) => {
      if (!LAYERS.includes(where)) throw new Error(`KNGHT footer: there is no layer called "${where}" (over, under, back).`);
      if (scope.layers[where]) return scope.layers[where];
      const n = document.createElement('div');
      n.className = `footer__layer footer__layer--${where}`;
      n.setAttribute('aria-hidden', 'true');
      if (where === 'under') stage.insertBefore(n, word);
      else if (where === 'back') footer.insertBefore(n, footer.firstChild);
      else stage.appendChild(n);
      scope.nodes.add(n);
      return (scope.layers[where] = n);
    };
    const make = (tag, { parent, attrs = {}, className, html, text } = {}) => {
      const into = parent || layer('over');
      const svgish = tag === 'svg' || (into instanceof SVGElement && tag !== 'foreignObject');
      const n = svgish ? document.createElementNS(NS, tag) : document.createElement(tag);
      if (className) n.setAttribute('class', className);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      if (html != null) n.innerHTML = html;
      if (text != null) n.textContent = text;
      into.appendChild(n);
      scope.nodes.add(n);
      return n;
    };
    const ctx = {
      id,
      reason, // 'load' on a page load, 'swap' when the knight brought it
      footer, stage, word, letters,
      get overlay() { return layer('over'); },   // above the letters, the stage's box
      get underlay() { return layer('under'); }, // behind the letters, the stage's box
      get backdrop() { return layer('back'); },  // behind everything in the footer, links included, the footer's box
      gsap,
      plugins: PLUGINS,
      knight: KNIGHT,
      sprite: SPRITE,
      flags,
      signal: scope.ac.signal, // aborted on destroy: addEventListener(type, fn, { signal: ctx.signal })
      measure,
      inView: () => seenNow,
      isLive: () => isLive(scope),

      // Nodes. Every one is removed on destroy. svg() and canvas() draw in stage coordinates on every layer.
      make,
      svg({ layer: where = 'over', className } = {}) {
        const n = make('svg', { parent: layer(where), className, attrs: { 'aria-hidden': 'true', focusable: 'false' } });
        const fit = () => {
          const b = boxOf(where);
          n.setAttribute('width', b.w); n.setAttribute('height', b.h); n.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
        };
        fit();
        scope.fits.add(fit);
        return n;
      },
      canvas({ layer: where = 'over', className, maxDpr = 2, context = '2d', options } = {}) {
        const n = make('canvas', { parent: layer(where), className });
        const c = context ? n.getContext(context, options) : null;
        const gl = !!c && /webgl/.test(context);
        if (gl) scope.gls.add(c);
        const out = { canvas: n, ctx: c, x: 0, y: 0, width: 0, height: 0, dpr: 1 };
        const fit = () => {
          const b = boxOf(where), d = Math.min(maxDpr, window.devicePixelRatio || 1);
          Object.assign(out, { x: b.x, y: b.y, width: b.w, height: b.h, dpr: d });
          n.width = Math.round(b.w * d); n.height = Math.round(b.h * d);
          n.style.width = `${b.w}px`; n.style.height = `${b.h}px`;
          // A 2D context draws in stage CSS pixels on any layer. WebGL sets its own viewport (ctx.onResize).
          if (c && !gl) c.setTransform(d, 0, 0, d, -b.x * d, -b.y * d);
        };
        fit();
        scope.fits.add(fit);
        return out;
      },
      // A piece from the KNGHT chess set: king, queen, rook, bishop, knight, pawn. Path data: ../pieces.js.
      piece(name, { parent, className } = {}) {
        const n = make('svg', { parent, className, attrs: { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' } });
        const u = document.createElementNS(NS, 'use');
        u.setAttribute('href', `${SPRITE}#knght-${name}`);
        n.appendChild(u);
        return n;
      },
      css(text) {
        const n = document.createElement('style');
        n.textContent = text;
        document.head.appendChild(n);
        scope.nodes.add(n);
        return n;
      },

      // Listeners. All passive unless asked otherwise, all removed on destroy.
      on,
      // Pointer in the footer (mouse, pen and touch): x and y in stage coordinates. Never act on a press
      // when interactive is true: that press belongs to a link or the knight.
      onPointer(fn, target = footer) {
        return many(target, ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave'], (e) => {
          fn({ type: e.type, ...toStage(e.clientX, e.clientY), pointerType: e.pointerType, interactive: isInteractive(e.target), event: e });
        });
      },
      // Touch in the footer: keeps reporting while the page scrolls under the finger, which pointer events do not.
      onTouch(fn, target = footer) {
        return many(target, ['touchstart', 'touchmove', 'touchend', 'touchcancel'], (e) => {
          const t = e.changedTouches[0];
          if (t) fn({ type: e.type, ...toStage(t.clientX, t.clientY), touches: e.touches.length, interactive: isInteractive(e.target), event: e });
        });
      },
      onResize(fn) {
        scope.resizers.add(fn);
        return () => scope.resizers.delete(fn);
      },
      observe(observer) { scope.observers.add(observer); return observer; },

      // Time. A tick runs only while the scene can be seen: the footer in view, not paused, never under reduced motion.
      tick(fn) {
        const w = (time, dt, frame) => { if (isLive(scope)) fn(time, dt, frame); };
        gsap.ticker.add(w);
        scope.ticks.add(w);
        liveTicks++;
        return () => { if (scope.ticks.delete(w)) { gsap.ticker.remove(w); liveTicks--; } };
      },
      later(fn, ms) {
        const t = setTimeout(() => { scope.timers.delete(t); fn(); }, ms);
        scope.timers.add(t);
        return t;
      },
      // Wrap a handler that makes tweens, so destroy can revert them too.
      add(fn) { return (...a) => scope.g.add(() => fn(...a)); },
    };
    return ctx;
  };

  /* ---------- Mounting and the play, pause, resume, still cycle ---------- */
  let current = null; // { id, scene, api, scope, ready, played, paused, seen, held }
  let seenNow = false; // the wordmark is in view
  let footerIn = true; // the footer is in view (until the observer says otherwise)
  let liveTicks = 0;
  const isLive = (scope) => !!current && current.scope === scope && current.ready && !current.paused && footerIn && !flags.reduce;

  // The scene's own animations still running: the top-level tweens and timelines its GSAP context recorded.
  const running = (scope) => {
    const out = [], seen = new Set([scope.g]);
    const walk = (list) => list.forEach((a) => {
      if (a instanceof gsap.core.Animation) {
        if (a.parent === gsap.globalTimeline && !a.paused() && a.totalProgress() < 1) out.push(a);
      } else if (a && Array.isArray(a.data) && !seen.has(a)) { seen.add(a); walk(a.data); } // a nested context
    });
    walk(scope.g.data);
    return out;
  };

  // QA only (a page opened with ?ending=<id>): a report to check that swaps leave nothing behind,
  // and the gsap instance, so a recorder can step time frame by frame.
  if (bag.forced) {
    window.KNGHT_FOOTER = Object.freeze({
      gsap,
      measure, // the geometry a scene gets, to read from the console while porting
      stats: () => ({
        ending: current && current.id,
        state: footer.dataset.endingState,
        base: base.on,
        live: !!current && isLive(current.scope),
        tweens: gsap.globalTimeline.getChildren(true, true, true).length,
        triggers: ScrollTrigger.getAll().length,
        ticks: liveTicks,
        scope: current && {
          listeners: current.scope.offs.size, nodes: current.scope.nodes.size,
          ticks: current.scope.ticks.size, timers: current.scope.timers.size, observers: current.scope.observers.size,
          running: running(current.scope).length, held: current.held ? current.held.length : 0,
        },
      }),
    });
  }

  const setState = (s) => { footer.dataset.endingState = s; };
  const call = (c, method) => {
    if (!c || !c.api || typeof c.api[method] !== 'function') return;
    try { c.scope.g.add(() => { c.api[method](); }); } catch (e) { report(`${c.id}.${method}() failed`, e); }
  };
  const markSeen = (c) => {
    if (c.seen) return;
    c.seen = true;
    bag.commit(c.id);
  };
  const play = (c = current) => {
    if (!c || !c.ready || c.played || flags.reduce) return;
    c.played = true;
    c.paused = false;
    call(c, 'play');
    setState('playing');
    markSeen(c);
  };
  // pause() is the scene's; the host then holds whatever of the scene was still running (a loop it forgot),
  // and lets exactly that go on resume. What the scene starts inside pause() (a fade out) is left to finish.
  const pause = (c = current) => {
    if (!c || !c.ready || !c.played || c.paused) return;
    c.paused = true;
    const was = running(c.scope);
    call(c, 'pause');
    c.held = was.filter((a) => a.parent && !a.paused()); // not one the scene killed or paused itself
    c.held.forEach((a) => a.pause());
    setState('paused');
  };
  const resume = (c = current) => {
    if (!c || !c.ready || !c.paused) return;
    c.paused = false;
    (c.held || []).forEach((a) => { if (a.parent && a.paused()) a.resume(); });
    c.held = null;
    call(c, 'resume');
    setState('playing');
  };
  // Reduced motion: still() draws the end. Anything of the scene's still moving then jumps to its end (or stops, if endless).
  const still = (c) => {
    call(c, 'still');
    running(c.scope).forEach((a) => (a.totalDuration() > ENDLESS ? a.pause() : a.totalProgress(1).pause()));
    setState('still');
  };

  const unmount = () => {
    const c = current;
    if (!c) return;
    current = null;
    // destroy runs outside the gsap context, so the context's revert cannot undo what destroy restores.
    try { if (c.api && typeof c.api.destroy === 'function') c.api.destroy(); } catch (e) { report(`${c.id}.destroy() failed`, e); }
    c.scope.dispose();
    delete footer.dataset.ending;
    delete footer.dataset.endingState;
  };

  const mount = async (id, reason) => {
    let scene;
    try { scene = await load(id); } catch (e) { report(`could not load the ${id} ending`, e); return false; }
    if (scene.id && scene.id !== id) console.warn(`KNGHT footer: the module registered as "${id}" calls itself "${scene.id}".`);
    unmount();
    base.apply(!scene.takesOver); // clean letters for every scene: the rise rebuilt, or off for a takeover
    footer.dataset.ending = id;
    const scope = createScope(id);
    // Not ready until mount has returned (or its promise has settled): until then play, pause and ticks wait.
    const c = { id, scene, api: null, scope, ready: false, played: false, paused: false, seen: false, held: null };
    current = c;
    try {
      let api = scope.g.add(() => scene.mount(makeCtx(id, scope, reason)));
      if (api && typeof api.then === 'function') api = await api;
      c.api = api || {};
    } catch (e) {
      report(`the ${id} ending failed to mount`, e);
      if (current === c) current = null;
      scope.dispose();
      delete footer.dataset.ending;
      base.apply(true); // fall back to the plain wordmark
      return false;
    }
    c.ready = true;
    setState('mounted');
    if (flags.reduce) {
      still(c);
      if (seenNow || reason === 'swap') markSeen(c);
    } else if (seenNow || reason === 'swap') {
      play(c);
      if (!footerIn) pause(c); // a swap from the keyboard after scrolling away: it waits for the reader
    }
    return true;
  };

  // One operation at a time: the first mount and the swaps queue behind each other.
  let chain = Promise.resolve();
  const enqueue = (task) => { chain = chain.then(task).catch((e) => report('a footer task failed', e)); return chain; };

  /* ---------- The knight in the footer line ---------- */
  let said = 0;
  const announce = async (id) => {
    if (!live) return;
    const scene = await load(id).catch(() => null);
    const name = (scene && scene.name) || id;
    live.textContent = '';
    // A beat later, so the same words are read again if they come round again.
    clearTimeout(said);
    said = setTimeout(() => { live.textContent = `${name}. Ending ${ids.indexOf(id) + 1} of ${ids.length}.`; }, 80);
  };
  const hop = () => {
    if (flags.reduce || !glyph) return;
    gsap.killTweensOf(glyph);
    // Two up, one across: a knight's move, then home.
    gsap.timeline()
      .to(glyph, { y: -6, duration: 0.12, ease: 'power2.out' })
      .to(glyph, { x: 3, duration: 0.1, ease: 'power1.out' })
      .to(glyph, { x: 0, y: 0, duration: 0.34, ease: 'power3.inOut' }, '+=0.05');
  };
  let swapQueued = false;
  const swap = () => {
    hop();
    if (swapQueued) return; // presses while one is waiting fold into it
    swapQueued = true;
    enqueue(async () => {
      swapQueued = false;
      const id = bag.next(current ? current.id : null);
      if (await mount(id, 'swap')) announce(id);
    });
  };
  if (button) {
    button.addEventListener('click', swap);
    // Fetch the next ending as soon as a press looks likely.
    const warm = () => { load(bag.peek(current ? current.id : null)).catch(() => {}); };
    ['pointerenter', 'focus', 'touchstart'].forEach((t) => button.addEventListener(t, warm, { passive: true }));
    button.classList.add('is-ready');
  }

  /* ---------- When: near, in view, out of view ---------- */
  const firstId = bag.first();
  load(firstId).catch(() => {}); // only the chosen scene is fetched
  const mountFirst = () => enqueue(async () => {
    if (current) return; // a press got there first
    await fontsReady();
    if (!current) await mount(firstId, 'load');
  });

  // One watcher for the geometry; scenes subscribe with ctx.onResize. It watches the letters too, because a webfont
  // that lands after the mount moves them while the stage keeps its size.
  const shape = () => [stage.clientWidth, stage.clientHeight, footer.clientWidth, footer.clientHeight,
    ...letters.map((n) => `${n.offsetLeft}:${n.offsetWidth}:${n.offsetHeight}`)].join(',');
  let raf = 0, lastShape = shape();
  const reshape = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const now = shape();
      if (now === lastShape) return;
      lastShape = now;
      const c = current;
      if (!c) return;
      c.scope.fits.forEach((fit) => fit());
      if (c.scope.resizers.size) {
        const geo = measure();
        c.scope.resizers.forEach((fn) => { try { fn(geo); } catch (e) { report(`${c.id} resize failed`, e); } });
      }
    });
  };
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(reshape);
    [stage, footer, ...letters].forEach((n) => ro.observe(n));
  } else {
    addEventListener('resize', reshape, { passive: true });
  }
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', reshape);

  if (!('IntersectionObserver' in window)) {
    mountFirst().then(() => { seenNow = true; if (current) (flags.reduce ? markSeen(current) : play()); });
    return;
  }
  // Mount when the footer is within one screen of the viewport.
  const nearIO = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { nearIO.disconnect(); mountFirst(); }
  }, { rootMargin: '0px 0px 100% 0px' });
  nearIO.observe(footer);
  // Play on first view: a third of the wordmark showing.
  new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1];
    seenNow = e.isIntersecting && e.intersectionRatio >= VIEW - 0.01; // ratios at a threshold can round just under it
    if (seenNow && current && current.ready) (flags.reduce ? markSeen(current) : play());
  }, { threshold: [0, VIEW] }).observe(stage);
  // Pause when the footer leaves the viewport, resume when it returns.
  new IntersectionObserver((entries) => {
    footerIn = entries[entries.length - 1].isIntersecting;
    if (!current || flags.reduce) return;
    if (footerIn) resume(); else pause();
  }).observe(footer);
}
