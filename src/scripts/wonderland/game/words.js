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

  winHead: 'Checkmate. Your move.',
  winLine: (id) => `You beat the Black Queen at ${levelName(id)} level.`,
  book: 'Book the free call',
  climb: 'Climb back up',
  lossHead: 'Checkmate. The Black Queen wins this one.',
  again: 'Play again',
  drawHead: 'A draw.',
  drawQuote: 'It takes all the running you can do, to keep in the same place.',
  drawCredit: 'Lewis Carroll, Through the Looking-Glass',
  drawWhy: {
    stalemate: 'Stalemate.',
    threefold: 'The same position, three times.',
    fifty: 'Fifty moves without a capture or a pawn move.',
    insufficient: 'Not enough pieces left to checkmate.',
  },
};

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
