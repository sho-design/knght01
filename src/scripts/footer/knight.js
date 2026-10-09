/* The B knight, the approved one: the KNIGHT path in public/assets/js/chapters.js, on a 24 grid.
   One path holds the head and the plinth; the eye is a separate dot. Keep this in step with chapters.js.
   index.astro draws the swap button from it, and the footer host hands it to every scene. */
export const KNIGHT_D = 'M7 19.4Q5.6 18.9 4.9 17.4Q5.8 17.5 6.4 16.8Q5 16 4.7 14.2Q5.6 14.5 6.3 13.9Q5 12.8 5 10.9Q5.9 11.4 6.6 11Q5.8 9.6 6.1 7.9Q6.9 8.6 7.6 8.4Q7.3 6.8 8.1 5.4Q8.6 6.2 9.5 6.2L10.8 2.4L12.1 4.3C12.3 3.3 13.4 3.0 14.8 3.55Q14.05 4.0 13.9 4.8Q15.05 4.25 15.9 5.05Q15.15 5.35 14.85 5.95C16.52 6.90 17.79 8.33 18.6 10.6C19 11.8 18.6 13.2 17.3 13.2L15.6 12.7C14.6 12.4 13.8 12.9 13.8 13.9C14 15.9 16 17.4 16.9 19.4ZM5.6 19.4H18.2M4.6 21.5H19.2';
export const KNIGHT_EYE = { cx: 14.6, cy: 8.4, r: 0.6 };
export const KNIGHT_VIEWBOX = '0 0 24 24';
// The same knight as markup, for innerHTML. Hairline: stroke is currentColor, the eye is filled.
export const KNIGHT_SVG = `<svg viewBox="${KNIGHT_VIEWBOX}" aria-hidden="true" focusable="false"><path d="${KNIGHT_D}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${KNIGHT_EYE.cx}" cy="${KNIGHT_EYE.cy}" r="${KNIGHT_EYE.r}" fill="currentColor"/></svg>`;
