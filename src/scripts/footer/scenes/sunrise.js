/* Sunrise. The name's baseline is a horizon. Behind the G, in the valley between the G and the H, the knght is the
   sun: a dark head with a lit hairline edge, a soft glow round it and a lit eye. Its neck fades out under the jaw, and
   near the horizon it comes up out of a haze.

   As the footer settles at the end of the page it rises a little on its own, as at first light: the ear tips and the
   crown of the mane just over the letters, the eye low in the valley. It blinks once, slowly, and then it waits.
   Pull past the end of the page (the wheel or a trackpad on a desktop, a finger at the bottom of a phone) and it rises
   the rest of the way, the glow brightening, until its head stands clear over the name. Let go and it sets back to
   first light. Arriving at the end with speed gives it a small bounce, and so do End, Page Down, Space and the down
   arrow pressed at the end.

   The gap between the N and the G belongs to another ending: nothing here is drawn, lit or stood in it. Everything is
   drawn in one band that starts to the right of the G's leftmost ink and clips there, and every light has faded out
   before that edge. The horizon starts where the G's bowl meets the floor, not on the floor in front of the gap.
   The band runs from just under the links down to the horizon, behind the letters (the underlay).
   It keeps the shared base (the rise and the steel) and never touches the letters: the band follows their rise.

   Everything is drawn once, at mount and on a resize. The head is four layers (the glow, the dark, the lit edge, the
   eye), the sky and the horizon two more, and all that moves is their place and their light: transform and opacity,
   which the compositor does alone. Nothing is repainted while it rises or sets, so a phone that is busy with its own
   bounce never drops it, and nothing is written at all while nothing moves. The end of the page is read from the
   footer itself (Lenis and the wheel are left alone, and nothing is prevented), and the page's own bounce on a phone
   is left as it is.
   Reduced motion: the knght stands risen over the name, the glow up. Drawn once. Nothing listens. */

const EAR = 2.4;           // the ear tip, on the 24 grid: the knight's highest point
const EYE = { cx: 14.6, cy: 8.4 };
const LEFT = 4.7;          // the knight's leftmost point on the grid (the mane)
const RIGHT = 18.7;        // and its rightmost (the muzzle)
const NECK = [12.6, 18.6]; // on the grid: the neck is whole at the jaw and gone above the base
const GLOW = 20;           // room round the head for its glow, in px
const INTERACTIVE = 'a,button,input,select,textarea,label,summary,[tabindex]';
const LAYER = 'position:absolute;left:0;top:0;pointer-events:none;will-change:transform,opacity';
const WHITE = (a) => `rgba(255,255,255,${a})`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const px = (v) => `${v.toFixed(2)}px`;
let uid = 0;

export default {
  id: 'sunrise',
  name: 'Sunrise',
  takesOver: false,

  mount(ctx) {
    const { gsap, letters, word, footer, flags } = ctx;
    const NS = `sunrise-${++uid}`;
    let geo = ctx.measure();

    /* ---------- Nodes: one band behind the letters; each light in it its own layer ---------- */
    const HEAD = ctx.knight.d.slice(0, ctx.knight.d.indexOf('Z') + 1); // the head alone, no plinth
    const wrap = ctx.make('div', { parent: ctx.underlay, className: 'sunrise-band', attrs: { 'aria-hidden': 'true' } });
    const div = (className, parent = wrap) => ctx.make('div', { parent, className });
    const sky = div('sunrise-sky');         // the sky behind the head
    const horizon = div('sunrise-horizon'); // a hairline of light along the baseline
    const haze = div('sunrise-haze');       // near the horizon the head comes up out of a haze (a mask)
    const head = div('sunrise-head', haze); // the head: moved as one
    // The head's layers, each an svg drawn once in the knight's own units.
    const stops = (parent, list) => list.forEach(([o, a, c]) => ctx.make('stop', { parent, attrs: { offset: o, 'stop-color': c, 'stop-opacity': a } }));
    // The neck, in the knight's own units: whole at the jaw, gone above the base. A head, not a piece on a stand.
    const neck = (svg, id, color, a) => {
      const defs = ctx.make('defs', { parent: svg });
      const g = ctx.make('linearGradient', { parent: defs, attrs: { id: `${NS}-${id}`, gradientUnits: 'userSpaceOnUse', x1: 0, y1: NECK[0], x2: 0, y2: NECK[1] } });
      stops(g, [[0, a, color], [1, 0, color]]);
      return defs;
    };
    const part = (name) => ctx.make('svg', { parent: head, className: `sunrise-${name}`, attrs: { 'aria-hidden': 'true', focusable: 'false' } });
    const line = { fill: 'none', 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: HEAD };
    const glow = part('glow');
    const blurFe = ctx.make('feGaussianBlur', { parent: ctx.make('filter', { parent: neck(glow, 'glow', '#fff', 1), attrs: { id: `${NS}-blur`, x: '-25%', y: '-25%', width: '150%', height: '150%' } }) });
    const glowPath = ctx.make('path', { parent: glow, attrs: { ...line, stroke: `url(#${NS}-glow)`, filter: `url(#${NS}-blur)` } });
    const dark = part('dark');
    neck(dark, 'dark', '#050505', 0.94);
    ctx.make('path', { parent: dark, attrs: { d: HEAD, fill: `url(#${NS}-dark)` } });
    const rim = part('rim');
    neck(rim, 'rim', '#fff', 1);
    const rimPath = ctx.make('path', { parent: rim, attrs: { ...line, stroke: `url(#${NS}-rim)` } });
    const eye = div('sunrise-eye', head);
    const parts = [glow, dark, rim];

    /* ---------- Where: the valley between the G and the H, clear of the gap between the N and the G ---------- */
    // A letter's ink, row by row, read from the font on screen (Cormorant, or any fallback serif).
    const inkRows = (i) => {
      const L = geo.letters[i];
      const cs = getComputedStyle(letters[i]);
      const pad = Math.ceil(geo.fontSize * 0.2);
      const w = Math.ceil(L.w) + pad * 2, h = Math.ceil(geo.baseline - L.y) + 4;
      if (w < 4 || h < 4) return null;
      try {
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const c = cv.getContext('2d', { willReadFrequently: true });
        c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        c.fillText(L.ch, pad, geo.baseline - L.y);
        const data = c.getImageData(0, 0, w, h).data;
        const rows = [];
        for (let y = 0; y < h; y++) {
          let l = -1, r = -1;
          for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 90) { if (l < 0) l = x; r = x; }
          rows.push(l < 0 ? null : [L.x + l - pad, L.x + r + 1 - pad]);
        }
        return { y0: L.y, rows };
      } catch (e) {
        return null;
      }
    };
    // The ink's furthest left (side -1) or right (side 1) between two heights; NaN when there is none.
    const edge = (ink, y0, y1, side) => {
      let v = NaN;
      if (ink) ink.rows.forEach((r, n) => {
        const y = ink.y0 + n;
        if (!r || y < y0 || y > y1) return;
        const x = side < 0 ? r[0] : r[1];
        v = Number.isNaN(v) ? x : side < 0 ? Math.min(v, x) : Math.max(v, x);
      });
      return v;
    };

    // All in stage px. x0, y0: the band's corner. top: the ear tip, risen; hidden: set. u: px per grid unit.
    const at = { u: 1, X: 0, top: 0, hidden: 0, peek: 0.7, x0: 0, y0: 0, ry: 1 };
    const layout = () => {
      const { baseline, capTop, capHeight, linksBottom } = geo;
      const Lg = geo.letters[2], Lh = geo.letters[3];
      const gInk = inkRows(2), hInk = inkRows(3);
      const or = (v, d) => (Number.isFinite(v) ? v : d);
      // The G's leftmost ink is where the gap ends: the band starts just to the right of it.
      const gLeft = or(edge(gInk, capTop - 4, baseline + 4, -1), Lg.x + Lg.w * 0.07);
      // The valley at the top of the letters: the G's shoulder and terminal, the H's first serif.
      const gRight = or(edge(gInk, capTop, capTop + capHeight * 0.4, 1), Lg.x + Lg.w * 0.92);
      const hLeft = or(edge(hInk, capTop, capTop + capHeight * 0.4, -1), Lh.x + Lh.w * 0.04);
      const room = capTop - linksBottom;
      at.top = linksBottom + Math.max(10, room * 0.16);                // risen, the ear tip just under the links
      at.u = (capTop - room * 0.18 - at.top) / (EYE.cy - EAR);          // and the eye clear over the letters
      at.X = Math.max((gRight + hLeft) / 2 - EYE.cx * at.u, gLeft + 10 - LEFT * at.u); // the eye in the valley
      const u = at.u, eyeX = at.X + EYE.cx * u;
      at.hidden = baseline + 2;                                         // set: the ear tip just under the horizon
      // First light: the ear tips just over the letters.
      at.peek = (at.hidden - (capTop - clamp(room * 0.22, 10, 24))) / (at.hidden - at.top);
      // The sky behind the head: wide enough to read, faded out before the G's left edge.
      const skyX = at.X + 11.6 * u;
      const skyRx = Math.min(8.5 * u, skyX - gLeft - 6);
      at.ry = 9 * u;
      // The horizon: a hairline of light along the baseline, brightest under the eye. It starts where the G's bowl
      // meets the floor, so none of it lies on the floor in front of the gap between the N and the G.
      const gFoot = or(edge(gInk, baseline - 3, baseline, -1), Lg.x + Lg.w * 0.3);
      const reach = Math.max(8, eyeX - (Math.max(gLeft, gFoot) + 8));

      // The band: from just under the links to the horizon, from the G's leftmost ink to the last light on the right.
      const x0 = gLeft + 4, y0 = at.top - 6;
      const x1 = Math.min(geo.width, Math.max(at.X + RIGHT * u + 8, eyeX + reach, skyX + skyRx) + 2);
      const bw = Math.max(1, x1 - x0), bh = Math.max(1, baseline - y0);
      at.x0 = x0; at.y0 = y0;
      wrap.style.cssText = `position:absolute;left:${px(x0)};top:${px(y0)};width:${px(bw)};height:${px(bh)};overflow:hidden;pointer-events:none;will-change:transform`;
      // The sky: an ellipse of light, drawn at its tallest; it is squeezed to fit as the head comes up (draw).
      sky.style.cssText = `${LAYER};left:${px(skyX - skyRx - x0)};width:${px(skyRx * 2)};height:${px(at.ry * 2)};transform-origin:0 0;opacity:0;`
        + `background:radial-gradient(closest-side,${WHITE(1)} 0%,${WHITE(0.55)} 30%,${WHITE(0.18)} 60%,${WHITE(0)} 100%)`;
      horizon.style.cssText = `${LAYER};left:${px(eyeX - reach - x0)};top:${px(baseline - 1 - y0)};width:${px(reach * 2)};height:1px;opacity:0;`
        + `background:linear-gradient(to right,${WHITE(0)},${WHITE(1)},${WHITE(0)})`;
      // The haze, in band px: clear at the top of the band, whole down to the middle of the letters, gone at the horizon.
      const mask = `linear-gradient(to bottom,transparent 0px,#000 6px,#000 ${px(capTop + capHeight * 0.45 - y0)},transparent ${px(bh - 2)})`;
      haze.style.cssText = `position:absolute;left:0;top:0;width:${px(bw)};height:${px(bh)};pointer-events:none;will-change:transform;-webkit-mask-image:${mask};mask-image:${mask}`;
      // The head: its box in the knight's own units, with room for the glow; placed risen, moved down from there.
      const m = GLOW / u;
      const gx = LEFT - m, gy = EAR - m, gw = RIGHT - LEFT + 2 * m, gh = NECK[1] - EAR + 2 * m;
      head.style.cssText = `position:absolute;left:${px(at.X + gx * u - x0)};top:${px(at.top - m * u - y0)};width:${px(gw * u)};height:${px(gh * u)};pointer-events:none;will-change:transform`;
      parts.forEach((svg) => {
        svg.style.cssText = `${LAYER};display:block;opacity:0`;
        svg.setAttribute('width', (gw * u).toFixed(2));
        svg.setAttribute('height', (gh * u).toFixed(2));
        svg.setAttribute('viewBox', `${gx.toFixed(3)} ${gy.toFixed(3)} ${gw.toFixed(3)} ${gh.toFixed(3)}`);
      });
      dark.style.opacity = '1';
      const sw = u > 9 ? 1.2 : 1;
      rimPath.setAttribute('stroke-width', sw);
      glowPath.setAttribute('stroke-width', sw * 4);
      blurFe.setAttribute('stdDeviation', ((u > 9 ? 5 : 3) / u).toFixed(3)); // a few px at any size
      const r = Math.max(0.42 * u, 1.6);
      eye.style.cssText = `${LAYER};left:${px((EYE.cx - gx) * u - r)};top:${px((EYE.cy - gy) * u - r)};width:${px(r * 2)};height:${px(r * 2)};`
        + `border-radius:50%;background:${WHITE(1)};transform-origin:50% 50%;opacity:0`;
      seen.clear(); // every place and light is written again on the next draw
    };

    /* ---------- How far it has risen: written only when that changes ---------- */
    // rest: first light (0 to 1 of the peek); pull: past the end; bump: a bounce; lid: the eye (1 open)
    const S = { rest: 0, pull: 0, bump: 0, lid: 1 };
    const level = () => {
      const r = S.rest * at.peek;
      return clamp(r + (1 - r) * Math.max(S.pull, S.bump), 0, 1);
    };
    const seen = new Map();
    // One style property, written only when its value changed.
    const put = (el, prop, v) => {
      let s = seen.get(el);
      if (!s) seen.set(el, (s = {}));
      if (s[prop] !== v) { s[prop] = v; el.style[prop] = v; }
    };
    let lift = 0, drawn = '', dirty = true;
    const mark = () => { dirty = true; };
    // The letters' shared rise, as the band follows it: the mean of the G's and the H's.
    const liftOf = () => {
      let s = 0;
      [2, 3].forEach((i) => { s += ((+gsap.getProperty(letters[i], 'yPercent') || 0) / 100) * geo.letters[i].h; });
      return s / 2;
    };
    const draw = () => {
      dirty = false;
      put(wrap, 'transform', `translate3d(0,${px(lift)},0)`);
      const lv = level();
      const key = `${lv.toFixed(4)}:${S.lid.toFixed(3)}`;
      if (key === drawn) return;
      drawn = key;
      wrap.setAttribute('data-rise', lv.toFixed(3)); // for QA: 0 set, the peek at first light, 1 risen
      const ear = lerp(at.hidden, at.top, lv);
      put(head, 'transform', `translate3d(0,${px(ear - at.top)},0)`);
      // The light comes up with it. Dawn: the first light, as far as the peek. Sun: the rest of the way up.
      const dawn = clamp(lv / at.peek, 0, 1);
      const sun = clamp((lv - at.peek) / (1 - at.peek), 0, 1);
      // The sky stays inside the band: its top never above the band's, so it is never cut by a straight edge.
      const cy = ear + 6 * at.u;
      const ry = clamp(cy - at.top + 6, 1, at.ry);
      put(sky, 'transform', `translate3d(0,${px(cy - ry - at.y0)},0) scale(1,${(ry / at.ry).toFixed(4)})`);
      put(sky, 'opacity', (0.05 * dawn + 0.13 * sun).toFixed(4));
      put(horizon, 'opacity', (0.3 * dawn + 0.35 * sun).toFixed(3));
      put(glow, 'opacity', (0.08 + 0.17 * dawn + 0.3 * sun).toFixed(3));
      put(rim, 'opacity', (0.45 + 0.15 * dawn + 0.35 * sun).toFixed(3));
      put(eye, 'opacity', (0.8 + 0.2 * sun).toFixed(3));
      put(eye, 'transform', S.lid < 1 ? `scale(1,${S.lid.toFixed(3)})` : 'none');
    };

    layout();
    draw();

    /* ---------- The end of the page ---------- */
    // The end is where the footer's own bottom meets the bottom of the screen (or the page will not scroll further).
    // Not the page's height: the hall can sometimes leave room below the footer, and that is not the end.
    const atEnd = () => {
      const se = document.scrollingElement || document.documentElement;
      return footer.getBoundingClientRect().bottom <= innerHeight + 2 || scrollY >= se.scrollHeight - innerHeight - 2;
    };
    const wordIn = () => word.getBoundingClientRect().bottom <= innerHeight + 1;
    const now = () => gsap.globalTimeline.time(); // GSAP's clock, so a recording that steps time steps this too

    let playing = false, paused = false, end = false, whole = false, stillSince = 0;
    let setting = null, bounce = null, dawn = null;
    const T = { pull: 0, src: null, px: 0, wheelAt: 0, anchor: 0, moved: false }; // the pull asked for, and by what
    let following = false;
    const PW = 170;                                       // the wheel: pixels past the end for 63% of the rise
    const PT = () => clamp(innerHeight * 0.16, 100, 160); // a finger: the same, in pixels it travels past the end
    const pxOf = (r, P) => -P * Math.log(1 - Math.min(0.995, r)); // from a rise back to the pull that makes it
    // A tween made while the scene is paused waits for resume().
    const held = (tw) => { if (paused) tw.pause(); return tw; };
    const pullTo = (r) => {
      if (setting) { setting.kill(); setting = null; }
      following = true;
      T.pull = clamp(r, 0, 1);
      mark();
    };
    const letGo = ctx.add((d) => {
      following = false;
      T.src = null;
      if (setting) setting.kill();
      setting = held(gsap.to(S, { pull: 0, duration: d, ease: 'power2.inOut', onUpdate: mark, onComplete: () => { setting = null; } }));
    });
    const bump = ctx.add((amount) => {
      if (S.pull >= amount || T.src) return;
      if (bounce) bounce.kill();
      bounce = held(gsap.timeline({ onComplete: () => { bounce = null; } })
        .to(S, { bump: amount, duration: 0.55, ease: 'power2.out', onUpdate: mark })
        .to(S, { bump: 0, duration: 1.8, ease: 'power2.inOut', onUpdate: mark }, '>0.12'));
    });
    // First light, once the footer has settled with the whole name in view. One slow blink, and then it waits.
    const firstLight = ctx.add((delay) => {
      if (dawn) return;
      dawn = held(gsap.timeline({ delay })
        .to(S, { rest: 1, duration: 2.6, ease: 'sine.inOut', onUpdate: mark })
        .to(S, { lid: 0.06, duration: 0.32, ease: 'power2.in', onUpdate: mark }, '+=0.8')
        .to(S, { lid: 1, duration: 0.5, ease: 'power2.out', onUpdate: mark }, '>0.12'));
    });
    const look = () => { end = atEnd(); whole = wordIn(); };

    const offs = [];
    if (!flags.reduce) {
      let last = now();
      offs.push(ctx.tick(() => {
        const t = now(), dt = Math.max(0, t - last);
        last = t;
        const l = liftOf();
        if (Math.abs(l - lift) > 0.01) { lift = l; mark(); }
        if (playing && !dawn && whole && t - stillSince > 0.3) firstLight(0);
        if (T.src === 'wheel' && t - T.wheelAt > 0.2) letGo(1.9); // the wheel stopped: let go
        // Following a pull: quick, but never a jump.
        if (following && S.pull !== T.pull) {
          const k = 1 - Math.exp(-dt / (T.src === 'wheel' ? 0.16 : 0.06));
          S.pull += (T.pull - S.pull) * k;
          if (Math.abs(T.pull - S.pull) < 1e-4) S.pull = T.pull;
          mark();
        }
        if (dirty) draw();
      }));

      // Scrolling: where the page is, and how fast it arrives at the end. Fast enough, and it bounces.
      let lastY = scrollY, lastT = now(), v = 0;
      offs.push(ctx.on(window, 'scroll', () => {
        const t = now(), dt = t - lastT;
        if (dt > 0) v = v * 0.4 + ((scrollY - lastY) / dt) * 0.6;
        lastY = scrollY; lastT = t; stillSince = t;
        const was = end;
        look();
        if (playing && end && !was && v > 900) {
          bump(clamp(v / 4000, 0.35, 0.7));
          firstLight(0.5);
        }
      }));

      // The wheel or a trackpad past the end. Lenis owns the wheel; this only listens.
      offs.push(ctx.on(window, 'wheel', (e) => {
        if (!playing || e.ctrlKey || e.deltaY <= 0) return;
        look();
        if (!end) return;
        const d = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
        if (T.src !== 'wheel') { T.src = 'wheel'; T.px = pxOf(S.pull, PW); }
        T.px += Math.min(120, d) * 0.55;
        T.wheelAt = now();
        pullTo(1 - Math.exp(-T.px / PW));
      }));

      // A finger past the end: from where the page stops, every pixel the finger keeps going up.
      const start = (y) => { T.src = 'touch'; T.moved = false; T.anchor = y + pxOf(S.pull, PT()); };
      offs.push(
        ctx.on(window, 'touchstart', (e) => {
          if (!playing || e.touches.length !== 1) { if (T.src === 'touch') letGo(1.8); return; }
          look();
          if (end) start(e.touches[0].clientY);
        }),
        ctx.on(window, 'touchmove', (e) => {
          if (!playing || e.touches.length !== 1) return;
          const y = e.touches[0].clientY;
          if (T.src !== 'touch') { look(); if (!end) return; start(y); }
          T.moved = true;
          pullTo(1 - Math.exp(-Math.max(0, T.anchor - y) / PT()));
        }),
        // Lifted: it sets. (A tap that did not pull leaves whatever was already happening alone.)
        ctx.on(window, 'touchend', (e) => { if (T.src === 'touch' && !e.touches.length) { if (T.moved) letGo(1.8); else T.src = null; } }),
        ctx.on(window, 'touchcancel', () => { if (T.src === 'touch') letGo(1.8); }),
      );

      // The keys that go further down, pressed at the end.
      offs.push(ctx.on(window, 'keydown', (e) => {
        if (!playing || e.altKey || e.ctrlKey || e.metaKey) return;
        if (!['End', 'PageDown', 'ArrowDown', ' '].includes(e.key)) return;
        const t = e.target;
        if (t && t !== document.body && t.closest && (t.closest(INTERACTIVE) || t.isContentEditable)) return;
        look();
        if (end) { bump(0.8); firstLight(0); }
      }));
    }

    const offResize = ctx.onResize((next) => {
      geo = next;
      layout();
      look();
      drawn = '';
      draw();
    });

    const tweens = () => [setting, bounce, dawn].filter(Boolean);
    return {
      play: () => {
        playing = true;
        look();
        stillSince = now();
        if (ctx.reason === 'swap') firstLight(0.4);
      },
      pause: () => { paused = true; tweens().forEach((t) => t.pause()); },
      resume: () => {
        paused = false;
        tweens().forEach((t) => { if (t.progress() < 1) t.resume(); });
        stillSince = now();
      },
      still: () => {
        // Risen, the head clear over the name, the glow up. Ticks never run here, so draw it once.
        S.rest = 1; S.pull = 1; S.bump = 0; S.lid = 1;
        drawn = '';
        draw();
      },
      destroy: () => {
        offResize();
        offs.forEach((off) => off());
        tweens().forEach((t) => t.kill());
        gsap.killTweensOf(S);
        wrap.remove();
      },
    };
  },
};
