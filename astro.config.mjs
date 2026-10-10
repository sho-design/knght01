// @ts-check
import { defineConfig } from 'astro/config';
import csp from './integrations/csp.mjs';

// The Black Queen's QA harness (src/lab/wonderland.astro) is served only by `astro dev`, or by a build made with
// PUBLIC_WL_LAB=1. A production build has no page for it, so the game's only way in stays the rabbit, and the
// harness's own script never becomes a second entry that would split Vite's preload helper out of the Motion chunk.
const wonderlandLab = () => ({
  name: 'knght-wonderland-lab',
  hooks: {
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command === 'dev' || process.env.PUBLIC_WL_LAB) {
        injectRoute({ pattern: '/lab/wonderland', entrypoint: './src/lab/wonderland.astro' });
      }
    },
  },
});

export default defineConfig({
  site: 'https://knght.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: false,
  integrations: [wonderlandLab(), csp()],
});
