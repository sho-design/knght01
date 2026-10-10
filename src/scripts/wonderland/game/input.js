// Input on the board: tap (or click), an optional drag, and the keyboard cursor; and the promotion chooser's keys.
// Every listener sits inside the game's host and ends with the signal. Tap a piece, then a square, always works.
import { sqName, sqXY } from './board.js';

const clamp = (v) => Math.max(0, Math.min(7, v));

// h: { activate(square), escape() => handled, canDrag(square) => bool, dragged(from, to) => moved }
export function bindBoard(board, signal, h) {
  const grid = board.squares;
  let press = null, dragging = false, swallow = false;

  grid.addEventListener('click', (e) => {
    if (swallow) { swallow = false; e.stopPropagation(); return; } // the click that ends a drag
    const b = e.target.closest('.wlg-sq');
    if (!b) return;
    board.setCursor(b.dataset.sq, false);
    h.activate(b.dataset.sq);
  }, { signal });

  // Arrow keys move the cursor over the 64 squares; Enter and Space press the square (a native button click).
  grid.addEventListener('keydown', (e) => {
    const b = e.target.closest('.wlg-sq');
    if (!b || e.altKey || e.ctrlKey || e.metaKey) return;
    let [x, y] = sqXY(b.dataset.sq);
    switch (e.key) {
      case 'ArrowUp': y--; break;
      case 'ArrowDown': y++; break;
      case 'ArrowLeft': x--; break;
      case 'ArrowRight': x++; break;
      case 'Home': x = 0; break;
      case 'End': x = 7; break;
      case 'PageUp': y = 0; break;
      case 'PageDown': y = 7; break;
      case 'Escape': if (h.escape()) e.preventDefault(); return;
      default: return;
    }
    e.preventDefault();
    board.setCursor(sqName(clamp(x), clamp(y)), true);
  }, { signal });

  // Drag is optional: press on your own piece and move a little, and it follows the pointer.
  grid.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const b = e.target.closest('.wlg-sq');
    if (!b || !h.canDrag(b.dataset.sq)) return;
    press = { id: e.pointerId, sq: b.dataset.sq, x: e.clientX, y: e.clientY };
    dragging = false;
  }, { signal });
  grid.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!dragging) {
      if (Math.hypot(dx, dy) < 8) return;
      if (!h.canDrag(press.sq, true)) { press = null; return; }
      dragging = true;
      try { grid.setPointerCapture(e.pointerId); } catch {}
    }
    e.preventDefault();
    board.drag(press.sq, dx, dy);
  }, { signal });
  const release = (e, cancelled) => {
    if (!press || e.pointerId !== press.id) return;
    const p = press;
    press = null;
    if (!dragging) return;
    dragging = false;
    swallow = true;
    setTimeout(() => { swallow = false; }, 0);
    const to = cancelled ? null : board.squareAt(e.clientX, e.clientY);
    if (!to || to === p.sq || !h.dragged(p.sq, to)) board.dragHome(p.sq);
  };
  grid.addEventListener('pointerup', (e) => release(e, false), { signal });
  grid.addEventListener('pointercancel', (e) => release(e, true), { signal });
  grid.addEventListener('lostpointercapture', (e) => release(e, true), { signal });
}

// The chooser: arrows move between the four pieces, Enter or Space picks, Escape puts the pawn back.
export function bindPromo(promo, signal, cancel) {
  promo.addEventListener('keydown', (e) => {
    const all = [...promo.querySelectorAll('button')];
    const i = all.indexOf(document.activeElement);
    let n;
    switch (e.key) {
      case 'Escape': e.preventDefault(); cancel(); return;
      case 'ArrowDown': case 'ArrowRight': n = (i + 1) % all.length; break;
      case 'ArrowUp': case 'ArrowLeft': n = (i - 1 + all.length) % all.length; break;
      case 'Home': n = 0; break;
      case 'End': n = all.length - 1; break;
      default: return;
    }
    e.preventDefault();
    all[n].focus();
  }, { signal });
}
