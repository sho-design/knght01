/*! chess.js 1.4.0 (https://github.com/jhlywa/chess.js), used as the referee for the Black Queen's game.
Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
*/
// The referee. chess.js decides every legal move, applies both sides' moves and judges the endings.
// You are white; the Black Queen is black. Nothing here touches the page.
import { Chess } from 'chess.js';

export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// moves (the lab only): SAN moves played from the start position at once, up to the first that is not legal. They are
// the game's own history, so take-backs, repetition and the endings count them like any other move.
export function createRules(fen, moves) {
  const first = fen || START;
  let game;
  try { game = new Chess(first); } catch { game = new Chess(START); }
  const start = game.fen();
  for (const san of moves || []) {
    if (!san) continue;
    try { game.move(san); } catch { break; }
  }
  // chess.js rebuilds its verbose history on every call, so it is kept until the next move, undo or reset.
  let ver = 0, cached = -1, past = [];
  const hist = () => { if (cached !== ver) { past = game.history({ verbose: true }); cached = ver; } return past; };

  const api = {
    get fen() { return game.fen(); },
    // The position the game started from (the lab's ?fen=, or the usual start), before any move.
    get start() { return start; },
    turn: () => game.turn(),
    get: (sq) => game.get(sq) || null,
    // Every square, rank 8 first: [{ square, type, color } | null].
    board: () => game.board(),
    isCheck: () => game.isCheck(),
    kingSquare(color) {
      const s = game.findPiece({ type: 'k', color });
      return s && s[0];
    },
    movesFrom: (square) => game.moves({ square, verbose: true }),
    allMoves: () => game.moves({ verbose: true }),
    uciMoves: () => game.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion || '')),
    // Apply a move. Returns the chess.js move, or null when it is not legal.
    play(m) {
      try { const r = game.move({ from: m.from, to: m.to, promotion: m.promotion }); ver++; return r; } catch { return null; }
    },
    // A random legal move: her fallback when anything goes wrong.
    playAny() {
      const all = game.moves({ verbose: true });
      if (!all.length) return null;
      const m = all[Math.floor(Math.random() * all.length)];
      return api.play(m);
    },
    undo() { ver++; return game.undo(); },
    history: hist,
    last() { const h = hist(); return h[h.length - 1] || null; },
    // Plies played since the start or since the lab position.
    plies: () => hist().length,
    reset() { ver++; game.load(start); },
    // The positions since the last capture or pawn move, oldest first, without the current one (for repetition).
    since() {
      const v = hist();
      let i0 = -1;
      for (let i = v.length - 1; i >= 0; i--) if (v[i].piece === 'p' || v[i].captured) { i0 = i; break; }
      return v.slice(i0 + 1).map((m) => m.before);
    },
    // Has white a move to take back?
    canTakeBack() { return hist().some((m) => m.color === 'w'); },
    // The end checks, in order: checkmate, stalemate, insufficient material, threefold repetition, fifty moves.
    // result is from your side: win, loss or draw.
    end() {
      if (game.isCheckmate()) return { result: game.turn() === 'b' ? 'win' : 'loss', reason: 'checkmate' };
      if (game.isStalemate()) return { result: 'draw', reason: 'stalemate' };
      if (game.isInsufficientMaterial()) return { result: 'draw', reason: 'insufficient' };
      if (game.isThreefoldRepetition()) return { result: 'draw', reason: 'threefold' };
      if (game.isDrawByFiftyMoves()) return { result: 'draw', reason: 'fifty' };
      return null;
    },
  };
  return api;
}
