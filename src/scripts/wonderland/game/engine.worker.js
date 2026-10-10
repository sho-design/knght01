// The Black Queen thinks here, off the page's thread. Bundled on its own as /_astro/engine.worker-[hash].js.
// Board to worker: { type: 'think', id, fen, history, moves, level, budget, seed }
// Worker to board: { type: 'move', id, move, depth, score, nodes, ms } or { type: 'fail', id, message }
import { think } from './search.js';

self.onmessage = (e) => {
  const d = e.data || {};
  if (d.type !== 'think') return;
  try {
    const r = think(d);
    if (!r.move) throw new Error('no move');
    self.postMessage({ type: 'move', id: d.id, ...r });
  } catch (err) {
    self.postMessage({ type: 'fail', id: d.id, message: String((err && err.message) || err) });
  }
};
self.postMessage({ type: 'ready' });
