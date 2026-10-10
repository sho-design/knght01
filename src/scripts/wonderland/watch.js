/* The white rabbit's drawing and its pocket watch, which keeps Toronto time. Pure: no DOM, no gsap, no strings.
   rabbit.js imports it, so it sits in the Motion chunk with it (README.md, "Budget"); the portal and the game take
   it from there. Keep it small. */

// The White Rabbit, drawn as a seventh piece of the KNGHT Story set on its 24 grid: the king's collar and skirt,
// a rabbit's head facing right with its ears swept back, and a pocket watch held out on a short chain.
// The watch face's centre is (16.4, 13.85). minute and hour both point to 12 at rest; turn them about the centre,
// clockwise in degrees: the minute hand m * 6, the hour hand (h % 12) * 30 + m / 2.
export const RABBIT = {
  outline: 'M7 19.4c1.2-1.05 2.85-3.85 3-8.5h-.95q-.45 0-.45-.45 0-.45.45-.45h1.35c-.3-.6-.5-1.4-.4-2.2.1-.8.4-1.4.9-1.8C10 4.9 8.7 3 8.7 1.4c0-.4.4-.4.7-.1 1.2 1.1 2 2.6 2.4 4.1-.2-1.5-.5-3.4-.1-4.6.15-.4.5-.4.7 0 .7 1.4.9 3 .8 4.7 1.1.3 2 1.2 2.3 2.2.2.7-.2 1.3-.9 1.4-.6.1-1 .4-1 .9h1.35q.45 0 .45.45 0 .45-.45.45h-.95c.15 4.65 1.8 7.45 3 8.5z',
  watch: 'M14.95 10.9q1.45.1 1.45 1.5m0 0a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 1 1 0-2.9z',
  hands: 'M16.4 13.85v-.8m0 .8l.6.35',
  eye: [13.85, 7.3],
  minute: 'M16.4 13.85v-.85',
  hour: 'M16.4 13.85v-.55',
};

// The time in Toronto: { h: 0 to 23, m, open }. open: Wednesday or Friday from 1 to 5 pm, the hours for calls and
// visits (13:00 to 16:59).
export const toronto = (d = new Date()) => {
  let [w, h, m] = d.toLocaleString('en-US', { timeZone: 'America/Toronto', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).split(/\W+/);
  h %= 24;
  return { h, m: +m, open: /We|Fr/.test(w) && h > 12 && h < 17 };
};
