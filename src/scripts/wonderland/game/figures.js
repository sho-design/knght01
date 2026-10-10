/* The cast's drawings: KNGHT hairline figures in the Story set's language, drawn fresh for the Black Queen's board.
   The 24 grid, round caps and joins, bodies filled black, lines and details white, a hairline of 1.25 px (1.5 from
   760 px wide) that never scales (cast.css). Nothing here is copied from Tenniel or anyone's cartoon: no fur, no
   faces with brows, no clothing beyond what a chess piece would carry.
   Classes on the paths (cast.css): b a black body with a white line, f a white body, h a black halo drawn under a
   line that crosses something white, so it still reads. Every figure is aria-hidden; cast.js places and moves them.
   The White Rabbit is RABBIT from ../watch.js, built in cast.js (only cast.js imports the top level). */
import { SET, PLINTH } from './set.js';

const svg = (cls, view, body) => `<svg class="wlc-fig ${cls}" viewBox="${view}" aria-hidden="true" focusable="false">${body}</svg>`;

/* ----- The Cheshire Cat: only its eyes and its grin (viewBox 0 4 24 12) -----
   Two almond eyes 4.2 by 2.4, tilted 8 degrees up and out, each with a white slit; a wide crescent grin with nine
   short teeth and a small tuck at each corner. The eyes (.wlc-lid) blink and fade before the grin; the grin goes
   last. */
const EYE = 'M-2.1 0Q0-2.4 2.1 0 0 2.4-2.1 0Z';
const SLIT = 'M0-1Q.7 0 0 1-.7 0 0-1Z';
const eye = (x, a) => `<g transform="translate(${x} 8.4) rotate(${a})"><g class="wlc-lid"><path class="b" d="${EYE}"/><path class="c" d="${SLIT}"/></g></g>`;
// The outer lip runs (4.2, 12.2) to (12, 16.6) to (19.8, 12.2); the inner lip (5.6, 12.6) to (12, 14.6) to (18.4, 12.6).
const GRIN = 'M4.2 12.2C6.6 15.3 9.2 16.6 12 16.6S17.4 15.3 19.8 12.2Q19.1 12.45 18.4 12.6C16.4 14 14.2 14.6 12 14.6S7.6 14 5.6 12.6Q4.9 12.45 4.2 12.2Z';
// Nine teeth hang from the inner lip, 1.2 apart, each a little over half the gap (sampled from the two lips).
const TEETH = 'M7.2 13.58V14.45M8.4 14.07V15.05M9.6 14.4V15.46M10.8 14.59V15.69M12 14.65V15.76M13.2 14.59V15.69M14.4 14.4V15.46M15.6 14.07V15.05M16.8 13.58V14.45';
const TUCKS = 'M3.55 11.45Q3.75 12.35 4.55 12.75M20.45 11.45Q20.25 12.35 19.45 12.75';
export const CAT = svg('wlc-cat', '0 4 24 12',
  `<g class="wlc-eyes">${eye(8.2, 8)}${eye(15.8, -8)}</g>`
  + `<g class="wlc-grin"><path class="b" d="${GRIN}"/><path class="d" d="${TEETH}"/><path d="${TUCKS}"/></g>`);

/* ----- Humpty Dumpty on his wall (24 grid; drawn 36 x 40, 44 x 48 from 760 px) -----
   The wall: a course line and its joints. Humpty: an egg, the Story set's collar band for his cravat with a small
   bow, two dot eyes, a closed smile, short arms resting on the wall's top edge and two legs over the front.
   .wlc-hd is everything but the wall: it wobbles about (12, 15.5) when he speaks. */
const WALL = 'M3 15.5H21V22H3Z';
const BRICKS = 'M3 18.7H21M7.5 15.5V18.7M12 15.5V18.7M16.5 15.5V18.7M9.75 18.7V22M14.25 18.7V22M18.75 18.7V22';
const LEGS = 'M10.4 15.3 9.8 18.8M13.6 15.3 14.2 18.8';
const FEET = 'M9.8 18.8Q8.75 18.75 8.45 19.6M14.2 18.8Q15.25 18.75 15.55 19.6';
const EGG = 'M12 3.2C14.9 3.2 16.3 7.2 16.3 10.4 16.3 13.4 14.5 15.5 12 15.5S7.7 13.4 7.7 10.4C7.7 7.2 9.1 3.2 12 3.2Z';
const ARMS = 'M8.05 12.7Q6.7 13.5 6.4 15.5M15.95 12.7Q17.3 13.5 17.6 15.5';
const BAND = 'M7.75 10H16.25Q16.7 10 16.7 10.45 16.7 10.9 16.25 10.9H7.75Q7.3 10.9 7.3 10.45 7.3 10 7.75 10Z';
const BOW = 'M12 10.45 10.75 9.7V11.2ZM12 10.45 13.25 9.7V11.2Z';
export const HUMPTY = svg('wlc-humpty', '2.4 1 19.2 21.4',
  `<path class="b" d="${WALL}"/><path class="d" d="${BRICKS}"/>`
  + `<g class="wlc-hd"><path class="h" d="${LEGS}${FEET}"/><path d="${LEGS}${FEET}"/>`
  + `<path class="b" d="${EGG}"/><path d="${ARMS}"/><path class="b" d="${BAND}"/><path class="b" d="${BOW}"/>`
  + '<circle class="c" cx="10.6" cy="7.5" r=".45"/><circle class="c" cx="13.4" cy="7.5" r=".45"/>'
  + '<path class="d" d="M11.3 8.85Q12 9.35 12.7 8.85"/></g>');

/* ----- The White Knght: the Story set's knght, with a rider who does not stay on (24 grid, viewBox -5 -1 25 25) -----
   The horse is the set's knght glyph (white body, black eye, its plinth), with the plinth's lower line drawn on to
   the left as the ground. The rider sits behind the mane: a helmet with its visor, a plume, a short body and one
   leg over the mane, black with white lines like every piece, so it shows on the horse and off it.
   .wlc-rider turns about the saddle (8.4, 8.2) when he falls. */
const N = SET.n;
// A great helm with its visor slit and a plume curling back; a body like a small piece; one leg over the mane.
const HELM = 'M6.95 4.95V3.5Q6.95 2.25 8.15 2.25T9.35 3.5V4.95Z';
const VISOR = 'M8.35 3.55H9.35M8.85 3.55V4.4';
const PLUME = 'M8.15 2.25C7.75 1.05 6.55.45 5.25.85';
const BODY = 'M7.6 7.95 6.85 5.55Q6.75 4.95 7.35 4.95H9Q9.6 4.95 9.5 5.55L9.1 7.95Z';
const LANCE = 'M9.6 6.6 9.95-.5';
const PENNANT = 'M9.95-.5 11.9.05 9.92.6';
const LEG = 'M8.4 7.35 10.1 7.95Q10.5 8.1 10.45 8.5L10.35 10.2 11 10.35Q11.2 10.8 10.85 10.85H9.7L9.75 8.95 8.3 8.4Z';
export const KNGHT = svg('wlc-knght', '-5 -2.5 25 25',
  '<path class="wlc-ground" d="M-4.2 21.5H4.6"/>'
  + `<path class="f" fill-rule="evenodd" d="${N.outline}"/><path d="${PLINTH}"/>`
  + `<circle class="k" cx="${N.eye[0]}" cy="${N.eye[1]}" r=".6"/>`
  + `<g class="wlc-rider"><g transform="translate(8.4 8.2) scale(1.2) translate(-8.4 -8.2)"><path class="h" d="${LANCE}"/><path d="${LANCE}"/><path class="b" d="${PENNANT}"/>`
  + `<path d="${PLUME}"/><path class="b" d="${LEG}"/><path class="b" d="${BODY}"/><path class="b" d="${HELM}"/><path class="d" d="${VISOR}"/></g></g>`);
