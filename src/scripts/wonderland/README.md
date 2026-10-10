# Wonderland: the white rabbit, the fall and the board

A hidden way into a game of chess against the Black Queen. A small white rabbit hops along the footer line of
every page, checks its watch and dives into a hole. Follow it (or take the codex's "Follow the rabbit", or open
any page at `#down-the-rabbit-hole`) and the page closes into the hole. You fall about five seconds through the
KNGHT world, which rolls slowly as you go, and land on a chessboard that comes through the looking-glass. "Climb back
up" (or Escape, or Back) plays the fall backwards and puts you exactly where you were.

The **portal** (this folder's top level) owns the rabbit, the overlay, the page behind it and the fall. The
**game** (`game/`) owns everything on the board. They meet in one call, `mount()`, described in section 3.

```
src/scripts/wonderland/
  rabbit.js        eager: the rabbit on the footer line, the ways in, follow(). In the Motion chunk on every page.
                   Its style is in public/assets/css/site.css ("The white rabbit"), not in the chunk.
  watch.js         eager (rabbit.js imports it): RABBIT, the drawing, and toronto(), the watch's clock. Pure: no
                   DOM, no gsap, no strings. The portal and the game take it from the Motion chunk.
  portal.js        lazy chunk 1: the overlay, scroll and focus, Lenis, history, the wall clock, the hand-off, and
                   Climb back up (the fall in reverse, and the page turning back into place)
  fall.js          in chunk 1: the tunnel (canvas) and its roll, the watch and the knght falling past, the four
                   lines, and the rabbit on the way back up
  portal.css       in chunk 1, as a string (?inline), injected once as <style id="wl-css">
  game/index.js    lazy chunk 2: the game. Exports mount(). The portal finds it with a literal glob.
  game/endings.js  the twelve endings: the table and the rules that pick one (section 9)
  game/memory.js   what this browser remembers: one localStorage key (section 9)
  game/souvenir.js its own lazy chunk: "Keep this game", the game sheet drawn on the device (section 10)
  game/cast.js     in chunk 2: the White Rabbit, the Cheshire Cat, Humpty Dumpty and the White Knght (section 11)
  game/figures.js  in chunk 2: the cast's hairline drawings on the 24 grid
  game/cast.css    in chunk 2, as a string (?inline), injected once as <style id="wlg-cast-css">
```

## 1. What a visitor who never finds it pays

Only `rabbit.js`, inside the Motion chunk that every page with a footer already loads. No new request on page load,
and none when the footer comes into view. The portal chunk is fetched when someone points at, focuses or touches the
hole (or the codex's button), and on the press at the latest. The game chunk starts loading the moment the overlay
opens, in parallel with the fall; its worker starts when the board has landed.

**Budget.** The whole rabbit hole may cost every page at most 3.0 KB gzipped. Measured on the production build
against the same files at e9999eb (gzip level 9; brotli is what Vercel sends to browsers that ask for it):

| File (already loaded by every page with a footer) | gzip | brotli | What |
| --- | --- | --- | --- |
| Motion chunk | +2,390 B | +2,127 B | `rabbit.js`: the placement, the run, the markup, the watcher, the ways in, the watch's hands on Toronto time, the pace in the hours, and the memory (the bow, the black rabbit); `watch.js`: the drawing and the Toronto clock |
| `site.css` | +361 B | +277 B | the rabbit's style (`.wl-rb`), and the black rabbit (`.wl-rb.a`) |
| `site.js` | +167 B | +174 B | the codex's third button, the candle light pausing under `html.wl-hide`, and the `knght:codex` listener |
| `stage.*.js` | -18 B | -27 B | only its import line (the Motion chunk's new hash) |
| **In all** | **+2,900 B** | **+2,551 B** | **no new request**, on load or when the footer comes into view |

Round 1 was +2,569 B; round 2's fall added +175 B (the clock in `watch.js` and the listener in `site.js`), and the
cast's footer work +156 B (the real hands, the pace, the memory read, the bow and the black rabbit, less the old fixed
hands). 100 B are left under the ceiling, and the hashes in the import lines move the numbers by a byte or two.

Checked in a browser too: `/`, `/process/`, `/book/`, a world page and `/check/`, at 390 (touch) and 1280 wide,
loaded, scrolled to the footer and left 8 s, fetch exactly the files they fetched at e9999eb.

Keep it that way:

- **No second entry that imports anything lazily.** Vite's preload helper lives inside the Motion chunk only while the
  Motion chunk is the one entry with a dynamic `import()`. A page script with its own `import()` (the lab harness was
  one) makes Rollup move the helper into a shared `preload-helper.*.js`, which every page then fetches. That is why the
  lab is not in `src/pages` (section 7). After a build, `ls dist/_astro | grep -i -E 'preload|watch'` must print
  nothing: `watch.js` stays inside the Motion chunk because `rabbit.js` imports it, and the lazy chunks import it from
  there.
- Measure again after any change: gzip the Motion chunk (level 9) and compare it with a build without the import line
  in `Motion.astro`, and add the `.wl-rb` block of `site.css`.

**Import rules** (they keep the footer's chunk graph as it is; see the preview rule in `../footer/SCENES.md`):

- Wonderland modules import only: `gsap` core (the portal, never a plugin), `chess.js` (the game only),
  `src/lib/sigils.ts` (`fall.js` only) and files in this folder.
- Never import `src/scripts/footer/*`, `src/assets/knght-chess.svg`, `gsap/*` plugins or `motion.js`.
- The game imports nothing from the portal and never imports gsap (it animates with `element.animate`). The portal
  imports the game only through `import.meta.glob('./game/index.js')`.
- The game may import `../watch.js` (RABBIT and the Toronto clock). Nothing else from the top level.
- `watch.js` stays pure and small: no DOM, no gsap, no side effects, no strings (lines live in the lazy files).

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

One way out leads somewhere: the knght's move. The game's `onCodex()` (its "Open the codex") climbs with stage
`codex`; once the climb has finished (focus back, overlay gone, `knght:wonderland` closed) the portal dispatches
`knght:codex` on `document` (`detail: { from: 'wonderland' }`), and `site.js` opens the codex, whose eyebrow already
reads "You found the knght's move". A game without `onCodex` (the lab) dispatches `knght:codex` itself.

## 3. The rabbit (rabbit.js, watch.js)

- **Drawing.** `RABBIT = { outline, watch, eye, minute, hour }` (in `watch.js`; `rabbit.js` re-exports it) on
  the 24 grid: the White Rabbit as a seventh piece of the Story set, drawn fresh. It keeps the king's and bishop's collar (y 10 to 10.9) and skirt (to y 19.4); a rabbit's
  head faces right with its ears swept back, the eye like the knght's, and a pocket watch held out on a short chain.
  On the footer's black it is a solid white figure, the eye cut in black, the watch a hairline (1.1 px), with a
  1.5 px black drop shadow where it passes over the homepage letters.
- **The watch keeps Toronto time.** `toronto(date?)` in `watch.js` gives `{ h, m, open }` for America/Toronto (Intl);
  `open` is Wednesday or Friday from 1 to 5 pm (13:00 to 16:59), the hours for calls and visits. `minute` and `hour`
  both point to 12 at rest; turn them about the face's centre (16.4, 13.85), clockwise in degrees: the minute hand
  `m * 6`, the hour hand `(h % 12) * 30 + m / 2`. Every rabbit shows the real time there. The footer's rabbit reads it
  once, when its run starts (`start()`): its hands are turned with SVG `transform="rotate(a 16.4 13.85)"`, and in the
  hours it is not late, so the hops after its watch beat keep their 0.28 s pace; any other time it hurries at 0.22 s.
  The portal reads the time once, at open: the bar's rabbit shows it, the fall's big watch ends its three turns on
  it, and on the way back up the rabbit says "I'm late." or, in those hours, "Right on time. Calls are open until 5."
  The rabbit waiting at the landing (section 11) says the same. A browser whose Intl cannot tell gets its own clock.
- **It remembers you.** `start()` also reads the rabbit hole's one storage key once (section 9), in a try/catch, and
  uses two flags of it, nothing else: `p`, a game played in this browser, and `a`, every ending found. After a game
  played here the rabbit bows after its watch beat (16 degrees from its feet, 0.24 s down and back, once): in the
  Story set it wears no hat to tip, and a hat would crowd its ears at 32 to 40 px, so it bows. Once all twelve
  endings are found the layer takes class `a` and `site.css` draws the rabbit black with its white line and a white
  eye (`.wl-rb.a`); it still bows. Storage that is missing or throws: a first visit's white rabbit, and no bow.
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
- **Reduced motion.** The hole and the rabbit appear at once, still, the rabbit just left of the hole with its watch out
  and its hands on the time. No bow; the black rabbit is still black.

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
  onCodex,    // the knght's move card's "Open the codex": the portal climbs, then dispatches knght:codex
});
await controller.land({ from: { x, y, d, roll } }); // the board rises out of the core (centre, diameter, the roll)
controller.leaving();                                // the portal is closing: input, timers and her thinking stop
controller.destroy();                                // idempotent: worker, animations, listeners, and host emptied
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

**The controller, round 2** (the header of `game/index.js` is the full text). Besides `land`, `leaving` and `destroy`,
it is what the cast and the souvenir use; neither ever calls `land`, `leaving` or `destroy`.

```js
controller.on(type, fn)   // -> off(). Listeners run synchronously in order, each in try/catch; dropped on destroy
controller.phase          // 'pre' | 'land' | 'pick' | 'you' | 'her' | 'moving' | 'promo' | 'end' | 'gone'
controller.level, controller.ending, controller.hintsLeft
controller.root           // the .wlg element
controller.layer          // <div class="wlg-cast">: last child of .wlg, absolute, inset 0, no pointer events,
                          //   z-index 9 (under the card's 10); its children opt in to taps
controller.reduce, controller.signal, controller.qa   // signal: the game's own, aborted in destroy; qa: { idle, now }
controller.rects()        // boxes in root coordinates: { layout, sq, root, stage, board (with its letters), her,
                          //   herUsed, tag, you, youUsed, panel, status, last (text line boxes), controls, card, promo }
controller.square(sq)     // -> { x, y, size }: the square's centre and size in root coordinates
controller.hint()         // -> Promise<{ from, to, promotion, piece } | null>: her engine at Queen strength, on your
                          //   side; 3 a game; the game's live region says it
```

| Event | Payload | When |
| --- | --- | --- |
| `land` | `{ at }`, 'start' or 'done' | when `land()` begins, and just before it resolves |
| `card` | `{ kind }`, 'pick', 'end', 'confirm' or null | a card shown or hidden ("See the board" hides it) |
| `level` | `{ level }` | a level was chosen |
| `turn` | `{ who }`, 'you' or 'her' | the phase became yours or hers |
| `select` | `{ square }`, or null | you picked up a piece, or put it back |
| `move` | `{ by, move, check, mate, yourMoves, ply }` | a move has landed (chess.js's verbose move, frozen) |
| `capture` | `{ by, piece, square, move }` | right after `move` when something was taken (`piece` 'n' is a knght) |
| `promote` | `{ at, square, piece }`, at 'open', 'done' or 'cancel' | your promotion chooser |
| `takeback` | `{ plies }` | Take back |
| `idle` | `{ on }` | on after 20 s of your move with no input in the game (`qa.idle`); off at the next input |
| `hint` | `{ from, to, promotion, piece, left }` | a hint has arrived |
| `end` | `{ ending }` | the game ended, before the 1.2 s hold |
| `restart` | `{}` | New game or Play again |
| `layout` | `{}` | after a resize has been laid out |
| `climb` | `{}` | from `leaving()` |

Namespaces: the portal uses `.wl`, `.wl-*`, `#wl-*`; the game `.wlg`, `.wlg-*`, `#wlg-*`, and its cast `.wlc-*` (inside
`.wlg-cast`). `--wl-bar-h` is the one shared custom property (the bar's height: 56 px plus the safe area).

## 5. The fall, second by second (on the wall clock)

The fall is one GSAP timeline, made paused: GSAP's ticker never plays it. The portal's `drive()` moves it every
frame to the real time since the overlay opened (`tl.time(t)`, which still fires its `.call()`s in order across a
long jump), and never past 4.6 s while there is no board. So a slow frame, or the main thread stalled for 800 ms, never
stretches it, and GSAP's global `lagSmoothing` (the site's own animations use it) is left alone. `pause()`,
`resume()` and `seek(t)` keep the time; a resume carries on from where it stopped, so waiting at the core is not
skipped. A hidden tab gets no frames: on its return the time jumps to the wall clock, and a fall that ended in the
background lands at once. The climb runs on the same driver (section 6); the landing and the page turn are WAAPI,
which is wall clock already.

| Time (s) | What happens |
| --- | --- |
| 0 | The overlay mounts. The iris covers the page in black except a circle at the origin, with a white rim at .7. |
| 0 to 0.85 | The page closes into the hole: the circle shrinks from the farthest corner to 26 px (34 px on a desktop). |
| 0.35 to 0.75 | The bar (the rabbit, its watch at the time in Toronto, "Down the rabbit hole", Climb back up) fades in. It is above the iris from the start. |
| 0.85 to 1.05 | Inside the rim goes black. At 1.1 the page behind stops painting (`html.wl-hide`). |
| 1.0 to 1.45 | The dive: the mouth glides to the centre and grows past the edges. A faint light at the bottom of the hole. |
| 0.95 to 1.95 | "Down, down, down." (Lewis Carroll) |
| 1.1 to 4.4 | The tunnel: the boundary, then Machinery, Artifacts, Ground, Map, Language, Law, outside in. Hoops come out of the dark and leave past the edge; the boundary passes at 2.0 s, then one layer every 0.4 s. The boundary carries "CHECKED AGAINST YOUR REGULATOR" over the top and "EVERY WORD · EVERY SIGN · EVERY SYSTEM" underneath; each layer carries its sigil on a chip (turning 8° a second, alternate hoops opposite ways) and its name once the chip is big enough. |
| 1.1 to 4.9 | The world rolls, one slow sway each way and never a spin: `roll(t) = 15 · e(t) · sin(2π (t - 1.1) / 3.6)` degrees, clockwise positive, with e easing it in from 1.1 to 1.8 s. +15° as the boundary passes (2.0 s), -15° at 3.8 s, +5.1° at the hand-off, where it holds. The canvas (glow, hoops, chips, arc words, core) and the figures' layer (`.wl-fall__world`) turn about the centre of the hole; the four lines (`.wl-fall__words`), the bar and the iris never do. The hoops turn back against it: a chip's angle is its own, plus its spin, minus `a(dz) · roll`, with `a` 0.5 for the near wall and 0.15 at the deep end (`0.15 + 0.35 · clamp((6 - dz) / 5)`), and the boundary's words move the same way. On screen the near wall swings half the sway and the deep end almost all of it, so it reads as a well. |
| 1.1 to 3.7 | The rabbit's watch rises past from lower left, swinging. Its minute hand goes round three times and ends on the minute in Toronto; the hour hand ends on the hour. |
| 1.95 to 3.0 | "Strategy first, then the sword." |
| 2.3 to 5.0 | The knght tumbles past from lower right, turning 1.15 times and growing as it passes close. The figures start at 1.25 of the height and end at -0.3, so the roll never shows them early. |
| 3.0 to 3.95 | "We say what we can prove." |
| 3.95 to 4.9 | "No layer is built before Lore.", above the core. |
| 4.2 to 4.9 | The core: Lore, a black disc with a 1.4 px rim and the Lore sigil, rises toward you and slows. |
| 4.6 | If the board is not ready: the fall holds here and the core breathes (±2% every 1.6 s); "The board is being set." After 12 s: "The board could not be set. Climb back up and try again." |
| 4.9 | The hand-off: `land({ from })` with the core's centre and diameter and the world's roll (`from.roll`, +5.1°). The tunnel, figures and words fade (0.4 s); the core's ring grows past the board and fades (0.5 s); the bar turns black with a hairline. |
| 5.45 | The fall layer is hidden. The game plays its landing on its own (WAAPI) clock, below. |

**The landing, through the looking-glass** (`game/board.js`, `land(from)`; ms from the call):

| ms | What happens |
| --- | --- |
| 0 to 850 | The board rises out of the core (translate and scale to 1.012 at 70%, then 1). The rise is written in the board's own turned frame, so it still leaves the core's centre. |
| 0 to 600 | The squares, ring by ring from the centre (45 ms a ring, 420 ms each). |
| 60 to 450 | The pieces fade in, row by row (30 ms a row). They no longer drop, so the mirrored position can be read. |
| 200 to 450 | The frame and its letters, which read h g f e d c b a in the mirror. |
| 0 to 1180 | The looking-glass and the tilt, one animation of 24 keyframes on the board's parent (`.wlg-boardwrap`): `perspective(1600px) rotate(R) rotateY(Y)`. Y is 180 (the back of the board faces you, mirrored: `backface-visibility` stays visible) until 500 ms, then turns to 0 by 1180 ms (cubic-bezier(.65,0,.35,1); edge-on near 840 ms). R holds the world's roll until 680 ms, then the world rights itself in half a second: an ease-out a little past square (-12% at 80%), then square. |
| 1180 to about 1500 | Each piece settles (scaleY .95 to 1, 120 ms), row by row. |
| 1250 | The rows, the panel and the level picker rise (`game/index.js`), after the board faces you. |
| 1560 at most | `land()` resolves. |

Without `from` (the lab) the tilt starts at -6°. Under reduced motion there is no fall, no mirror and no tilt.

The tunnel is a function of the timeline's time (`fall.js`, `draw(t)`), so a paused timeline shows any moment
exactly. The four lines and the figures are DOM and SVG moved by transform and opacity only.

## 6. The page behind, and the way back up

On open: Lenis stops (unless something else had already stopped it), the body stops scrolling, every other child of
`<body>` becomes `inert` (and is given back on close, exactly those), the address gets `#down-the-rabbit-hole` as a
new history entry (unless it was opened from that address), and focus moves into the dialog. Wheel and touch inside
the overlay are left to the browser (`data-lenis-prevent`), and nothing behind can move. Every key pressed inside the
overlay stops there, so the page's own handlers (the knght's move on the arrow keys, the menu's Escape) never see it.

Climb back up (the bar's button, Escape, an ending's buttons through the game's `onClimb` and `onCodex`) goes back
through history when the portal added the entry, so it and the phone's Back do the same thing (a 400 ms fallback
closes anyway). On close the game's `leaving()` is called first, if it has one (it stops input, timers and her
thinking), the board takes no more input, and the fall plays backwards on its own clock (c, seconds), moving the
fall's timeline (F) with its events suppressed and doing each step itself. From the board:

| c | F | What happens |
| --- | --- | --- |
| 0 to 0.25 | 5.40 to 4.90 | The board sinks (opacity to 0, scale to .94, power1.in) as the ring that grew past it closes back onto the core. The bar fades and is then hidden. The fall shows again. |
| 0.05 to 0.25 | | The White Rabbit fades in, standing on Lore in place of its sigil (1.15 r tall, its feet 0.55 r below the centre, scaled with the core every frame, rolled with the world). |
| 0.25 | | `destroy()`, then the game's signal aborts. Focus waits on the dialog. |
| 0.15 to 0.65 | | The rabbit checks its watch (-14°, 10°, 0 from the top of its chain). |
| 0.30 to 1.20 | | Its line above the core, never rolled: "I'm late.", or on Wednesday and Friday from 1 to 5 pm, Toronto time, "Right on time. Calls are open until 5." |
| 0.25 to 1.45 | 4.90 to 1.45 | Up through the hoops, slow off the core and then faster (F = 4.9 - 3.45 u², u = (c - .25) / 1.2): the roll and the counter-turn run backwards, the knght and the watch fall past downward. The rabbit fades with the core (F 4.45 to 4.2, c about .68 to .79). The four lines stay hidden. |
| 1.45 to 1.90 | 1.45 to 0.85 | The iris is on again, black inside. The mouth shrinks to the hole and glides back to where you went in. At F 1.10 (c 1.71) the page is put back behind it: visible, not inert, overflow as it was, Lenis running, the scroll exactly where it was, turned -6° about the hole. From F 1.05 it shows inside the mouth. |
| 1.90 to 2.50 | 0.85 to 0 | The iris opens on the page; the rim fades from c 2.25. |
| 1.90 to 2.60 | | The page turns back into place, -6° to 0 (700 ms, cubic-bezier(.33,0,.15,1)). |
| 2.60 | | Focus goes back where it was (the hole, or what the codex gave), without scrolling; the overlay goes; `knght:wonderland` closed; then `knght:codex` after the knght's move. |

From the fall itself there is no sink: the game, if it had arrived, ends at once, and the climb enters the part of the
table that F is in, at the same rates (2.875 fall-seconds a second in the tunnel, power1.in only from above F 4.2;
1.333 in the mouth; 1.417 in the iris). The rabbit shows when the climb starts at the core (F 4.45 or later). From the
iris (before 1.1 s) the page was never hidden: it is given back at once, and nothing turns. From the error line the
fall comes back up to full and climbs the same way.

**The page turn** is a same-document view transition, so no element of the page is ever transformed (the nav, the
hall, `.totop` and ScrollTrigger pins stay as they are). At F 1.10 the portal names itself `wl` (its own group, kept
live above the page, so the iris goes on opening), sets the world plates' own `view-transition-name`s to `none` for
the moment, adds `html.wl-turn`, and puts the page back inside `document.startViewTransition()`. `portal.css` hides
both old pictures and turns off every default animation (these rules outrank `site.css`'s page to page ones); the only
animation is the turn on `::view-transition-new(root)`, added at `vt.ready` with a delay until c 1.90 and
`fill: backwards`, its origin the hole. On `vt.finished` the names come back and the class goes. The fall layer is
hidden as the page comes back (nothing is left to draw above F 1.1, and a canvas inside a view transition can show a
stale frame). Without `startViewTransition`, if it throws, or with the tab hidden, the page is put back plainly and
the iris opens level, as in round 1.

**Skipping.** Escape, Enter, Space or a tap while the page is still hidden (phase `rise`) jumps to the end; the steps
still run in order (the game ends, the page is put back without the turn, the overlay goes). Once the page is back
(phase `climb`) the overlay takes no taps, as before. Under reduced motion all of it happens at once: no sink, no
rabbit, no turn.

The page's own frame loops are told nothing, so they must not do work the visitor cannot see: while `html.wl-hide`
is set, `site.js`'s candle light (the hall's `frame`) skips its frames. Without that it wrote styles on the hidden
hall and read layout on every frame, and kept the phone's main thread over 80% busy under a still board.

## 7. QA

- `?wl-qa` on any page exposes `window.KNGHT_WL = { gsap, tl, fall, phase, clock, climb(stage), game }` once the
  overlay opens. `clock` is whichever driver is running, the fall's or the climb's: `clock.pause()`,
  `clock.seek(t)`, `clock.resume()`, `clock.t`. Stills of the fall: `clock.pause(); clock.seek(2.0)` (seek forward:
  the timeline's calls fire as it passes them). `climb(stage)` starts a climb (through history, so wait for
  `phase === 'rise'`); the clock is then the climb's (c). `fall.core()` gives the hand-off (`{ x, y, d, roll }`);
  `game` is the controller.
- Stills of the landing: seek the fall to 4.9 (the hand-off calls `land()`), then pause every animation in
  `document.getAnimations()` and set its `currentTime` to the ms you want (keep the list from the first still: a
  paused animation past its end is no longer listed). Stills of the page turn: the animation on
  `::view-transition-new(root)` is in the same list.
- Judge motion from paused or stepped timelines, never from live playback in a software-rendered browser.
- `/?ending=<id>` on the homepage exposes the site's GSAP as `KNGHT_FOOTER.gsap`; the rabbit's run is the top-level
  timeline whose tweens target `.wl-rb div>svg`.
- The game alone: `/lab/wonderland/` (the game's harness, `src/lab/wonderland.astro`; it takes `?fen=`, `?level=`,
  `?seed=` and `?reduce=1`, and for round 2 `?moves=` (SAN moves played at once), `?idle=` (ms before the Cheshire
  Cat's quiet spell), `?now=` (a date for the rabbit's watch, e.g. `2026-10-14T14:30:00-04:00` is in the hours) and
  `?preview=1` (`KNGHT_WLG.qaPreview(id)` shows any ending's card). The controller is `window.KNGHT_WLG`. It exists
  only under `astro dev`, or in a build made with `PUBLIC_WL_LAB=1 npx astro build --outDir <somewhere else>`. A
  production build has no `/lab/wonderland/`: the live site's only ways to the game are the three in section 2,
  through the rabbit hole. (The lab imports the game on its own, so its build has a `watch.*.js` and a preload helper;
  a production build must have neither.)
- The cast: stills of a figure's motion come from its own animations (`el.getAnimations()`, paused, `currentTime`
  set). A fen where she takes a free knght at Queen level shows the White Knght's fall:
  `?fen=3qk3/8/8/3N4/8/8/8/4K3%20b%20-%20-%200%201`, then Queen. Humpty speaks at the first promotion:
  `?fen=4k3/1P6/8/8/8/8/8/4K3%20w%20-%20-%200%201`. `?idle=1500` brings the grin.
- The footer's memory: set `localStorage['knght-wonderland']` to `{"v":1,"p":1,"f":[],"a":0}` before the page loads
  for the bow, with `"a":1` for the black rabbit.
- After any change, check: the footer's height and the hole against the footer's links at 360, 390, 430 and 1440
  wide; ten presses of the footer knght with no leftovers warning; each way in and each way out (from the board, from
  the fall, from the iris, skipped), with the scroll position, focus, Lenis, overflow, `inert` and the plates'
  view-transition names restored; reduced motion; no CSP errors; and that pages scrolled to the footer fetch nothing
  new until the hole is hovered, focused or tapped. For the cast: at 360x640, 375x667, 390x844, 430x932, 768x1024,
  844x390, 1280x800 and 1440x900, no cast box over the board and its letters, the used part of either row, the status
  and last lines, a control, the card or the promotion chooser, at the landing, the level, the grin, a take back
  and a capture; Tab reaches the grin after the controls; the footer's hands with the page's clock moved into the
  hours and out of them.

## 8. Words

Every string is in the KNGHT voice: short plain sentences, no dashes as dashes, no exclamation marks, "knght" for the
piece. The Carroll lines are public domain, quoted exactly where they are quoted, and none of them names that piece.
The game's strings are all in `game/words.js` (the cast's in `W.cast`); the portal's few are in `portal.js` and
`fall.js`. `watch.js` holds none.

## 9. Endings and memory (game/endings.js, game/memory.js)

Every finished game lands on exactly one of twelve endings; the rules are total (every outcome has a row) and
exclusive (the first that applies wins). `endings.js` holds the table in tally order and `classify(facts)`, which is
pure and tested in node; its header is the full text.

| Kind | Endings, in the order they are tried |
| --- | --- |
| Win (you mate) | The knght's move (mated by a knght; it offers the codex, section 2), She tips her king (Queen level), Alice becomes queen (a pawn became a queen), Quick work (under 20 of your moves), Clean (nothing of yours lost), The long game (50 or more of your moves), Checkmate |
| Loss (she mates) | Too fast (under 10 of your moves), The long loss |
| Draw | Stalemate; Round and round (threefold, fifty moves, not enough pieces) |
| Resign | Tip your king (asked first, then your king lies down) |

A finished game becomes one frozen ending model: the `end` event's payload, `controller.ending`, and the souvenir's
input. The live region says the last move and the ending at once; the card follows 1.2 s later with the ending's name,
its line, the facts, the tally (12 dots and "N of 12 endings found."), the actions and a quiet row.

**Memory.** One localStorage key, `knght-wonderland`: `{"v":1,"p":1,"f":["knght","quick"],"a":0}`. `p` is 1 once a
move has been made in some game; `f` the endings found, by id, each once; `a` 1 when all twelve are. Nothing personal,
no dates, no counts, and nothing is sent anywhere. Every read and write is in a try/catch; storage that is missing,
blocked or full leaves a copy in `memory.js` that keeps the tally true for the page view, and a write merges what is
stored first, so another tab's finds are kept. The footer's rabbit reads the key once for `p` and `a` (section 3).

## 10. The souvenir (game/souvenir.js)

"Keep this game", on every ending card, draws a black and white game sheet on the device (no server) and shares or
saves it. It is its own lazy chunk, fetched only once an ending card is showing; `game/index.js` finds it with a
literal glob, prepares the sheet when the card comes up and calls it on the press. The header of `game/souvenir.js`
is its documentation.

## 11. The cast (game/cast.js, game/figures.js, game/cast.css)

Four of Carroll's characters around the board, drawn fresh as KNGHT hairline figures in the Story set's language: the
24 grid, round caps and joins, bodies black, lines white, a hairline of 1.25 px (1.5 px from 760 px wide) that never
scales. Nothing is copied from Tenniel or a cartoon: no fur, no faces with brows, nothing a chess piece would not carry.
`figures.js` holds the drawings; the White Rabbit is `RABBIT` from `watch.js` (only `cast.js` imports the top level).
`index.js` finds `cast.js` with a literal eager glob and calls `mountCast(controller)` once the board is built; the
cast only listens and asks for a hint. It never calls `land`, `leaving` or `destroy`, never writes to the game's live
region, and never takes the game's focus. Figures and captions are `aria-hidden`; the grin is its one control.

**Where.** Everything is in the game's layer (`controller.layer`), placed in root coordinates from `controller.rects()`
whenever the game lands, lays out, shows or hides a card, changes turn or moves. Taken: the board with its letters, the
used part of each row (name, watch and taken pieces), the level tag, the status and last-move lines, every control,
the card and the promotion chooser, each with 6 px to spare, and the root's edges inset 8. The slots:

| Slot | Where |
| --- | --- |
| head, foot | the stage's width, above it and below it |
| youEnd | the right end of your row, 40 px tall, from 72 px in |
| controlsEnd | the right end of the controls row |
| gap | landscape only: between the board and the panel |
| columnTop, columnBottom | landscape only: the panel's column above the status, and below the controls |

A figure needs 56 px of height in head, foot and the columns; a caption needs 22. A character with no room does not
come, and the moment passes. A figure the layout now crowds moves to its next place or goes. Any card but the level
picker sends the whole cast away; under the picker only the landing rabbit may stay, clear of it. On a 360 x 640 phone
the board leaves no head or foot: the rabbit and the White Knght do not come, and Humpty and the grin speak nowhere.

| Who | Where (in order) | When | What |
| --- | --- | --- | --- |
| The White Rabbit, 48 px (56 from 760) | foot, left, 8 px in; head; landscape: columnBottom, columnTop | 1.3 s after the landing starts (reduced motion: when it is done) | It checks its watch (Toronto time) and bobs twice; "I'm late.", or Wednesday and Friday from 1 to 5 pm "Right on time. Calls are open until 5."; at 4.6 s three hops toward the nearer edge and gone |
| The Cheshire Cat: only its eyes and grin, 64 x 32 (80 x 40) | head, right; youEnd; landscape: columnTop, youEnd | `idle` on, while hints are left | The grin comes first, then the eyes; they blink every 4 to 6 s. "That depends a good deal on where you want to get to." A press (or Enter) asks `controller.hint()`; the eyes go, then the grin |
| Humpty Dumpty on his wall, 36 x 40 (44 x 48) | controlsEnd, right; foot; landscape: gap, his wall's foot on the board's bottom edge; columnBottom | from the level chosen until a card, the end or the climb | "When I use a word, it means just what I choose it to mean." at the first take back and the first promotion of a game, wobbling on his wall |
| The White Knght, 56 (64) | foot, right; head; landscape: columnBottom, columnTop | 120 ms after she takes one of your knghts | The rider tips back, falls head first and lands beside the horse with one bounce. "It's my own invention." Gone after 5 s |

**The hint.** The grin is a `<button>`, at least 56 x 40, "Ask the Cheshire Cat for a hint. N left.", in the tab order
after the panel's controls while it shows. Tab on the way to it does not send it away (the cast notes the key before
the game's idle clock hears it). Her engine at Queen strength suggests your move; the game's live region says it
("The Cheshire Cat suggests your knght from g1 to f3."), and the cast draws it over the board as a dotted path that
takes no taps: white dots on black halos every 0.22 of a square, a knght's path as an L (two squares the long way,
then one), and a dotted ring on the destination. It goes when you pick up a piece, move, start again, a card shows,
the climb starts, or after 10 s. Three a game; the grin does not come back once they are used. A keyboard press puts
focus back on the board.

**Captions.** One at a time, Cormorant Garamond italic 15 px (14 under 400 wide), two lines at most, beside the
speaker if there is room (160 px for Humpty), else above or below it in its slot, else in a free text slot, else
nowhere. In 200 ms, held 3.2 s (the Cat 4 s), out 300 ms.

**Reduced motion.** Fades only. The rabbit stands still with its watch out and leaves at 4 s; the grin and eyes fade in
200 ms with no stagger over 100 ms and do not blink; Humpty does not wobble; the White Knght is already down; the
path is drawn at once.

**Taking it down.** `mountCast` returns `{ destroy }`, which the game calls first in its own `destroy()`; the cast also
listens to the game's signal. Its timers, animations, listeners and elements all go; only its `<style>` stays, like
the game's.
