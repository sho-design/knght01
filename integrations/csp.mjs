// Content Security Policy: after the build, every page gets a <meta> policy listing exactly what it may load.
// Inline scripts are allowed by their SHA-256 hash, so editing one updates the policy on the next build.
// The form service is read from the built pages (src/lib/settings.ts), so setting an endpoint allows it automatically.
// frame-ancestors cannot live in a <meta> tag; it is sent as a header from vercel.json.
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GA = ['https://*.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com'];
const CDN = 'https://d2ol7oe51mr4n9.cloudfront.net';

const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((d) =>
  d.isDirectory() ? walk(join(dir, d.name)) : d.name.endsWith('.html') ? [join(dir, d.name)] : []))).flat();

const policy = (hashes, formOrigins) => [
  "default-src 'self'",
  `script-src 'self' ${hashes.map((h) => `'sha256-${h}'`).join(' ')} https://www.googletagmanager.com https://assets.calendly.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://assets.calendly.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${CDN} ${GA.join(' ')}`,
  `media-src 'self' ${CDN}`,
  `connect-src 'self' ${CDN} ${GA.join(' ')} ${formOrigins.join(' ')}`.trim(),
  'frame-src https://calendly.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

export default function csp() {
  return {
    name: 'knght-csp',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const files = await walk(fileURLToPath(dir));
        const pages = await Promise.all(files.map(async (f) => [f, await readFile(f, 'utf8')]));
        // Form endpoints named anywhere in the build (the quiz meta tag, the sigil form).
        const formOrigins = new Set();
        for (const [, html] of pages) {
          for (const m of html.matchAll(/(?:knght:form-endpoint" content|data-endpoint)="(https:\/\/[^"]+)"/g)) {
            try { formOrigins.add(new URL(m[1]).origin); } catch {}
          }
        }
        for (const [file, html] of pages) {
          const hashes = new Set();
          // Inline scripts that run (JSON-LD is data, not code, so it needs no hash).
          for (const m of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)) {
            hashes.add(createHash('sha256').update(m[1]).digest('base64'));
          }
          const tag = `<meta http-equiv="Content-Security-Policy" content="${policy([...hashes], [...formOrigins])}">`;
          const out = html.replace(/<meta charset="[^"]*">/i, (c) => `${c}\n${tag}`);
          if (out === html) { logger.warn(`No <meta charset> in ${file}; CSP not added`); continue; }
          await writeFile(file, out);
        }
        logger.info(`CSP added to ${pages.length} pages${formOrigins.size ? `, forms allowed: ${[...formOrigins].join(', ')}` : ''}`);
      },
    },
  };
}
