# Wonderland: the white rabbit, the fall and the board

A hidden way into a game of chess against the Black Queen. A small white rabbit hops along the footer line of
every page, checks its watch and dives into a hole. Follow it (or take the codex's "Follow the rabbit", or open
any page at `#down-the-rabbit-hole`) and the page closes into the hole. You fall about five seconds through the
KNGHT world and land on a chessboard. "Climb back up" (or Escape, or Back) puts you exactly where you were.

The **portal** (this folder's top level) owns the rabbit, the overlay, the page behind it and the fall. The
**game** (`game/`) owns everything on the board. They meet in one call, `mount()`, described in section 3.

```
src/scripts/wonderland/
  rabbit.js        eager: the rabbit on the footer line, the ways in, follow(). In the Motion chunk on every page.
                   Its style is in public/assets/css/site.css ("The white rabbit"), not in the chunk.
  portal.js        lazy chunk 1: the overlay, scroll and focus, Lenis, history, Climb back up, the hand-off
  fall.js          in chunk 1: the tunnel (canvas), the watch and the knght falling past, the four lines
  portal.css       in chunk 1, as a string (?inline), injected once as <style id="wl-css">
  game/index.js    lazy chunk 2: the game. Exports mount(). The portal finds it with a literal glob.
```

## 1. What a visitor who never finds it pays

Only `rabbit.js`, inside the Motion chunk that every page with a footer already loads. No new request on page load,
and none when the footer comes into view. The portal chunk is fetched when someone points at, focuses or touches the
hole (or the codex's button), and on the press at the latest. The game chunk starts loading the moment the overlay
opens, in parallel with the fall; its worker starts when the board has landed.

**Budget.** `rabbit.js` was given 2.2 KB gzipped in the Motion chunk. Measured on the production build against the
same files at e9999eb (gzip level 9; brotli is what Vercel sends to browsers that ask for it):

| File (already loaded by every page with a footer) | gzip | brotli | What |
| --- | --- | --- | --- |
| Motion chunk | +2,092 B | +1,909 B | `rabbit.js`: the drawing, the placement, the run, the markup, the watcher, the ways in |
| `site.css` | +346 B | +266 B | the rabbit's style (`.wl-rb`) |
| `site.js` | +146 B | +128 B | the codex's third button, and the candle light pausing under `html.wl-hide` |
| `stage.*.js` | -15 B | -32 B | only its import line (the Motion chunk's new hash) |
| **In all** | **+2,569 B** | **+2,271 B** | **no new request**, on load or when the footer comes into view |

Checked in a browser too: `/`, `/process/`, `/book/`, a world page and `/check/`, at 390 (touch) and 1280 wide,
loaded, scrolled to the footer and left 8 s, fetch exactly the files they fetched at e9999eb.

Keep it that way:

- **No second entry that imports anything lazily.** Vite's preload helper lives inside the Motion chunk only while the
  Motion chunk is the one entry with a dynamic `import()`. A page script with its own `import()` (the lab harness was
  one) makes Rollup move the helper into a shared `preload-helper.*.js`, which every page then fetches. That is why the
  lab is not in `src/pages` (section 7). After a build, `ls dist/_astro | grep preload` must print nothing.
- Measure again after any change: gzip the Motion chunk (level 9) and compare it with a build without the import line
  in `Motion.astro`, and add the `.wl-rb` block of `site.css`.

**Import rules** (they keep the footer's chunk graph as it is; see the preview rule in `../footer/SCENES.md`):

- Wonderland modules import only: `gsap` core (the portal, never a plugin), `chess.js` (the game only),
  `src/lib/sigils.ts` (`fall.js` only) and files in this folder.
- Never import `src/scripts/footer/*`, `src/assets/knght-chess.svg`, `gsap/*` plugins or `motion.js`.
- The game imports nothing from the portal and never imports gsap (it animates with `element.animate`). The portal
  imports the game only through `import.meta.glob('./game/index.js')`.

Adding `rabbit.js` changes the Motion chunk's hash, and with it the import line of the footer host's chunk
(`stage.*.js`), which imports from Motion. Nothing else changes: the same requests on every page.

## 2. The ways in

| Way | How | `from` | The iris closes on | Focus comes back to |
| --- | --- | --- | --- | --- |
| The hole | the button over the hole (or the rabbit, by pointer, during its watch beat) | `rabbit` | the hole | the hole's button |
| The codex | `site.js`: "Follow the rabbit" closes the codex, then dispatches `knght:rabbit` | `codex` | the centre | what the codex gave focus back to |
| The address | `#down-the-rabbit-hole` on load, or a later change of hash to it | `hash` | the centre | where it was (the body) |

`knght:rabbit` on `document` (`detail: { from }`) is the one public door. A later page (the 404) can use it too.
The portal says when it opens and closes with `knght:wonderland` on `document` (`detail: { state: 'open' | 'closed' }`),
for any page script that wants to pause itself. Nothing has to listen.

## 3. The rabbit (rabbit.js)

- **Drawing.** `RABBIT = { outline, watch, hands, eye }` on the 24 grid: the White Rabbit as a seventh piece of the
  Story set, drawn fresh. It keeps the king's and bishop's collar (y 10 to 10.9) and skirt (to y 19.4); a rabbit's
  head faces right with its ears swept back, the eye like the knght's, and a pocket watch held out on a short chain.
  On the footer's black it is a solid white figure, the eye cut in black, the watch a hairline (1.1 px), with a
  1.5 px black drop shadow where it passes over the homepage letters.
- **Where.** On the border of the last `footer .footer__base`, in a layer appended to `<body>` (never inside the
  footer: the footer host removes what a scene did not make). The layer is `z-index: 60`, takes no pointer events
  except the hole's button, and never changes the footer's layout. Its style is the `.wl-rb` block at the end of
  `site.css`, so the layer needs no `<style>` of its own.
- **Placement.** The hole starts at 70% of the line and moves in 8 px steps, alternately left and right, until its
  48 x 44 hit box clears every link, button and field in the footer (each with 8 px to spare) and the back-to-top
  column (from the button's left minus 12 px to the edge, at every height). The run starts nine hops to the left
  (no further than the line), moving right until its corridor clears the same obstacles. Fewer than two hops: the
  rabbit stands still beside the hole. No room for the hole: no rabbit on that page.
- **When.** Once per page view: the whole line in view for 0.7 s, at least 1.5 s after load, the tab visible, no
  codex, phone menu or overlay open. Out of view mid-run, or a layout change (a new width, the page above changing
  height): the run jumps to its end and the hole follows the line.
- **The run** (GSAP; times from the start). 0 to 0.35 s the hole opens (rx 11 px, 14 px from 900 px wide; its lower
  rim a white hairline at .55, its upper rim the line's grey). 0.15 s the rabbit arrives, fading in over its first
  hop. Hops of 0.28 s (34 px apart, 46 px on a desktop, a parabola 0.3 of its height high, a squash just after each
  landing). At 60% of the way the watch beat, 0.8 s: the watch swings out (-14°, 10°, 0 from the top of its chain)
  and the body bobs twice; a tap on the rabbit then follows. Hops of 0.22 s after it. The dive: a hop 1.6 times as
  high onto the hole, down through the line (clipped at it), and a hairline ripple. About 3.5 to 4.5 s in all, and
  nothing loops. Hover or focus on the hole: the rim to .9 and 1.12 times the size.
- **Reduced motion.** The hole and the rabbit appear at once, still, the rabbit just left of the hole with its watch out.

## 4. The contract with the game

`game/index.js` exports `mount(host, opts)` and returns a controller. The portal never reads or styles anything
inside `host`; the game touches nothing outside it except its own `<style id="wlg-css">`.

```js
const controller = mount(host, {
  reduce,     // prefers-reduced-motion, read at open
  signal,     // an AbortSignal, aborted on close right after destroy(): use it for every listener
  onClimb,    // the ending card's "Climb back up" calls this (it goes through history, like Back)
  track,      // (name, params) analytics; never throws
  bookHref,   // '/book/'
});
await controller.land({ from: { x, y, d } }); // the board rises out of the core (centre and diameter, viewport px)
controller.destroy();                          // idempotent: worker, animations, listeners, and host emptied
```

- `host` is `<div class="wl-game">` after the bar: the viewport's width, at least `calc(100dvh - var(--wl-bar-h))`
  tall, no padding. `.wl` is the scroll container; the game should fit without scrolling.
- `mount` is synchronous and cheap: it builds the board hidden (`.wlg[data-phase="pre"]`, visibility hidden), starts
  nothing, and makes no worker.
- `land()` resolves once the level picker is visible and focused, and its live region has spoken. It rejects only if
  the board cannot be built; the portal then shows its error line. Under reduced motion `from` is not passed.
- Keys: the game listens only inside `host`. When it uses Escape (to drop a selection, to close the promotion
  chooser) it calls `preventDefault()`; otherwise Escape bubbles and the portal climbs.
- Size: in portrait a square is `min((width - 40) / 8, (height - 220) / 8, 72)` px, so every square and every button
  of the promotion chooser is at least 40 px on a 360 px phone (43 at 390, 48 at 430).
- Endings: the card waits 1.2 s after the last move (reduced motion too: a pause is not motion), so the mating move,
  its ticks and the check ring are seen first; the live region speaks at once. On a phone the card covers most of the
  board, so it has a quiet "See the board": the card steps aside, focus stays on the board (arrow keys read the
  final position square by square), and a tap on the board, Enter on a square, or "See the result" in the panel
  brings it back. New game works throughout.

Namespaces: the portal uses `.wl`, `.wl-*`, `#wl-*`; the game `.wlg`, `.wlg-*`, `#wlg-*`. `--wl-bar-h` is the one
shared custom property (the bar's height: 56 px plus the safe area).

## 5. The fall, second by second (one GSAP timeline, so a slow frame never stretches it)

| Time (s) | What happens |
| --- | --- |
| 0 | The overlay mounts. The iris covers the page in black except a circle at the origin, with a white rim at .7. |
| 0 to 0.85 | The page closes into the hole: the circle shrinks from the farthest corner to 26 px (34 px on a desktop). |
| 0.35 to 0.75 | The bar (the rabbit, "Down the rabbit hole", Climb back up) fades in. It is above the iris from the start. |
| 0.85 to 1.05 | Inside the rim goes black. At 1.1 the page behind stops painting (`html.wl-hide`). |
| 1.0 to 1.45 | The dive: the mouth glides to the centre and grows past the edges. A faint light at the bottom of the hole. |
| 0.95 to 1.95 | "Down, down, down." (Lewis Carroll) |
| 1.1 to 4.4 | The tunnel: the boundary, then Machinery, Artifacts, Ground, Map, Language, Law, outside in. Hoops come out of the dark and leave past the edge; the boundary passes at 2.0 s, then one layer every 0.4 s. The boundary carries "CHECKED AGAINST YOUR REGULATOR" over the top and "EVERY WORD · EVERY SIGN · EVERY SYSTEM" underneath; each layer carries its sigil on a chip (turning 8° a second, alternate hoops opposite ways) and its name once the chip is big enough. |
| 1.1 to 3.7 | The rabbit's watch rises past from lower left, swinging, its minute hand going round three times. |
| 1.95 to 3.0 | "Strategy first, then the sword." |
| 2.3 to 5.0 | The knght tumbles past from lower right, turning 1.15 times and growing as it passes close. |
| 3.0 to 3.95 | "We say what we can prove." |
| 3.95 to 4.9 | "No layer is built before Lore.", above the core. |
| 4.2 to 4.9 | The core: Lore, a black disc with a 1.4 px rim and the Lore sigil, rises toward you and slows. |
| 4.6 | If the board is not ready: the fall holds here and the core breathes (±2% every 1.6 s); "The board is being set." After 12 s: "The board could not be set. Climb back up and try again." |
| 4.9 | The hand-off: `land({ from })` with the core's centre and diameter. The tunnel, figures and words fade (0.4 s); the core's ring grows past the board and fades (0.5 s); the bar turns black with a hairline. |
| 5.45 | The fall layer is hidden. The game plays its landing (squares, settle, pieces, the level picker) on its own clock. |

The tunnel is a function of the timeline's time (`fall.js`, `draw(t)`), so a paused timeline shows any moment
exactly. The four lines and the figures are DOM and SVG moved by transform and opacity only.

## 6. The page behind

On open: Lenis stops (unless something else had already stopped it), the body stops scrolling, every other child of
`<body>` becomes `inert` (and is given back on close, exactly those), the address gets `#down-the-rabbit-hole` as a
new history entry (unless it was opened from that address), and focus moves into the dialog. Wheel and touch inside
the overlay are left to the browser (`data-lenis-prevent`), and nothing behind can move. Every key pressed inside the
overlay stops there, so the page's own handlers (the knght's move on the arrow keys, the menu's Escape) never see it.

Climb back up (the bar's button, Escape, an ending's button) goes back through history when the portal added the
entry, so it and the phone's Back do the same thing (a 400 ms fallback closes anyway). On close: the board stops
taking input at once and fades (0.2 s), then `destroy()` and the signal's abort (the game also ends itself when its
signal aborts, so the abort waits for the fade), the page is put back (visible, not inert, overflow as it was, Lenis running, the scroll where it
was), the iris opens on it from where you went in (0.65 s), and focus goes back where it was, without scrolling.
Under reduced motion all of it happens at once.

The page's own frame loops are told nothing, so they must not do work the visitor cannot see: while `html.wl-hide`
is set, `site.js`'s candle light (the hall's `frame`) skips its frames. Without that it wrote styles on the hidden
hall and read layout on every frame, and kept the phone's main thread over 80% busy under a still board.

## 7. QA

- `?wl-qa` on any page exposes `window.KNGHT_WL = { gsap, tl, fall, phase }` once the overlay opens, to pause and
  step the fall (`tl.pause(); tl.seek(2.5, false)`).
- `/?ending=<id>` on the homepage exposes the site's GSAP as `KNGHT_FOOTER.gsap`; the rabbit's run is the top-level
  timeline whose tweens target `.wl-rb div>svg`.
- The game alone: `/lab/wonderland/` (the game's harness, `src/lab/wonderland.astro`; it takes `?fen=`, `?level=`,
  `?seed=` and `?reduce=1`). It exists only under `astro dev`, or in a build made with `PUBLIC_WL_LAB=1 npx astro
  build --outDir <somewhere else>`. A production build has no `/lab/wonderland/`: the live site's only ways to the game
  are the three in section 2, through the rabbit hole.
- After any change, check: the footer's height and the hole against the footer's links at 360, 390, 430 and 1440
  wide; ten presses of the footer knght with no leftovers warning; each way in and each way out, with the scroll
  position, focus, Lenis, overflow and `inert` restored; reduced motion; no CSP errors; and that pages scrolled to the
  footer fetch nothing new until the hole is hovered, focused or tapped.

## 8. Words

Every string is in the KNGHT voice: short plain sentences, no dashes as dashes, no exclamation marks, "knght" for the
piece. The Carroll lines are public domain, and none of them names that piece.
