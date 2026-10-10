# Footer endings: the scene contract

The homepage footer ends a different way on each visit. Each way is a **scene** (an "ending"): one module in
`src/scripts/footer/scenes/`. The **host** (`src/scripts/footer/stage.js`) picks the scene, mounts it, plays it,
pauses it, swaps it when the small knight in the footer line is pressed, and cleans up after it.

A scene only has to draw. Everything else is the host's job.

```
src/scripts/footer/
  stage.js         the host: choice, lifecycle, the knight button, the live region, clean-up
  bag.js           the shuffle bag (one localStorage key: knght-ending)
  base.js          the shared base: the letter rise and the steel sheen switch
  knight.js        the B knight path (same as KNIGHT in public/assets/js/chapters.js)
  letters.js       K N G H T as outlines (Cormorant Garamond 500), for scenes that need the shapes
  pieces.js        the six chess pieces as path data, and placePath() to move a path into place
  scenes/index.js  the registry: one line per scene
  scenes/*.js      the scenes
src/assets/knght-chess.svg  the chess-set sprite (ctx.sprite, ctx.piece)
```

## 1. A scene module

```js
export default {
  id: 'tour',            // same as its key in scenes/index.js, and what ?ending= takes (in any case)
  name: 'The tour',      // plain words: the live region says "The tour. Ending 3 of 7." after a swap
  takesOver: false,      // true: the host switches off the shared rise and steel while this scene is mounted

  mount(ctx) {
    // Build nodes, set the start state, make timelines PAUSED. Do not start anything here.
    const tl = ctx.gsap.timeline({ paused: true });
    // ...
    return {
      play()    { tl.play(0); },          // once, on first view, or at once after a swap
      pause()   { tl.pause(); },          // the footer left the viewport
      resume()  { tl.resume(); },         // it came back
      still()   { tl.progress(1).pause(); }, // reduced motion: the complete end state, no motion
      destroy() { tl.revert(); /* and remove what you made */ },
    };
  },
};
```

Register it with one line in `scenes/index.js`:

```js
export const SCENES = {
  classic: () => import('./classic.js'),
  outline: () => import('./outline.js'),
  tour: () => import('./tour.js'),   // the build makes one chunk per scene; a visit fetches only its own
};
```

`mount` should be synchronous. If it must await (a fetch, a decode), it may return a promise of the controller.
The host waits for it: nothing is played, paused or ticked until the promise settles. Tweens made after the first
`await` are not recorded for the safety net (wrap that code in `ctx.add`).

## 2. When the host calls what

| Moment | Call |
| --- | --- |
| Page load | The bag picks a scene; only its chunk is fetched. Nothing mounts yet. |
| Footer within one screen of the viewport | Web fonts are ready (or 1.5 s passed), then `mount(ctx)`. |
| A third of the wordmark in view, first time | `play()`. Once. Not under reduced motion. |
| Footer leaves the viewport | `pause()`. Then the host holds whatever of the scene is still running (below). |
| Footer returns | The host lets go of what it held, then `resume()`. |
| Reduced motion | `still()` right after `mount`. Never `play`, `pause` or `resume`. |
| The knight is pressed | `destroy()` on the old scene, host clean-up, then `mount(ctx)` and `play()` (or `still()`) of the next one at once. Nothing scrolls. (Pressed from the keyboard with the footer out of view, it is paused until the footer returns.) |

The footer carries the state for QA and for scene CSS: `data-ending="<id>"` and
`data-ending-state="mounted | playing | paused | still"`.

What the host guarantees, so a scene cannot get these wrong:

- **One GSAP context per scene.** `mount`, `play`, `pause`, `resume` and `still` run inside it, so every tween,
  timeline, ScrollTrigger, SplitText and matchMedia they create is recorded and reverted when the scene goes.
  `destroy` runs outside it, so what `destroy` restores stays restored.
- **Nothing runs off screen.** `ctx.tick` callbacks run only while the footer is in view and the scene is not paused.
  After the scene's own `pause()`, any of its top-level tweens and timelines still running (a loop it forgot) are held,
  and exactly those are let go on resume. What `pause()` itself starts (a fade out) is left to finish.
- **Reduced motion is still.** Ticks never run. After `still()`, anything of the scene's still moving jumps to its end
  (or stops, if it repeats forever).
- **Clean letters for every scene.** Before each mount the host clears every transform on the letters, even one made
  outside the context, and rebuilds the rise at the scroll's current place (or leaves it off for a takeover). It also
  puts back the letters' other inline styles and classes, and those of the footer, stage and word.
- **One thing at a time.** The first mount and the swaps queue. Presses while a swap waits for its chunk fold into one more swap.

## 3. What `ctx` holds

All positions are CSS pixels in **stage coordinates**: (0, 0) is the top-left of the wordmark's box, on every layer.

| | |
| --- | --- |
| `ctx.id`, `ctx.reason` | The scene id; `'load'` on a page load, `'swap'` when the knight brought it. |
| `ctx.footer` | The `<footer>`. |
| `ctx.stage` | `.footer__stage`: the wordmark's box exactly. Position relative, isolated. |
| `ctx.word`, `ctx.letters` | `.footer__word` and its five `span.sheen` letters, K N G H T. |
| `ctx.overlay` | A layer **over** the letters, the stage's box, `pointer-events: none`. Made on first use. |
| `ctx.underlay` | The same, **behind** the letters. |
| `ctx.backdrop` | A layer behind **everything** in the footer, links and email included, the footer's whole box. For floors, light and shadows. |
| `ctx.svg({ layer, className })` | An `<svg>` in a layer (`'over'`, `'under'` or `'back'`), sized to that layer, kept in size on resize. Its viewBox is in stage coordinates on every layer. |
| `ctx.canvas({ layer, className, maxDpr, context, options })` | `{ canvas, ctx, x, y, width, height, dpr }`, sharp at the device ratio (2 at most), kept in size on resize. With `context: '2d'` (the default) the context is already scaled and moved: draw in stage coordinates and clear with `clearRect(x, y, width, height)`. With `context: 'webgl'` or `'webgl2'` (and `options` for its attributes) set `gl.viewport` yourself in `ctx.onResize`; the host lets the WebGL context go on destroy. `context: null` gets no context. |
| `ctx.make(tag, { parent, attrs, className, html, text })` | Any element (SVG when the parent is SVG). Default parent: the overlay. |
| `ctx.piece(name, { parent, className })` | A chess piece from the KNGHT set: `king queen rook bishop knight pawn`, drawn by `<use>` from the sprite. Hairline: style it with `stroke-width` (1 to 1.3 on the 24 grid) and `color`. Filled: `--knght-fill: currentColor; --knght-cut: #000`. To morph or draw a piece, use the path data in `pieces.js`. |
| `ctx.sprite` | The built URL of that sprite (`<use href="${ctx.sprite}#knght-rook">`). |
| `ctx.knight` | The B knight: `{ d, eye: { cx, cy, r }, viewBox: '0 0 24 24', svg }`. `d` holds the head and the plinth in one path. |
| `ctx.gsap` | The site's GSAP (the same instance as `src/scripts/motion.js`). |
| `ctx.plugins` | `{ ScrollTrigger, SplitText, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin }`, all registered. |
| `ctx.flags` | `{ reduce, touch, coarse, fine }`: reduced motion, a touch screen, a coarse pointer, a hover-capable fine pointer. |
| `ctx.measure()` | The wordmark's geometry (below). Call it again after a resize. |
| `ctx.onResize(fn)` | `fn(geometry)` when the stage, the footer or a letter changes size or place (a new width, or a webfont landing late). |
| `ctx.onPointer(fn, target?)` | Pointer events in the footer (mouse, pen, touch): `{ type, x, y, inside, pointerType, interactive, event }`. |
| `ctx.onTouch(fn, target?)` | Touch events in the footer: `{ type, x, y, inside, touches, interactive, event }`. These keep coming while the page scrolls under the finger; pointer events do not. |
| `ctx.on(target, type, fn, opts)` | Any listener on any target (window, document). Passive unless you say otherwise. Returns `off()`. |
| `ctx.signal` | An AbortSignal aborted on destroy, for `addEventListener(type, fn, { signal: ctx.signal })`. |
| `ctx.observe(observer)` | Hand over an IntersectionObserver, ResizeObserver or MutationObserver; it is disconnected on destroy. |
| `ctx.tick(fn)` | A GSAP ticker callback `fn(time, deltaMs, frame)`. It runs only while the footer is in view and the scene is not paused (so also before `play`, to follow the rise), never under reduced motion. Returns `off()`. Use it instead of `requestAnimationFrame`. |
| `ctx.later(fn, ms)` | A timeout, cleared on destroy. It does not pause; prefer `gsap.delayedCall`, which the host holds with the rest. |
| `ctx.add(fn)` | Wraps a handler that makes tweens, so they are recorded and reverted too. |
| `ctx.css(text)` | A `<style>` element, removed on destroy. Scope every rule to `.footer[data-ending="<id>"]`. |
| `ctx.inView()`, `ctx.isLive()` | Whether the wordmark is in view now; whether the scene's time is running now (what gates `tick`). |

### `ctx.measure()`

All values in CSS pixels, in stage coordinates.

```
width, height      the stage
fontSize           the wordmark's font size
baseline           y of the letters' baseline
capHeight, capTop  cap height, and y of the cap line (baseline - capHeight)
letters[i]         { el, ch, x, y, w, h, cx } for K N G H T, at rest (the rise and transforms are not included)
footer             { x, y, width, height } of the footer, in stage coordinates
back               { x, y, w, h }: the backdrop's box (the footer inside its top rule)
linksBottom        y of the bottom of the links and email above (a negative number)
baseTop            y of the top of the footer line below
floor              baseTop - baseline: the room under the letters
```

Measured on this build, to plan with:

| | desktop 1440 x 900 | phone 390 x 844 |
| --- | --- | --- |
| fontSize | 346 | 94 |
| capHeight | 216 | 59 |
| room above the letters (`capTop - linksBottom`) | 98 | 46 |
| `floor` (room under the baseline) | 77 | 26 |
| footer height | 736 | 815 |

`letters.js` gives each letter's outline in 1/1000 em from the top-left of its span:
`translate(letter.x, letter.y) scale(fontSize / 1000)` lays it exactly over the real letter (see `outline.js`), and
`placePath(LETTERS.N.d, fontSize / 1000, letter.x, letter.y)` gives the same path already in stage coordinates.
To follow a letter while the base rise moves it, add `gsap.getProperty(el, 'yPercent') / 100 * letter.h`.

## 4. The shared base

Unless a scene sets `takesOver: true`, the host keeps today's footer under it:

- **The rise.** The letters rise 18% letter by letter as the wordmark arrives, scrubbed by the scroll
  (`base.js`, a ScrollTrigger on `yPercent`). A scene that keeps the base must not tween the letters' `y` or `yPercent`.
  It may tween their opacity, filter, clip-path, colour, or `x`, `rotation` and `scale`.
- **The steel.** Each letter's sheen follows the hall light (`site.js`, `--gx` on each letter; `.has-hall .footer__word .sheen` in `site.css`).

With `takesOver: true`, the host reverts the rise and adds `.is-own` to the stage: the letters stand at rest in plain
white, no gradient, and the scene owns them completely (transforms included). They get the base back when the next
scene does not take over. Either way the next scene starts with clean letters.

## 5. Rules every scene keeps

1. **No layout shift.** Never change the size, margin, padding, display, position or font of anything in the footer.
   Draw on the layers, or change only transform, opacity, filter, clip-path and colour. The footer is the same height under every scene.
2. **The links and the email are never covered or blocked.** Layers take no pointer events; never turn them on.
   On the overlay and underlay, keep drawings between `linksBottom` and `baseTop` (they may bleed past the stage's sides, not over text).
   The backdrop sits behind the text: it may run under the links, but keep it dark and quiet there so every word stays easy to read.
   Never call `preventDefault` on footer events, and never act on a press whose `interactive` is true: it belongs to a link or the knight.
3. **Black and white only.** White, black, and greys between. Opacity is fine. No colour, not even a tint.
4. **Reduced motion means still.** `still()` shows the finished picture at once: no tweens with duration, no ticks, no loops.
5. **Destroy leaves nothing.** Kill or revert every tween and timeline, remove every node and listener, disconnect every
   observer, and give the letters back their own styles. The host checks: after ten swaps in a row the page has exactly
   the listeners, nodes, observers, ScrollTriggers and ticks it had before. Anything left in the footer is removed and named in a console warning.
6. **Light on the page.** Make timelines in `mount`, paused. For pointer-driven motion use `gsap.quickTo` made in `mount`,
   not a new tween per event. Stop canvas drawing when nothing moves. Nothing runs while paused.
7. **The strict CSP holds.** No inline scripts, no `eval` or `new Function`, no workers from blobs, nothing fetched from
   another origin. Import what you need; Vite bundles it. Inline `style` attributes and `ctx.css` are allowed.
8. **No storage.** The host owns the one localStorage key. A scene keeps its state in memory.
9. **Words, if any, in the KNGHT voice.** Short plain sentences. No em dashes. No exclamation marks.
   Text a scene draws is decoration (`aria-hidden`); the live region already names the ending.

## 6. Porting the prototypes

| The prototype does | In a scene |
| --- | --- |
| A knight that moves among the letters (where-the-i-was, the board tours) | `ctx.svg()` on the overlay, `ctx.knight.d`, `MotionPathPlugin` for the path. Letters may slide on `x` with the base on. To pass behind one letter and in front of another, draw on the overlay and mask the knight with that letter's outline (`letters.js` through `placePath`). |
| Hairlines drawn in (tour, trail, the outline placeholder) | `DrawSVGPlugin` on paths in `ctx.svg()`. For a one-pixel line at any size, set `vector-effect: non-scaling-stroke`. |
| A letter that turns into a piece (letter-to-piece, back-rank) | `MorphSVGPlugin` between `placePath(LETTERS[ch].d, fontSize / 1000, x, y)` and `placePath(PIECES.rook.outline, size / 24, left, top)`. To keep the steel on the shape, the prototypes clip the letter itself (`clip-path: path(...)` on the span, the gradient made to fill the box with `ctx.css`); both are undone on destroy. |
| Shadows cast across the floor (dusk, light-the-knght) | `ctx.canvas({ layer: 'back' })`: the whole footer, behind the links, in stage coordinates. Outlines from `letters.js` as `Path2D`, the B knight from `ctx.knight.d`. |
| A floor that reflects (still-water, the-set-below, floor-reads-knight) | The prototypes add room under the letters by growing the wordmark's bottom margin (about 0.95 cap height: 205 px on desktop, 64 px on phones). A scene may not do that (rule 1), and `floor` is only 77 and 26 px. A reflection must fit that room, or the owner decides to give every ending a deeper floor, once, in `site.css`. |
| Driven by the scroll, not by time (dusk, tour) | A ScrollTrigger made in `mount` that scrubs a paused timeline; `still()` sets it to the end. After a swap the reader is already at the bottom, so a scrub alone would show the end at once: when `ctx.reason === 'swap'`, `play()` tweens the timeline from the start to the scroll's place first. |
| Footage scrubbed by the scroll | Frames, not a `<video>`: a video seeks through the whole media pipeline on every change and cannot keep up with a scroll. WebP frames fetched when the scene mounts, decoded around the playhead with `createImageBitmap`, drawn on a canvas in the backdrop. Cut the frames at the sizes the screens draw (a phone set and a large one) and decode them at their own size: a resize inside `createImageBitmap` costs two to four times the decode. Read the scroll from Lenis (`window.KNGHT.lenis.scroll`) inside `ctx.tick`, not from scroll events, and follow it closely (Lenis has smoothed it already: a second slow ease makes the film trail the reader). Take the time from `gsap.globalTimeline.time()` so a recorder that steps GSAP steps the film. |
| WebGL (still-water) | `ctx.canvas({ layer, context: 'webgl' })`; draw only in `ctx.tick` (it stops off screen); set `gl.viewport` in `ctx.onResize`. Fall back to a still picture when `ctx` is null. |
| `KF.measure()`, `KF.geo`, `KN.baseline(word)` | `ctx.measure()` |
| `kf:resize`, `addEventListener('resize')`, `document.fonts.ready.then(build)` | `ctx.onResize(fn)` |
| `KN.on(fn)`, `requestAnimationFrame` loops | `ctx.tick(fn)` |
| `addEventListener('pointermove' / 'touchstart')` on window or the word | `ctx.onPointer(fn)`, `ctx.onTouch(fn)` |
| `<svg class="board board--under">` beside the word | `ctx.svg({ layer: 'under' })` |
| `<svg class="board board--over">`, overlays inside `.footer__word` | `ctx.svg()` or `ctx.make('div', { parent: ctx.overlay })` |
| A canvas prepended to the footer, behind `.wrap` | `ctx.canvas({ layer: 'back' })` |
| `window.KNGHT_SET`, inline piece paths | `ctx.piece('rook')`, `ctx.sprite`, `PIECES` in `pieces.js` |
| `KN.reduce`, `?reduce` | `ctx.flags.reduce` and `still()` |
| `KN.addSteel(el)`, the hall light loop | Nothing: the base does it (unless `takesOver`). An SVG shape that should catch the light reads `--gx` from its letter in `ctx.tick`. |
| A `<style>` block in the page | `ctx.css(text)`, scoped to `.footer[data-ending="<id>"]` |
| `?rec`, `window.__advance` | Not needed: in QA mode `window.KNGHT_FOOTER.gsap` lets a recorder step time |

## 7. Adding a scene

1. Copy `scenes/outline.js` to `scenes/<id>.js`. Set `id`, `name` and `takesOver`.
2. Port the prototype into `mount` (section 6).
3. Add `<id>: () => import('./<id>.js'),` to `scenes/index.js`.
4. `npm run build`, then open `/?ending=<id>` (desktop and phone). `?ending=` forces the scene, never touches the bag,
   and the knight then steps through the list in registry order. It also exposes `window.KNGHT_FOOTER`: `stats()` for
   leak checks, `measure()` for the geometry, and `gsap` to step time.
5. Check: first view plays; scrolling away pauses and back resumes; reduced motion shows the still; the knight swaps
   in and out ten times with no errors and no leftovers; the footer height and the scroll position never move.

## 8. The scenes now

| id | name | where |
| --- | --- | --- |
| `lookout` | The lookout | Rotation |
| `your-move` | Your move | Rotation |
| `tear-along` | The blade in the line | Rotation |
| `last-rank` | The last rank | Rotation |
| `candle` | Candle | Rotation. Its knght shadow stands in the gap between the N and the G. |
| `letter-to-piece` | Letter to piece | Rotation |
| `dusk` | Dusk | Rotation. Also stands its knght shadow in the N-G gap, by the owner's choice. No other ending may. |
| `back-rank` | The back rank | Rotation |
| `guard` | The guard | Rotation |
| `checkmate` | Checkmate | Rotation |
| `sunrise` | Sunrise | Rotation |
| `title` | Title sequence | Preview |
| `missing-i` | The missing I | Preview |
| `last-line` | The last line | Preview |

`classic.js` and `outline.js` stay in the folder as the base and the template for a new scene (section 7). They are in neither list.

**Preview endings.** `PREVIEW` in `scenes/index.js` holds finished endings that are not in the rotation (now `title`,
`missing-i` and `last-line`). The bag is built from `SCENES` alone, so a
visit never gets one and never fetches one; the list itself adds about 0.5 KB (0.2 KB gzipped) to the host's chunk.
`/?ending=<id>` opens an id from either list, and the knight then steps through `SCENES`, then `PREVIEW`, in order. To
put one in the rotation, move its line from `PREVIEW` to `SCENES`. A preview scene must not import a module the host
or a rotation scene also uses (`gsap/utils/paths.js`, `pieces.js`, `letters.js`): the build would then share it between chunks and
change what a visit downloads. Take gsap's path tools from `ctx.plugins.MotionPathPlugin`, as dusk and back-rank do.
