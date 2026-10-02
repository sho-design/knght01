// The sitemap, built from the pages and content files so a new world or article is listed automatically.
import type { APIRoute } from 'astro';
import { execFileSync } from 'node:child_process';
import { getWorlds, getLayers, getForPages, getRules } from '../lib/site';

const today = new Date().toISOString().slice(0, 10);
/** Last commit date of a source file, or today when git history is not available. */
const changed = (file: string) => {
  try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { encoding: 'utf8' }).trim() || today; }
  catch { return today; }
};

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.href ?? 'https://knght.com/').replace(/\/$/, '');
  const pages: [string, string][] = [
    ['/', 'src/pages/index.astro'],
    ['/llms.txt', 'public/llms.txt'],
    ['/book/', 'src/pages/book/index.astro'],
    ['/process/', 'src/pages/process.astro'],
    ['/rules/', 'src/pages/rules/index.astro'],
    ['/sigil/', 'src/pages/sigil.astro'],
    ['/privacy/', 'src/pages/privacy/index.astro'],
    ['/accessibility/', 'src/pages/accessibility/index.astro'],
  ];
  const fromCollection = (dir: string, ext: string, entries: { id: string }[]) =>
    entries.map((e) => [`/${dir}/${e.id}/`, `src/content/${dir === 'for' ? 'for' : dir}/${e.id}.${ext}`] as [string, string]);
  pages.push(
    ...fromCollection('worlds', 'json', await getWorlds()),
    ...fromCollection('layers', 'json', await getLayers()),
    ...fromCollection('for', 'json', await getForPages()),
    ...fromCollection('rules', 'md', await getRules()),
  );
  const body = pages.map(([path, file]) => `  <url>\n    <loc>${base}${path}</loc>\n    <lastmod>${changed(file)}</lastmod>\n  </url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
