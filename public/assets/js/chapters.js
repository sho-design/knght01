/* KNGHT home: the page read as five chapters.
   Chapter openers, the chapter rail, the white self-check, the offer ladder, the worlds swipe on phones, layer sigils, the knight-move hover and the bottom bar. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mobile = matchMedia('(max-width: 900px)');
  const G = !!window.KNGHT_MOTION; // GSAP owns the numerals, the white wipe and the ladder entrance
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
    { n: 'II', t: 'Work with us', s: 'key', el: $('#engage') },
    { n: 'III', t: 'The layers', s: 'shield', el: $('#layers') },
    { n: 'IV', t: 'The self-check', s: 'scales', el: $('#score') },
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
  if (G) { /* motion.js */ } else if ('IntersectionObserver' in window) {
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
  cbar.innerHTML = `<p class="cbar__chap" aria-live="off"><span class="cbar__n"></span><span class="cbar__t"></span></p><a class="btn btn--sm" href="book/">Book the free call</a>`;
  document.body.appendChild(cbar);
  const cbarN = $('.cbar__n', cbar), cbarT = $('.cbar__t', cbar);

  /* ---------- 3. The self-check turns to white as it arrives ---------- */
  const score = $('.score');


  /* ---------- 6. The offer ladder: steps rise in order, sigils draw, cards lean to the cursor. The price reads 3,500 from the first frame. ---------- */
  const ladder = $('[data-ladder]');
  if (ladder) {
    const run = () => ladder.classList.add('is-in');
    if (G) { /* motion.js */ } else if ('IntersectionObserver' in window) {
      const lo = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { run(); lo.disconnect(); } }, { threshold: 0.25 });
      lo.observe(ladder);
    } else run();
    if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      $$('.rung', ladder).forEach((card) => {
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`);
          card.style.setProperty('--tilt-y', `${(x * 6).toFixed(2)}deg`);
          card.style.setProperty('--lx', `${((x + 0.5) * 100).toFixed(1)}%`);
          card.style.setProperty('--ly', `${((y + 0.5) * 100).toFixed(1)}%`);
        });
        card.addEventListener('pointerleave', () => { card.style.setProperty('--tilt-x', '0deg'); card.style.setProperty('--tilt-y', '0deg'); });
      });
    }
  }

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

  /* ---------- 10. The dial's codex: each question shows its layer's sigil and meaning ----------
     The meaning decodes from runes. Hover, focus or tap any segment to read that layer. */
  const dial = $('[data-dial]');
  const codex = $('[data-dial-codex]');
  const qs = $$('#quiz .q');
  if (dial && codex && qs.length) {
    const els = { no: $('[data-codex-no]', codex), sigil: $('[data-codex-sigil]', codex), name: $('[data-codex-name]', codex), def: $('[data-codex-def]', codex) };
    const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    const N = qs.length;
    let current = 0, holdUntil = 0, timer = 0, raf = 0, peeking = false;

    const decodeInto = (el, text) => {
      cancelAnimationFrame(raf);
      if (reduce) { el.textContent = text; return; }
      const t0 = performance.now(), dur = 520 + text.length * 9;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur), fixed = Math.floor(p * text.length);
        el.textContent = text.split('').map((ch, k) => (k < fixed || ch === ' ' ? ch : RUNES[(Math.random() * RUNES.length) | 0])).join('');
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const render = (i) => {
      const q = qs[i]; if (!q) return;
      const name = q.dataset.layer;
      els.no.textContent = `Layer ${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
      els.sigil.innerHTML = sigil(name.toLowerCase(), 'dial__sig');
      els.name.textContent = name;
      dial.classList.remove('is-scoring', 'is-done');
      dial.classList.add('is-codex');
      decodeInto(els.def, q.dataset.def);
      codex.classList.remove('is-rise'); void codex.offsetWidth;
      codex.classList.add('is-rise');
    };
    const showCurrent = () => { clearTimeout(timer); timer = setTimeout(() => render(current), Math.max(0, holdUntil - performance.now())); };

    document.addEventListener('knght:question', (e) => { current = e.detail.i; if (!peeking) showCurrent(); });
    document.addEventListener('knght:answer', () => {
      // The answer lands on the score first, then the next layer's meaning arrives.
      dial.classList.remove('is-codex'); dial.classList.add('is-scoring');
      holdUntil = performance.now() + (reduce ? 0 : 1400);
    });
    document.addEventListener('knght:verdict', () => { clearTimeout(timer); dial.classList.remove('is-codex', 'is-scoring'); dial.classList.add('is-done'); });
    document.addEventListener('knght:reset', () => { holdUntil = 0; });
    current = +(dial.dataset.at || 0);
    render(current);

    // Hover or tap any segment or label to read that layer, then it returns.
    {
      const segsG = $('[data-dial-segs]', dial);
      const tracks = $$('.seg-track', segsG);
      const labels = $$('.seg-label', segsG);
      let back = 0;
      const peek = (i) => {
        if (dial.classList.contains('is-done')) return;
        clearTimeout(back); peeking = i !== current;
        dial.classList.toggle('is-peek', peeking);
        tracks.forEach((t, k) => t.classList.toggle('is-peeked', peeking && k === i));
        labels.forEach((t, k) => t.classList.toggle('is-peeked', peeking && k === i));
        render(i);
      };
      const unpeek = (delay) => {
        clearTimeout(back);
        back = setTimeout(() => {
          if (!peeking) return;
          peeking = false; dial.classList.remove('is-peek');
          tracks.forEach((t) => t.classList.remove('is-peeked')); labels.forEach((t) => t.classList.remove('is-peeked'));
          if (!dial.classList.contains('is-done')) render(current);
        }, delay);
      };
      tracks.forEach((t, i) => {
        const hit = t.cloneNode(); hit.setAttribute('class', 'seg-hit'); hit.style.strokeDashoffset = '';
        segsG.appendChild(hit);
        [hit, labels[i]].forEach((el) => {
          if (!el) return;
          el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') peek(i); });
          el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') unpeek(250); });
          el.addEventListener('click', () => { peek(i); unpeek(3200); });
        });
      });
    }
  }

  /* ---------- 9. A knight roams the world plates on hover ---------- */
  const KNIGHT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 19.4Q5.6 18.9 4.9 17.4Q5.8 17.5 6.4 16.8Q5 16 4.7 14.2Q5.6 14.5 6.3 13.9Q5 12.8 5 10.9Q5.9 11.4 6.6 11Q5.8 9.6 6.1 7.9Q6.9 8.6 7.6 8.4Q7.3 6.8 8.1 5.4Q8.6 6.2 9.5 6.2L10.8 2.4L12.1 4.3C12.3 3.3 13.4 3.0 14.8 3.55Q14.05 4.0 13.9 4.8Q15.05 4.25 15.9 5.05Q15.15 5.35 14.85 5.95C16.52 6.90 17.79 8.33 18.6 10.6C19 11.8 18.6 13.2 17.3 13.2L15.6 12.7C14.6 12.4 13.8 12.9 13.8 13.9C14 15.9 16 17.4 16.9 19.4ZM5.6 19.4H18.2M4.6 21.5H19.2"/><circle cx="14.6" cy="8.4" r=".6"/></svg>';
  // On hover the knight lands on a random square, then keeps making random legal L moves until the cursor leaves.
  const COLS = 8, ROWS = 10;
  const MOVES = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const rand = (n) => Math.floor(Math.random() * n);
  $$('.world__plate').forEach((pl) => {
    pl.insertAdjacentHTML('beforeend', `<span class="world__knight" aria-hidden="true">${KNIGHT}</span>`);
    const kn = $('.world__knight', pl);
    const card = pl.closest('.world') || pl;
    let pos = null, timer = 0;
    const place = (c, r) => { pos = [c, r]; kn.style.transform = `translate(${c * 100}%, ${r * 100}%)`; };
    const hop = () => {
      const legal = MOVES.map(([dc, dr]) => [pos[0] + dc, pos[1] + dr]).filter(([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
      const [c, r] = legal[rand(legal.length)];
      kn.classList.remove('is-hop'); void kn.offsetWidth; kn.classList.add('is-hop');
      place(c, r);
      timer = setTimeout(hop, 900 + rand(500));
    };
    card.addEventListener('pointerenter', () => {
      if (reduce || !matchMedia('(hover: hover) and (min-width: 901px)').matches) return;
      kn.classList.add('is-instant');
      place(1 + rand(COLS - 2), 1 + rand(ROWS - 2));
      void kn.offsetWidth;
      kn.classList.remove('is-instant');
      kn.classList.add('is-on');
      clearTimeout(timer);
      timer = setTimeout(hop, 650);
    });
    card.addEventListener('pointerleave', () => { clearTimeout(timer); kn.classList.remove('is-on'); });
  });

  /* ---------- One scroll loop for all of it ---------- */
  const nav = $('.nav');
  const hero = $('.hero');
  const footer = $('.footer');
  let ticking = false;
  const frame = () => {
    ticking = false;
    const vh = innerHeight, y = scrollY;

    // Numerals drift against the scroll
    if (!reduce && !G) bands.forEach((b) => {
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
    if (score && !reduce && !G) {
      const r = score.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.75), 0, 1);
      const e = 1 - Math.pow(1 - p, 2);
      score.style.setProperty('--clip-x', `${((1 - e) * Math.min(innerWidth * 0.06, 90)).toFixed(1)}px`);
      score.style.setProperty('--clip-r', `${((1 - e) * 36).toFixed(1)}px`);
    }


  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  addEventListener('load', onScroll);
  frame();
})();
