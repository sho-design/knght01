// Checks the KNGHT marks: one icon per thing and one thing per icon.
// src/lib/marks.json is the list. Every icon the site draws must be on it, and nothing on it may repeat.
// Run with `npm run marks`. It also runs before every build, so a stray icon stops the deploy.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const { marks } = JSON.parse(readFileSync(join(root, 'src/lib/marks.json'), 'utf8'));
const tidy = (svg) => svg.replace(/\s+/g, ' ').replace(/\s*\/>/g, '/>').trim();
const problems = [];

// 1. Nothing on the list repeats: not an id, a drawing, a typed name or a code point.
for (const [what, values] of [
  ['id', marks.map((m) => m.id)],
  ['drawing', marks.map((m) => tidy(m.svg))],
  ['typed name', marks.flatMap((m) => m.names)],
  ['code point', marks.map((m) => m.codepoint).filter(Boolean)],
]) {
  const seen = new Map();
  values.forEach((v, i) => {
    if (seen.has(v)) problems.push(`marks.json: the ${what} of "${marks[i].id}" repeats "${marks[seen.get(v)].id}"`);
    else seen.set(v, i);
  });
}
const known = new Map(marks.map((m) => [tidy(m.svg), m.id]));

// 2. Every icon table in the site's scripts draws marks from the list.
const tableEntry = /^\s*'?([a-z][a-z0-9-]*)'?:\s*'(<(?:path|circle|ellipse|rect|g)[^']*)'/gm;
const jsDir = join(root, 'public/assets/js');
for (const file of readdirSync(jsDir).filter((f) => f.endsWith('.js'))) {
  const src = readFileSync(join(jsDir, file), 'utf8');
  for (const [, key, svg] of src.matchAll(tableEntry)) {
    if (!known.has(tidy(svg))) problems.push(`public/assets/js/${file}: "${key}" is not a KNGHT mark. Add it to marks.json or use the mark that means this.`);
  }
}

// 3. No page draws a 24-grid icon inline: pages take theirs from MARKS, SIGILS or WORLD_SIGILS.
//    Player controls are not marks, so the film's play and pause button is left alone.
const NOT_MARKS = ['film__play'];
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
for (const file of walk(join(root, 'src')).filter((f) => f.endsWith('.astro'))) {
  const src = readFileSync(file, 'utf8');
  for (const [tag, inner] of src.matchAll(/<svg[^>]*viewBox="0 0 24 24"[^>]*?(?<!\/)>([\s\S]*?)<\/svg>/g)) {
    if (!inner.trim() || NOT_MARKS.some((c) => src.slice(Math.max(0, src.indexOf(tag) - 200), src.indexOf(tag)).includes(c))) continue;
    if (!known.has(tidy(inner))) problems.push(`${file.slice(root.length)}: an icon is drawn inline. Use MARKS from src/lib/sigils.ts.`);
  }
}

if (problems.length) {
  console.error(`KNGHT marks: ${problems.length} problem${problems.length > 1 ? 's' : ''}\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`KNGHT marks: ${marks.length} marks, one icon per thing. Every icon on the site is on the list.`);
