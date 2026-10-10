// The Black Queen's side of the board: the worker client.
// warm() makes the worker (after land() resolves, so she is ready before her first reply).
// think(position) resolves with her move, { from, to, promotion }, or with null when cancelled.
// cancel() ends the worker at once (Take back, New game, Play again, Climb back up); the next think makes a new one.
// If the worker cannot start, fails, or goes quiet, she thinks on the page's thread instead, for 250 ms.

const WATCHDOG = 4000;

export function createEngine() {
  let worker = null, broken = false, seq = 0, job = null;

  function kill() {
    if (worker) { worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate(); }
    worker = null;
  }

  function spawn() {
    if (worker || broken) return;
    try {
      worker = new Worker(new URL('./engine.worker.js', import.meta.url), { type: 'module', name: 'black-queen' });
    } catch {
      broken = true; worker = null; return;
    }
    let ready = false;
    worker.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === 'ready') { ready = true; return; }
      if (!job || d.id !== job.id) return;
      if (d.type === 'move' && d.move) settle(d.move);
      else local();
    };
    const fail = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (!ready) broken = true;
      kill();
      if (job) local();
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
  }

  function settle(uci) {
    const j = job;
    if (!j) return;
    job = null;
    clearTimeout(j.timer);
    // Her move must be one the board allows; if not, any legal move will do.
    let m = j.pos.moves.includes(uci) ? uci : j.pos.moves[Math.floor(Math.random() * j.pos.moves.length)];
    if (!m) { j.resolve(null); return; }
    j.resolve({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] || undefined });
  }

  // Think on the page's thread. Used only when the worker is not there for her.
  function local() {
    const j = job;
    if (!j || j.local) return;
    j.local = true;
    clearTimeout(j.timer);
    import('./search.js').then((s) => {
      if (job !== j) return;
      let r = null;
      try { r = s.think({ ...j.pos, budget: 250 }); } catch {}
      settle(r && r.move);
    }, () => { if (job === j) settle(''); });
  }

  return {
    warm() { spawn(); },
    think(pos) {
      this.cancel();
      return new Promise((resolve) => {
        const id = ++seq;
        job = { id, pos, resolve, local: false, timer: 0 };
        spawn();
        if (!worker) { local(); return; }
        job.timer = setTimeout(() => { if (job && job.id === id) { kill(); local(); } }, (pos.budget || 1500) + WATCHDOG);
        worker.postMessage({ type: 'think', id, ...pos });
      });
    },
    // Stop her. A worker in the middle of a search cannot be interrupted, so it is ended.
    cancel() {
      const j = job;
      job = null;
      if (!j) return;
      clearTimeout(j.timer);
      if (!j.local) kill();
      j.resolve(null);
    },
    get thinking() { return !!job; },
    destroy() { this.cancel(); kill(); },
  };
}
