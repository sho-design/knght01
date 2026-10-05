/* Loads the sword after the page has settled, so it never slows the first paint.
   Skipped for reduced motion and where WebGL is missing. */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const gl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
if (!reduce && gl) {
  const go = () => import('./sword.js').then((m) => m.default()).catch(() => {});
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 600));
  if (document.readyState === 'complete') idle(go);
  else addEventListener('load', () => idle(go), { once: true });
}
