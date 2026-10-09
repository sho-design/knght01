/* The back rank. Once, when the reader has come to rest at the end, the name stands up as the back rank of the KNGHT
   set, in the letters' own steel: K the king, N the knight, G the queen, H the rook, T the bishop. It holds a beat and
   is KNGHT again.
   Each letter turns by a plinth-up wipe: a level front climbs from under the foot to over the crown, the piece below it,
   the letter above it, so every frame is a clean letter over a clean piece (nothing is interpolated, no blob frames).
   The pieces stand up left to right and go home together; the name is away for 1.2 s in all.
   "Your move." then stays in the floor under the K. A tap (or a click) on the name plays it once more.

   Keeps the shared base: the rise and the steel stay. Each piece is a div on the overlay over its own letter's box,
   painted with that letter's computed sheen (so it catches the hall light exactly as the letter does) and cut to the
   piece with clip-path: path(). The letters themselves are only clipped (clip-path) and, for the last of each wipe,
   faded (opacity); never moved or resized.
   The silhouettes (RANK, below) are the sprite's filled look, made once from pieces.js with path ops: the outline filled
   and stroked at 1.1 on the 24 grid, the plinth stroked, the details and the knight's eye cut out. They are in 1/1000 em
   from the top-left of each letter's span (the space of letters.js): the foot on the baseline, the plinth centred under
   the letter's ink, every piece inside its letter's box (0 to w, 0 to 760). */

const SAY = 'Your move.';
const LEAD = 0.3;   // s from the start to the first wipe
const SETTLE = 0.25; // s the page must rest (no scrolling) with the name landed before it starts
const LATEST = 3;   // s after play() it starts anyway, landed or not (a reader who stops just short of the end)
const UP = 0.3;     // s for one letter to stand up as its piece
const STAGGER = 0.03;
const HOLD = 0.48;  // s the whole rank stands
const DOWN = 0.28;  // s for all five to go home together
const EDGE = 0.045; // the bright casting edge on the piece, under the front, in em
const FADE = 0.72;  // past this much of the wipe, what is left of the letter fades out (and in, on the way home)

export default {
  id: 'back-rank',
  name: 'The back rank',
  takesOver: false,

  mount(ctx) {
    const { gsap, letters, word, flags } = ctx;
    // pieces.js placePath, made from the host's MotionPathPlugin: importing pieces.js would split it out of last-rank
    // into a chunk of its own (one more request on a visit) and make the host's chunk export gsap's path utilities.
    const { stringToRawPath, transformRawPath, rawPathToString } = ctx.plugins.MotionPathPlugin;
    const placePath = (d, k, x = 0, y = 0) => rawPathToString(transformRawPath(stringToRawPath(d), k, 0, 0, k, x, y));
    const cuts = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('clip-path', 'path("M0 0H1V1Z")');
    let geo = ctx.measure();

    const scope = '.footer[data-ending="back-rank"]';
    ctx.css(`${scope} .br-cast{position:absolute;left:0;top:0;visibility:hidden}
${scope} .br-piece{position:absolute;inset:0;background-size:100% 100%;background-repeat:no-repeat}
${scope} .br-edge{position:absolute;left:0;right:0;top:0;opacity:0;background:linear-gradient(rgba(255,255,255,.95),rgba(255,255,255,0))}
${scope} .br-say{font-family:var(--serif);font-style:italic;font-weight:400;fill:var(--ash)}`);

    const items = letters.map((el) => {
      const R = RANK[el.textContent.trim()];
      if (!R || !cuts) return null;
      const cast = ctx.make('div', { className: 'br-cast' });
      const piece = ctx.make('div', { parent: cast, className: 'br-piece' });
      const edge = ctx.make('div', { parent: piece, className: 'br-edge' });
      return { el, R, cast, piece, edge, p: 0, x: 0, y: 0, w: 0, h: 0, top: 0, bottom: 0, bg: '', drawn: null };
    });
    const live = items.filter(Boolean);

    const svg = ctx.svg({ className: 'br-words' });
    const say = ctx.make('text', { parent: svg, className: 'br-say', text: SAY, attrs: { opacity: '0' } });

    // The letter's own steel on its piece: its computed background (the sheen, the hall light already resolved).
    const steel = (it) => {
      const bg = getComputedStyle(it.el).backgroundImage;
      if (bg !== it.bg) { it.bg = bg; it.piece.style.backgroundImage = bg; }
    };
    const liftOf = (it) => (+gsap.getProperty(it.el, 'y') || 0) + ((+gsap.getProperty(it.el, 'yPercent') || 0) / 100) * it.h;

    const place = () => {
      const k = geo.fontSize / 1000;
      const s = ctx.stage.getBoundingClientRect();
      live.forEach((it) => {
        const at = geo.letters[letters.indexOf(it.el)];
        // x to the sub-pixel (the rise moves the letters in y only), y from the layout
        it.x = it.el.getBoundingClientRect().left - s.left;
        it.y = at.y; it.w = at.w; it.h = at.h;
        it.top = it.R.front[0] * k;
        it.bottom = it.R.front[1] * k;
        Object.assign(it.cast.style, { left: `${it.x.toFixed(2)}px`, top: `${it.y}px`, width: `${it.w}px`, height: `${it.h}px` });
        it.piece.style.clipPath = `path("${placePath(it.R.d, k, 0, 0)}")`;
        it.edge.style.height = `${Math.max(2, EDGE * geo.fontSize).toFixed(1)}px`;
        it.drawn = null;
      });
      // "Your move." in the floor under the K: flush with the K's ink, half way between the letters' box and the footer line.
      const K = geo.letters[0];
      const room = geo.baseTop - (K.y + K.h);
      const size = Math.max(13, Math.min(22, room * 0.42));
      const ink = 0.63 * size; // Cormorant's cap height: no descenders in the line
      say.setAttribute('x', (K.x + RANK.K.ink[0] * k).toFixed(1));
      say.setAttribute('y', (K.y + K.h + room / 2 + ink / 2).toFixed(1));
      say.setAttribute('font-size', size.toFixed(1));
    };

    // Draw one letter at progress p: 0 the letter, 1 the piece. The front is level, at the same height in both.
    const draw = (it) => {
      const p = it.p;
      const lift = liftOf(it);
      const front = it.bottom - p * (it.bottom - it.top);
      if (it.drawn && it.drawn.p === p && Math.abs(it.drawn.lift - lift) < 0.01) return;
      it.drawn = { p, lift };
      if (p <= 0) {
        it.el.style.removeProperty('clip-path');
        it.el.style.removeProperty('opacity');
        it.cast.style.visibility = 'hidden';
        return;
      }
      // The last of the letter (the tops of its serifs) fades as the front passes it, so no hairline is left behind.
      if (p > FADE) it.el.style.opacity = Math.max(0, 1 - (p - FADE) / (1 - FADE)).toFixed(3);
      else it.el.style.removeProperty('opacity');
      if (!it.bg) steel(it);
      it.cast.style.visibility = 'visible';
      it.cast.style.transform = lift ? `translate3d(0,${lift.toFixed(2)}px,0)` : '';
      if (p >= 1) {
        it.el.style.clipPath = 'inset(0 0 100% 0)';
        it.cast.style.clipPath = '';
        it.edge.style.opacity = '0';
        return;
      }
      it.el.style.clipPath = `inset(-30% -30% ${(it.h - front).toFixed(2)}px -30%)`;
      it.cast.style.clipPath = `inset(${front.toFixed(2)}px 0 0 0)`;
      it.edge.style.transform = `translate3d(0,${front.toFixed(2)}px,0)`;
      it.edge.style.opacity = (0.8 * Math.sin(Math.PI * p)).toFixed(3);
    };
    const render = () => live.forEach(draw);

    place();
    render();
    const offResize = ctx.onResize((next) => { geo = next; place(); render(); });

    // One timeline, made here and paused. Up left to right, a beat as the back rank, home together.
    const tl = gsap.timeline({ paused: true, onUpdate: render, onComplete: () => { done = true; } });
    live.forEach((it, i) => tl.to(it, { p: 1, duration: UP, ease: 'power2.out' }, LEAD + i * STAGGER));
    const stood = LEAD + (live.length - 1) * STAGGER + UP;
    tl.to(live, { p: 0, duration: DOWN, ease: 'power2.in' }, stood + HOLD);
    tl.set({}, {}, stood + HOLD + DOWN); // the end, even with no pieces
    const words = gsap.fromTo(say, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power1.out', paused: true });
    tl.call(() => { if (!words.isActive() && words.progress() < 1) words.play(0); }, null, stood);

    // The start waits for the name to land (the rise ends when the wordmark's foot is on screen) and for the page to
    // come to rest, so it plays when the reader has stopped at the end, not while the page still slides. Timed on GSAP's
    // clock, which the host holds off screen (and a recorder can step).
    let armed = false, started = false, done = false, held = false, replays = 0;
    let armedAt = 0, movedAt = 0, lastY = null;
    const clock = () => gsap.globalTimeline.time();
    const landed = () => word.getBoundingClientRect().bottom <= innerHeight + 1
      && letters.every((el) => Math.abs(+gsap.getProperty(el, 'yPercent') || 0) < 0.6);
    const start = () => { started = true; tl.play(0); };
    // Under reduced motion nothing plays, so nothing is listened for: no tick, no press.
    const none = () => {};
    const offTick = flags.reduce ? none : ctx.tick(() => {
      if (armed && !started) {
        const t = clock();
        if (scrollY !== lastY) { lastY = scrollY; movedAt = t; }
        if ((landed() && t - movedAt >= SETTLE) || t - armedAt > LATEST) start();
      }
      // While a piece shows: follow the rise and the hall light.
      if (live.some((it) => it.p > 0)) live.forEach((it) => { if (it.p > 0) { steel(it); draw(it); } });
    });

    // A tap or a click on the name plays it once more, after the first time has finished.
    let press = null;
    const offPointer = flags.reduce ? none : ctx.onPointer((e) => {
      if (e.type === 'pointerdown') {
        press = e.inside && !e.interactive && e.event.isPrimary !== false ? { x: e.x, y: e.y, t: performance.now() } : null;
      } else if (e.type === 'pointerup' && press) {
        const quick = performance.now() - press.t < 700 && Math.hypot(e.x - press.x, e.y - press.y) < 12;
        press = null;
        if (quick && e.inside && !e.interactive && done && replays < 1 && ctx.isLive()) {
          replays++;
          done = false;
          tl.play(LEAD - 0.12);
        }
      } else if (e.type === 'pointercancel' || e.type === 'pointerleave') {
        press = null;
      }
    });

    return {
      play: () => { armed = true; armedAt = movedAt = clock(); },
      pause: () => { held = tl.isActive(); tl.pause(); },
      resume: () => { if (held) tl.resume(); held = false; },
      // Reduced motion: the finished picture. The name at rest, and the line under it.
      still: () => {
        armed = false;
        tl.pause(0);
        live.forEach((it) => { it.p = 0; });
        render();
        words.progress(1).pause();
      },
      destroy: () => {
        offTick();
        offPointer();
        offResize();
        tl.kill();
        words.kill();
        letters.forEach((el) => { el.style.removeProperty('clip-path'); el.style.removeProperty('opacity'); });
        live.forEach((it) => it.cast.remove());
        svg.remove();
      },
    };
  },
};

/* The rank, from the sprite through pieces.js (generated: footer/_port/back-rank/gen.py, 31 units of 1/1000 em to one
   grid unit). ink: the letter's own outline box from letters.js. front: where the wipe starts and ends (y), a little
   past the lowest and highest ink of the letter and its piece together. Regenerate if pieces.js or letters.js change. */
const RANK = {
  K: { piece: 'king', ink: [31, 73.5, 651, 699.5], front: [8.7, 709.5],
    d: 'M145.7 599.3L182.5 599.3Q255.5 530.8 264.3 369.9L252.7 369.9Q221.7 369.9 221.7 338.9Q221.7 307.9 252.7 307.9L271.3 307.9Q263.9 293.8 247.6 272.2Q209.4 221.4 204.8 191.1Q204.7 190.8 204.7 190.4Q203.1 175.9 211.2 166.8Q218.7 158.3 231.7 157.6Q243.2 117.7 313.1 110.9L313.1 104.5L289.8 104.5Q272.8 104.5 272.8 87.5Q272.8 70.4 289.8 70.4L317.9 70.4Q314 63.5 314 52.8Q314 40.3 322.8 31.5Q331.6 22.7 344.1 22.7Q359.1 22.7 366.7 30.2Q374.2 37.7 374.2 52.8Q374.2 63.5 370.3 70.4L398.3 70.4Q415.4 70.4 415.4 87.5Q415.4 104.5 398.3 104.5L375.1 104.5L375.1 110.9Q445 117.7 456.5 157.6Q469.5 158.3 477 166.8Q485.1 175.9 483.5 190.4Q483.5 190.8 483.4 191.1Q478.8 221.4 440.6 272.2Q424.3 293.8 416.9 307.9L435.5 307.9Q466.5 307.9 466.5 338.9Q466.5 369.9 435.5 369.9L423.9 369.9Q432.7 530.8 505.7 599.3L536.3 599.3Q553.3 599.3 553.3 616.4Q553.3 633.4 536.3 633.4L145.7 633.4Q128.6 633.4 128.6 616.4Q128.6 599.3 145.7 599.3ZM114.7 664.4L567.3 664.4Q584.3 664.4 584.3 681.5Q584.3 698.5 567.3 698.5L114.7 698.5Q97.6 698.5 97.6 681.5Q97.6 664.4 114.7 664.4ZM245 196.3Q227.9 196.3 227.9 213.4Q227.9 230.4 245 230.4L443.2 230.4Q460.3 230.4 460.3 213.4Q460.3 196.3 443.2 196.3Z' },
  N: { piece: 'knight', ink: [33, 73.5, 712, 714.2], front: [57.8, 724.2],
    d: 'M177.2 633.4Q160.1 633.4 160.1 616.4Q160.1 605.6 166.9 601.6Q151 585 140 561.6Q132.8 546.1 148.3 538.9Q152.6 536.9 157.4 537.4Q165.8 538.3 173 535.9Q140.7 507.5 132.5 458Q129.7 441.1 146.5 438.3Q150.7 437.6 154.7 439Q162.9 441.7 170.2 440.9Q141.5 405.4 141.5 352.9Q141.5 335.8 158.6 335.8Q163 335.8 166.9 337.9Q175.9 343 183.6 344Q167.7 303.6 175.9 256.9Q178.9 240.1 195.7 243.1Q200.3 243.9 203.9 247Q212.5 254.5 219.9 257.5Q217.3 213.4 239.9 173.9Q248.4 159.1 263.2 167.5Q266.9 169.7 269.2 173.3Q276.1 184.4 286.6 188.2L322.3 83.8Q327.8 67.7 343.9 73.2Q349.3 75.1 352.5 79.7L377.1 115.7Q386.8 106.4 402.1 102.2Q430.7 94.2 468.6 109.1Q476.6 112.2 479 117.8Q481.4 123.3 478.3 131.2Q476.1 136.6 471.2 139.6Q470.9 139.8 470.5 140Q490.8 142.7 508.2 159.1Q520.6 170.8 508.9 183.2Q506.3 185.9 502.8 187.3Q494.9 190.5 489.2 195Q562.9 244.3 596.3 337.8Q608.4 374.2 595.5 404.5Q579.9 441.2 539.9 441.2Q537.4 441.2 535.1 440.5L482.4 425Q466.5 420.2 457 426.4Q448.7 431.8 448.5 445Q452.2 477.2 496.6 536.5Q524.9 574.5 538.1 599.3L567.8 599.3Q584.8 599.3 584.8 616.4Q584.8 633.4 567.8 633.4L177.2 633.4ZM146.2 664.4L598.8 664.4Q615.8 664.4 615.8 681.5Q615.8 698.5 598.8 698.5L146.2 698.5Q129.1 698.5 129.1 681.5Q129.1 664.4 146.2 664.4ZM437.6 275.4C437.6 285.6 445.9 294 456.2 294C466.5 294 474.8 285.6 474.8 275.4C474.8 265.1 466.5 256.8 456.2 256.8C445.9 256.8 437.6 265.1 437.6 275.4Z' },
  G: { piece: 'queen', ink: [49, 62.5, 685, 710.5], front: [33.5, 720.5],
    d: 'M171.7 599.3L208.5 599.3Q281.5 530.8 290.3 369.9L278.7 369.9Q247.7 369.9 247.7 338.9Q247.7 307.9 278.7 307.9L300.3 307.9Q293.7 287.9 273.3 259Q255.7 234.1 249.3 220.7Q247.9 217.6 247.7 214.2L245.2 167Q244.3 166.6 243.3 166.3Q231.6 161.7 226.6 150.2Q221.5 138.6 226.1 126.9Q230.7 115.2 242.2 110.2Q253.7 105.1 265.5 109.7Q277.2 114.3 282.2 125.8Q287.3 137.3 282.7 149.1Q282.2 150.4 281.6 151.6L283.6 154L292.7 134.2Q289.7 132 287 129Q275.1 115.5 280.8 98.5Q286.6 81.4 304.2 78Q321.6 74.3 333.6 87.8Q345.5 101.2 339.7 118.2Q337.8 123.9 334.6 128.1L339.2 135.3L350.7 108.3Q337.5 100.8 337.5 80.1Q337.5 66.6 347.1 57Q356.6 47.5 370.1 47.5Q386.4 47.5 394.5 55.6Q402.7 63.8 402.7 80.1Q402.7 100.8 389.5 108.3L401 135.3L405.6 128.1Q402.4 124 400.5 118.2Q394.7 101.2 406.6 87.8Q418.6 74.3 436.2 78Q453.6 81.4 459.4 98.5Q465.1 115.5 453.2 129Q450.5 132 447.5 134.2L456.6 154L458.6 151.6Q458 150.4 457.5 149.1Q452.9 137.3 458 125.8Q463 114.3 474.7 109.7Q486.5 105.1 498 110.2Q509.5 115.2 514.1 126.9Q518.7 138.6 513.6 150.2Q508.6 161.7 496.9 166.3Q495.9 166.6 495 167L492.5 214.2Q492.3 217.6 490.9 220.7Q484.5 234.1 466.9 259Q446.5 287.9 439.9 307.9L461.5 307.9Q492.5 307.9 492.5 338.9Q492.5 369.9 461.5 369.9L449.9 369.9Q458.7 530.8 531.7 599.3L562.3 599.3Q579.3 599.3 579.3 616.4Q579.3 633.4 562.3 633.4L171.7 633.4Q154.6 633.4 154.6 616.4Q154.6 599.3 171.7 599.3ZM140.7 664.4L593.3 664.4Q610.3 664.4 610.3 681.5Q610.3 698.5 593.3 698.5L140.7 698.5Q123.6 698.5 123.6 681.5Q123.6 664.4 140.7 664.4ZM280.2 196.3Q263.2 196.3 263.2 213.4Q263.2 230.4 280.2 230.4L460 230.4Q477 230.4 477 213.4Q477 196.3 460 196.3Z' },
  H: { piece: 'rook', ink: [31, 73.5, 728, 698.5], front: [59.5, 708.5],
    d: 'M184.2 599.3L220.9 599.3Q274.7 545.3 277.1 369.3Q253.9 365.7 253.9 338.9Q253.9 317.8 268.3 311.1Q265 305 260 297.3Q238.4 264.8 238.4 241.3L238.4 170Q238.4 152.9 255.5 152.9L294.2 152.9Q311.3 152.9 311.3 170L311.3 218L345.4 218L345.4 170Q345.4 152.9 362.5 152.9L402.7 152.9Q419.8 152.9 419.8 170L419.8 218L453.9 218L453.9 170Q453.9 152.9 471 152.9L509.7 152.9Q526.7 152.9 526.7 170L526.7 241.3Q526.7 264.8 505.2 297.3Q500.2 305 496.9 311.1Q511.2 317.8 511.2 338.9Q511.2 365.7 488.1 369.3Q490.5 545.3 544.3 599.3L574.8 599.3Q591.8 599.3 591.8 616.4Q591.8 633.4 574.8 633.4L184.2 633.4Q167.1 633.4 167.1 616.4Q167.1 599.3 184.2 599.3ZM153.2 664.4L605.8 664.4Q622.8 664.4 622.8 681.5Q622.8 698.5 605.8 698.5L153.2 698.5Q136.1 698.5 136.1 681.5Q136.1 664.4 153.2 664.4ZM348.5 599.3L416.7 599.3L416.7 534.2Q416.7 500.1 382.6 500.1Q348.5 500.1 348.5 534.2Z' },
  T: { piece: 'bishop', ink: [38, 44.5, 601, 698.5], front: [30.5, 708.5],
    d: 'M124.2 599.3L161 599.3Q234 530.8 242.8 369.9L231.2 369.9Q200.2 369.9 200.2 338.9Q200.2 307.9 231.2 307.9L231.4 307.9Q220.3 287.9 220.3 259.9Q220.3 228.4 238.2 198.4L273.1 139.6L306.1 83.7Q305.5 86.3 305.5 89.4L305.5 194.4Q305.5 211.5 322.6 211.5Q339.7 211.5 339.7 194.4L339.7 89.4Q339.7 86.3 339.1 83.7L372.2 139.6L407 198.5Q424.9 228.4 424.9 259.9Q424.9 287.9 413.8 307.9L414 307.9Q445 307.9 445 338.9Q445 369.9 414 369.9L402.4 369.9Q411.2 530.8 484.2 599.3L514.8 599.3Q531.8 599.3 531.8 616.4Q531.8 633.4 514.8 633.4L124.2 633.4Q107.1 633.4 107.1 616.4Q107.1 599.3 124.2 599.3ZM93.2 664.4L545.8 664.4Q562.8 664.4 562.8 681.5Q562.8 698.5 545.8 698.5L93.2 698.5Q76.1 698.5 76.1 681.5Q76.1 664.4 93.2 664.4ZM322.6 211.5Q316.1 211.5 316.1 218Q316.1 224.5 322.6 224.5Q329.1 224.5 329.1 218Q329.1 211.5 322.6 211.5ZM313.8 73.9Q319.6 69.7 327.2 72.7Q325.1 72.3 322.6 72.3Q317.4 72.3 313.8 73.9Z' },
};
