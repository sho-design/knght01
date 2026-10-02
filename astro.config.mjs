// @ts-check
import { defineConfig } from 'astro/config';
import csp from './integrations/csp.mjs';

export default defineConfig({
  site: 'https://knght.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: false,
  integrations: [csp()],
});
