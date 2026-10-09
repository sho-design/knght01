/* The footer endings. One line per scene: the key is its id (used by ?ending=<id> and the bag),
   the value a lazy import, so the build makes one chunk per scene and a visit fetches only the one it shows.
   The order here is the order the knight steps through under ?ending=. See SCENES.md for the contract.
   letter-to-piece.js is out of the bag until it becomes a true letter-to-piece transformation. */
export const SCENES = {
  lookout: () => import('./lookout.js'),
  'your-move': () => import('./your-move.js'),
  'tear-along': () => import('./tear-along.js'),
  'last-rank': () => import('./last-rank.js'),
};
