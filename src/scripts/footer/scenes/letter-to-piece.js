/* Letter to piece. Rest the pointer on a letter (tap it on a phone) and it is recast as its chess piece in the same
   steel, from the plinth up: K the king, N the knight, G the queen, H the rook, T the bishop. Move on and the piece
   sinks back into its plinth and the letter returns. One letter at a time, by touch. On arrival the N turns into the
   knight once by itself, then back: the hint.

   How. Each piece is a div on the overlay laid exactly over its own letter's box, painted with that letter's own sheen
   (copied from the letter every frame it shows, so it follows the hall light like the letter does) and clipped to the
   piece's silhouette. A soft horizontal mask wipe climbs from the plinth: under the front the piece, over it the letter.
   No morph, so there are no in-between blobs. Each letter has one tween, made in mount, played forward and reversed.
   Every piece fits inside its letter's box: it stands on the letter's baseline, centred on the glyph, never wider
   than the box. Nothing is drawn between the letters. The shared base (the rise and the steel) stays on.

   The silhouettes are the KNGHT set (pieces.js) as the sprite draws them filled: the outline filled and stroked at
   1.1 on the 24 grid, the details and the knight's eye cut out, the plinth stroked. Generated once with path ops and
   placed in each letter's span in 1/1000 em (31 per grid unit), so they scale with the wordmark.
   top and bottom: the wipe's run (the higher of the glyph's and the piece's tops, the lower of their feet).
   box: the piece's bounds in its span, for reference (the spans are 0.76 em tall; the widths are in letters.js). */

const SHAPES = {
  K: { piece: 'king', top: 22, bottom: 700, box: [97.6, 22.7, 584.3, 698.5],
    d: 'M145.7 599.3L182.5 599.3Q255.5 530.8 264.3 369.9L252.7 369.9Q221.7 369.9 221.7 338.9Q221.7 307.9 252.7 307.9L271.3 307.9Q263.9 293.8 247.6 272.2Q209.4 221.4 204.8 191.1Q204.7 190.8 204.7 190.4Q203.1 175.9 211.2 166.8Q218.7 158.3 231.7 157.6Q243.2 117.7 313.1 110.9L313.1 104.5L289.8 104.5Q272.8 104.5 272.8 87.5Q272.8 70.4 289.8 70.4L317.9 70.4Q314 63.5 314 52.8Q314 40.3 322.8 31.5Q331.6 22.7 344.1 22.7Q359.1 22.7 366.6 30.2Q374.2 37.7 374.2 52.8Q374.2 63.5 370.3 70.4L398.3 70.4Q415.4 70.4 415.4 87.5Q415.4 104.5 398.3 104.5L375.1 104.5L375.1 110.9Q445 117.7 456.5 157.6Q469.5 158.3 477 166.8Q485.1 175.9 483.5 190.4Q483.5 190.8 483.4 191.1Q478.8 221.4 440.6 272.2Q424.3 293.8 416.9 307.9L435.5 307.9Q466.5 307.9 466.5 338.9Q466.5 369.9 435.5 369.9L423.9 369.9Q432.7 530.8 505.7 599.3L536.3 599.3Q553.3 599.3 553.3 616.3Q553.3 633.4 536.3 633.4L145.7 633.4Q128.6 633.4 128.6 616.3Q128.6 599.3 145.7 599.3ZM114.7 664.4L567.3 664.4Q584.3 664.4 584.3 681.5Q584.3 698.5 567.3 698.5L114.7 698.5Q97.6 698.5 97.6 681.5Q97.6 664.4 114.7 664.4ZM245 196.3Q227.9 196.3 227.9 213.4Q227.9 230.4 245 230.4L443.2 230.4Q460.3 230.4 460.3 213.4Q460.3 196.3 443.2 196.3Z' },
  N: { piece: 'knight', top: 71, bottom: 715, box: [129.1, 71.8, 615.8, 698.5],
    d: 'M177.2 633.4Q160.1 633.4 160.1 616.4Q160.1 605.6 166.9 601.6Q151 585 140 561.6Q132.8 546.1 148.3 538.9Q152.6 536.9 157.4 537.4Q165.8 538.3 173 535.9Q140.7 507.5 132.5 458Q129.7 441.1 146.5 438.3Q150.7 437.6 154.7 439Q162.9 441.7 170.2 440.9Q141.5 405.4 141.5 352.9Q141.5 335.8 158.6 335.8Q163 335.8 166.9 337.9Q175.9 343 183.6 344Q167.7 303.6 175.9 256.9Q178.9 240.1 195.7 243.1Q200.3 243.9 203.9 247Q212.5 254.5 219.9 257.5Q217.3 213.4 239.9 173.9Q248.4 159.1 263.2 167.5Q266.9 169.7 269.2 173.3Q276.1 184.4 286.6 188.2L322.3 83.8Q327.8 67.7 343.9 73.2Q349.3 75.1 352.5 79.7L377.1 115.7Q386.8 106.4 402.1 102.2Q430.7 94.2 468.6 109.1Q476.6 112.2 479 117.8Q481.4 123.3 478.3 131.2Q476.1 136.6 471.2 139.6Q470.9 139.8 470.5 140Q490.8 142.7 508.2 159.1Q520.6 170.8 508.9 183.2Q506.3 185.9 502.8 187.3Q494.9 190.5 489.2 195Q562.9 244.3 596.3 337.8Q608.4 374.2 595.5 404.5Q579.9 441.2 539.9 441.2Q537.4 441.2 535.1 440.5L482.4 425Q466.5 420.2 457 426.4Q448.7 431.8 448.5 445Q452.2 477.2 496.6 536.5Q524.9 574.5 538.1 599.3L567.8 599.3Q584.8 599.3 584.8 616.3Q584.8 633.4 567.8 633.4L177.2 633.4ZM146.2 664.4L598.8 664.4Q615.8 664.4 615.8 681.5Q615.8 698.5 598.8 698.5L146.2 698.5Q129.1 698.5 129.1 681.5Q129.1 664.4 146.2 664.4ZM437.6 275.4C437.6 285.6 445.9 294 456.2 294C466.5 294 474.8 285.6 474.8 275.4C474.8 265.1 466.5 256.8 456.2 256.8C445.9 256.8 437.6 265.1 437.6 275.4Z' },
  G: { piece: 'queen', top: 47, bottom: 711, box: [123.6, 47.5, 610.3, 698.5],
    d: 'M171.7 599.3L208.5 599.3Q281.5 530.8 290.3 369.9L278.7 369.9Q247.7 369.9 247.7 338.9Q247.7 307.9 278.7 307.9L300.3 307.9Q293.7 287.9 273.3 259Q255.7 234.1 249.3 220.7Q247.9 217.6 247.7 214.2L245.2 167Q244.3 166.6 243.3 166.3Q231.6 161.7 226.6 150.1Q221.5 138.6 226.1 126.9Q230.7 115.2 242.2 110.2Q253.7 105.1 265.4 109.7Q277.2 114.3 282.2 125.8Q287.3 137.3 282.7 149.1Q282.2 150.4 281.6 151.6L283.6 154L292.7 134.2Q289.7 132 287 129Q275.1 115.5 280.9 98.5Q286.6 81.4 304.2 78Q321.6 74.3 333.6 87.8Q345.5 101.2 339.7 118.2Q337.8 123.9 334.6 128.1L339.2 135.3L350.7 108.3Q337.5 100.8 337.5 80.1Q337.5 66.6 347.1 57Q356.6 47.5 370.1 47.5Q386.4 47.5 394.5 55.6Q402.7 63.8 402.7 80.1Q402.7 100.8 389.5 108.3L401 135.3L405.6 128.1Q402.4 124 400.5 118.2Q394.7 101.2 406.6 87.8Q418.6 74.3 436.2 78Q453.6 81.4 459.4 98.5Q465.1 115.5 453.2 129Q450.5 132 447.5 134.2L456.6 154L458.6 151.6Q458 150.4 457.5 149.1Q452.9 137.3 457.9 125.8Q463 114.3 474.8 109.7Q486.5 105.1 498 110.2Q509.5 115.2 514.1 126.9Q518.7 138.6 513.7 150.1Q508.6 161.7 496.9 166.3Q495.9 166.6 495 167L492.5 214.2Q492.3 217.6 490.9 220.7Q484.5 234.1 466.9 259Q446.5 287.9 439.9 307.9L461.5 307.9Q492.5 307.9 492.5 338.9Q492.5 369.9 461.5 369.9L449.9 369.9Q458.7 530.8 531.7 599.3L562.3 599.3Q579.3 599.3 579.3 616.3Q579.3 633.4 562.3 633.4L171.7 633.4Q154.6 633.4 154.6 616.3Q154.6 599.3 171.7 599.3ZM140.7 664.4L593.3 664.4Q610.3 664.4 610.3 681.5Q610.3 698.5 593.3 698.5L140.7 698.5Q123.6 698.5 123.6 681.5Q123.6 664.4 140.7 664.4ZM280.2 196.3Q263.2 196.3 263.2 213.4Q263.2 230.4 280.2 230.4L460 230.4Q477 230.4 477 213.4Q477 196.3 460 196.3Z' },
  H: { piece: 'rook', top: 73, bottom: 699, box: [136.1, 152.9, 622.8, 698.5],
    d: 'M184.2 599.3L220.9 599.3Q274.7 545.3 277.1 369.3Q253.9 365.7 253.9 338.9Q253.9 317.8 268.3 311.1Q265 305 260 297.3Q238.4 264.8 238.4 241.3L238.4 170Q238.4 152.9 255.5 152.9L294.2 152.9Q311.3 152.9 311.3 170L311.3 218L345.4 218L345.4 170Q345.4 152.9 362.5 152.9L402.7 152.9Q419.8 152.9 419.8 170L419.8 218L453.9 218L453.9 170Q453.9 152.9 471 152.9L509.7 152.9Q526.7 152.9 526.7 170L526.7 241.3Q526.7 264.8 505.2 297.3Q500.2 305 496.9 311.1Q511.2 317.8 511.2 338.9Q511.2 365.7 488.1 369.3Q490.5 545.3 544.3 599.3L574.8 599.3Q591.8 599.3 591.8 616.3Q591.8 633.4 574.8 633.4L184.2 633.4Q167.1 633.4 167.1 616.3Q167.1 599.3 184.2 599.3ZM153.2 664.4L605.8 664.4Q622.8 664.4 622.8 681.5Q622.8 698.5 605.8 698.5L153.2 698.5Q136.1 698.5 136.1 681.5Q136.1 664.4 153.2 664.4ZM348.5 599.3L416.7 599.3L416.7 534.2Q416.7 500.1 382.6 500.1Q348.5 500.1 348.5 534.2Z' },
  T: { piece: 'bishop', top: 44, bottom: 699, box: [76.1, 71.4, 562.8, 698.5],
    d: 'M322.6 211.5Q316.1 211.5 316.1 218Q316.1 224.5 322.6 224.5Q329.1 224.5 329.1 218Q329.1 211.5 322.6 211.5Q339.7 211.5 339.7 194.4L339.7 89.4Q339.7 86.3 339.1 83.7L372.2 139.6L407 198.5Q424.9 228.4 424.9 259.9Q424.9 287.9 413.8 307.9L414 307.9Q445 307.9 445 338.9Q445 369.9 414 369.9L402.4 369.9Q411.2 530.8 484.2 599.3L514.8 599.3Q531.8 599.3 531.8 616.3Q531.8 633.4 514.8 633.4L124.2 633.4Q107.1 633.4 107.1 616.3Q107.1 599.3 124.2 599.3L161 599.3Q234 530.8 242.8 369.9L231.2 369.9Q200.2 369.9 200.2 338.9Q200.2 307.9 231.2 307.9L231.4 307.9Q220.3 287.9 220.3 259.9Q220.3 228.4 238.2 198.4L273.1 139.6L306.1 83.7Q305.5 86.3 305.5 89.4L305.5 194.4Q305.5 211.5 322.6 211.5ZM93.2 664.4L545.8 664.4Q562.8 664.4 562.8 681.5Q562.8 698.5 545.8 698.5L93.2 698.5Q76.1 698.5 76.1 681.5Q76.1 664.4 93.2 664.4ZM313.8 73.9Q319.6 69.7 327.2 72.7Q325.1 72.3 322.6 72.3Q317.4 72.3 313.8 73.9Z' },
};

const TURN = 0.9;      // seconds, letter to piece
const BACK = 0.62;     // seconds, piece to letter (the same tween, reversed faster)
const REST = 0.12;     // a cursor rests this long on a letter before it turns, so a pass across the name leaves it alone
const HOLD = 1.6;      // seconds a piece stays after the finger lifts
const FEATHER = 0.05;  // the soft edge of the wipe, in em
const WARM = 0.14;     // the steel brightens this much at the middle of a change
const EDGE = 0.3;      // the bright casting edge at the front, as a share of the feather
const HINT = { load: 1.3, swap: 0.7, stay: 1.2 }; // the N's turn on arrival: when it starts, how long the knight stays

const scaled = (d, k) => d.replace(/-?\d*\.?\d+/g, (v) => String(Math.round(v * k * 100) / 100));
const mask = (style, value) => { style.maskImage = value; style.webkitMaskImage = value; };
const idle = () => {};

export default {
  id: 'letter-to-piece',
  name: 'Letter to piece',
  takesOver: false,

  mount(ctx) {
    const { gsap, letters, flags } = ctx;
    // Without clip-path: path() the name simply stays itself.
    if (!(window.CSS && CSS.supports('clip-path', 'path("M0 0H1V1Z")'))) {
      return { play: idle, pause: idle, resume: idle, still: idle, destroy: idle };
    }
    let geo = ctx.measure();
    let dead = false;
    ctx.css(`.footer[data-ending="letter-to-piece"] .ltp{position:absolute;left:0;top:0;display:none;pointer-events:none;background-repeat:no-repeat;transition:none!important}`);

    const cast = letters.map((el, i) => {
      const shape = SHAPES[el.textContent.trim()];
      const node = ctx.make('div', { className: 'ltp' });
      return { i, el, shape, node, p: 0, on: false, at: null, lo: 0, hi: 0, f: 0, edge: null, bg: null, tw: null };
    }).filter((c) => c.shape);

    // Follow the letter exactly: its box as drawn now, the shared rise included (layout offsets round to whole pixels).
    const place = (c) => {
      const r = c.el.getBoundingClientRect(), s = ctx.stage.getBoundingClientRect(), n = c.node.style;
      n.transform = `translate(${(r.left - s.left).toFixed(2)}px,${(r.top - s.top).toFixed(2)}px)`;
      n.width = `${r.width.toFixed(2)}px`; n.height = `${r.height.toFixed(2)}px`;
    };
    // The same steel: the letter's own sheen, read from the letter (the hall light moves it every frame).
    const steel = (c) => {
      const s = getComputedStyle(c.el);
      c.bg = s.backgroundImage === 'none'
        ? { image: 'none', size: 'auto', pos: '0 0', color: s.color }
        : { image: s.backgroundImage, size: s.backgroundSize, pos: s.backgroundPosition, color: s.backgroundColor };
      paint(c);
    };
    // The steel, and while the piece is being cast a bright edge where the metal is setting (on the piece alone).
    const paint = (c) => {
      const n = c.node.style, bg = c.bg;
      if (!bg) return;
      if (c.edge == null) {
        n.backgroundImage = bg.image; n.backgroundSize = bg.size; n.backgroundPosition = bg.pos;
      } else {
        const e = c.edge, r = c.f * EDGE;
        n.backgroundImage = `linear-gradient(transparent ${(e - r).toFixed(1)}px,rgba(255,255,255,.85) ${e.toFixed(1)}px,transparent ${(e + r).toFixed(1)}px),${bg.image}`;
        n.backgroundSize = `100% 100%,${bg.size}`; n.backgroundPosition = `0 0,${bg.pos}`;
      }
      n.backgroundColor = bg.color;
    };
    // p from 0 (the letter) to 1 (the piece). The front climbs from under the foot to over the crown.
    const draw = (c) => {
      if (dead) return;
      const p = c.p, n = c.node.style, l = c.el.style;
      if (p <= 0.0005) {
        if (c.on) { c.on = false; c.edge = null; n.display = 'none'; mask(n, ''); n.filter = ''; mask(l, ''); }
        return;
      }
      if (!c.on) { c.on = true; n.display = 'block'; place(c); steel(c); }
      if (p >= 0.9995) {
        c.edge = null; paint(c);
        mask(n, ''); n.filter = '';
        mask(l, 'linear-gradient(transparent,transparent)');
        return;
      }
      const y = c.lo + (c.hi - c.lo) * p, a = (y - c.f / 2).toFixed(1), b = (y + c.f / 2).toFixed(1);
      mask(l, `linear-gradient(#000 ${a}px,transparent ${b}px)`);
      mask(n, `linear-gradient(transparent ${a}px,#000 ${b}px)`);
      c.edge = y + c.f * 0.2; paint(c);
      n.filter = `brightness(${(1 + WARM * Math.sin(Math.PI * p)).toFixed(3)})`;
    };
    const layout = () => {
      const k = geo.fontSize / 1000;
      cast.forEach((c) => {
        c.at = geo.letters[c.i];
        c.f = FEATHER * geo.fontSize;
        c.lo = c.shape.bottom * k + c.f / 2; // the front at rest: just under the letter's foot
        c.hi = c.shape.top * k - c.f / 2;    // and when done: just over the piece's crown
        const n = c.node.style;
        n.clipPath = `path(evenodd,"${scaled(c.shape.d, k)}")`;
        if (c.on) { place(c); draw(c); }
      });
    };
    layout();
    ctx.onResize((next) => { geo = next; layout(); });
    // While a piece shows, keep it on its letter and in the letter's light. Nothing to do when none shows.
    ctx.tick(() => { cast.forEach((c) => { if (c.on) { place(c); steel(c); } }); });

    // One tween per letter, played to the piece and reversed back to the letter.
    cast.forEach((c) => {
      c.tw = gsap.fromTo(c, { p: 0 }, { p: 1, duration: TURN, ease: 'power1.inOut', paused: true, onUpdate: () => draw(c) });
    });
    const turn = (c) => {
      if (flags.reduce) { c.p = 1; draw(c); return; } // reduced motion: a plain cut, no wipe
      c.tw.timeScale(1).play();
    };
    const back = (c) => {
      if (flags.reduce) { c.p = 0; draw(c); return; }
      if (c.p > 0 || c.tw.isActive()) c.tw.timeScale(TURN / BACK).reverse();
    };

    /* Which letter is under the pointer: only the letter's own box counts, never the space between letters. */
    const which = (e) => {
      if (!e.inside) return -1;
      const hit = cast.find((c) => e.x >= c.at.x && e.x <= c.at.x + c.at.w);
      return hit ? hit.i : -1;
    };
    const byIndex = (i) => cast.find((c) => c.i === i);
    let cur = -1, aim = -1, engaged = false;
    const hint = gsap.timeline({ paused: true });
    const quiet = () => { if (!engaged) { engaged = true; hint.kill(); } };
    // One letter at a time: this one turns, every other one goes home (the hint's N included).
    const go = (i) => {
      quiet();
      cur = i;
      cast.forEach((c) => (c.i === i ? turn(c) : back(c)));
    };
    const intent = gsap.delayedCall(REST, () => { const i = aim; aim = -1; if (i >= 0) go(i); }).pause();
    const point = (i, wait) => {
      if (i === cur) { if (aim >= 0) { intent.pause(); aim = -1; } return; }
      if (wait && i >= 0 && i === aim) return; // already waiting for it
      intent.pause(); aim = -1;
      if (cur >= 0) back(byIndex(cur));
      cur = -1;
      if (i < 0) return;
      if (wait && !flags.reduce) { aim = i; intent.restart(true); } else go(i);
    };
    const hold = gsap.delayedCall(HOLD, () => point(-1, 0)).pause();

    // A cursor (mouse or pen): rest on a letter and it turns; move on and it goes back.
    ctx.onPointer((e) => {
      if (e.pointerType === 'touch') return; // fingers are read from the touch events below
      if (e.type === 'pointerleave') { if (e.event.target === ctx.footer) point(-1, 0); return; }
      if (e.type === 'pointermove') point(e.interactive ? -1 : which(e), REST); // over a link: no letter
      else if (e.type === 'pointerdown' && !e.interactive) point(which(e), 0); // a press on a link or the knight is theirs
    });
    // A finger: tap a letter and it turns at once; slide along the name and each letter turns as the finger reaches it.
    // The piece stays a moment after the finger lifts. Touch events keep coming while the page scrolls under the finger.
    ctx.onTouch((e) => {
      if (e.interactive) return;
      if (e.type === 'touchstart' || e.type === 'touchmove') {
        const i = which(e);
        if (i >= 0) { hold.pause(); point(i, 0); }
      } else if (cur >= 0 && !e.touches) {
        hold.restart(true);
      }
    });

    // The hint: on arrival the N turns into the knight by itself, once, then back.
    const N = cast.find((c) => c.el.textContent.trim() === 'N');
    if (N) {
      hint.add(() => turn(N), ctx.reason === 'swap' ? HINT.swap : HINT.load)
        .add(() => back(N), `+=${TURN + HINT.stay}`);
    }

    return {
      play: () => { if (!engaged) hint.play(0); },
      pause: idle,  // the host holds what is still running (the hint, a letter mid-change) and lets it go on resume
      resume: idle,
      // Reduced motion: the name, complete and still. A hover or a tap later shows a piece as a plain cut.
      still: () => { hint.kill(); cast.forEach((c) => { c.tw.pause(0); c.p = 0; draw(c); }); },
      destroy: () => {
        cast.forEach((c) => { c.tw.kill(); c.p = 0; draw(c); });
        dead = true;
        hint.kill(); intent.kill(); hold.kill();
        cast.forEach((c) => { mask(c.el.style, ''); c.node.remove(); });
      },
    };
  },
};
