// The KNGHT marks: hairline sigils on a 24 grid, one icon per thing and one thing per icon.
// They live in marks.json, which the KNGHT Order font is built from too. `npm run marks` checks the site against it.
import REGISTRY from './marks.json';

type Mark = { id: string; group: string; svg: string };
const marks = REGISTRY.marks as Mark[];
const of = (group: string) => Object.fromEntries(marks.filter((m) => m.group === group).map((m) => [m.id, m.svg]));

// Every mark by id, such as MARKS['the-build'].
export const MARKS: Record<string, string> = Object.fromEntries(marks.map((m) => [m.id, m.svg]));

// The seven layers, by layer id.
export const SIGILS: Record<string, string> = of('layers');

// One sigil for each world, by world slug.
export const WORLD_SIGILS: Record<string, string> = of('worlds');
