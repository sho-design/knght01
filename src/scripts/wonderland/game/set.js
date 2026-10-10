/* The KNGHT Story set (the K1 king, the Q6 queen) as <symbol>s for the Black Queen's board.
   A copy on purpose: the paths are verbatim from src/assets/knght-chess.svg (and footer/pieces.js), so this chunk
   shares nothing with the footer. Keep the three in step if the set ever changes.
   On the 24 grid. Each symbol takes its colours from custom properties on the host <svg>:
     --body  the piece's own colour, --ink  the outline (the colour that contrasts with its square),
     --cut   the details and the knght's eye (always the colour opposite the body).
   The host sets stroke-width; it is inherited into the symbol. The plinth is always in the outline colour. */

export const PLINTH = 'M5.6 19.4H18.2M4.6 21.5H19.2';
export const SET = {
  k: {
    outline: 'M7 19.4C8.2 18.35 9.85 15.55 10 10.9L9.05 10.9Q8.6 10.9 8.6 10.45Q8.6 10 9.05 10L10.4 10C10.35 8.7 8.3 7.25 8.05 5.6Q8 5.15 8.45 5.15L8.85 5.15C8.85 4.08 10.016 3.672 11.55 3.609V2.34H10.25H12V1.64A0.42 0.42 0 1 1 12 0.8A0.42 0.42 0 1 1 12 1.64A0.42 0.42 0 1 1 12 0.8A0.42 0.42 0 1 1 12 1.64V2.34H13.75H12.45V3.609C12.303 3.603 12.153 3.6 12 3.6C11.847 3.6 11.697 3.603 11.55 3.609C11.697 3.603 11.847 3.6 12 3.6C12.153 3.6 12.303 3.603 12.45 3.609C13.984 3.672 15.15 4.08 15.15 5.15L15.55 5.15Q16 5.15 15.95 5.6C15.7 7.25 13.65 8.7 13.6 10L14.95 10Q15.4 10 15.4 10.45Q15.4 10.9 14.95 10.9L14 10.9C14.15 15.55 15.8 18.35 17 19.4Z',
    details: 'M8.803 6.4H15.197',
  },
  q: {
    outline: 'M7 19.4C8.2 18.35 9.85 15.55 10 10.9L9.05 10.9Q8.6 10.9 8.6 10.45Q8.6 10 9.05 10L10.4 10C10.4 8.6 9.15 7.55 8.6 6.4L8.5 4.5L8.44 4.363A0.43 0.43 0 1 1 8.095 3.575A0.43 0.43 0 1 1 8.44 4.363A0.43 0.43 0 1 1 8.095 3.575A0.43 0.43 0 1 1 8.44 4.363L8.5 4.5L9.35 5.5L10.2 3.65L10.16 3.454A0.45 0.45 0 1 1 9.981 2.572A0.45 0.45 0 1 1 10.16 3.454A0.45 0.45 0 1 1 9.981 2.572A0.45 0.45 0 1 1 10.16 3.454L10.2 3.65L11.1 5.05L12 2.95L12 2.6A0.5 0.5 0 1 1 12 1.6A0.5 0.5 0 1 1 12 2.6A0.5 0.5 0 1 1 12 1.6A0.5 0.5 0 1 1 12 2.6L12 2.95L12.9 5.05L13.8 3.65L13.84 3.454A0.45 0.45 0 1 1 14.019 2.572A0.45 0.45 0 1 1 13.84 3.454A0.45 0.45 0 1 1 14.019 2.572A0.45 0.45 0 1 1 13.84 3.454L13.8 3.65L14.65 5.5L15.5 4.5L15.56 4.363A0.43 0.43 0 1 1 15.905 3.575A0.43 0.43 0 1 1 15.56 4.363A0.43 0.43 0 1 1 15.905 3.575A0.43 0.43 0 1 1 15.56 4.363L15.5 4.5L15.4 6.4C14.85 7.55 13.6 8.6 13.6 10L14.95 10Q15.4 10 15.4 10.45Q15.4 10.9 14.95 10.9L14 10.9C14.15 15.55 15.8 18.35 17 19.4Z',
    details: 'M9.1 6.4H14.9',
  },
  r: {
    outline: 'M7 19.4C8.2 18.35 9.15 14.5 9.15 10.9L8.85 10.9Q8.4 10.9 8.4 10.45Q8.4 10 8.85 10L9.05 10C8.95 9.05 7.9 8.4 7.9 7.3L7.9 5L9.15 5L9.15 7.1L11.35 7.1L11.35 5L12.65 5L12.65 7.1L14.85 7.1L14.85 5L16.1 5L16.1 7.3C16.1 8.4 15.05 9.05 14.95 10L15.15 10Q15.6 10 15.6 10.45Q15.6 10.9 15.15 10.9L14.85 10.9C14.85 14.5 15.8 18.35 17 19.4Z M10.35 19.4V16.75A1.65 1.65 0 0 1 13.65 16.75V19.4Z',
  },
  b: {
    outline: 'M7 19.4C8.2 18.35 9.85 15.55 10 10.9L9.05 10.9Q8.6 10.9 8.6 10.45Q8.6 10 9.05 10L10.4 10C9.65 9.6 9.25 9 9.25 7.9C9.25 7.25 9.41 6.77 9.75 6.2C10.5 4.933 11.25 3.667 12 2.4C12.75 3.667 13.5 4.933 14.25 6.2C14.59 6.77 14.75 7.25 14.75 7.9C14.75 9 14.35 9.6 13.6 10L14.95 10Q15.4 10 15.4 10.45Q15.4 10.9 14.95 10.9L14 10.9C14.15 15.55 15.8 18.35 17 19.4ZM12 5.79A0.76 0.76 0 1 1 12 7.31A0.76 0.76 0 1 1 12 5.79Z',
    details: 'M12 2.4V5.79',
  },
  n: {
    outline: 'M7 19.4Q5.6 18.9 4.9 17.4Q5.8 17.5 6.4 16.8Q5 16 4.7 14.2Q5.6 14.5 6.3 13.9Q5 12.8 5 10.9Q5.9 11.4 6.6 11Q5.8 9.6 6.1 7.9Q6.9 8.6 7.6 8.4Q7.3 6.8 8.1 5.4Q8.6 6.2 9.5 6.2L10.8 2.4L12.1 4.3C12.3 3.3 13.4 3.0 14.8 3.55Q14.05 4.0 13.9 4.8Q15.05 4.25 15.9 5.05Q15.15 5.35 14.85 5.95C16.52 6.90 17.79 8.33 18.6 10.6C19 11.8 18.6 13.2 17.3 13.2L15.6 12.7C14.6 12.4 13.8 12.9 13.8 13.9C14 15.9 16 17.4 16.9 19.4Z',
    eye: [14.6, 8.4],
  },
  p: {
    outline: 'M8 19.4C9 18.55 10.375 16.24 10.5 12.1L9.85 12.1Q9.4 12.1 9.4 11.65Q9.4 11.2 9.85 11.2L10.946 11.2A2 2 0 0 1 12 7.5A2 2 0 0 1 13.054 11.2L14.15 11.2Q14.6 11.2 14.6 11.65Q14.6 12.1 14.15 12.1L13.5 12.1C13.625 16.24 15 18.55 16 19.4ZM13.3 9.5A1.3 1.3 0 0 0 10.7 9.5A1.3 1.3 0 0 0 13.3 9.5Z',
  },
};

const symbol = (id, s) =>
  `<symbol id="wlg-${id}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">`
  + `<path style="fill:var(--body);stroke:var(--ink)" fill-rule="evenodd" d="${s.outline}"/>`
  + (s.details ? `<path style="stroke:var(--cut)" d="${s.details}"/>` : '')
  + `<path style="stroke:var(--ink)" d="${PLINTH}"/>`
  + (s.eye ? `<circle style="fill:var(--cut)" stroke="none" cx="${s.eye[0]}" cy="${s.eye[1]}" r=".6"/>` : '')
  + '</symbol>';

// The hidden sprite, placed once inside the game's host.
export const SPRITE = `<svg class="wlg-sprite" aria-hidden="true" focusable="false" width="0" height="0"><defs>${
  Object.entries(SET).map(([id, s]) => symbol(id, s)).join('')}</defs></svg>`;

// One piece: <svg class="wlg-glyph" data-c="w|b"><use href="#wlg-q"/></svg>. Its look comes from CSS (game.css).
export const glyph = (type, color, cls = '') =>
  `<svg class="wlg-glyph${cls ? ' ' + cls : ''}" data-c="${color}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#wlg-${type}"/></svg>`;
