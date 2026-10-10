// The Black Queen's game. The portal loads this module when someone follows the rabbit and calls:
//   const controller = mount(host, { reduce, signal, onClimb, track, bookHref })
//   controller.land({ from: { x, y, d } })  plays the landing, resolves when the level picker is up and focused
//   controller.destroy()                    ends the worker, the animations and the listeners, and empties host
// The game touches nothing outside host except its own <style id="wlg-css">. fen and seed are for the lab only.
// See src/scripts/wonderland/README.md for the whole contract.
import css from './game.css?inline';
import { SPRITE, glyph } from './set.js';
import { createRules } from './rules.js';
import { createBoard } from './board.js';
import { bindBoard, bindPromo } from './input.js';
import { createEngine } from './engine.js';
import { W, LEVELS, PIECE_TITLE, sayMove } from './words.js';

const BUDGET = { pawn: 150, knght: 600, queen: 1500 };
const HOLD = 1200; // ms between the last move of a game and its ending card
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const WORTH = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
let remembered = null; // the last level chosen, kept in module memory only

export function mount(host, opts = {}) {
  const reduce = !!opts.reduce;
  const bookHref = opts.bookHref || '/book/';
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
    + `<div class="wlg-controls"><button type="button" class="link" data-act="result" hidden>${W.result}</button><button type="button" class="link" data-act="back">${W.takeBack}</button><button type="button" class="link" data-act="new">${W.newGame}</button></div></div>`
    + '<section class="wlg-card" hidden tabindex="-1" aria-labelledby="wlg-card-h"></section>'
    + '</div></div>';

  const $ = (s) => host.querySelector(s);
  const root = $('.wlg'), probe = $('.wlg-probe'), live = $('[data-wlg-live]'), stage = $('.wlg-stage');
  const wrap = $('.wlg-boardwrap'), card = $('.wlg-card'), statusEl = $('.wlg-status'), lastEl = $('.wlg-last');
  const herRow = $('.wlg-who--her'), youRow = $('.wlg-who--you'), panel = $('.wlg-panel'), tag = $('.wlg-tag');
  const herTaken = herRow.querySelector('.wlg-taken'), youTaken = youRow.querySelector('.wlg-taken'), hand = $('.wlg-hand');
  const backBtn = $('[data-act="back"]'), newBtn = $('[data-act="new"]'), resultBtn = $('[data-act="result"]');

  const rules = createRules(opts.fen);
  const board = createBoard(wrap, { reduce });
  board.squares.setAttribute('role', 'group');
  board.squares.setAttribute('aria-label', W.boardLabel);
  board.squares.setAttribute('aria-describedby', 'wlg-help');
  const engine = createEngine();

  const ac = new AbortController();
  const signal = ac.signal;
  const timers = new Set();
  let destroyed = false, landing = null, phase = 'pre', level = null, sel = null, targets = new Map();
  let promoAt = null, promoFresh = false, token = 0, watch = null, flip = false, peeking = false;
  let seed = (opts.seed >>> 0) || ((Math.random() * 4294967296) >>> 0);
  const nextSeed = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const sleep = (ms) => new Promise((r) => { const t = setTimeout(() => { timers.delete(t); r(); }, Math.max(0, ms)); timers.add(t); });

  // The live region. A trailing space that comes and goes makes a repeated sentence speak again.
  function say(text) { flip = !flip; live.textContent = text + (flip ? ' ' : ''); }

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
  }
  let frame = 0;
  const ro = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(layout); });
  ro.observe(host);
  ro.observe(probe);

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
  function showCard(html, { rise = !reduce, delay = 0 } = {}) {
    if (html != null) card.innerHTML = html;
    setPeek(false);
    card.hidden = false;
    board.squares.inert = true;
    placeCard();
    if (rise) card.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay, easing: EASE_OUT, fill: 'backwards' });
  }
  function uncover() {
    herRow.removeAttribute('data-covered');
    youRow.removeAttribute('data-covered');
  }
  function hideCard() {
    setPeek(false);
    card.hidden = true;
    card.inert = false;
    card.innerHTML = '';
    board.squares.inert = false;
    uncover();
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
  }
  function unpeek() {
    if (phase !== 'end' || !peeking) return;
    showCard(null);
    focusCard();
  }
  function focusCard() { const b = card.querySelector('.btn'); if (b) b.focus(); }

  /* ----- What the page shows: markers, labels, the two rows, the status ----- */
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
    const canBack = ['you', 'her', 'promo'].includes(phase) && rules.canTakeBack();
    backBtn.setAttribute('aria-disabled', String(!canBack));
    newBtn.setAttribute('aria-disabled', String(['pre', 'land', 'pick'].includes(phase)));
  }

  /* ----- Your side ----- */
  function select(s, quiet) {
    const p = rules.get(s);
    const ms = rules.movesFrom(s);
    if (!ms.length) { sel = null; targets = new Map(); refresh(); say(W.stuck(p.type)); return false; }
    sel = s;
    targets = new Map();
    for (const m of ms) { if (!targets.has(m.to)) targets.set(m.to, []); targets.get(m.to).push(m); }
    refresh();
    if (!quiet) say(W.select(p.type, s));
    return true;
  }
  function deselect(speak) {
    if (!sel) return;
    const s = sel, p = rules.get(s);
    sel = null;
    targets = new Map();
    refresh();
    if (speak && p) say(W.deselect(p.type, s));
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
    phase = 'promo';
    promoAt = { from, to };
    promoFresh = true; // the click that opened it (or ends the drag) is still on its way
    setTimeout(() => { promoFresh = false; }, 0);
    const promo = board.promo;
    promo.style.setProperty('--px', to.charCodeAt(0) - 97);
    promo.setAttribute('aria-label', W.promoGroup);
    promo.innerHTML = W.promoOrder.map((t) => `<button type="button" data-p="${t}" aria-label="${PIECE_TITLE[t]}">${glyph(t, 'w')}</button>`).join('');
    promo.hidden = false;
    board.squares.inert = true;
    refresh();
    say(W.promoting);
    promo.querySelector('button').focus();
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
    phase = 'you';
    deselect(true);
    board.setCursor(at.from, true);
  }
  board.promo.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-p]');
    if (!b || phase !== 'promo') return;
    const at = promoAt;
    closePromo();
    promoAt = null;
    board.setCursor(at.to, true);
    play({ ...at, promotion: b.dataset.p }, false);
  }, { signal });
  bindPromo(board.promo, signal, cancelPromo);
  // A tap beside the chooser puts the pawn back. (The tap that opened it landed on a square; squares are inert after.)
  wrap.addEventListener('click', (e) => {
    if (phase === 'promo' && !promoFresh && !e.target.closest('.wlg-promo') && !e.target.closest('.wlg-sq')) cancelPromo();
  }, { signal });

  async function play(mv, dragged) {
    const m = rules.play(mv);
    if (!m) { deselect(false); say(W.illegal); return; }
    sel = null;
    targets = new Map();
    phase = 'moving';
    board.setCursor(m.to, false);
    refresh();
    const t = token, line = sayMove(m, /\+$/.test(m.san));
    await board.move(m, { mine: true, dragged });
    if (destroyed || t !== token) return;
    const end = rules.end();
    if (end) { finish(end, line); return; }
    say(line);
    if (rules.turn() === 'b') herTurn();
    else { phase = 'you'; refresh(); }
  }

  /* ----- Her side ----- */
  function startWatch() {
    if (reduce || watch) return;
    watch = hand.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1000, iterations: Infinity, easing: 'steps(12, end)' });
  }
  function stopWatch() { if (watch) { watch.cancel(); watch = null; } }

  async function herTurn() {
    phase = 'her';
    refresh();
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
    phase = 'moving';
    refresh();
    await board.move(m, { mine: false });
    if (destroyed || t !== token) return;
    const end = rules.end();
    const line = sayMove(m, /\+$/.test(m.san)); // checkmate is said by the ending
    if (end) { finish(end, line); return; }
    phase = 'you';
    refresh();
    say(line);
  }

  /* ----- Endings ----- */
  function finish(end, line) {
    phase = 'end';
    stopWatch();
    sel = null;
    targets = new Map();
    const actions = (first) => `<div class="wlg-actions">${first}<button type="button" class="btn btn--ghost" data-act="climb">${W.climb}</button></div>`;
    const peekLink = `<button type="button" class="link wlg-peek" data-act="peek">${W.peek}</button>`;
    let html, head;
    if (end.result === 'win') {
      head = W.winHead;
      html = `<h2 class="wlg-head" id="wlg-card-h">${head}</h2><p class="wlg-lede">${W.winLine(level)}</p>`
        + actions(`<a class="btn" href="${bookHref}">${W.book}</a>`) + peekLink;
    } else if (end.result === 'loss') {
      head = W.lossHead;
      html = `<h2 class="wlg-head" id="wlg-card-h">${head}</h2>`
        + actions(`<button type="button" class="btn" data-act="again">${W.again}</button>`) + peekLink;
    } else {
      head = W.drawHead;
      html = `<h2 class="wlg-head" id="wlg-card-h">${head}</h2><p class="wlg-why">${W.drawWhy[end.reason] || ''}</p>`
        + `<blockquote class="wlg-quote"><p>${W.drawQuote}</p></blockquote><p class="wlg-credit">${W.drawCredit}</p>`
        + actions(`<button type="button" class="btn" data-act="again">${W.again}</button>`) + peekLink;
    }
    statusEl.textContent = head;
    refresh();
    // The card waits, so the last move, its ticks and the check ring are seen before anything covers the board.
    // (Reduced motion too: the pause is not motion, and there the move itself is instant.) Taps on the board do
    // nothing meanwhile; New game still works, and then the card never comes.
    const t = token;
    sleep(HOLD).then(() => {
      if (destroyed || t !== token || phase !== 'end') return;
      showCard(`<p class="wlg-eyebrow">${W.pickEyebrow}</p>${html}`);
      focusCard();
    });
    const extra = end.result === 'win' ? ` ${W.winLine(level)}` : end.result === 'draw' ? ` ${W.drawWhy[end.reason] || ''}` : '';
    say(`${line ? `${line} ` : ''}${head}${extra}`);
    track('rabbit_game_end', { result: end.result, reason: end.reason, level, moves: Math.ceil(rules.plies() / 2) });
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
    phase = 'pick';
    level = null;
    refresh();
    showCard(pickerHTML(), opt);
    if (speak) { focusLevel(); say(speak); }
  }
  function choose(id) {
    if (phase !== 'pick' || !BUDGET[id]) return;
    level = id;
    remembered = id;
    hideCard();
    track('rabbit_level', { level: id });
    const end = rules.end();
    if (end) { refresh(); finish(end); return; }
    if (rules.turn() === 'b') { say(W.chosen(id).replace(` ${W.yourMove}`, '')); herTurn(); return; }
    phase = 'you';
    refresh();
    // The cursor starts on e2, or on the first white piece that can move.
    const e2 = rules.get('e2'), any = rules.allMoves()[0];
    board.setCursor(e2 && e2.color === 'w' ? 'e2' : any ? any.from : rules.kingSquare('w') || 'e2', true);
    say(W.chosen(id));
  }
  card.addEventListener('click', (e) => {
    const b = e.target.closest('[data-level],[data-act]');
    if (!b) return;
    if (b.dataset.level) choose(b.dataset.level);
    else if (b.dataset.act === 'again') restart();
    else if (b.dataset.act === 'peek') peek();
    else if (b.dataset.act === 'climb') { try { if (opts.onClimb) opts.onClimb(); } catch {} }
  }, { signal });

  /* ----- Take back, New game, Play again ----- */
  function takeBack() {
    if (!['you', 'her', 'promo'].includes(phase) || !rules.canTakeBack()) return;
    token++;
    engine.cancel();
    stopWatch();
    closePromo();
    promoAt = null;
    board.finishAll();
    for (let i = 0; i < 2; i++) { const u = rules.undo(); if (!u || u.color === 'w') break; }
    sel = null;
    targets = new Map();
    board.sync(rules.board());
    phase = 'you';
    refresh();
    say(W.takenBack);
  }
  function restart() {
    if (['pre', 'land'].includes(phase)) return;
    token++;
    engine.cancel();
    stopWatch();
    closePromo();
    promoAt = null;
    board.finishAll();
    hideCard();
    rules.reset();
    sel = null;
    targets = new Map();
    board.sync(rules.board());
    showPicker(W.fresh);
  }
  backBtn.addEventListener('click', () => { if (backBtn.getAttribute('aria-disabled') !== 'true') takeBack(); }, { signal });
  newBtn.addEventListener('click', () => { if (newBtn.getAttribute('aria-disabled') !== 'true') restart(); }, { signal });
  resultBtn.addEventListener('click', unpeek, { signal });

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

  // Build in the 'pre' phase: measurable, hidden from view and from assistive tech. Nothing starts here.
  board.sync(rules.board());
  refresh();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    token++;
    engine.destroy();
    stopWatch();
    for (const t of timers) clearTimeout(t);
    timers.clear();
    cancelAnimationFrame(frame);
    ro.disconnect();
    try { for (const a of root.getAnimations({ subtree: true })) a.cancel(); } catch {}
    ac.abort();
    host.textContent = '';
  }
  if (opts.signal) {
    if (opts.signal.aborted) destroy();
    else opts.signal.addEventListener('abort', destroy, { once: true });
  }

  return {
    land(arg = {}) {
      if (destroyed) return Promise.reject(new Error('destroyed'));
      if (landing) return landing;
      landing = (async () => {
        layout();
        if (!board.squares.children.length) throw new Error('The board could not be built.');
        phase = 'land';
        root.dataset.phase = 'land';
        refresh();
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
        if (destroyed) return;
        card.inert = false;
        root.dataset.phase = 'play';
        placeCard();
        focusLevel();
        say(W.pickLive);
        engine.warm();
        // A card measured before the type arrived is placed again once it has.
        if (document.fonts) document.fonts.ready.then(() => { if (!destroyed && !card.hidden) placeCard(); });
      })();
      return landing;
    },
    destroy,
  };
}

const settled = (a) => a.finished.catch(() => {});
