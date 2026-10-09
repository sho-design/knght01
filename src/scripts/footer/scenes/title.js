/* Title sequence. The end title of the page: played once as the footer arrives, then held.
   The little hairline knght comes up through the footer line near its far end and crosses it in four knight's
   moves, each one placed like a piece on a board: lift, carry, set down. A beat of light follows it across the
   steel of the name, a step behind, and dies away as it arrives: the name settles. It stops on the line one
   knight's move from the knght in the footer line (the swap button: one square across, two up), facing it,
   and after a beat it blinks once, slowly. Then nothing moves.

   It keeps the shared base (the rise and the steel). The light is the letters' own steel: one more gradient layer
   on each letter, so it is clipped by the real glyphs, rides the rise and changes no box. The walker is drawn on the
   backdrop, behind every word, and clipped at the line, so it rises out of the line and only ever stands on it.
   It never lands or rests in the gap between N and G (that gap belongs to another ending), and the light lives only
   in the letters, so the gap is never lit. No words. Reduced motion: the knght standing on the line beside the
   swap button, facing it, eye open. */

const ID = 'title';
const AXIS = 11.9, EAR = 2.4, FOOT = 21.5, HALF = 7.3; // the B knight on its 24 grid: plinth centre, top, lowest line, half its width
const TILT = (100 * Math.PI) / 180; // the steel's angle: linear-gradient(100deg, ...) in site.css
const MOVES = 4;
// The beat of light along each letter's steel line, from its front (the way the knght walks) to its tail:
// [offset in --bu, grey, share of the beat's strength]. Polished metal under a passing light: a dark lead, a hot
// narrow core, a soft wake behind it, and the steel a shade darker again past the wake.
const BEAT = [[-230, 0, 0], [-80, 0, 0.36], [-30, 0, 0.1], [-16, 255, 0.4], [0, 255, 1], [16, 255, 0.7], [64, 255, 0.22], [130, 0, 0.12], [260, 0, 0]];
const STEEL = 'linear-gradient(100deg,#9c9c9c 0%,#dcdcdc calc(var(--gx) - 22%),#fff var(--gx),#dcdcdc calc(var(--gx) + 22%),#8f8f8f 100%)';
const INK = '#e6e6e6'; // a shade brighter than the swap knight (--ash-2), so the one that moved reads as the one that moved

export default {
  id: ID,
  name: 'Title sequence',
  takesOver: false,

  mount(ctx) {
    const { gsap, stage, letters, footer } = ctx;
    const base = footer.querySelector('.footer__base');
    const swap = footer.querySelector('[data-footer-swap]');

    // The steel of .has-hall .footer__word .sheen (site.css), with the beat as one more layer over it. The beat is a
    // whole gradient written per letter while it shines (--title-beat), and nothing (none) the rest of the time.
    ctx.css(`.has-hall .footer[data-ending="${ID}"] .footer__word .sheen{background-image:var(--title-beat,none),${STEEL}}`);

    /* ---------- The walker, on the backdrop, clipped at the line ---------- */
    const uid = `title-${Math.random().toString(36).slice(2, 8)}`;
    const svg = ctx.svg({ layer: 'back', className: 'title-knght' });
    const defs = ctx.make('defs', { parent: svg });
    const clip = ctx.make('clipPath', { parent: defs, attrs: { id: `${uid}-above` } });
    const clipRect = ctx.make('rect', { parent: clip, attrs: { x: 0, y: 0, width: 0, height: 0 } });
    const field = ctx.make('g', { parent: svg, attrs: { 'clip-path': `url(#${uid}-above)` } });
    const piece = ctx.make('g', { parent: field, attrs: { opacity: 0 } });
    const body = ctx.make('path', {
      parent: piece,
      attrs: { d: ctx.knight.d, fill: 'none', stroke: INK, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    });
    const E = ctx.knight.eye;
    const eye = ctx.make('circle', { parent: piece, attrs: { cx: E.cx, cy: E.cy, r: E.r, fill: INK } });

    /* ---------- Geometry, in stage coordinates ---------- */
    let G = null;
    const layout = () => {
      const geo = ctx.measure();
      const s = stage.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const b = base && base.getBoundingClientRect();
      // The line is the base's top border: its top edge, snapped to the device pixel the browser paints it on.
      const ruleTop = b && b.width ? Math.round(b.top * dpr) / dpr - s.top : geo.baseTop;
      const x1 = b && b.width ? b.right - s.left : geo.width;
      const phone = geo.fontSize < 160;
      const box = phone ? 20 : 24; // the knght's 24 grid, in px: the swap knight's own size on a phone, a little more on a desk
      const k = box / 24;
      const sw = phone ? 1 : 1.1;
      const foot = ruleTop - (phone ? 1.5 : 2) - sw / 2; // where the plinth's lower line stands: just above the line
      const tall = (FOOT - EAR) * k;
      // The swap knight, as drawn: its svg's size, centred in the 44 px button (read from the button, which holds
      // still: the svg itself hops when pressed, and a swap mounts this scene mid-hop).
      const btn = swap && swap.getBoundingClientRect();
      const gEl = swap && swap.querySelector('svg');
      const gw = (gEl && gEl.getBoundingClientRect().width) || 20;
      const bx = btn && btn.width ? (btn.left + btn.right) / 2 - s.left : gw / 2, by = btn && btn.width ? (btn.top + btn.bottom) / 2 - s.top : ruleTop + 34;
      const glyph = { l: bx - gw / 2, r: bx + gw / 2, t: by - gw / 2, b: by + gw / 2 };
      // It stops one knight's move from the swap knight: two squares up (from the swap knight's middle to its own),
      // one square across. Its plinth always keeps clear of the swap knight's column.
      const square = Math.max(box * 0.75, ((glyph.t + glyph.b) / 2 - (foot - tall / 2)) / 2);
      const end = Math.max((glyph.l + glyph.r) / 2 + square, glyph.r + 4 + HALF * k);
      // It comes from the far end of the line (clear of the back-to-top button that sits over it).
      const start = Math.max(end + 4 * box, x1 - (phone ? 64 : 100));
      const xs = Array.from({ length: MOVES + 1 }, (_, i) => start + ((end - start) * i) / MOVES);
      // No move lands in the gap between N and G: a landing that would is set down just past it, on the near side.
      const N = geo.letters[1], Gl = geo.letters[2];
      const keep = HALF * k + 3, gapL = N.x + N.w - keep, gapR = Gl.x + keep;
      for (let i = 1; i < MOVES; i++) {
        if (xs[i] > gapL && xs[i] < gapR) xs[i] = xs[i] - gapL < gapR - xs[i] ? gapL : gapR;
      }
      const carry = (start - end) / MOVES;
      // As high as a quarter of the carry, and always clear of the letters' feet (on a phone, with 26 px under the
      // name, that is a low skim of about 6 px).
      const lift = Math.max(phone ? 5 : 16, Math.min(carry * 0.26, foot - tall - (geo.baseline + 2)));
      G = {
        geo, phone, k, sw, glyph, xs, foot, tall, lift, ruleTop, square,
        across: 0.4 * Math.min(1.25, Math.sqrt(Math.max(1, carry / 133))), // a longer line (a wide screen): a little longer carry
        hide: -(tall + sw + 3) / lift, // standing under the line, out of sight, in lifts
        bu: Math.min(1, geo.fontSize / 345), // the beat's unit on the steel: 1 px on a desk, scaled with the name below that
        lines: geo.letters.map((L) => ({ cx: L.x + L.w / 2, half: (Math.abs(L.w * Math.sin(TILT)) + Math.abs(L.h * Math.cos(TILT))) / 2 })),
      };
      body.setAttribute('stroke-width', sw);
      // The eye: the swap knight's own, fuller (2 px across), so one blink can be seen at this size.
      eye.setAttribute('r', Math.max(E.r, 1 / k).toFixed(3));
      // Everything above the line, the whole footer wide.
      const back = geo.back;
      clipRect.setAttribute('x', back.x - 20);
      clipRect.setAttribute('y', back.y);
      clipRect.setAttribute('width', back.w + 40);
      clipRect.setAttribute('height', Math.max(0, ruleTop - back.y));
    };

    /* ---------- What the timeline moves, and how it is drawn ---------- */
    // p: where along the moves (0 at the start, MOVES beside the swap knight); h: height in lifts (0 standing on the
    // line, below 0 under it); lean in degrees; lid 1 open; lp, la: the light's place (in moves) and its strength.
    const S = { p: 0, h: -99, lean: 0, lid: 1, lp: -1, la: 0 }; // h: -99 is out of sight under the line on every screen
    const at = (p) => {
      const i = Math.max(0, Math.min(MOVES - 1, Math.floor(p)));
      return G.xs[i] + (G.xs[i + 1] - G.xs[i]) * (p - i);
    };
    let dead = false, lastLight = '';
    const dark = () => letters.forEach((el) => el.style.removeProperty('--title-beat'));
    const paint = () => {
      if (dead || !G) return;
      const x = at(S.p), y = G.foot - Math.max(S.h, G.hide) * G.lift;
      piece.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${S.lean.toFixed(2)}) scale(${(-G.k).toFixed(4)} ${G.k.toFixed(4)}) translate(${-AXIS} ${-FOOT})`);
      piece.setAttribute('opacity', S.h <= G.hide + 0.001 ? 0 : 1);
      eye.setAttribute('transform', `translate(0 ${E.cy}) scale(1 ${Math.max(0.06, S.lid).toFixed(3)}) translate(0 ${-E.cy})`);
      // The light: each letter is told where the beat is along its own gradient line, and how strong it is.
      const a = Math.max(0, Math.min(1, S.la));
      const X = at(S.lp);
      const key = a < 0.004 ? 'off' : `${X.toFixed(1)}|${a.toFixed(3)}`;
      if (key === lastLight) return;
      lastLight = key;
      if (key === 'off') { dark(); return; }
      letters.forEach((el, i) => {
        const L = G.lines[i];
        const bx = L.half + (X - L.cx) * Math.sin(TILT);
        const stops = BEAT.map(([o, g, s]) => `rgba(${g},${g},${g},${(a * s).toFixed(3)}) ${(bx + o * G.bu).toFixed(1)}px`);
        el.style.setProperty('--title-beat', `linear-gradient(100deg,${stops.join(',')})`);
      });
    };

    /* ---------- The sequence ---------- */
    let tl = null;
    const build = () => {
      const t = gsap.timeline({ paused: true, onUpdate: paint, onComplete: () => { svg.dataset.state = 'done'; } });
      const dip = -0.8 / G.lift; // the set down presses a hair into the line, and lets go
      // One move: lift, carry two squares' worth along the line, set down. The legs overlap, so the corners are round.
      const move = (i, at0, { up = 0.15, across = 0.4, down = 0.16, from = 0, upEase = 'power2.out', downEase = 'power2.in', settle = 0.12 } = {}) => {
        const c0 = at0 + up * 0.4;
        const d0 = c0 + across - down * 0.7;
        t.fromTo(S, { h: from }, { h: 1, duration: up, ease: upEase, immediateRender: false }, at0)
          .to(S, { p: i + 1, duration: across, ease: 'power2.inOut' }, c0)
          .to(S, { lean: -4.5, duration: across * 0.55, ease: 'sine.out' }, c0)
          .to(S, { lean: 0, duration: across * 0.45 + down * 0.7, ease: 'sine.inOut' }, c0 + across * 0.55)
          .to(S, { h: dip, duration: down, ease: downEase }, d0)
          .to(S, { h: 0, duration: settle, ease: 'power1.out' }, d0 + down);
        return d0 + down + settle;
      };
      const lead = ctx.reason === 'swap' ? 0.3 : 0.15; // a breath before the first move
      // 1. Up through the line, near its far end: the entrance is the first move's lift.
      const A = G.across;
      let done = move(0, lead, { from: G.hide, up: 0.5, across: A, down: 0.17, upEase: 'power3.out' });
      // 2, 3. The walk: an even step, a beat on the line between moves.
      done = move(1, done + 0.08, { across: A });
      done = move(2, done + 0.08, { across: A });
      // 4. The last move, a little slower, set down softly one knight's move from the swap knight.
      const last = done + 0.1;
      done = move(3, last, { up: 0.16, across: A * 1.1, down: 0.26, downEase: 'power2.inOut', settle: 0.18 });
      // The beat of light: a step behind the knght the whole way, and gone as it arrives.
      const l0 = lead + 0.25;
      t.fromTo(S, { lp: -0.6 }, { lp: MOVES - 0.1, duration: done - l0, ease: 'sine.inOut', immediateRender: false }, l0)
        .fromTo(S, { la: 0 }, { la: 1, duration: 0.6, ease: 'power1.out', immediateRender: false }, l0)
        .to(S, { la: 0, duration: 1, ease: 'power2.inOut' }, last + 0.2);
      // A beat, then one slow blink, facing the swap knight. Then nothing moves.
      const blink = done + 0.4;
      t.to(S, { lid: 0.06, duration: 0.34, ease: 'power2.in' }, blink)
        .to(S, { lid: 1, duration: 0.5, ease: 'power2.out' }, blink + 0.34 + 0.12);
      return t;
    };

    layout();
    tl = build();
    paint();
    svg.dataset.state = 'waiting';

    // It starts once the line it walks on is in view and the page has come to rest (play comes earlier, when a third
    // of the name shows): a title plays on a still frame. A reader who keeps scrolling gets it after 1.2 s in view.
    let started = false, offGate = null, lastTop = null, restSince = 0, seenSince = -1, lastAsk = -1;
    const ready = () => {
      const time = gsap.globalTimeline.time();
      if (time - lastAsk > 0.25) { lastTop = null; seenSince = -1; } // back after a while out of view: look again
      lastAsk = time;
      const top = stage.getBoundingClientRect().top;
      if (top + G.ruleTop + 6 > window.innerHeight) { lastTop = null; seenSince = -1; return false; }
      if (seenSince < 0) seenSince = time;
      if (lastTop == null || Math.abs(top - lastTop) > 0.5) { lastTop = top; restSince = time; }
      return time - restSince >= 0.2 || time - seenSince >= 1.2;
    };
    const go = () => {
      if (started) return;
      started = true;
      if (offGate) { offGate(); offGate = null; }
      svg.dataset.state = 'playing';
      tl.play(0);
    };

    const offResize = ctx.onResize(() => {
      // The geometry changes under a timeline that only moves numbers: rebuild it at the same time, and draw again.
      const time = tl.time(), wasPlaying = started && !tl.paused() && tl.progress() < 1, finished = tl.progress() === 1;
      layout();
      tl.kill();
      tl = ctx.add(build)();
      if (finished) tl.progress(1).pause();
      else if (started) { tl.time(time); if (wasPlaying) tl.play(); else tl.pause(); }
      lastLight = '';
      paint();
    });

    return {
      play() {
        ready();
        offGate = ctx.tick(() => { if (ready()) go(); });
      },
      pause() { if (started) tl.pause(); },
      resume() { if (started && tl.progress() < 1) tl.resume(); },
      still() {
        // The end title, held: the knght on the line beside the swap knight, facing it, its eye open. No light.
        started = true;
        tl.progress(1).pause();
        svg.dataset.state = 'done';
        lastLight = '';
        paint();
      },
      destroy() {
        dead = true;
        if (offGate) offGate();
        offResize();
        tl.kill();
        svg.remove();
        dark();
      },
    };
  },
};
