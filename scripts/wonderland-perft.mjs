// Tests for the Black Queen's engine (src/scripts/wonderland/game/search.js). Not part of npm run build.
//   node scripts/wonderland-perft.mjs                 perft counts, then the search checks
//   node scripts/wonderland-perft.mjs --deep          adds the slow perft depths
//   node scripts/wonderland-perft.mjs --selfplay 200  engine against engine, refereed by chess.js
//   node scripts/wonderland-perft.mjs --selfplay 200 --level knght --budget 40
// Self-play uses a small budget by default so 200 games finish; the real budgets are tested in the search checks.
import { perft, think } from '../src/scripts/wonderland/game/search.js';
import { Chess } from 'chess.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, d) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : d; };
let failed = 0;
const check = (ok, line) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${line}`); if (!ok) failed++; };

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PERFT = [
  ['start', START, [20, 400, 8902, 197281]],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['position 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['position 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];
const DEEP = [
  ['start d5', START, 5, 4865609],
  ['kiwipete d4', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 4, 4085603],
  ['position 3 d5', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 5, 674624],
];

console.log('Perft');
for (const [name, fen, counts] of PERFT) {
  counts.forEach((want, i) => {
    const t = performance.now(), got = perft(fen, i + 1);
    check(got === want, `${name} d${i + 1}: ${got} (want ${want}) ${Math.round(performance.now() - t)} ms`);
  });
}
if (flag('--deep')) {
  for (const [name, fen, d, want] of DEEP) {
    const t = performance.now(), got = perft(fen, d), ms = performance.now() - t;
    check(got === want, `${name}: ${got} (want ${want}) ${Math.round(ms)} ms, ${Math.round(got / ms)}k leaves/s`);
  }
}

// The board sends every legal move in UCI, as chess.js lists them.
const position = (fen) => {
  const c = new Chess(fen);
  return { fen, moves: c.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion || '')) };
};
const BUDGET = { pawn: 150, knght: 600, queen: 1500 };

console.log('\nSearch');
const MATES = [
  ['back rank, black to mate', '6k1/5ppp/8/8/8/8/5PPP/r5K1 b - - 0 1', null],
  ['queen and king, black to mate', '8/8/8/8/8/5k2/4q3/6K1 b - - 0 1', null],
  ['scholar, black to mate', 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 0 1', null],
];
for (const level of ['pawn', 'knght', 'queen']) {
  for (const [name, fen] of MATES) {
    const pos = position(fen);
    const r = think({ ...pos, level, budget: BUDGET[level], seed: 7 });
    const c = new Chess(fen); c.move({ from: r.move.slice(0, 2), to: r.move.slice(2, 4), promotion: r.move[4] });
    if (name.startsWith('scholar')) check(pos.moves.includes(r.move), `${level}: ${name}: legal reply ${r.move}`);
    else check(c.isCheckmate(), `${level}: ${name}: plays ${r.move} (${c.isCheckmate() ? 'mate' : 'no mate'}) in ${r.ms} ms`);
  }
}
// She takes a free queen at Knght and Queen.
for (const level of ['knght', 'queen']) {
  const fen = 'rnb1kbnr/pppp1ppp/8/4p3/3qP3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 4';
  const r = think({ ...position(fen), level, budget: BUDGET[level], seed: 3 });
  check(r.move === 'f3d4', `${level}: takes the hanging queen: ${r.move}, depth ${r.depth}, ${r.nodes} nodes, ${r.ms} ms`);
}
// Every budget is kept, within 100 ms, from a busy middlegame.
const MIDDLE = 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P4/2PBPN2/PP1N1PPP/R1BQ1RK1 b - - 3 8';
for (const level of ['pawn', 'knght', 'queen']) {
  for (let s = 1; s <= 3; s++) {
    const t = performance.now();
    const r = think({ ...position(MIDDLE), level, budget: BUDGET[level], seed: s });
    const ms = performance.now() - t;
    check(ms <= BUDGET[level] + 100, `${level}: budget ${BUDGET[level]} ms kept: ${Math.round(ms)} ms, depth ${r.depth}, ${r.nodes} nodes, ${Math.round(r.nodes / Math.max(1, ms))}k nodes/s, ${r.move}`);
  }
}
// Repetition: with a draw in hand she still plays on at Queen level when she is ahead.
{
  const c = new Chess('6k1/5ppp/8/8/8/8/q4PPP/6K1 b - - 0 1');
  const r = think({ ...position(c.fen()), level: 'queen', budget: 600, seed: 1 });
  check(r.score > 300, `queen: knows she is a queen up: ${r.move} score ${r.score}`);
}

if (flag('--selfplay')) {
  const games = +value('--selfplay', 200);
  const levels = value('--level', 'pawn,knght').split(',');
  for (const level of levels) {
    const budget = +value('--budget', level === 'pawn' ? 150 : 40);
    const tally = { white: 0, black: 0, draw: 0, plies: 0, illegal: 0, crash: 0 };
    const t0 = performance.now();
    for (let g = 0; g < games; g++) {
      const c = new Chess();
      let seed = 1000 + g;
      try {
        while (!c.isGameOver() && c.history().length < 300) {
          const v = c.history({ verbose: true });
          let i0 = -1;
          for (let i = v.length - 1; i >= 0; i--) if (v[i].piece === 'p' || v[i].captured) { i0 = i; break; }
          const pos = position(c.fen());
          const r = think({ ...pos, history: v.slice(i0 + 1).map((m) => m.before), level, budget, seed: seed++ });
          if (!pos.moves.includes(r.move)) { tally.illegal++; console.log(`illegal ${r.move} in ${c.fen()}`); break; }
          c.move({ from: r.move.slice(0, 2), to: r.move.slice(2, 4), promotion: r.move[4] });
        }
      } catch (e) { tally.crash++; console.log(`crash in game ${g}: ${e.message}`); }
      tally.plies += c.history().length;
      if (c.isCheckmate()) tally[c.turn() === 'w' ? 'black' : 'white']++; else tally.draw++;
    }
    const s = Math.round((performance.now() - t0) / 1000);
    check(!tally.illegal && !tally.crash, `self-play ${level} (budget ${budget} ms): ${games} games in ${s} s, white ${tally.white}, black ${tally.black}, draw or cut ${tally.draw}, ${Math.round(tally.plies / games)} plies a game, illegal ${tally.illegal}, crashes ${tally.crash}`);
  }
}

console.log(failed ? `\n${failed} failed` : '\nAll passed');
process.exit(failed ? 1 : 0);
