/* KNGHT site behaviour. No dependencies. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Loader ---------- */
  let seen = false;
  try { seen = sessionStorage.getItem('knght-intro') === '1'; } catch (e) {}
  const finishIntro = () => {
    root.classList.add('is-loaded');
    try { sessionStorage.setItem('knght-intro', '1'); } catch (e) {}
  };
  if (reduce || seen) {
    root.classList.add('no-loader');
    requestAnimationFrame(finishIntro);
  } else {
    const count = $('.loader__count');
    const start = performance.now();
    const dur = 1500;
    const tick = (t) => {
      const p = clamp((t - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (count) count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finishIntro, 180);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Split headings into masked lines ---------- */
  $$('[data-split]').forEach((el) => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines.map((l) => `<span class="line"><span>${l.trim()}</span></span>`).join('');
    el.classList.add('split');
  });

  /* ---------- Thesis: wrap words so they light up with scroll ---------- */
  const thesis = $('.thesis__text');
  let words = [];
  if (thesis) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(thesis);
    words = $$('.w', thesis);
    if (reduce) words.forEach((w) => w.classList.add('lit'));
  }

  /* ---------- Reveal on view ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  $$('[data-reveal], .split').forEach((el) => io.observe(el));

  /* ---------- Layers: active layer follows the reading line ---------- */
  const layers = $$('.layer');
  const bigNums = $$('.layers__big span');
  const nowName = $('.layers__now b');
  const nowWhat = $('.layers__now span');
  let activeLayer = -1;
  const setLayer = (i) => {
    if (i === activeLayer || i < 0) return;
    activeLayer = i;
    layers.forEach((l, k) => l.classList.toggle('on', k === i));
    bigNums.forEach((s, k) => {
      s.classList.toggle('on', k === i);
      s.classList.toggle('out', k < i);
    });
    if (nowName) nowName.textContent = layers[i].dataset.name;
    if (nowWhat) nowWhat.textContent = `Layer ${i + 1} of ${layers.length}`;
  };
  if (layers.length) {
    const lio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setLayer(layers.indexOf(e.target)); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    layers.forEach((l) => lio.observe(l));
    setLayer(0);
  }

  /* ---------- Final video: play once, when it is seen ---------- */
  const verdictVideo = $('.verdict video');
  if (verdictVideo && !reduce) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { verdictVideo.play().catch(() => {}); vio.disconnect(); }
      });
    }, { threshold: 0.45 });
    vio.observe(verdictVideo);
  }
  const heroVideo = $('.hero video');
  if (heroVideo && reduce) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }

  /* ---------- Horizontal worlds gallery ---------- */
  const worlds = $('.worlds');
  const track = $('.worlds__track');
  const bar = $('.worlds__bar i');
  const countNow = $('.worlds__count b');
  const worldCards = $$('.world', track || document);
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const horizontal = () => matchMedia('(min-width: 901px)').matches;
  let travel = 0;
  const sizeWorlds = () => {
    if (!worlds || !track) return;
    if (!horizontal()) { worlds.style.height = ''; travel = 0; track.style.transform = ''; return; }
    const endPad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    travel = Math.max(0, track.scrollWidth - innerWidth + endPad);
    worlds.style.height = `${innerHeight + travel}px`;
  };

  /* ---------- Scroll-driven frame ---------- */
  const nav = $('.nav');
  const hero = $('.hero');
  const heroMedia = $('.hero__media');
  const heroInner = $('.hero__inner');
  const footWord = $('.footer__word');
  const footLetters = footWord ? $$('span', footWord) : [];
  let lastY = scrollY;
  let ticking = false;

  const frame = () => {
    ticking = false;
    const y = scrollY;
    const vh = innerHeight;

    // Nav: solid after the hero starts to go, hide when reading down, return on the way up
    if (nav) {
      nav.classList.toggle('is-solid', y > 40);
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (goingDown && y > vh) nav.classList.add('is-hidden');
      else if (goingUp || y < vh) nav.classList.remove('is-hidden');
    }
    lastY = y;

    // Hero: the plate sinks and sharpens away as you leave
    if (hero && !reduce) {
      const p = clamp(y / vh, 0, 1);
      root.classList.toggle('is-scrolling', y > 2);
      if (heroMedia && root.classList.contains('is-loaded')) {
        heroMedia.style.transform = `translate3d(0, ${p * 18}vh, 0) scale(${1 + p * 0.12})`;
        heroMedia.style.opacity = String(1 - p * 0.85);
      }
      if (heroInner) heroInner.style.transform = `translate3d(0, ${p * -8}vh, 0)`;
    }

    // Thesis words light up across the section
    if (words.length && !reduce) {
      const r = thesis.getBoundingClientRect();
      const p = clamp((vh * 0.8 - r.top) / (vh * 0.5), 0, 1);
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }

    // Worlds: vertical scroll drives horizontal travel
    if (worlds && track && travel > 0) {
      const r = worlds.getBoundingClientRect();
      const p = clamp(-r.top / travel, 0, 1);
      track.style.transform = `translate3d(${-p * travel}px, 0, 0)`;
      if (bar) bar.style.transform = `scaleX(${p})`;
      if (countNow && worldCards.length) {
        const idx = clamp(Math.round(p * (worldCards.length - 1)), 0, worldCards.length - 1);
        countNow.textContent = roman[idx];
      }
    }

    // Blade fills down the layers list
    const blade = $('.blade i');
    const list = $('.layers ol');
    if (blade && list) {
      const r = list.getBoundingClientRect();
      const p = clamp((vh * 0.5 - r.top) / r.height, 0, 1);
      blade.style.transform = `scaleY(${p})`;
    }

    // Footer wordmark rises letter by letter
    if (footWord && !reduce) {
      const r = footWord.getBoundingClientRect();
      const p = clamp((vh - r.top) / (r.height + 80), 0, 1);
      footLetters.forEach((s, i) => {
        const local = clamp(p * 1.6 - i * 0.12, 0, 1);
        s.style.transform = `translateY(${(1 - local) * 18}%)`;
      });
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { sizeWorlds(); onScroll(); });
  addEventListener('load', () => { sizeWorlds(); onScroll(); });
  sizeWorlds();
  frame();

  /* ---------- Cursor + magnetic buttons (fine pointers only) ---------- */
  if (finePointer && !reduce) {
    const cursor = $('.cursor');
    const label = cursor && $('span', cursor);
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      root.classList.add('has-cursor');
    }, { passive: true });
    document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
    const loop = () => {
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      if (cursor) cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseover', (e) => {
      if (!cursor) return;
      const t = e.target.closest('a, button, [data-cursor]');
      const text = t && t.dataset.cursor;
      cursor.classList.toggle('is-label', !!text);
      cursor.classList.toggle('is-link', !!t && !text);
      if (label) label.textContent = text || '';
    });

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Toronto time in the hero ---------- */
  const clock = $('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Toronto' });
    const set = () => { clock.textContent = `${fmt.format(new Date())} ET`; };
    set(); setInterval(set, 30000);
  }

  /* ---------- Year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
