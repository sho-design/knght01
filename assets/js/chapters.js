/* KNGHT home: the page read as five chapters.
   Chapter openers, the chapter rail, the white self-check, stacked offers, the worlds swipe on phones, layer sigils, the knight-move hover and the bottom bar. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mobile = matchMedia('(max-width: 900px)');
  if (!$('.hero')) return;

  /* Sigils: hairline heraldry on a 24 grid, the same family as the menu. */
  const PATHS = {
    orb: '<circle cx="12" cy="14" r="7"/><ellipse cx="12" cy="14" rx="3" ry="7"/><path d="M5 14h14M12 7V2M9.6 4h4.8"/>',
    shield: '<path d="M4.5 4h15v7.5c0 5-3.6 8.2-7.5 10-3.9-1.8-7.5-5-7.5-10z"/><path d="M4.5 8.5h15M4.7 13h14.6M6.4 17.3h11.2"/>',
    scales: '<path d="M12 3v18M7.5 21h9M4 6.5h16"/><path d="M6.5 6.5L3.5 13h6zM17.5 6.5l-3 6.5h6z"/><path d="M3.5 13a3 2 0 0 0 6 0M14.5 13a3 2 0 0 0 6 0"/>',
    key: '<circle cx="7" cy="12" r="4.2"/><circle cx="7" cy="12" r="1.4"/><path d="M11.2 12H21M17.5 12v3.2M20.5 12v2.4"/>',
    sword: '<circle cx="12" cy="3" r="1.6"/><path d="M12 4.6V7M8 7h8M10.8 8.2h2.4V19L12 22l-1.2-3z"/>',
    lore: '<path d="M12 6.5C9.8 5 6.9 4.6 4 5v13c2.9-.4 5.8 0 8 1.5 2.2-1.5 5.1-1.9 8-1.5V5c-2.9-.4-5.8 0-8 1.5zM12 6.5v13"/>',
    language: '<path d="M20 3C13.5 4.2 8.6 9.4 6.6 16.4L5.4 21"/><path d="M6.8 15.6c3.4.2 6.8-1.2 9-3.6M9.4 10.8c2.4.1 4.6-.7 6.2-2"/>',
    map: '<path d="M3 6.2 9 4l6 2.2L21 4v13.8L15 20l-6-2.2L3 20z"/><path d="M9 4v13.8M15 6.2V20"/>',
    ground: '<path d="M4.5 21V9.5h2.5V6.5h2.5v3h1.5v-3h2v3h1.5v-3h2.5v3h2.5V21z"/><path d="M10 21v-4.5a2 2 0 0 1 4 0V21"/>',
    artifacts: '<path d="M10 2.5h4V6l2.2 3.2V21H7.8V9.2L10 6z"/><path d="M7.8 12h8.4v5H7.8z"/>',
    machinery: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'
  };
  PATHS.law = PATHS.scales;
  const sigil = (k, cls) => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[k]}</svg>`;

  /* The five chapters, each opened by a band. */
  const verdictSec = $('.verdict');
  if (verdictSec && !verdictSec.id) verdictSec.id = 'the-verdict';
  const CHAPTERS = [
    { n: 'I', t: 'The worlds', s: 'orb', el: $('#worlds') },
    { n: 'II', t: 'The layers', s: 'shield', el: $('#layers') },
    { n: 'III', t: 'The self-check', s: 'scales', el: $('#score') },
    { n: 'IV', t: 'Work with us', s: 'key', el: $('#engage') },
    { n: 'V', t: 'The Verdict', s: 'sword', el: verdictSec }
  ].filter((c) => c.el);

  /* ---------- 1. Chapter openers: an outlined numeral, the sigil and the chapter above its title ---------- */
  const bands = [];
  CHAPTERS.forEach((c) => {
    const band = document.createElement('div');
    band.className = 'chap';
    band.setAttribute('aria-hidden', 'true');
    band.innerHTML = `<div class="wrap chap__in"><span class="chap__num">${c.n}</span><p class="chap__meta">${sigil(c.s, 'chap__sigil')}<span>Chapter ${c.n}</span><b>${c.t}</b></p></div>`;
    c.el.parentNode.insertBefore(band, c.el);
    c.start = band;
    bands.push(band);
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.35 });
    bands.forEach((b) => io.observe(b));
  } else bands.forEach((b) => b.classList.add('is-in'));

  /* ---------- 2. Chapter rail (wide screens) and the bottom bar (phones) ---------- */
  const rail = document.createElement('nav');
  rail.className = 'crail';
  rail.setAttribute('aria-label', 'Chapters');
  rail.innerHTML = `<ol>${CHAPTERS.map((c) => `<li><a href="#${(c.link || '#' + c.el.id).replace(/^#+/, '')}">${sigil(c.s, 'crail__sigil')}<span class="crail__label"><i>${c.n}</i> ${c.t}</span></a></li>`).join('')}</ol><span class="crail__line" aria-hidden="true"><i></i></span>`;
  document.body.appendChild(rail);
  const railLinks = $$('a', rail);
  const railFill = $('.crail__line i', rail);

  const cbar = document.createElement('div');
  cbar.className = 'cbar';
  cbar.innerHTML = `<p class="cbar__chap" aria-live="off"><span class="cbar__n"></span><span class="cbar__t"></span></p><a class="btn btn--sm" href="book/">Book a Verdict</a>`;
  document.body.appendChild(cbar);
  const cbarN = $('.cbar__n', cbar), cbarT = $('.cbar__t', cbar);

  /* ---------- 3. The self-check turns to white as it arrives ---------- */
  const score = $('.score');


  /* ---------- 6. Stacked offers ---------- */
  const offers = $$('.offer');
  offers.forEach((o, i) => o.style.setProperty('--i', i));

  /* ---------- 5. Worlds swipe on phones ---------- */
  const pin = $('.worlds__pin');
  const track = $('.worlds__track');
  const intro = $('.worlds__intro');
  const countNow = $('.worlds__count b');
  const bar = $('.worlds__bar i');
  if (track && intro && pin) {
    const hint = document.createElement('span');
    hint.className = 'worlds__hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'Swipe';
    const head = $('.worlds__head', pin);
    if (head) head.appendChild(hint);
    const place = () => {
      if (mobile.matches) { if (intro.parentNode === track) pin.insertBefore(intro, track); }
      else if (intro.parentNode !== track) track.insertBefore(intro, track.firstChild);
    };
    place();
    mobile.addEventListener('change', place);
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    track.addEventListener('scroll', () => {
      if (!mobile.matches) return;
      const cards = $$('.world', track).filter((w) => !w.hidden && w.offsetParent);
      const max = track.scrollWidth - track.clientWidth;
      const p = max > 0 ? track.scrollLeft / max : 0;
      if (bar) bar.style.transform = `scaleX(${p})`;
      if (countNow && cards.length) countNow.textContent = roman[Math.round(p * (cards.length - 1))] || '';
      hint.classList.toggle('is-gone', track.scrollLeft > 24);
    }, { passive: true });
  }

  /* ---------- 8. Layer sigils ---------- */
  $$('.layer[data-name]').forEach((li) => {
    const k = li.dataset.name.toLowerCase();
    const n = $('.layer__n', li);
    if (PATHS[k] && n && !$('.layer__sigil', n)) n.insertAdjacentHTML('beforeend', sigil(k, 'layer__sigil'));
  });

  /* ---------- 9. Knight-move hover on the world plates ---------- */
  const KNIGHT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.8 21c-.2-2.5-.4-5.5-.2-8.5.3-4 1.8-6.9 3.6-8.1l.2-2 1.4 1.5c2.1 1.1 3.6 3.7 4.4 6.7.3 1.1-.2 1.9-1 1.8l-1.8-.4c-1-.1-1.7.3-1.8 1.2.6 2.4 2.8 4.2 3.6 7.8M6.5 21h11"/><circle cx="13.4" cy="7.4" r=".6"/></svg>';
  $$('.world__plate').forEach((pl) => pl.insertAdjacentHTML('beforeend', `<span class="world__board" aria-hidden="true"></span><span class="world__knight" aria-hidden="true">${KNIGHT}</span>`));

  /* ---------- One scroll loop for all of it ---------- */
  const nav = $('.nav');
  const hero = $('.hero');
  const footer = $('.footer');
  let ticking = false;
  const frame = () => {
    ticking = false;
    const vh = innerHeight, y = scrollY;

    // Numerals drift against the scroll
    if (!reduce) bands.forEach((b) => {
      const r = b.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      b.style.setProperty('--drift', ((r.top + r.height / 2 - vh / 2) * -0.18).toFixed(1) + 'px');
    });

    // Which chapter are we in
    let cur = -1;
    CHAPTERS.forEach((c, i) => { if (c.start && c.start.getBoundingClientRect().top < vh * 0.5) cur = i; });
    const heroGone = hero ? hero.getBoundingClientRect().bottom < vh * 0.4 : y > vh;
    const footIn = footer ? footer.getBoundingClientRect().top < vh * 0.9 : false;
    const lastEl = CHAPTERS[CHAPTERS.length - 1];
    const docEnd = lastEl ? lastEl.el.getBoundingClientRect().bottom : 0;
    railLinks.forEach((a, i) => { a.classList.toggle('is-on', i === cur); a.classList.toggle('is-past', i < cur); if (i === cur) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    if (railFill && CHAPTERS[0] && CHAPTERS[0].start) {
      const top = CHAPTERS[0].start.getBoundingClientRect().top + y;
      const end = docEnd + y;
      railFill.style.transform = `scaleY(${clamp((y + vh * 0.5 - top) / (end - top), 0, 1).toFixed(3)})`;
    }
    rail.classList.toggle('is-on', heroGone && !footIn && cur >= 0);

    // Bottom bar: shows while reading down (the nav is away), hides when the nav comes back
    const navAway = nav && nav.classList.contains('is-hidden');
    const inVerdict = verdictSec && verdictSec.getBoundingClientRect().top < vh * 0.85;
    const showBar = mobile.matches && heroGone && navAway && !inVerdict && !footIn && !root.classList.contains('menu-open') && cur >= 0;
    cbar.classList.toggle('is-on', showBar);
    root.classList.toggle('cbar-on', showBar);
    if (cur >= 0) { cbarN.textContent = CHAPTERS[cur].n; cbarT.textContent = CHAPTERS[cur].t; }

    // The self-check: white page opening edge to edge
    if (score && !reduce) {
      const r = score.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.75), 0, 1);
      const e = 1 - Math.pow(1 - p, 2);
      score.style.setProperty('--clip-x', `${((1 - e) * Math.min(innerWidth * 0.06, 90)).toFixed(1)}px`);
      score.style.setProperty('--clip-r', `${((1 - e) * 36).toFixed(1)}px`);
    }


    // Offers: each card settles back as the next one lands on it
    if (!reduce) offers.forEach((o, i) => {
      const next = offers[i + 1];
      if (!next) return;
      const a = o.getBoundingClientRect(), b = next.getBoundingClientRect();
      const t = clamp(1 - (b.top - a.top) / a.height, 0, 1);
      o.style.setProperty('--s', (1 - t * 0.05).toFixed(4));
      o.style.setProperty('--dim', (t * 0.5).toFixed(3));
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  addEventListener('load', onScroll);
  frame();
})();
