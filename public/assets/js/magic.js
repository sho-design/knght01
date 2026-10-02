/* KNGHT home: the quiet magic.
   Runes that wake under the cursor, chapter names that decode,
   a portal into each world and wax seals that break. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  if (!$('.hero')) return;

  const G = {
    knight: '<path d="M7 19.4Q5.6 18.9 4.9 17.4Q5.8 17.5 6.4 16.8Q5 16 4.7 14.2Q5.6 14.5 6.3 13.9Q5 12.8 5 10.9Q5.9 11.4 6.6 11Q5.8 9.6 6.1 7.9Q6.9 8.6 7.6 8.4Q7.3 6.8 8.1 5.4Q8.6 6.2 9.5 6.2L10.8 2.4L12.3 4.6C15 5.1 17.5 7.4 18.6 10.6C19 11.8 18.6 13.2 17.3 13.2L15.6 12.7C14.6 12.4 13.8 12.9 13.8 13.9C14 15.9 16 17.4 16.9 19.4ZM5.6 19.4H18.2M4.6 21.5H19.2"/>',
    sword: '<circle cx="12" cy="3" r="1.6"/><path d="M12 4.6V7M8 7h8M10.8 8.2h2.4V19L12 22l-1.2-3z"/>',
    lore: '<path d="M12 6.5C9.8 5 6.9 4.6 4 5v13c2.9-.4 5.8 0 8 1.5 2.2-1.5 5.1-1.9 8-1.5V5c-2.9-.4-5.8 0-8 1.5zM12 6.5v13"/>',
    law: '<path d="M12 3v18M7.5 21h9M4 6.5h16"/><path d="M6.5 6.5L3.5 13h6zM17.5 6.5l-3 6.5h6z"/>',
    language: '<path d="M20 3C13.5 4.2 8.6 9.4 6.6 16.4L5.4 21"/><path d="M6.8 15.6c3.4.2 6.8-1.2 9-3.6"/>',
    map: '<path d="M3 6.2 9 4l6 2.2L21 4v13.8L15 20l-6-2.2L3 20z"/><path d="M9 4v13.8M15 6.2V20"/>',
    ground: '<path d="M4.5 21V9.5h2.5V6.5h2.5v3h1.5v-3h2v3h1.5v-3h2.5v3h2.5V21z"/>',
    artifacts: '<path d="M10 2.5h4V6l2.2 3.2V21H7.8V9.2L10 6z"/><path d="M7.8 12h8.4v5H7.8z"/>',
    machinery: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>'
  };
  const glyphs = Object.keys(G);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* ---------- 1. Runes carved into the dark, woken by the cursor or a finger ---------- */
  const runeHosts = $$('.thesis, .chap, .layers');
  runeHosts.forEach((host) => {
    const layer = document.createElement('div');
    layer.className = 'runes';
    layer.setAttribute('aria-hidden', 'true');
    const n = host.classList.contains('chap') ? 4 : 9;
    let html = '';
    for (let i = 0; i < n; i++) {
      const g = glyphs[Math.floor(rnd() * glyphs.length)];
      const size = 34 + Math.round(rnd() * 46);
      html += `<svg viewBox="0 0 24 24" style="left:${(rnd() * 94).toFixed(1)}%;top:${(rnd() * 90).toFixed(1)}%;width:${size}px;height:${size}px;transform:rotate(${Math.round(rnd() * 40 - 20)}deg)">${G[g]}</svg>`;
    }
    layer.innerHTML = html;
    const lit = layer.cloneNode(true);
    lit.className = 'runes runes--lit';
    host.prepend(layer, lit);
  });
  const wake = (e) => {
    const host = e.target.closest && e.target.closest('.thesis, .chap, .layers');
    if (!host) return;
    const r = host.getBoundingClientRect();
    host.style.setProperty('--rx', `${e.clientX - r.left}px`);
    host.style.setProperty('--ry', `${e.clientY - r.top}px`);
    host.classList.add('is-woken');
    clearTimeout(host._rt);
    host._rt = setTimeout(() => host.classList.remove('is-woken'), fine ? 2400 : 1600);
  };
  addEventListener('pointermove', wake, { passive: true });
  addEventListener('pointerdown', wake, { passive: true });

  /* ---------- 9. Chapter names decode from runes ---------- */
  const RUNE = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  const decode = (el) => {
    if (!el || el.dataset.decoded) return;
    el.dataset.decoded = '1';
    const final = el.textContent;
    if (reduce) return;
    el.setAttribute('aria-label', final);
    const dur = 650, start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const fixed = Math.floor(p * final.length);
      el.textContent = final.split('').map((ch, i) => (i < fixed || ch === ' ' ? ch : RUNE[Math.floor(Math.random() * RUNE.length)])).join('');
      if (p < 1) requestAnimationFrame(tick); else { el.textContent = final; el.removeAttribute('aria-label'); }
    };
    requestAnimationFrame(tick);
  };
  const decodeTargets = $$('.chap__meta b');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { decode(e.target); io.unobserve(e.target); } }), { threshold: 0.8 });
    decodeTargets.forEach((el) => io.observe(el));
  }


  /* ---------- 12. Portal into a world (a fallback for browsers without page transitions) ---------- */
  const crossDocVT = 'CSSViewTransitionRule' in window;
  if (!crossDocVT && !reduce) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.world__link');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const plate = $('.world__plate img', a.closest('.world'));
      if (!plate) return;
      e.preventDefault();
      const r = plate.getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.className = 'portal';
      ghost.innerHTML = `<img src="${plate.currentSrc || plate.src}" alt="">`;
      Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      document.body.appendChild(ghost);
      requestAnimationFrame(() => requestAnimationFrame(() => ghost.classList.add('is-open')));
      setTimeout(() => { location.href = a.href; }, 520);
    });
  }

  /* ---------- 5. Every world arrives sealed. The seal breaks on hover, or as it scrolls in on a phone ---------- */
  const SEAL = `<svg viewBox="0 0 80 80" aria-hidden="true"><path class="seal__wax" d="M40 4c5 0 7 4 11 5s9-1 12 3 1 8 4 11 7 5 7 10-4 7-4 11 3 9 0 12-8 1-11 4-3 8-8 9-8-2-12-1-6 5-11 5-7-4-11-5-9 1-12-3-1-8-4-11-7-5-7-10 4-7 4-11-3-9 0-12 8-1 11-4 3-8 8-9 8 2 12 1 6-5 11-5z"/><circle cx="40" cy="40" r="22" class="seal__ring"/><g class="seal__mark"><circle cx="40" cy="26" r="2.4"/><path d="M40 28.4v3.4M34.5 31.8h11M38.6 33.4h2.8v15.4L40 53l-1.4-4.2z"/></g></svg>`;
  $$('.world__plate').forEach((pl) => {
    const s = document.createElement('span');
    s.className = 'wseal';
    s.innerHTML = `<span class="wseal__half wseal__l">${SEAL}</span><span class="wseal__half wseal__r">${SEAL}</span>`;
    pl.appendChild(s);
  });
  const breakSeal = (w) => { if (!w.classList.contains('is-unsealed')) w.classList.add('is-unsealed'); };
  $$('.world').forEach((w) => {
    w.addEventListener('pointerenter', () => breakSeal(w));
    w.addEventListener('focusin', () => breakSeal(w));
  });
  if (!fine && 'IntersectionObserver' in window) {
    const so = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setTimeout(() => breakSeal(e.target), 350); so.unobserve(e.target); } }), { threshold: 0.65 });
    $$('.world').forEach((w) => so.observe(w));
  }

})();
