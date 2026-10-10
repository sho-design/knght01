// The Black Queen's game. The portal loads this module when someone follows the rabbit and calls:
//   const controller = mount(host, { reduce, signal, onClimb, track, bookHref, onCodex })
//   controller.land({ from: { x, y, d, roll } })  plays the landing, resolves when the level picker is up and focused
//   controller.leaving()                    the portal is closing: input, timers and her thinking stop, 'climb' fires
//   controller.destroy()                    ends the worker, the animations and the listeners, and empties host
// The game touches nothing outside host except its own <style id="wlg-css"> (and the cast's <style id="wlg-cast-css">).
// fen, seed, level, moves and qa are for the lab only. See src/scripts/wonderland/README.md for the whole contract.
//
// THE CONTROLLER (round 2). The cast (./cast.js) and the souvenir (./souvenir.js) are found by literal globs below, so
// the game works with either file missing. The cast must never call land, destroy or leaving.
//   on(type, fn) -> off()   listeners run synchronously in subscription order, each in try/catch; dropped on destroy
//   phase                   'pre' | 'land' | 'pick' | 'you' | 'her' | 'moving' | 'promo' | 'end' | 'gone'
//   level, ending, hintsLeft
//   root                    the .wlg element
//   layer                   <div class="wlg-cast">: the last child of .wlg, absolute, inset 0, pointer-events none,
//                           z-index 9 (under the card's 10). Children with pointer-events:auto take taps.
//   reduce, signal, qa      signal is the game's own AbortSignal (aborted in destroy); qa = opts.qa || {} ({ idle, now })
//   rects()                 boxes in root (.wlg border box) coordinates, { x, y, w, h } or null:
//                           { layout, sq, root, stage, board (frame and its rank and file labels), her, herUsed (name,
//                           watch and her taken pieces), tag, you, youUsed ("You" and your taken pieces), panel, status,
//                           last (status and last are the text's own line boxes, joined), controls: [each visible one],
//                           card, promo }
//   square(sq)              -> { x, y, size }: the square's centre and size in root coordinates
//   hint()                  -> Promise<{ from, to, promotion, piece } | null>. null unless it is your move, no card is up
//                           and a hint is left (3 a game). Her engine at Queen strength suggests your move; the live
//                           region says it; 'hint' fires; track('rabbit_hint', { left }).
//   qaPreview(id)           with qa.preview only: shows that ending's card from a made-up game. Never remembered.
//
// EVENTS (type: payload)
//   land { at: 'start' | 'done' }    when land() begins, and just before it resolves
//   card { kind: 'pick' | 'end' | 'confirm' | null }   a card shown or hidden ("See the board" hides; "See the result"
//                                    shows 'end' again)
//   level { level }                  a level was chosen
//   turn { who: 'you' | 'her' }      the phase became 'you' or 'her'
//   select { square | null }         you picked up a piece, or put it back
//   move { by, move, check, mate, yourMoves, ply }   a move has landed on the board (move: chess.js's verbose move,
//                                    frozen), in the same tick as its sentence in the live region. Your first move of a
//                                    game marks memory.played() just before.
//   capture { by, piece, square, move }   right after 'move' when something was taken (piece 'n' is a knght)
//   promote { at: 'open' | 'done' | 'cancel', square, piece? }   your promotion chooser
//   takeback { plies }
//   idle { on }                      on after 20 s (qa.idle) of your move with no pointerdown or keydown in host (the
//                                    cast's layer does not count; paused while a card is up); off at the next input, a
//                                    change of phase or a card. Off is only sent after an on.
//   hint { from, to, promotion, piece, left }
//   end { ending }                   inside finish(), before the 1.2 s hold (it counts even if New game follows)
//   restart {}                       New game or Play again
//   layout {}                        after a resize has been laid out
//   climb {}                         from leaving()
//
// THE ENDINGS (endings.js has the table and the rules; memory.js keeps the tally). A finished game becomes one frozen
// ending model, passed to 'end', kept as controller.ending and given to the souvenir. The live region speaks the last
// move and the ending at once; the card follows 1.2 s later: eyebrow (its name), the line, the credit (a quote), the
// facts, the tally (12 dots and "N of 12 endings found."), the actions, and a quiet row: Keep this game (with the
// souvenir) and See the board. The knght's move offers Open the codex: opts.onCodex(), or else knght:codex on document.
// Tip your king (resign) asks first; then your king lies down and the ending is 'tip'. Winning at Queen level, her king
// lies down 300 ms after the mate.
import css from './game.css?inline';
import { SPRITE, glyph } from './set.js';
import { createRules } from './rules.js';
import { createBoard } from './board.js';
import { bindBoard, bindPromo } from './input.js';
import { createEngine } from './engine.js';
import { W, LEVELS, PIECE_TITLE, sayMove, levelName } from './words.js';
import { ENDINGS, ENDING_COUNT, byId, makeEnding } from './endings.js';
import * as memory from './memory.js';

// Wave 2: the cast is bundled with the game when the file exists ({} until then); the souvenir is its own lazy chunk,
// fetched only once an ending card is showing (undefined until the file exists).
const CAST = Object.values(import.meta.glob('./cast.js', { eager: true }))[0];
const KEEP = import.meta.glob('./souvenir.js')['./souvenir.js'];

const BUDGET = { pawn: 150, knght: 600, queen: 1500 };
const HOLD = 1200; // ms between the last move of a game and its ending card
const IDLE_MS = 20000;
const HINTS = 3;
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const WORTH = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
let remembered = null; // the last level chosen, kept in module memory only

export function mount(host, opts = {}) {
  const reduce = !!opts.reduce;
  const bookHref = opts.bookHref || '/book/';
  const qa = opts.qa || {};
  const IDLE = qa.idle > 0 ? qa.idle : IDLE_MS;
  const track = (name, params) => { try { if (opts.track) opts.track(name, params); } catch {} };

  if (!document.getElementById('wlg-css')) {
    const s = document.createElement('style');
    s.id = 'wlg-css';
    s.textContent = css;
    document.head.append(s);
  }

  host.innerHTML = `<div class="wlg" data-phase="pre" data-layout="portrait">${SPRITE}<i class="wlg-probe" aria-hidden="true"></i>`
    + '<p class="sr-only" aria-live="polite" data-wlg-live></p>'
    + '<div class="wlg-stage">'
    + '<div class="wlg-who wlg-who--her"><span class="wlg-dot" aria-hidden="true"></span>'
    + `<span class="wlg-name">${W.her}</span>`
    + '<svg class="wlg-watch" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><circle cx="7" cy="7" r="6.3"/><path class="wlg-hand" d="M7 7V3.1"/></svg>'
    + '<span class="wlg-taken" aria-hidden="true"></span><span class="wlg-tag"></span></div>'
    + `<div class="wlg-boardwrap"><p class="sr-only" id="wlg-help">${W.boardHelp}</p></div>`
    + `<div class="wlg-who wlg-who--you"><span class="wlg-dot" aria-hidden="true"></span><span class="wlg-name">${W.you}</span><span class="wlg-taken" aria-hidden="true"></span></div>`
    + '<div class="wlg-panel"><p class="wlg-status"></p><p class="wlg-last"></p>'
    + `<div class="wlg-controls"><button type="button" class="link" data-act="result" hidden>${W.result}</button><button type="button" class="link" data-act="back">${W.takeBack}</button><button type="button" class="link" data-act="new">${W.newGame}</button><button type="button" class="link" data-act="resign">${W.resign}</button></div></div>`
    + '<section class="wlg-card" hidden tabindex="-1" aria-labelledby="wlg-card-h"></section>'
    + '</div><div class="wlg-cast"></div></div>';

  const $ = (s) => host.querySelector(s);
  const root = $('.wlg'), probe = $('.wlg-probe'), live = $('[data-wlg-live]'), stage = $('.wlg-stage');
  const wrap = $('.wlg-boardwrap'), card = $('.wlg-card'), statusEl = $('.wlg-status'), lastEl = $('.wlg-last');
  const herRow = $('.wlg-who--her'), youRow = $('.wlg-who--you'), panel = $('.wlg-panel'), tag = $('.wlg-tag');
  const herTaken = herRow.querySelector('.wlg-taken'), youTaken = youRow.querySelector('.wlg-taken'), hand = $('.wlg-hand');
  const backBtn = $('[data-act="back"]'), newBtn = $('[data-act="new"]'), resultBtn = $('[data-act="result"]');
  const resignBtn = $('[data-act="resign"]'), layer = $('.wlg-cast');

  const rules = createRules(opts.fen, opts.moves);
  const board = createBoard(wrap, { reduce });
  board.squares.setAttribute('role', 'group');
  board.squares.setAttribute('aria-label', W.boardLabel);
  board.squares.setAttribute('aria-describedby', 'wlg-help');
  const engine = createEngine();

  const ac = new AbortController();
  const signal = ac.signal;
  const timers = new Set();
  let destroyed = false, left = false, landing = null, phase = 'pre', level = null, sel = null, targets = new Map();
  let promoAt = null, promoFresh = false, token = 0, watch = null, flip = false, peeking = false, sqPx = 0;
  let cardKind = null, ending = null, hintsLeft = HINTS, hinting = null, playedThis = false;
  let seed = (opts.seed >>> 0) || ((Math.random() * 4294967296) >>> 0);
  const nextSeed = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const sleep = (ms) => new Promise((r) => { const t = setTimeout(() => { timers.delete(t); r(); }, Math.max(0, ms)); timers.add(t); });

  // The live region. A trailing space that comes and goes makes a repeated sentence speak again.
  function say(text) { flip = !flip; live.textContent = text + (flip ? ' ' : ''); }

  /* ----- The emitter: what the cast (and anything else) can listen to ----- */
  const subs = new Map();
  function on(type, fn) {
    if (destroyed || typeof fn !== 'function') return () => {};
    if (!subs.has(type)) subs.set(type, []);
    subs.get(type).push(fn);
    return () => { const l = subs.get(type); const i = l ? l.indexOf(fn) : -1; if (i >= 0) l.splice(i, 1); };
  }
  function emit(type, payload = {}) {
    const l = subs.get(type);
    if (!l || !l.length || destroyed) return;
    for (const fn of [...l]) { try { fn(payload); } catch (e) { console.error(e); } }
  }

  /* ----- Size: one square in whole pixels, from the room the portal gives ----- */
  function layout() {
    if (destroyed) return;
    const w = host.clientWidth || window.innerWidth, h = probe.offsetHeight || window.innerHeight;
    const gut = w >= 760 ? 32 : 16, side = w >= 1100 ? 320 : 280;
    // Portrait: 20 px either side of the board, so a 360 px phone still gets 40 px squares (the smallest tap target).
    const tall = Math.floor(Math.min((w - 40) / 8, (h - 220) / 8, 72));
    const wide = Math.floor(Math.min((h - 2 * gut - 24) / 8, (w - side - 96) / 8, 80));
    const landscape = (w >= 760 && wide > tall) || (w < 760 && w > h);
    const sq = Math.max(24, landscape ? wide : tall);
    sqPx = sq;
    root.dataset.layout = landscape ? 'landscape' : 'portrait';
    root.toggleAttribute('data-compact', landscape && h < 480);
    root.style.setProperty('--sq', `${sq}px`);
    root.style.setProperty('--gut', `${gut}px`);
    root.style.setProperty('--panel', `${side}px`);
    // The piece stroke in screen pixels: 1.25 under 52 px squares, 1.5 to 72, 1.75 above; written in grid units.
    const px = sq < 52 ? 1.25 : sq <= 72 ? 1.5 : 1.75;
    root.style.setProperty('--wlg-sw', (px * 24 / (0.88 * sq)).toFixed(3));
    board.setSize(sq);
    if (!card.hidden) placeCard();
    emit('layout', {});
  }
  let frame = 0;
  const ro = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(layout); });
  ro.observe(host);
  ro.observe(probe);

  /* ----- Idle: the Cheshire Cat waits for a quiet board ----- */
  let idleT = 0, idleOn = false;
  function idleStop() {
    clearTimeout(idleT);
    idleT = 0;
    if (idleOn) { idleOn = false; emit('idle', { on: false }); }
  }
  function idleArm() {
    clearTimeout(idleT);
    idleT = 0;
    if (destroyed || left || phase !== 'you' || !card.hidden) return;
    idleT = setTimeout(() => {
      idleT = 0;
      if (!destroyed && !left && phase === 'you' && card.hidden && !idleOn) { idleOn = true; emit('idle', { on: true }); }
    }, IDLE);
  }
  const poke = (e) => {
    if (e.target instanceof Element && e.target.closest('.wlg-cast')) return;
    idleStop();
    idleArm();
  };
  host.addEventListener('pointerdown', poke, { signal, capture: true });
  host.addEventListener('keydown', poke, { signal, capture: true });

  // Every change of phase goes through here: the page is redrawn, the idle clock follows, and 'turn' is sent.
  function go(p) {
    const changed = phase !== p;
    phase = p;
    refresh();
    if (!changed) return;
    idleStop();
    if (p === 'you' || p === 'her') emit('turn', { who: p });
    idleArm();
  }

  /* ----- Cards: centred over the board, kept inside the screen ----- */
  function placeCard() {
    const st = stage.getBoundingClientRect(), b = wrap.getBoundingClientRect(), hr = host.getBoundingClientRect();
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const cw = Math.round(Math.min(400, Math.max(b.width - 24, 280), vw - 32));
    card.style.width = `${cw}px`;
    const ch = card.offsetHeight, room = probe.offsetHeight || window.innerHeight;
    const left = Math.max(16, Math.min(b.left + b.width / 2 - cw / 2, vw - 16 - cw));
    const top = Math.max(hr.top + 8, Math.min(b.top + b.height / 2 - ch / 2, hr.top + room - 8 - ch));
    card.style.left = `${Math.round(left - st.left)}px`;
    card.style.top = `${Math.round(top - st.top)}px`;
    for (const row of [herRow, youRow]) {
      const r = row.getBoundingClientRect();
      row.toggleAttribute('data-covered', top < r.bottom && top + ch > r.top && left < r.right && left + cw > r.left);
    }
  }
  // kind: 'pick' | 'end' | 'confirm'. html null shows the card that was put aside ("See the result").
  function showCard(html, { rise = !reduce, delay = 0, kind = cardKind, end = null } = {}) {
    if (html != null) card.innerHTML = html;
    cardKind = kind;
    card.dataset.card = kind;
    if (kind === 'end' && end) card.dataset.end = end;
    else if (kind !== 'end') delete card.dataset.end;
    setPeek(false);
    card.hidden = false;
    board.squares.inert = true;
    placeCard();
    if (rise) card.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay, easing: EASE_OUT, fill: 'backwards' });
    idleStop();
    controls();
    emit('card', { kind });
  }
  function uncover() {
    herRow.removeAttribute('data-covered');
    youRow.removeAttribute('data-covered');
  }
  function hideCard() {
    const was = !card.hidden;
    setPeek(false);
    card.hidden = true;
    card.inert = false;
    card.innerHTML = '';
    cardKind = null;
    delete card.dataset.card;
    delete card.dataset.end;
    board.squares.inert = false;
    uncover();
    controls();
    if (was) emit('card', { kind: null });
    idleArm();
  }
  // After an ending, "See the board" puts the card aside and leaves the final position to look at (and, by
  // keyboard, to read square by square). A tap on the board, Enter on a square or "See the result" brings it back.
  function setPeek(on) {
    peeking = on;
    root.toggleAttribute('data-peek', on);
    resultBtn.hidden = !on;
  }
  function peek() {
    if (phase !== 'end' || card.hidden) return;
    const had = card.contains(document.activeElement);
    setPeek(true);
    card.hidden = true;
    board.squares.inert = false;
    uncover();
    if (had) board.setCursor(board.cursor, true); // focus stays on the board, so the keyboard can read it
    say(W.peekLive);
    emit('card', { kind: null });
  }
  function unpeek() {
    if (phase !== 'end' || !peeking) return;
    showCard(null, { kind: 'end' });
    focusCard();
  }
  function focusCard() { const b = card.querySelector('.btn'); if (b) b.focus(); }

  /* ----- What the page shows: markers, labels, the two rows, the status ----- */
  function controls() {
    // Take back and Tip your king need a game in play, no card up and a move of yours on the board.
    const playing = ['you', 'her', 'promo'].includes(phase) && card.hidden && rules.canTakeBack();
    backBtn.setAttribute('aria-disabled', String(!playing));
    newBtn.setAttribute('aria-disabled', String(['pre', 'land', 'pick', 'gone'].includes(phase)));
    resignBtn.setAttribute('aria-disabled', String(!(playing && phase !== 'promo')));
  }
  function refresh() {
    if (destroyed) return;
    root.dataset.state = phase;
    const last = rules.last();
    const check = phase !== 'pick' && rules.isCheck() ? rules.kingSquare(rules.turn()) : null;
    const t = new Map();
    for (const [to, ms] of targets) t.set(to, ms[0].captured ? 'capture' : 'target');
    board.mark({ sel, targets: t, last: last ? [last.from, last.to] : null, check });
    board.label(rules.get);

    const mover = phase === 'moving' && last ? last.color : null;
    herRow.toggleAttribute('data-turn', phase === 'her' || mover === 'b');
    youRow.toggleAttribute('data-turn', phase === 'you' || phase === 'promo' || mover === 'w');
    const took = { w: [], b: [] };
    for (const m of rules.history()) if (m.captured) took[m.color].push(m.captured);
    const row = (list, color) => list.sort((a, b) => WORTH[b] - WORTH[a]).map((p) => glyph(p, color)).join('');
    youTaken.innerHTML = row(took.w, 'b');
    herTaken.innerHTML = row(took.b, 'w');
    tag.textContent = level ? W.levelTag(level) : '';

    const inCheck = rules.isCheck();
    statusEl.textContent = phase === 'you' ? (inCheck ? W.checkYou : W.yourMove)
      : phase === 'her' ? (inCheck ? W.checkHer : W.thinking)
      : phase === 'promo' ? W.promoting
      : phase === 'end' ? statusEl.textContent
      : phase === 'moving' ? statusEl.textContent : '';
    lastEl.textContent = last && phase !== 'pick' ? sayMove(last, /\+$/.test(last.san)) : '';
    controls();
  }

  /* ----- Your side ----- */
  function select(s, quiet) {
    const p = rules.get(s);
    const ms = rules.movesFrom(s);
    if (!ms.length) {
      const had = sel;
      sel = null; targets = new Map(); refresh(); say(W.stuck(p.type));
      if (had) emit('select', { square: null });
      return false;
    }
    sel = s;
    targets = new Map();
    for (const m of ms) { if (!targets.has(m.to)) targets.set(m.to, []); targets.get(m.to).push(m); }
    refresh();
    if (!quiet) say(W.select(p.type, s));
    emit('select', { square: s });
    return true;
  }
  function deselect(speak) {
    if (!sel) return;
    const s = sel, p = rules.get(s);
    sel = null;
    targets = new Map();
    refresh();
    if (speak && p) say(W.deselect(p.type, s));
    emit('select', { square: null });
  }

  function activate(s) {
    if (phase === 'end') { unpeek(); return; }
    if (phase === 'her' || phase === 'moving') { say(W.thinking); return; }
    if (phase !== 'you') return;
    const p = rules.get(s);
    if (sel) {
      if (s === sel) { deselect(true); return; }
      if (targets.has(s)) { attempt(sel, s, false); return; }
      if (p && p.color === 'w') { select(s); return; }
      deselect(false);
      say(W.illegal);
      return;
    }
    if (p && p.color === 'w') select(s);
  }

  function attempt(from, to, dragged) {
    const ms = targets.get(to);
    if (!ms) return false;
    if (ms.some((m) => m.promotion)) { openPromo(from, to, dragged); return true; }
    play({ from, to }, dragged);
    return true;
  }

  /* ----- The promotion chooser: queen, rook, bishop, knght, over the file ----- */
  function openPromo(from, to, dragged) {
    if (dragged) board.dragHome(from);
    promoAt = { from, to };
    promoFresh = true; // the click that opened it (or ends the drag) is still on its way
    setTimeout(() => { promoFresh = false; }, 0);
    const promo = board.promo;
    promo.style.setProperty('--px', to.charCodeAt(0) - 97);
    promo.setAttribute('aria-label', W.promoGroup);
    promo.innerHTML = W.promoOrder.map((t) => `<button type="button" data-p="${t}" aria-label="${PIECE_TITLE[t]}">${glyph(t, 'w')}</button>`).join('');
    promo.hidden = false;
    board.squares.inert = true;
    go('promo');
    say(W.promoting);
    promo.querySelector('button').focus();
    emit('promote', { at: 'open', square: to });
  }
  function closePromo() {
    const promo = board.promo;
    if (promo.hidden) return;
    promo.hidden = true;
    promo.innerHTML = '';
    if (card.hidden) board.squares.inert = false;
  }
  function cancelPromo() {
    if (phase !== 'promo') return;
    const at = promoAt;
    closePromo();
    promoAt = null;
    go('you');
    deselect(true);
    board.setCursor(at.from, true);
    emit('promote', { at: 'cancel', square: at.to });
  }
  board.promo.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-p]');
    if (!b || phase !== 'promo') return;
    const at = promoAt;
    closePromo();
    promoAt = null;
    board.setCursor(at.to, true);
    emit('promote', { at: 'done', square: at.to, piece: b.dataset.p });
    play({ ...at, promotion: b.dataset.p }, false);
  }, { signal });
  bindPromo(board.promo, signal, cancelPromo);
  // A tap beside the chooser puts the pawn back. (The tap that opened it landed on a square; squares are inert after.)
  wrap.addEventListener('click', (e) => {
    if (phase === 'promo' && !promoFresh && !e.target.closest('.wlg-promo') && !e.target.closest('.wlg-sq')) cancelPromo();
  }, { signal });

  const yourMoves = () => rules.history().reduce((n, m) => n + (m.color === 'w'), 0);
  // A move has landed: 'move', then 'capture'. Your first move of a game is remembered just before.
  function moved(m, by) {
    if (by === 'you' && !playedThis) { playedThis = true; try { memory.played(); } catch {} }
    const move = Object.freeze(m);
    emit('move', { by, move, check: /[+#]$/.test(m.san), mate: /#$/.test(m.san), yourMoves: yourMoves(), ply: rules.plies() });
    if (m.captured) {
      const square = m.flags.includes('e') ? m.to[0] + m.from[1] : m.to;
      emit('capture', { by, piece: m.captured, square, move });
    }
  }

  async function play(mv, dragged) {
    const m = rules.play(mv);
    if (!m) { deselect(false); say(W.illegal); return; }
    sel = null;
    targets = new Map();
    board.setCursor(m.to, false);
    go('moving');
    const t = token, line = sayMove(m, /\+$/.test(m.san));
    await board.move(m, { mine: true, dragged });
    if (destroyed || t !== token) return;
    const end = rules.end();
    moved(m, 'you');
    if (end) { finish(end, line); return; }
    say(line);
    if (rules.turn() === 'b') herTurn();
    else go('you');
  }

  /* ----- Her side ----- */
  function startWatch() {
    if (reduce || watch) return;
    watch = hand.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1000, iterations: Infinity, easing: 'steps(12, end)' });
  }
  function stopWatch() { if (watch) { watch.cancel(); watch = null; } }

  async function herTurn() {
    go('her');
    startWatch();
    const t = ++token, t0 = performance.now();
    const reply = await engine.think({
      fen: rules.fen, history: rules.since(), moves: rules.uciMoves(),
      level, budget: BUDGET[level] || 600, seed: nextSeed(),
    });
    if (destroyed || t !== token) return;
    // She never answers at once: a short pause that reads as thought.
    const shown = level === 'pawn' ? 700 + Math.random() * 400 : level === 'queen' ? 450 : 600;
    await sleep(shown - (performance.now() - t0));
    if (destroyed || t !== token) return;
    stopWatch();
    let m = reply ? rules.play(reply) : null;
    if (!m) m = rules.playAny();
    if (!m) { const end = rules.end(); if (end) finish(end); return; }
    go('moving');
    await board.move(m, { mine: false });
    if (destroyed || t !== token) return;
    const end = rules.end();
    const line = sayMove(m, /\+$/.test(m.san)); // checkmate is said by the ending
    moved(m, 'her');
    if (end) { finish(end, line); return; }
    go('you');
    say(line);
  }

  /* ----- Kings that lie down: you tipping yours, or hers after a win at Queen level ----- */
  const tips = [];
  function tipKing(sq, deg) {
    const el = sq && board.els.get(sq), g = el && el.querySelector('.wlg-glyph');
    if (!g) return;
    const at = (d, s) => ({ transform: `rotate(${d}deg) scale(${s})`, transformOrigin: '50% 88%' });
    if (reduce) {
      Object.assign(g.style, at(deg, 0.82));
      tips.push({ g, a: null });
      return;
    }
    // 450 ms down, then a 120 ms settle a few degrees back and down again.
    const back = deg - 4 * Math.sign(deg);
    const a = g.animate([
      { ...at(0, 1), easing: 'cubic-bezier(.55,0,.75,.2)' },
      { ...at(deg, 0.82), offset: 450 / 570, easing: 'ease-out' },
      { ...at(back, 0.82), offset: 510 / 570, easing: 'ease-in' },
      at(deg, 0.82),
    ], { duration: 570, fill: 'forwards' });
    tips.push({ g, a });
  }
  function untip() {
    for (const { g, a } of tips) {
      try { if (a) a.cancel(); } catch {}
      g.style.transform = '';
      g.style.transformOrigin = '';
    }
    tips.length = 0;
  }

  /* ----- Endings ----- */
  // end: rules.end(), or { result: 'resign', reason: 'resign' }. line: the last move's sentence. tipped: your king's
  // square when you tipped it.
  function finish(end, line, tipped = null) {
    // A confirm card still up when her move ends the game makes way at once, so the last move is seen.
    if (cardKind === 'confirm') { hideCard(); board.setCursor(board.cursor, true); }
    stopWatch();
    sel = null;
    targets = new Map();
    const e = makeEnding(rules, {
      level, result: end.result, reason: end.reason,
      tipped: tipped || ((id) => (id === 'queen' ? rules.kingSquare('b') : null)),
      found: memory.found,
    });
    ending = e;
    statusEl.textContent = W.endStatus[e.kind];
    go('end');
    emit('end', { ending: e });
    // The card waits, so the last move, its ticks and the check ring are seen before anything covers the board.
    // (Reduced motion too: the pause is not motion, and there the move itself is instant.) Taps on the board do
    // nothing meanwhile; New game still works, and then the card never comes.
    const t = token;
    if (e.id === 'queen' && e.tipped) sleep(300).then(() => { if (!destroyed && t === token && phase === 'end') tipKing(e.tipped, 90); });
    sleep(HOLD).then(() => {
      if (destroyed || t !== token || phase !== 'end') return;
      showEnd(e);
      focusCard();
    });
    say(`${line ? `${line} ` : ''}${e.say}`);
    track('rabbit_game_end', { ending: e.id, result: end.result, reason: end.reason, level, moves: e.yourMoves });
  }

  function tallyHTML(e) {
    const got = new Set(memory.read().f);
    got.add(e.id);
    const dots = ['win', 'loss', 'draw', 'resign'].map((k) => `<span>${ENDINGS.filter((x) => x.kind === k)
      .map((x) => `<i${e.found.all || got.has(x.id) ? ' data-on' : ''}${x.id === e.id ? ' data-this' : ''}></i>`).join('')}</span>`).join('');
    return `<p class="wlg-tally"><span class="wlg-dots" aria-hidden="true">${dots}</span>`
      + `<span>${e.found.all ? W.tallyAll : W.tally(e.found.n, e.found.of || ENDING_COUNT)}</span></p>`;
  }
  function endHTML(e) {
    const btn = (act, label, ghost) => `<button type="button" class="btn${ghost ? ' btn--ghost' : ''}" data-act="${act}">${label}</button>`;
    const book = (ghost) => `<a class="btn${ghost ? ' btn--ghost' : ''}" href="${bookHref}">${W.book}</a>`;
    // Play again and Climb back up always share the last row; a win's first actions sit above them.
    const pair = (first) => `<div class="wlg-pair">${btn('again', W.again, !first)}${btn('climb', W.climb, true)}</div>`;
    const acts = e.id === 'knght' ? btn('codex', W.codex) + book(true) + pair(false)
      : e.kind === 'win' ? book(false) + pair(false)
      : pair(true);
    return `<p class="wlg-eyebrow">${e.name}</p>`
      + `<h2 class="wlg-head" id="wlg-card-h"${e.credit ? ' data-quote' : ''}>${e.line}</h2>`
      + (e.credit ? `<p class="wlg-credit">${e.credit}</p>` : '')
      + `<p class="wlg-facts">${e.facts}</p>${tallyHTML(e)}`
      + `<div class="wlg-actions">${acts}</div>`
      + `<div class="wlg-quiet">${KEEP ? `<button type="button" class="link" data-act="keep">${W.keep}</button>` : ''}`
      + `<button type="button" class="link wlg-peek" data-act="peek">${W.peek}</button></div>`;
  }
  function showEnd(e) {
    showCard(endHTML(e), { kind: 'end', end: e.id });
    prepareKeep(e);
  }

  /* ----- Keep this game: the souvenir draws the sheet on the device ----- */
  const prepared = new WeakSet();
  function prepareKeep(e) {
    if (!KEEP || prepared.has(e)) return;
    prepared.add(e);
    const run = () => { if (!destroyed) KEEP().then((m) => m.prepare && m.prepare(e)).catch((err) => console.error(err)); };
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 300);
  }
  function keep(b) {
    const e = ending;
    if (!KEEP || !e || b.getAttribute('aria-busy') === 'true') return;
    b.setAttribute('aria-busy', 'true');
    b.textContent = W.keepBusy;
    KEEP().then((m) => m.keep(e)).then((how) => {
      if (how === 'saved') say(W.keepSaved);
      track('rabbit_keep', { ending: e.id, how });
    }, (err) => {
      console.error(err);
      say(W.keepFail);
      track('rabbit_keep', { ending: e.id, how: 'failed' });
    }).then(() => sleep(1200)).then(() => {
      b.removeAttribute('aria-busy');
      b.textContent = W.keep;
    });
  }
  // @wl-souvenir

  /* ----- The knght's move: the codex, after the climb ----- */
  function codex() {
    if (typeof opts.onCodex === 'function') { try { opts.onCodex(); } catch (e) { console.error(e); } return; }
    document.dispatchEvent(new CustomEvent('knght:codex', { detail: { from: 'wonderland' } }));
  }

  /* ----- Tip your king: ask, then lie down ----- */
  function askResign() {
    if (resignBtn.getAttribute('aria-disabled') === 'true' || left) return;
    showCard(`<p class="wlg-eyebrow">${W.resign}</p><h2 class="wlg-head" id="wlg-card-h">${W.confirmHead}</h2><p class="wlg-lede">${W.confirmLede}</p>`
      + `<div class="wlg-actions"><button type="button" class="btn" data-act="tip">${W.resign}</button>`
      + `<button type="button" class="btn btn--ghost" data-act="stay">${W.keepPlaying}</button></div>`, { kind: 'confirm' });
    card.querySelector('[data-act="stay"]').focus();
    say(W.confirmLive);
  }
  function keepPlaying() {
    if (cardKind !== 'confirm') return;
    hideCard();
    board.setCursor(board.cursor, true);
    say(phase === 'you' ? W.yourMove : W.thinking);
  }
  function resign() {
    if (cardKind !== 'confirm' || !['you', 'her', 'moving'].includes(phase)) return;
    if (rules.end()) return; // her move is about to end the game; finish() will replace this card
    token++;
    engine.cancel();
    stopWatch();
    closePromo();
    promoAt = null;
    board.finishAll();
    hideCard();
    board.setCursor(board.cursor, true);
    const k = rules.kingSquare('w');
    tipKing(k, -90);
    finish({ result: 'resign', reason: 'resign' }, null, k);
  }

  /* ----- The level picker ----- */
  function pickerHTML() {
    return `<p class="wlg-eyebrow">${W.pickEyebrow}</p><h2 class="wlg-head" id="wlg-card-h">${W.pickHeading}</h2>`
      + `<p class="wlg-lede">${W.pickLede}</p><div class="wlg-levels">`
      + LEVELS.map((l) => `<button type="button" class="wlg-level" data-level="${l.id}" aria-label="${l.name}. ${l.how}.">${glyph(l.piece, 'w')}<b>${l.name}</b><small>${l.how}</small></button>`).join('')
      + '</div>';
  }
  function focusLevel() {
    const b = card.querySelector(`[data-level="${remembered || opts.level || 'pawn'}"]`) || card.querySelector('.wlg-level');
    if (b) b.focus();
  }
  function showPicker(speak, opt) {
    level = null;
    go('pick');
    showCard(pickerHTML(), { ...opt, kind: 'pick' });
    if (speak) { focusLevel(); say(speak); }
  }
  function choose(id) {
    if (phase !== 'pick' || !BUDGET[id]) return;
    level = id;
    remembered = id;
    hideCard();
    track('rabbit_level', { level: id });
    emit('level', { level: id });
    const end = rules.end();
    if (end) { refresh(); finish(end); return; }
    if (rules.turn() === 'b') { say(W.chosen(id).replace(` ${W.yourMove}`, '')); herTurn(); return; }
    go('you');
    // The cursor starts on e2, or on the first white piece that can move.
    const e2 = rules.get('e2'), any = rules.allMoves()[0];
    board.setCursor(e2 && e2.color === 'w' ? 'e2' : any ? any.from : rules.kingSquare('w') || 'e2', true);
    say(W.chosen(id));
  }
  card.addEventListener('click', (e) => {
    const b = e.target.closest('[data-level],[data-act]');
    if (!b || left) return;
    const act = b.dataset.act;
    if (b.dataset.level) choose(b.dataset.level);
    else if (act === 'again') restart();
    else if (act === 'peek') peek();
    else if (act === 'climb') { try { if (opts.onClimb) opts.onClimb(); } catch {} }
    else if (act === 'codex') codex();
    else if (act === 'keep') keep(b);
    else if (act === 'tip') resign();
    else if (act === 'stay') keepPlaying();
  }, { signal });
  // Escape on the confirm card keeps playing (and is used, so the portal does not climb).
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cardKind === 'confirm' && !card.hidden && !left) { e.preventDefault(); keepPlaying(); }
  }, { signal });

  /* ----- Take back, New game, Play again ----- */
  function takeBack() {
    if (!['you', 'her', 'promo'].includes(phase) || !rules.canTakeBack() || !card.hidden) return;
    token++;
    engine.cancel();
    stopWatch();
    closePromo();
    promoAt = null;
    board.finishAll();
    let plies = 0;
    for (let i = 0; i < 2; i++) { const u = rules.undo(); if (!u) break; plies++; if (u.color === 'w') break; }
    sel = null;
    targets = new Map();
    board.sync(rules.board());
    go('you');
    say(W.takenBack);
    emit('takeback', { plies });
  }
  function restart() {
    if (['pre', 'land', 'gone'].includes(phase)) return;
    token++;
    engine.cancel();
    stopWatch();
    closePromo();
    promoAt = null;
    board.finishAll();
    untip();
    hideCard();
    rules.reset();
    sel = null;
    targets = new Map();
    ending = null;
    hintsLeft = HINTS;
    hinting = null;
    playedThis = false;
    board.sync(rules.board());
    emit('restart', {});
    showPicker(W.fresh);
  }
  const usable = (b) => b.getAttribute('aria-disabled') !== 'true' && !left;
  backBtn.addEventListener('click', () => { if (usable(backBtn)) takeBack(); }, { signal });
  newBtn.addEventListener('click', () => { if (usable(newBtn)) restart(); }, { signal });
  resignBtn.addEventListener('click', () => { if (usable(resignBtn)) askResign(); }, { signal });
  resultBtn.addEventListener('click', () => { if (!left) unpeek(); }, { signal });

  bindBoard(board, signal, {
    activate,
    escape() {
      if (phase === 'promo') { cancelPromo(); return true; }
      if (sel) { deselect(true); return true; }
      return false;
    },
    canDrag(s, starting) {
      if (phase !== 'you') return false;
      const p = rules.get(s);
      if (!p || p.color !== 'w') return false;
      if (starting && sel !== s) return select(s);
      return true;
    },
    dragged: (from, to) => (phase === 'you' && sel === from && targets.has(to) ? attempt(from, to, true) : false),
  });

  /* ----- The Cheshire Cat's hint: her engine, at full strength, on your side ----- */
  function hint() {
    if (hinting) return hinting;
    if (destroyed || left || phase !== 'you' || !card.hidden || hintsLeft <= 0) return Promise.resolve(null);
    hintsLeft--;
    const t = token;
    hinting = engine.think({ fen: rules.fen, history: rules.since(), moves: rules.uciMoves(), level: 'queen', budget: 500, seed: nextSeed() })
      .then((r) => {
        hinting = null;
        if (!r || destroyed || left || t !== token || phase !== 'you') return null;
        const p = rules.get(r.from);
        if (!p || p.color !== 'w') return null;
        const h = { from: r.from, to: r.to, promotion: r.promotion || null, piece: p.type };
        say(W.hint(h));
        emit('hint', { ...h, left: hintsLeft });
        track('rabbit_hint', { left: hintsLeft });
        return h;
      }, () => { hinting = null; return null; });
    return hinting;
  }

  /* ----- Where things are, for the cast ----- */
  function rects() {
    if (destroyed) return null;
    const R = root.getBoundingClientRect();
    const rel = (r) => (r && (r.width || r.height) ? { x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height } : null);
    const box = (el) => (el && !el.hidden ? rel(el.getBoundingClientRect()) : null);
    const union = (list) => {
      const l = list.filter(Boolean);
      if (!l.length) return null;
      const x = Math.min(...l.map((b) => b.x)), y = Math.min(...l.map((b) => b.y));
      return { x, y, w: Math.max(...l.map((b) => b.x + b.w)) - x, h: Math.max(...l.map((b) => b.y + b.h)) - y };
    };
    const clip = (b, c) => {
      if (!b || !c) return b;
      const x = Math.max(b.x, c.x), y = Math.max(b.y, c.y), x2 = Math.min(b.x + b.w, c.x + c.w), y2 = Math.min(b.y + b.h, c.y + c.h);
      return x2 > x && y2 > y ? { x, y, w: x2 - x, h: y2 - y } : null;
    };
    const text = (el) => {
      if (!el.textContent.trim()) return null;
      const r = document.createRange();
      r.selectNodeContents(el);
      return union([...r.getClientRects()].map(rel));
    };
    const used = (row) => {
      const t = row.querySelector('.wlg-taken'), tb = box(t);
      return union([...row.querySelectorAll('.wlg-name,.wlg-watch')].map(box)
        .concat([...t.querySelectorAll('.wlg-glyph')].map((g) => clip(box(g), tb))));
    };
    return {
      layout: root.dataset.layout, sq: sqPx,
      root: { x: 0, y: 0, w: R.width, h: R.height },
      stage: box(stage),
      board: union([board.el, ...wrap.querySelectorAll('.wlg-frame,.wlg-ranks,.wlg-files')].map(box)),
      her: box(herRow), herUsed: used(herRow), tag: text(tag),
      you: box(youRow), youUsed: used(youRow),
      panel: box(panel), status: text(statusEl), last: text(lastEl),
      controls: [...panel.querySelectorAll('.wlg-controls button')].map(box).filter(Boolean),
      card: card.hidden ? null : box(card),
      promo: board.promo.hidden ? null : box(board.promo),
    };
  }
  function square(s) {
    const b = board.btn[s];
    if (!b || destroyed) return null;
    const R = root.getBoundingClientRect(), r = b.getBoundingClientRect();
    return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height / 2, size: r.width };
  }

  // Build in the 'pre' phase: measurable, hidden from view and from assistive tech. Nothing starts here.
  board.sync(rules.board());
  refresh();

  let cast = null;
  function destroy() {
    if (destroyed) return;
    try { if (cast && cast.destroy) cast.destroy(); } catch (e) { console.error(e); }
    destroyed = true;
    phase = 'gone';
    token++;
    engine.destroy();
    stopWatch();
    clearTimeout(idleT);
    for (const t of timers) clearTimeout(t);
    timers.clear();
    cancelAnimationFrame(frame);
    ro.disconnect();
    try { for (const a of root.getAnimations({ subtree: true })) a.cancel(); } catch {}
    subs.clear();
    ac.abort();
    host.textContent = '';
  }

  // The portal is closing (Climb back up, Escape, Back): the board stays drawn while it fades, but nothing moves on it.
  function leaving() {
    if (left || destroyed) return;
    left = true;
    token++;
    engine.cancel();
    stopWatch();
    for (const t of timers) clearTimeout(t);
    timers.clear();
    idleStop();
    phase = 'gone';
    emit('climb', {});
  }

  // QA only: an ending's card from a made-up game, for screenshots. Nothing is remembered.
  function qaPreview(id, over = {}) {
    const row = byId(id);
    if (destroyed || !row) return null;
    token++;
    engine.cancel();
    stopWatch();
    closePromo();
    promoAt = null;
    board.finishAll();
    const lv = id === 'queen' ? 'queen' : level || 'knght';
    const n = { quick: 14, long: 61, fast: 7, knght: 23, alice: 38 }[id] || 31;
    const why = id === 'stalemate' ? W.why.herStalemate : id === 'round' ? W.why.threefold : null;
    const facts = row.kind === 'draw' ? W.factsDraw(levelName(lv), why) : row.kind === 'resign' ? W.factsTip(levelName(lv), n) : W.factsMate(levelName(lv), n);
    const m = memory.read();
    const f = m.f.includes(id) ? m.f : [...m.f, id];
    const say0 = W.end[id].say;
    const e = Object.freeze({
      id, kind: row.kind, name: row.name, line: row.line, credit: row.credit, say: typeof say0 === 'function' ? say0(why) : say0,
      why, facts, level: lv, levelName: levelName(lv), yourMoves: n, plies: rules.plies(),
      result: row.kind === 'win' ? '1-0' : row.kind === 'draw' ? '½-½' : '0-1',
      san: Object.freeze(rules.history().map((x) => x.san)), startFen: rules.start, fen: rules.fen,
      lastMove: null, check: null, tipped: null, matedBy: row.kind === 'win' ? (id === 'knght' ? 'n' : 'q') : row.kind === 'loss' ? 'q' : null,
      promotedQueen: id === 'alice', lost: id === 'clean' ? 0 : 3, date: new Date(),
      found: Object.freeze({ n: f.length, of: ENDING_COUNT, fresh: !m.f.includes(id), all: f.length >= ENDING_COUNT, ...over.found }),
    });
    if (!card.hidden) hideCard();
    ending = e;
    statusEl.textContent = W.endStatus[e.kind];
    go('end');
    showEnd(e);
    focusCard();
    return e;
  }

  const controller = {
    land(arg = {}) {
      if (destroyed) return Promise.reject(new Error('destroyed'));
      if (landing) return landing;
      landing = (async () => {
        layout();
        if (!board.squares.children.length) throw new Error('The board could not be built.');
        root.dataset.phase = 'land';
        go('land');
        emit('land', { at: 'start' });
        if (reduce) {
          showPicker(null, { rise: false });
          await settled(stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' }));
        } else {
          for (const el of [herRow, youRow, panel]) {
            el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 1250, easing: 'ease-out', fill: 'backwards' });
          }
          showPicker(null, { delay: 1250 });
          card.inert = true; // not to be tapped before it can be seen
          await Promise.all([board.land(arg && arg.from), sleep(1560)]);
        }
        if (destroyed || left) return;
        card.inert = false;
        root.dataset.phase = 'play';
        placeCard();
        focusLevel();
        say(W.pickLive);
        emit('land', { at: 'done' });
        engine.warm();
        // A card measured before the type arrived is placed again once it has.
        if (document.fonts) document.fonts.ready.then(() => { if (!destroyed && !card.hidden) placeCard(); });
      })();
      return landing;
    },
    destroy,
    leaving,
    on,
    get phase() { return phase; },
    get level() { return level; },
    get ending() { return ending; },
    get hintsLeft() { return hintsLeft; },
    root,
    layer,
    reduce,
    signal,
    qa,
    rects,
    square,
    hint,
  };
  if (qa.preview) controller.qaPreview = qaPreview;

  try { cast = CAST?.mountCast?.(controller) || null; } catch (e) { console.error(e); }
  // @wl-cast

  if (opts.signal) {
    if (opts.signal.aborted) destroy();
    else opts.signal.addEventListener('abort', destroy, { once: true });
  }
  return controller;
}

const settled = (a) => a.finished.catch(() => {});
