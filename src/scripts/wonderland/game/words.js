// Every word the game says, on screen and to a screen reader. KNGHT voice: short plain sentences,
// no dashes used as dashes, no exclamation marks, and the piece that jumps is always a knght.

export const PIECE = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knght', p: 'pawn' };
export const PIECE_TITLE = { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knght', p: 'Pawn' };

export const LEVELS = [
  { id: 'pawn', name: 'Pawn', how: 'Easy', piece: 'p' },
  { id: 'knght', name: 'Knght', how: 'Medium', piece: 'n' },
  { id: 'queen', name: 'Queen', how: 'Hard', piece: 'q' },
];
export const levelName = (id) => (LEVELS.find((l) => l.id === id) || LEVELS[1]).name;

export const W = {
  boardLabel: 'Chessboard. You play white, from the bottom.',
  boardHelp: 'Arrow keys move around the board. Enter or Space picks up a piece and puts it down. Escape puts it back.',
  her: 'The Black Queen',
  you: 'You',
  levelTag: (id) => `${levelName(id)} level`,

  pickEyebrow: 'The Black Queen',
  pickHeading: 'You play white.',
  pickLede: 'Alice was a white pawn. Choose how well the Black Queen plays.',
  pickLive: 'Choose how well the Black Queen plays.',
  chosen: (id) => `The Black Queen plays at ${levelName(id)} level. Your move.`,

  yourMove: 'Your move.',
  thinking: 'She is thinking.',
  checkYou: 'Check. Your move.',
  checkHer: 'Check. She is thinking.',
  promoting: 'Choose what Alice becomes.',
  promoGroup: 'Choose what Alice becomes',
  promoOrder: ['q', 'r', 'b', 'n'],

  select: (p, sq) => `Your ${PIECE[p]} on ${sq}. Choose a square.`,
  deselect: (p, sq) => `Your ${PIECE[p]} stays on ${sq}.`,
  stuck: (p) => `Your ${PIECE[p]} has no legal moves.`,
  illegal: 'Not a legal move.',

  takeBack: 'Take back',
  newGame: 'New game',
  takenBack: 'Taken back. Your move.',
  fresh: 'New game. Choose how well the Black Queen plays.',

  book: 'Book the free call',
  climb: 'Climb back up',
  again: 'Play again',
  codex: 'Open the codex',
  keep: 'Keep this game',
  keepBusy: 'Making the sheet',
  keepSaved: 'The game sheet is saved.',
  keepFail: 'The game sheet could not be made.',
  peek: 'See the board',
  result: 'See the result',
  peekLive: 'The board as the game ended. Tap it, or press Enter on a square, to see the result again.',

  // Tip your king (resign), with its confirm card.
  resign: 'Tip your king',
  confirmHead: 'End the game here?',
  confirmLede: 'Your king lies down and the game is hers.',
  keepPlaying: 'Keep playing',
  confirmLive: 'End the game here? Tip your king, or keep playing.',

  // The endings. endings.js holds the table and its rules; these are its words. say is the live region's sentence.
  end: {
    knght: { name: 'The knght\'s move', line: 'Few people find the knght\'s move. You did.', say: 'Checkmate with your knght. Few people find the knght\'s move. You did.' },
    queen: { name: 'She tips her king', line: 'Few beat her at Queen.', say: 'Checkmate. She tips her king. Few beat her at Queen.' },
    alice: { name: 'Alice becomes queen', line: 'A pawn walked the whole board and became a queen.', say: 'Checkmate. A pawn walked the whole board and became a queen.' },
    quick: { name: 'Quick work', line: 'Quick work. Strategy first, then the sword.', say: 'Checkmate. Quick work. Strategy first, then the sword.' },
    clean: { name: 'Clean', line: 'Not one piece lost. We say what we can prove.', say: 'Checkmate. Not one piece lost. We say what we can prove.' },
    long: { name: 'The long game', line: 'Patience is a strategy.', say: 'Checkmate. The long game. Patience is a strategy.' },
    mate: { name: 'Checkmate', line: 'Checkmate. Your move.', say: 'Checkmate. Your move.' },
    fast: { name: 'Too fast', line: 'Down the hole too fast. Lore first.', say: 'Checkmate. The Black Queen wins. Down the hole too fast. Lore first.' },
    slow: {
      name: 'The long loss', line: 'It takes all the running you can do, to keep in the same place.', credit: 'Lewis Carroll, Through the Looking-Glass',
      say: 'Checkmate. The Black Queen wins. It takes all the running you can do, to keep in the same place.',
    },
    stalemate: { name: 'Stalemate', line: 'Nowhere to go, and nothing lost.', say: 'Stalemate. A draw. Nowhere to go, and nothing lost.' },
    round: { name: 'Round and round', line: 'Round and round we went.', say: (why) => `A draw. ${why} Round and round we went.` },
    tip: { name: 'Tip your king', line: 'Every world starts with a Verdict.', say: 'You tipped your king. Every world starts with a Verdict.' },
  },
  // The panel's status line once the game is over, by the ending's kind.
  endStatus: { win: 'Checkmate. You win.', loss: 'Checkmate. She wins.', draw: 'A draw.', resign: 'You tipped your king.' },
  // The card's quiet line of facts.
  factsMate: (lv, n) => `${lv} level. Checkmate on move ${n}.`,
  factsDraw: (lv, why) => `${lv} level. ${why}`,
  factsTip: (lv, n) => `${lv} level. You tipped your king on move ${n}.`,
  why: {
    herStalemate: 'She had no legal move, and was not in check.',
    youStalemate: 'You had no legal move, and were not in check.',
    threefold: 'The same position, three times.',
    fifty: 'Fifty moves without a capture or a pawn move.',
    insufficient: 'Not enough pieces left to checkmate.',
  },
  tally: (n, of) => `${n} of ${of} endings found.`,
  tallyAll: '12 of 12 endings found. The rabbit will remember.',

  // The Cheshire Cat's hint, spoken in the game's live region (the only place a hint is said).
  hint: ({ piece, from, to, promotion }) => (promotion
    ? `The Cheshire Cat suggests your pawn from ${from} to ${to}. Alice becomes a ${PIECE[promotion]}.`
    : `The Cheshire Cat suggests your ${PIECE[piece]} from ${from} to ${to}.`),

  // For the cast (game/cast.js). Figures and captions are aria-hidden; only the grin's label is ever read.
  cast: {
    grin: (n) => `Ask the Cheshire Cat for a hint. ${n} left.`,
    cheshire: 'That depends a good deal on where you want to get to.',
    humpty: 'When I use a word, it means just what I choose it to mean.',
    whiteKnght: 'It\'s my own invention.',
    late: 'I\'m late.',
    open: 'Right on time. Calls are open until 5.',
  },

  // For the game sheet (game/souvenir.js).
  sheet: {
    title: 'A game with the Black Queen',
    her: 'The Black Queen',
    level: 'Level',
    moves: 'Moves',
    result: 'Result',
    more: '…',
    site: 'knght.com',
    mark: 'KNGHT',
    // 10 October 2026: the day, the month in full, the year.
    date: (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    // knght-game-2026-10-10.png
    file: (d) => `knght-game-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.png`,
  },
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');

// A square's accessible name: "e2, white pawn", "e4, empty", with ", selected", ", move here" or ", take it".
export function squareLabel(sq, piece, mark) {
  const what = piece ? `${piece.color === 'w' ? 'white' : 'black'} ${PIECE[piece.type]}` : 'empty';
  return `${sq}, ${what}${mark === 'selected' ? ', selected' : mark === 'target' ? ', move here' : mark === 'capture' ? ', take it' : ''}`;
}

// A move in plain words, from chess.js's verbose move. Yours when m.color is 'w'.
export function sayMove(m, check) {
  const you = m.color === 'w';
  const p = PIECE[m.piece], to = m.to;
  let s;
  if (m.flags.includes('k')) s = you ? 'You castled on the king\'s side.' : 'She castled on the king\'s side.';
  else if (m.flags.includes('q')) s = you ? 'You castled on the queen\'s side.' : 'She castled on the queen\'s side.';
  else if (m.flags.includes('e')) s = you ? `You took her pawn en passant. Your pawn is on ${to}.` : `She took your pawn en passant. Her pawn is on ${to}.`;
  else if (m.promotion) {
    const np = PIECE[m.promotion];
    if (m.captured) s = you ? `You took her ${PIECE[m.captured]} on ${to}. Alice becomes a ${np}.` : `She took your ${PIECE[m.captured]} on ${to}. Her pawn becomes a ${np}.`;
    else s = you ? `Alice becomes a ${np} on ${to}.` : `Her pawn becomes a ${np} on ${to}.`;
  } else if (m.captured) s = you ? `You took her ${PIECE[m.captured]} on ${to} with your ${p}.` : `She took your ${PIECE[m.captured]} on ${to} with her ${p}.`;
  else s = you ? `You moved your ${p} from ${m.from} to ${to}.` : `She moved her ${p} from ${m.from} to ${to}.`;
  return check ? `${s} Check.` : s;
}
