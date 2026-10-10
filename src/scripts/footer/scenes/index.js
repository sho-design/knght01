/* The footer endings. One line per scene: the key is its id (used by ?ending=<id> and the bag),
   the value a lazy import, so the build makes one chunk per scene and a visit fetches only the one it shows.
   The order here is the order the knight steps through under ?ending=. See SCENES.md for the contract. */
export const SCENES = {
  lookout: () => import('./lookout.js'),
  'your-move': () => import('./your-move.js'),
  'tear-along': () => import('./tear-along.js'),
  'last-rank': () => import('./last-rank.js'),
  candle: () => import('./candle.js'),
  'letter-to-piece': () => import('./letter-to-piece.js'),
  dusk: () => import('./dusk.js'),
  'back-rank': () => import('./back-rank.js'),
  guard: () => import('./guard.js'),
  checkmate: () => import('./checkmate.js'),
  sunrise: () => import('./sunrise.js'),
};

/* Preview only: finished endings the owner can open with ?ending=<id>. Never in the visitor bag.
   Under ?ending= the knight steps through SCENES, then these. To put one in the rotation, move its line up. */
export const PREVIEW = {
  title: () => import('./title.js'),
  'missing-i': () => import('./missing-i.js'),
  'last-line': () => import('./last-line.js'),
};
