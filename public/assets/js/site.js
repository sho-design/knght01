/* KNGHT site behaviour. Smooth scroll uses the vendored Lenis build when present; everything else is plain JS. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let lenis = null;
  // src/scripts/motion.js (GSAP) runs the scroll animations when it loads; these are the fallbacks.
  const G = !!window.KNGHT_MOTION;
  if (!G) root.classList.remove('gsap');

  /* ---------- The page is ready on its first frame (an inline script under the hero does this first) ---------- */
  requestAnimationFrame(() => root.classList.add('is-loaded'));

  /* ---------- Smooth scroll ---------- */
  if (!reduce && window.Lenis) {
    // The phone menu and the codex scroll on their own while the page is held still. Stopped, Lenis cancels every
    // swipe, so a swipe inside one of them is left to the browser while that layer still has room to move that way.
    // At its end Lenis takes the swipe back and cancels it, so the page underneath never moves.
    const ownScroll = ({ deltaY, event }) => {
      const box = event.target instanceof Element && event.target.closest('#mnav, .codex');
      if (!box) return true;
      const room = deltaY > 0 ? box.scrollHeight - box.clientHeight - box.scrollTop : box.scrollTop;
      return room < 1;
    };
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, anchors: true, autoRaf: true, virtualScroll: ownScroll });
    // A tap on a link to a place on this page: Lenis glides there (anchors), so the browser must not jump there
    // first, or the destination flashes for a frame and the glide starts back where the page was. The address still
    // gets the #place. Keyboard presses (detail 0) keep the browser's own jump, which also moves the focus along.
    document.addEventListener('click', (e) => {
      if (!lenis || !e.detail || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element && e.target.closest('a[href*="#"]');
      if (!a || (a.target && a.target !== '_self')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.pathname !== location.pathname || !u.hash) return;
      if (!document.getElementById(decodeURIComponent(u.hash.slice(1)))) return;
      e.preventDefault();
      if (location.hash !== u.hash) history.pushState(null, '', u.hash);
    });
  }

  /* ---------- Split headings into masked lines ---------- */
  if (!G) $$('[data-split]').forEach((el) => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    // A space between the lines keeps the words apart for screen readers and copy-paste.
    el.innerHTML = lines.map((l) => `<span class="line"><span>${l.trim()}</span></span>`).join(' ');
    el.classList.add('split');
  });


  /* ---------- Measurement ----------
     Google Analytics 4 loads on every page. Every interaction goes through sendEvent,
     which reports it to GA4 and also leaves it on window.dataLayer for a future tag manager. */
  const GA_ID = 'G-T91QCDLE81';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  if (/^G-[A-Z0-9]+$/.test(GA_ID)) {
    const g = document.createElement('script');
    g.async = true;
    g.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(g);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }
  // Microsoft Clarity: heatmaps and session recordings. Text typed into fields is masked.
  // It never runs on the free tools, so what a visitor types there stays on their device.
  const CLARITY_ID = 'yrly3zmoyn';
  const TOOL = /^\/(check|plain|reply|line|keep|leak|sigil|herald|armoury|cartographer|waymarks)(\/|$)/;
  if (/^[a-z0-9]{8,12}$/.test(CLARITY_ID) && !TOOL.test(location.pathname)) {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    const c = document.createElement('script');
    c.async = true;
    c.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
    document.head.appendChild(c);
  }
  const sendEvent = (event, params = {}) => {
    if (/^G-[A-Z0-9]+$/.test(GA_ID)) window.gtag('event', event, params);
  };
  window.KNGHT_TRACK = sendEvent;
  // Every click that heads for the booking page, labelled by button text and section.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || !/(^|\/)book\/?(\?|#|$)/.test(a.getAttribute('href'))) return;
    const where = a.closest('section[id], section[class], header, footer, .mnav');
    sendEvent('cta_click', {
      cta_label: a.textContent.trim().replace(/\s+/g, ' '),
      cta_location: where ? (where.id || where.className.split(' ')[0] || where.tagName.toLowerCase()) : 'page',
      page_path: location.pathname,
    });
  });
  document.addEventListener('knght:verdict', (e) => sendEvent('quiz_complete', { score: e.detail.total, band: e.detail.band, weakest_layer: e.detail.weak }));
  if (document.body.classList.contains('bookpage')) sendEvent('book_page_view', { referrer: document.referrer || '(direct)' });
  // Calendly reports its steps to the parent page through postMessage.
  addEventListener('message', (e) => {
    if (!/calendly\.com$/.test((() => { try { return new URL(e.origin).hostname; } catch (err) { return ''; } })())) return;
    const ev = e.data && e.data.event;
    if (ev === 'calendly.date_and_time_selected') sendEvent('booking_slot_picked');
    if (ev === 'calendly.event_scheduled') sendEvent('calendly_booked', { value: 0, currency: 'CAD' });
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
  if (!G) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    $$('[data-reveal], .split').forEach((el) => io.observe(el));
  }

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
        if (e.isIntersecting) {
          verdictVideo.play().catch(() => {});
          vio.disconnect();
        }
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
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  // Totals follow the cards, so adding a world never leaves a stale count.
  $$('[data-world-total]').forEach((el) => { el.textContent = roman[worldCards.length - 1] || String(worldCards.length); });
  $$('[data-world-total-num]').forEach((el) => { el.textContent = String(worldCards.length); });
  const horizontal = () => matchMedia('(min-width: 901px)').matches;
  const WORLD_PACE = 0.55; // vertical pixels per horizontal pixel: under 1 moves the gallery faster than the scroll
  let travel = 0;
  const sizeWorlds = () => {
    if (!worlds || !track) return;
    if (!horizontal()) { worlds.style.height = ''; travel = 0; track.style.transform = ''; return; }
    const endPad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    travel = Math.max(0, track.scrollWidth - innerWidth + endPad);
    worlds.style.height = `${innerHeight + travel * WORLD_PACE}px`;
  };

  /* ---------- Scroll-driven frame ---------- */
  const nav = $('.nav');
  const hero = $('.hero');
  const heroMedia = $('.hero__media');
  const heroInner = $('.hero__inner');
  const footWord = $('.footer__word');
  const footLetters = footWord ? $$('span', footWord) : [];
  const engage = $('.engage');
  let lastY = scrollY;
  let ticking = false;

  const frame = () => {
    ticking = false;
    const y = scrollY;
    const vh = innerHeight;

    // Nav: solid after the hero starts to go. Above 900 px it always stays, so "Book the free call" is in reach.
    // Up to 900 px it hides when reading down and returns on the way up; the phone's booking bar takes over meanwhile.
    if (nav) {
      nav.classList.toggle('is-solid', y > 40);
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      const narrow = innerWidth <= 900;
      if (goingDown && y > vh && narrow) nav.classList.add('is-hidden');
      else if (goingUp || y < vh || !narrow) nav.classList.remove('is-hidden');
    }
    lastY = y;

    // Hero: the plate sinks and sharpens away as you leave
    if (hero && !reduce && !root.classList.contains('hero-scrub')) {
      const p = clamp(y / vh, 0, 1);
      root.classList.toggle('is-scrolling', y > 2);
      if (heroMedia && root.classList.contains('is-loaded') && !G) {
        heroMedia.style.transform = `translate3d(0, ${p * 18}vh, 0) scale(${1 + p * 0.12})`;
        heroMedia.style.opacity = String(1 - p * 0.85);
      }
      if (heroInner && !G) heroInner.style.transform = `translate3d(0, ${p * -8}vh, 0)`;
    }

    // Thesis words light up across the section
    if (words.length && !reduce) {
      const r = thesis.getBoundingClientRect();
      const p = clamp((vh * 0.8 - r.top) / (vh * 0.5), 0, 1);
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }

    // Worlds: vertical scroll drives horizontal travel
    if (worlds && track && travel > 0 && !G) {
      const r = worlds.getBoundingClientRect();
      const p = clamp(-r.top / (travel * WORLD_PACE), 0, 1);
      track.style.transform = `translate3d(${-p * travel}px, 0, 0)`;
      if (bar) bar.style.transform = `scaleX(${p})`;
      if (countNow && worldCards.length) {
        const idx = clamp(Math.round(p * (worldCards.length - 1)), 0, worldCards.length - 1);
        countNow.textContent = roman[idx];
      }
    }

    // The vellum page opens edge to edge as it arrives
    if (engage && !reduce && !G) {
      const r = engage.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.75), 0, 1);
      const e = 1 - Math.pow(1 - p, 2);
      engage.style.setProperty('--clip-x', `${((1 - e) * Math.min(innerWidth * 0.06, 90)).toFixed(1)}px`);
      engage.style.setProperty('--clip-r', `${((1 - e) * 36).toFixed(1)}px`);
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
    if (footWord && !reduce && !G) {
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

  /* ---------- Magnetic buttons (fine pointers only) ---------- */
  if (finePointer && !reduce) {
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

  /* ---------- Score your world ---------- */
  const quiz = $('#quiz');
  if (quiz) {
    const qs = $$('.q', quiz);
    const result = $('#result');
    const now = $('[data-q-now]', quiz);
    const back = $('[data-q-back]', quiz);
    const live = $('[data-live]');
    const dial = $('[data-dial]');
    const segsG = $('[data-dial-segs]');
    const scoreEl = $('[data-dial-score]');
    const answers = qs.map(() => null);
    let at = 0, shown = 0, busy = false;

    // Dial: seven arcs, one per layer, that fill with each answer
    const N = qs.length, R = 96, C = 2 * Math.PI * R, gapDeg = 5;
    const L = C / N - (gapDeg / 360) * C;
    const NS = 'http://www.w3.org/2000/svg';
    const tracks = [], fills = [], labels = [];
    segsG.closest('svg').setAttribute('viewBox', '-30 -30 300 300');
    qs.forEach((q, i) => {
      const rot = -90 + i * (360 / N) + gapDeg / 2;
      const mk = (cls) => {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', 120); c.setAttribute('cy', 120); c.setAttribute('r', R);
        c.setAttribute('class', cls);
        c.setAttribute('stroke-dasharray', `${L} ${C}`);
        c.setAttribute('transform', `rotate(${rot} 120 120)`);
        segsG.appendChild(c); return c;
      };
      tracks.push(mk('seg-track'));
      const f = mk('seg-fill'); f.style.strokeDashoffset = L; fills.push(f);
      const mid = (rot + (L / C) * 180) * Math.PI / 180;
      const tx = 120 + Math.cos(mid) * 122, ty = 120 + Math.sin(mid) * 122;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', tx.toFixed(1)); t.setAttribute('y', (ty + 2.5).toFixed(1));
      t.setAttribute('text-anchor', Math.abs(tx - 120) < 18 ? 'middle' : tx > 120 ? 'start' : 'end');
      t.setAttribute('class', 'seg-label'); t.textContent = q.dataset.layer;
      segsG.appendChild(t); labels.push(t);
    });

    const total = () => answers.reduce((a, v) => a + (v || 0), 0);
    const countTo = (to) => {
      const from = shown, t0 = performance.now(), d = reduce ? 0 : 900;
      const step = (t) => {
        const p = d ? clamp((t - t0) / d, 0, 1) : 1;
        shown = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        scoreEl.textContent = shown;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const paint = () => {
      answers.forEach((v, i) => { fills[i].style.strokeDashoffset = v == null ? L : L * (1 - v / 10); });
      const done = !result.hidden;
      tracks.forEach((t, i) => t.classList.toggle('is-now', !done && i === at));
      labels.forEach((t, i) => t.classList.toggle('is-now', !done && i === at));
      countTo(total());
      dial.setAttribute('aria-label', `Score ${total()} out of 70`);
    };
    const show = (i, focus) => {
      at = i;
      qs.forEach((q, k) => q.classList.toggle('is-on', k === i));
      now.textContent = i + 1;
      back.disabled = i === 0;
      paint();
      if (focus) { const b = $('.opt', qs[i]); if (b) b.focus({ preventScroll: true }); }
      // The dial's codex (chapters.js) listens for these.
      dial.dataset.at = i;
      document.dispatchEvent(new CustomEvent('knght:question', { detail: { i } }));
    };
    const bands = [
      [63, 'Fortified', 'Your world holds. The full Verdict finds the few cracks left and ranks them.'],
      [49, 'Holding', 'Strong in places, thin in others. One weak layer is carrying risk for all the rest.'],
      [28, 'Exposed', 'Several layers are missing or working against each other. Fix them in order, weakest first.'],
      [0, 'At risk', 'The world is not built yet. Start with Lore and build up from there.'],
    ];
    const finish = () => {
      const sum = total();
      const [, band, blurb] = bands.find(([min]) => sum >= min);
      let weak = 0;
      answers.forEach((v, i) => { if (v < answers[weak]) weak = i; });
      const wq = qs[weak];
      $('[data-r-band]').textContent = band;
      $('[data-r-blurb]').textContent = blurb;
      $('[data-r-weak]').textContent = wq.dataset.layer;
      $('[data-r-fix]').textContent = wq.dataset.fix;
      $('[data-r-cta]').href = `${$('[data-r-cta]').getAttribute('href').split('?')[0]}?score=${sum}&weak=${encodeURIComponent(wq.dataset.layer)}`;
      quiz.hidden = true;
      result.hidden = false;
      paint();
      live.textContent = `Your score is ${sum} out of 70. ${band}. Weakest layer: ${wq.dataset.layer}.`;
      document.dispatchEvent(new CustomEvent('knght:verdict', { detail: { total: sum, band, weak: wq.dataset.layer, fix: wq.dataset.fix, layers: qs.map((q, i) => ({ name: q.dataset.layer, score: answers[i] })) } }));
      const h = $('[data-r-band]'); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
    };
    quiz.addEventListener('click', (e) => {
      const opt = e.target.closest('.opt');
      if (!opt || busy) return;
      busy = true;
      const i = qs.indexOf(opt.closest('.q'));
      $$('.opt', qs[i]).forEach((o) => o.setAttribute('aria-pressed', String(o === opt)));
      answers[i] = Number(opt.dataset.v);
      document.dispatchEvent(new CustomEvent('knght:answer', { detail: { i } }));
      paint();
      setTimeout(() => { busy = false; i < qs.length - 1 ? show(i + 1, true) : finish(); }, reduce ? 0 : 420);
    });
    back.addEventListener('click', () => { if (at > 0) show(at - 1, true); });
    $('[data-r-reset]').addEventListener('click', () => {
      answers.fill(null);
      $$('.opt', quiz).forEach((o) => o.removeAttribute('aria-pressed'));
      result.hidden = true; quiz.hidden = false;
      document.dispatchEvent(new CustomEvent('knght:reset'));
      show(0, true);
    });
    $$('.opt', quiz).forEach((o) => o.setAttribute('aria-pressed', 'false'));
    show(0, false);
  }

  /* ---------- Torchlight: an engraved plate only the light reveals ---------- */
  const verdict = $('.verdict');
  const engrave = $('.verdict__engrave');
  if (verdict && engrave && engrave.getContext) {
    const draw = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = verdict.clientWidth, h = verdict.clientHeight;
      engrave.width = w * dpr; engrave.height = h * dpr;
      const c = engrave.getContext('2d');
      c.scale(dpr, dpr);
      c.strokeStyle = 'rgba(255,255,255,.55)';
      c.lineWidth = 0.6;
      // banknote ground: fine waves
      c.globalAlpha = 0.35;
      for (let y = -20; y < h + 20; y += 9) {
        c.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const yy = y + Math.sin(x / 38 + y / 57) * 5 + Math.sin(x / 13 + y / 21) * 1.2;
          x ? c.lineTo(x, yy) : c.moveTo(x, yy);
        }
        c.stroke();
      }
      // guilloche bands around the knight, like the border of a banknote
      c.globalAlpha = 0.75;
      c.lineWidth = 0.5;
      const cx = w / 2, cy = h * 0.4, base = Math.min(w, h);
      [[0.2, 36, 0.012, 22], [0.31, 48, 0.014, 26], [0.43, 60, 0.012, 30], [0.56, 72, 0.01, 30]].forEach(([rr, waves, amp, n]) => {
        for (let k = 0; k < n; k++) {
          const ph = (k / n) * Math.PI * 2;
          c.beginPath();
          for (let t = 0; t <= Math.PI * 2 + 0.004; t += 0.004) {
            const r = base * (rr + amp * Math.sin(waves * t + ph) + amp * 0.5 * Math.sin(waves / 4 * t - ph));
            const x = cx + r * Math.cos(t), y = cy + r * Math.sin(t);
            t ? c.lineTo(x, y) : c.moveTo(x, y);
          }
          c.stroke();
        }
      });
    };
    draw();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 200); });

    let tx = 0.5, ty = 0.4, x = 0.5, y = 0.4, inside = false, visible = false, raf = 0;
    const t0 = performance.now();
    const loop = (t) => {
      if (!inside || !finePointer) {
        const s = (t - t0) / 1000;
        tx = 0.5 + Math.sin(s * 0.37) * 0.3; ty = 0.42 + Math.sin(s * 0.53) * 0.16;
      }
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      verdict.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`);
      verdict.style.setProperty('--my', `${(y * 100).toFixed(2)}%`);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    if (!reduce) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(verdict);
      verdict.addEventListener('pointermove', (e) => {
        const r = verdict.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; inside = true;
      });
      verdict.addEventListener('pointerleave', () => { inside = false; });
    }
  }

  /* ---------- Mobile menu: sigils, sub-menus, and a toggle that becomes a sword and a knight ---------- */
  const navBar = $('.nav');
  if (navBar && $('.nav nav ul a')) {
    const siteJs = $('script[src*="assets/js/site.js"]');
    const rootUrl = new URL('../../', siteJs ? siteJs.src : location.href);
    const onHome = new URL(rootUrl).pathname === location.pathname;
    const to = (p) => (p.startsWith('#') && onHome) ? p : new URL(p, rootUrl).pathname + (p.includes('#') ? p.slice(p.indexOf('#')) : '');
    const here = (p) => !p.includes('#') && new URL(p, rootUrl).pathname === location.pathname;

    /* Sigils: hairline heraldry drawn on a 24 grid, same stroke as the mark. One sigil per item: the layers keep
       the scales and the quill, so Score your world has the astrolabe and Free tools the armoury chest. */
    const SIGILS = {
      orb: '<circle cx="12" cy="14" r="7"/><ellipse cx="12" cy="14" rx="3" ry="7"/><path d="M5 14h14M12 7V2M9.6 4h4.8"/>',
      shield: '<path d="M4.5 4h15v7.5c0 5-3.6 8.2-7.5 10-3.9-1.8-7.5-5-7.5-10z"/><path d="M4.5 8.5h15M4.7 13h14.6M6.4 17.3h11.2"/>',
      banner: '<path d="M5 2.5v19M5 3.5h14v13l-3.5-2.6L12 16.5V3.5"/>',
      compass: '<circle cx="12" cy="12" r="9"/><path d="M12 5.5l2 6.5-2 6.5-2-6.5z"/><path d="M12 1.5v2M12 20.5v2M1.5 12h2M20.5 12h2"/>',
      seal: '<path d="M5 3h11.5a2.5 2.5 0 0 1 2.5 2.5V8M5 3a2 2 0 0 0-2 2v1h2M5 3v15"/><path d="M8 7.5h7M8 10.5h5"/><circle cx="15" cy="17" r="4.2"/><path d="M15 15.2l.6 1.2 1.3.2-.95.9.22 1.3-1.17-.62-1.17.62.22-1.3-.95-.9 1.3-.2z"/>',
      chest: '<path d="M4 11.2a8 5.2 0 0 1 16 0M4 11.2h16v9.4H4zM4 14.4h16M10.8 12.8h2.4v3.4h-2.4z"/>',
      astrolabe: '<circle cx="12" cy="13.6" r="7.8"/><circle cx="12" cy="2.9" r="1.2"/><path d="M10.2 6.1 12 4.1l1.8 2"/><circle cx="12" cy="11.6" r="4.2"/><path d="M6.5 19.1 17.5 8.1M6.9 17.3l1.8 1.8M15.3 8.5l1.8 1.8"/><circle cx="12" cy="13.6" r=".9"/>'
    };
    const sigil = (k) => `<svg class="mnav__sigil" viewBox="0 0 24 24" aria-hidden="true">${SIGILS[k]}</svg>`;
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
    const MENU = [
      { label: 'Worlds', sigil: 'orb', all: ['All worlds', '#worlds'], items: [
        ['Restoration Medical', 'worlds/restoration-medical/'], ['Black Lotus Coffee', 'worlds/black-lotus-coffee/'],
        ['Castleblack Spirits', 'worlds/castleblack-spirits/'], ['Toronto Beauty', 'worlds/toronto-beauty/'],
        ['Lorelyns Gourmet Desserts', 'worlds/lorelyns/'], ['Rum Raiders Ring', 'worlds/rum-raiders-ring/'],
        ['Lisa Dang Immigration Law', 'worlds/lisa-dang-immigration-law/'], ['Wellfit Social Club', 'worlds/wellfit-social-club/'],
        ['Art Colouring', 'worlds/art-colouring/']] },
      { label: 'The layers', sigil: 'shield', all: ['All seven layers', '#layers'], items:
        ['Lore', 'Law', 'Language', 'Map', 'Ground', 'Artifacts', 'Machinery'].map((n) => [n, `layers/${n.toLowerCase()}/`]) },
      { label: 'Who it’s for', sigil: 'banner', items: [
        ['Clinics', 'for/clinics/'], ['Dental', 'for/dental/'], ['Medspas', 'for/medspas/'],
        ['Law firms', 'for/law-firms/'], ['Spirits', 'for/spirits/'], ['Food and drink', 'for/food-and-drink/']] },
      { label: 'How it works', sigil: 'compass', href: 'process/' },
      { label: 'Rules journal', sigil: 'seal', all: ['All articles', 'rules/'], items: [
        ['What a medspa can say about Botox', 'rules/medspa-prescription-drug-ads/'],
        ['Selling spirits without the buzz', 'rules/alcohol-ads-strength-and-success/'],
        ['Why lawyers can’t say “specialist”', 'rules/lawyers-and-the-word-specialist/']] },
      { label: 'Score your world', sigil: 'astrolabe', href: '#score' },
      { label: 'Free tools', sigil: 'chest', all: ['All free tools', 'armoury/'], items: [
        ['Claim checker', 'check/'], ['Reply scribe', 'reply/'], ['Licence keep', 'keep/'], ['Plain-speech test', 'plain/'], ['The one-line forge', 'line/'], ['The cartographer', 'cartographer/'], ['The herald', 'herald/'], ['Waymarks', 'waymarks/'], ['The leak', 'leak/'], ['Your sigil', 'sigil/']] }
    ];
    const link = ([label, p], cls, n) => `<li><a class="${cls}" href="${to(p)}"${here(p) ? ' aria-current="page"' : ''}>${n ? `<span class="mnav__num">${n}</span>` : ''}${label}</a></li>`;
    const group = (m, i) => {
      const head = `${sigil(m.sigil)}<span class="mnav__label">${m.label}</span>`;
      if (!m.items) return `<li class="mnav__item" style="--i:${i}"><a class="mnav__top" href="${to(m.href)}"${here(m.href) ? ' aria-current="page"' : ''}>${head}</a></li>`;
      const open = m.items.concat(m.all ? [m.all] : []).some(([, p]) => here(p));
      const subs = (m.all ? [link(m.all, 'mnav__all')] : []).concat(m.items.map((it, k) => link(it, '', m.sigil === 'seal' || m.sigil === 'banner' || m.sigil === 'chest' ? '' : ROMAN[k])));
      return `<li class="mnav__item${open ? ' is-open' : ''}" style="--i:${i}"><button type="button" class="mnav__top" aria-expanded="${open}" aria-controls="mnav-sub-${i}">${head}<span class="mnav__plus" aria-hidden="true"></span></button>`
        + `<div class="mnav__sub" id="mnav-sub-${i}"><ul>${subs.join('')}</ul></div></li>`;
    };

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'mnav');
    toggle.setAttribute('aria-label', 'Open menu');
    /* Closed: two lines. Open: strategy first, then the sword. The bottom line becomes the base of a knight that faces the sword; the top line becomes the blade (the KNGHT mark). */
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">'
      + '<line class="tg__a" x1="4" y1="9" x2="20" y2="9"/><line class="tg__b" x1="4" y1="15" x2="20" y2="15"/>'
      + '<g class="tg__sword"><circle class="tg__pommel" cx="17.5" cy="3.6" r="1.4"/><path d="M17.5 5v2.6M14.4 7.6h6.2" pathLength="1"/><path d="M16.75 19.6l.75 2.2.75-2.2" pathLength="1"/></g>'
      + '<path class="tg__knight" pathLength="1" d="M2.53 19.5Q1.35 19 0.77 17.5Q1.52 17.6 2.03 16.9Q0.85 16.1 0.6 14.3Q1.35 14.6 1.94 14Q0.85 12.9 0.85 11Q1.61 11.5 2.19 11.1Q1.52 9.7 1.77 8Q2.45 8.7 3.03 8.5Q2.78 6.9 3.45 5.5Q3.87 6.3 4.63 6.3L5.72 2.5L6.81 4.4C6.98 3.4 7.9 3.1 9.08 3.65Q8.45 4.1 8.32 4.9Q9.29 4.35 10 5.15Q9.37 5.45 9.12 6.05C10.53 7 11.59 8.43 12.27 10.7C12.61 11.9 12.27 13.3 11.18 13.3L9.75 12.8C8.91 12.5 8.24 13 8.24 14C8.41 16 10.09 17.5 10.85 19.5ZM1.35 19.5H11.94"/>'
      + '<circle class="tg__eye" cx="8.91" cy="8.5" r=".6"/></svg>';
    ($('.nav__end', navBar) || $('.wrap', navBar)).appendChild(toggle);

    const cta = $('.btn', navBar);
    const panel = document.createElement('div');
    panel.id = 'mnav';
    panel.className = 'mnav';
    panel.hidden = true;
    panel.innerHTML = `<nav aria-label="Menu"><ol class="mnav__list">${MENU.map(group).join('')}</ol></nav>`
      + `<div class="mnav__foot"><a class="btn" href="${to('book/')}">${cta && /call/i.test(cta.textContent) ? cta.textContent.trim() : 'Book the free call'}</a><a class="link" href="mailto:sho@knght.com">sho@knght.com</a></div>`;
    document.body.appendChild(panel);
    // The same social icons as the footer, when any are set.
    const soc = $('.footer .social');
    if (soc) $('.mnav__foot', panel).appendChild(soc.cloneNode(true));

    $$('button.mnav__top', panel).forEach((btn) => btn.addEventListener('click', () => {
      const item = btn.parentElement, open = !item.classList.contains('is-open');
      $$('.mnav__item.is-open', panel).forEach((o) => { if (o !== item) { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false'); } });
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      // An opened list that runs past the bottom of the screen is brought up into view once it has opened,
      // never past its own heading.
      if (!open) return;
      const sub = $('.mnav__sub', item);
      let brought = false;
      const bring = () => {
        if (brought) return;
        brought = true;
        sub.removeEventListener('transitionend', opened);
        if (!item.classList.contains('is-open')) return;
        const p = panel.getBoundingClientRect(), r = item.getBoundingClientRect();
        const by = Math.min(r.bottom - p.bottom + 24, r.top - p.top - parseFloat(getComputedStyle(panel).paddingTop));
        if (by > 1) panel.scrollBy({ top: by, behavior: reduce ? 'auto' : 'smooth' });
      };
      const opened = (e) => { if (e.target === sub) bring(); };
      sub.addEventListener('transitionend', opened);
      setTimeout(bring, reduce ? 0 : 1000);
    }));

    let closeTimer = 0;
    const setMenu = (open) => {
      if (open === root.classList.contains('menu-open')) return;
      clearTimeout(closeTimer);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) {
        panel.hidden = false;
        requestAnimationFrame(() => root.classList.add('menu-open'));
        navBar.classList.remove('is-hidden');
        if (lenis) lenis.stop();
        document.body.style.overflow = 'hidden';
        setTimeout(() => { const first = $('.mnav__top', panel); if (first) first.focus({ preventScroll: true }); }, 60);
      } else {
        root.classList.remove('menu-open');
        if (lenis) lenis.start();
        document.body.style.overflow = '';
        closeTimer = setTimeout(() => { panel.hidden = true; }, 450);
      }
    };
    toggle.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    // The mark and the bar's Book button close it too, before Lenis glides (a stopped Lenis goes nowhere).
    navBar.addEventListener('click', (e) => { if (e.target.closest('a') && root.classList.contains('menu-open')) setMenu(false); });
    // Back to a page kept in the browser's cache: it comes back with the menu closed.
    addEventListener('pageshow', (e) => { if (e.persisted) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
    });
    matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }


  /* ---------- The knight's move: an L on the arrow keys, or press and hold the mark ---------- */
  const CODEX = [
    'No layer is built before Lore.',
    'Every word is checked against your regulator.',
    'We say what we can prove.',
    'Strategy first, then the sword.',
    'AI is the squire, not the knght.',
    'We took the I out of knight and made it a blade.',
    'We only show work we built.',
    'If we cannot help, we say so.'
  ];
  let codexEl = null, codexReturn = null;
  const openCodex = () => {
    if (codexEl) return;
    const up = (() => { const sj = $('script[src*="assets/js/site.js"]'); return sj ? new URL('../../', sj.src).pathname : '/'; })();
    codexReturn = document.activeElement;
    codexEl = document.createElement('div');
    codexEl.className = 'codex';
    codexEl.setAttribute('role', 'dialog');
    codexEl.setAttribute('aria-modal', 'true');
    codexEl.setAttribute('aria-labelledby', 'codex-title');
    codexEl.innerHTML = `<div class="codex__in">
      <svg class="codex__knight" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 19.4Q5.6 18.9 4.9 17.4Q5.8 17.5 6.4 16.8Q5 16 4.7 14.2Q5.6 14.5 6.3 13.9Q5 12.8 5 10.9Q5.9 11.4 6.6 11Q5.8 9.6 6.1 7.9Q6.9 8.6 7.6 8.4Q7.3 6.8 8.1 5.4Q8.6 6.2 9.5 6.2L10.8 2.4L12.1 4.3C12.3 3.3 13.4 3.0 14.8 3.55Q14.05 4.0 13.9 4.8Q15.05 4.25 15.9 5.05Q15.15 5.35 14.85 5.95C16.52 6.90 17.79 8.33 18.6 10.6C19 11.8 18.6 13.2 17.3 13.2L15.6 12.7C14.6 12.4 13.8 12.9 13.8 13.9C14 15.9 16 17.4 16.9 19.4ZM5.6 19.4H18.2M4.6 21.5H19.2"/><circle cx="14.6" cy="8.4" r=".6"/></svg>
      <p class="eyebrow">You found the knght's move</p>
      <h2 class="display codex__h" id="codex-title">The <em>Codex</em></h2>
      <p class="codex__lede">Eight rules we keep. Few people see this page.</p>
      <ol class="codex__list">${CODEX.map((r, i) => `<li style="--i:${i}"><span>${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][i]}</span>${r}</li>`).join('')}</ol>
      <div class="codex__actions"><a class="btn" href="${up}book/">Book the free call</a><button type="button" class="link" data-codex-close>Close the codex</button></div>
    </div>`;
    document.body.appendChild(codexEl);
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => codexEl.classList.add('is-on'));
    const close = $('[data-codex-close]', codexEl);
    close.focus({ preventScroll: true });
    close.addEventListener('click', closeCodex);
    codexEl.addEventListener('click', (e) => { if (e.target === codexEl) closeCodex(); });
    sendEvent('codex_found');
  };
  const closeCodex = () => {
    if (!codexEl) return;
    const el = codexEl; codexEl = null;
    el.classList.remove('is-on');
    if (lenis) lenis.start();
    document.body.style.overflow = '';
    setTimeout(() => el.remove(), 500);
    if (codexReturn && codexReturn.focus) codexReturn.focus({ preventScroll: true });
  };
  const AX = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  let moves = [], lastKey = 0;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && codexEl) { closeCodex(); return; }
    if (codexEl && e.key === 'Tab') {
      // Keep focus inside the codex, cycling through its links and buttons.
      const f = $$('a, button', codexEl);
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      return;
    }
    if (!AX[e.key] || e.target.closest('input, textarea, select, [contenteditable]')) return;
    const now = performance.now();
    if (now - lastKey > 900) moves = [];
    lastKey = now;
    moves.push(AX[e.key]);
    if (moves.length > 3) moves.shift();
    if (moves.length === 3) {
      const [a, b, c] = moves;
      const straight = a[0] === b[0] && a[1] === b[1];
      const turn = a[0] * c[0] + a[1] * c[1] === 0;
      if (straight && turn) { moves = []; openCodex(); }
    }
  });
  const markEl = $('.nav .mark');
  if (markEl) {
    // A touch screen has no hover, so a thumb that stays on the mark draws the blade out of the name (site.css,
    // .is-drawn), and a tap on the home page, where the mark only goes back to the top, draws it for a moment.
    // A quick tap anywhere else goes home at once.
    let hold = 0, held = false, touch = false, drawT = 0, undrawT = 0;
    const undraw = () => { clearTimeout(drawT); clearTimeout(undrawT); markEl.classList.remove('is-drawn'); };
    const draw = (ms) => { clearTimeout(undrawT); markEl.classList.add('is-drawn'); if (ms) undrawT = setTimeout(undraw, ms); };
    const start = (e) => {
      touch = e.pointerType !== 'mouse';
      held = false; clearTimeout(hold);
      hold = setTimeout(() => { held = true; markEl.classList.remove('is-holding'); openCodex(); if (touch) undrawT = setTimeout(undraw, 600); }, 900);
      markEl.classList.add('is-holding');
      if (touch) { clearTimeout(drawT); drawT = setTimeout(() => draw(), 180); }
    };
    const stop = () => {
      clearTimeout(hold); clearTimeout(drawT); markEl.classList.remove('is-holding');
      if (!held && markEl.classList.contains('is-drawn')) { clearTimeout(undrawT); undrawT = setTimeout(undraw, 1200); }
    };
    markEl.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => markEl.addEventListener(ev, stop));
    markEl.addEventListener('click', (e) => {
      if (held) { e.preventDefault(); held = false; return; }
      if (touch && (markEl.getAttribute('href') || '').charAt(0) === '#') draw(1800);
    });
    markEl.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /* ---------- Layer pages: seal each rule as it arrives, and turn outward to the next layer ---------- */
  (() => {
    const lists = $$('.wrules--sealed');
    if (lists.length && 'IntersectionObserver' in window && !reduce) {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        $$('li', e.target).forEach((li, k) => setTimeout(() => { li.classList.add('is-sealed'); }, 500 + k * 260));
      }), { rootMargin: '0px 0px -25% 0px' });
      lists.forEach((l) => io.observe(l));
    } else lists.forEach((l) => $$('li', l).forEach((li) => li.classList.add('is-sealed')));
    if (reduce) return;
    $$('[data-turn]').forEach((a) => a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      const r = a.getBoundingClientRect();
      const g = document.createElement('div');
      g.className = 'lgate';
      g.style.left = (e.clientX || r.left + r.width / 2) + 'px';
      g.style.top = (e.clientY || r.top + r.height / 2) + 'px';
      document.body.appendChild(g);
      const s = (Math.hypot(innerWidth, innerHeight) / 10) * 1.2;
      requestAnimationFrame(() => requestAnimationFrame(() => { g.style.transform = `scale(${s})`; }));
      setTimeout(() => { location.href = a.href; }, 620);
    }));
    addEventListener('pageshow', (e) => { if (e.persisted) $$('.lgate').forEach((g) => g.remove()); });
  })();

  /* ---------- Layer explainers: play once when they come into view, and again on request ---------- */
  (() => {
    const films = $$('[data-lx]');
    if (!films.length || reduce || !('IntersectionObserver' in window)) return;
    films.forEach((el) => {
      let done = 0;
      const svg = $('svg', el);
      const play = () => {
        el.classList.remove('is-ready', 'is-on', 'is-done');
        void el.offsetWidth;
        el.classList.add('is-ready', 'is-on');
        if (svg && svg.setCurrentTime) { try { svg.setCurrentTime(0); } catch (e) {} }
        $$('animateMotion[data-at]', el).forEach((m) => { try { m.endElement(); m.beginElementAt(+m.dataset.at); } catch (e) {} });
        clearTimeout(done); done = setTimeout(() => el.classList.add('is-done'), 9600);
      };
      el.classList.add('is-ready');
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); play(); } }, { threshold: 0.45 });
      io.observe(el);
      const again = $('[data-lx-again]', el);
      if (again) again.addEventListener('click', play);
    });
  })();

  /* ---------- Back to top (with a ring that fills as you read) ---------- */
  const topBtn = document.createElement('button');
  topBtn.type = 'button';
  topBtn.className = 'totop';
  topBtn.setAttribute('aria-label', 'Back to top');
  topBtn.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="totop__track" cx="24" cy="24" r="22"/><circle class="totop__ring" cx="24" cy="24" r="22" pathLength="100"/><path d="M24 31V17M18 23l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  document.body.appendChild(topBtn);
  const ring = $('.totop__ring', topBtn);
  let topTick = false;
  const paintTop = () => {
    topTick = false;
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    topBtn.classList.toggle('is-on', y > innerHeight * 1.5 && !root.classList.contains('menu-open'));
    ring.style.strokeDashoffset = String(100 - (max > 0 ? clamp(y / max, 0, 1) * 100 : 0));
  };
  addEventListener('scroll', () => { if (!topTick) { topTick = true; requestAnimationFrame(paintTop); } }, { passive: true });
  addEventListener('resize', paintTop);
  paintTop();
  topBtn.addEventListener('click', () => {
    if (lenis && !reduce) lenis.scrollTo(0, { duration: 1.6 });
    else scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    const target = $('.skip') ? $('#main') : null;
    if (target) { target.setAttribute('tabindex', '-1'); setTimeout(() => target.focus({ preventScroll: true }), 50); }
  });

  /* ---------- Worlds: filter the gallery by layer ---------- */
  $$('.wfilter__chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const layer = chip.dataset.layer;
      $$('.wfilter__chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      $$('.world[data-layers]').forEach((w) => {
        const on = !layer || (` ${w.dataset.layers} `).includes(` ${layer} `);
        w.classList.toggle('is-dim', !on);
      });
      if (window.KNGHT_TRACK) window.KNGHT_TRACK('world_filter', { layer: layer || 'all' });
    });
  });

  window.KNGHT = { get lenis() { return lenis; }, resize: () => { sizeWorlds(); onScroll(); } };

  /* ---------- Toronto time in the hero ---------- */
  const clock = $('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Toronto' });
    const set = () => { clock.textContent = `${fmt.format(new Date())} ET`; };
    set(); setInterval(set, 30000);
  }

  /* ---------- The hall: one light you carry, an engraving it finds, the room it is in ---------- */
  (() => {
    if (!document.body) return;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hall = document.createElement('div');
    hall.className = 'hall';
    hall.setAttribute('aria-hidden', 'true');
    hall.innerHTML = '<div class="hall-field"><div class="hall-field__d" data-f="0.55"></div><div class="hall-field__d" data-f="0.78"></div><div class="hall-field__d" data-f="1"></div></div><div class="hall__glow"></div>';
    document.body.appendChild(hall);
    const floor = document.createElement('div');
    floor.className = 'hall-floor';
    floor.setAttribute('aria-hidden', 'true');
    document.body.prepend(floor);
    const portalsEl = document.createElement('div');
    portalsEl.className = 'hall-portals';
    document.body.appendChild(portalsEl);
    const setVar = (k, v) => { hall.style.setProperty(k, v); floor.style.setProperty(k, v); };
    root.classList.add('has-hall');
    // Arriving through a portal: the world opens out of its sigil.
    try {
      const came = JSON.parse(sessionStorage.getItem('knght-portal') || 'null');
      sessionStorage.removeItem('knght-portal');
      if (came && location.pathname.includes(`/worlds/${came.slug}/`) && !reduce) {
        const gate = document.createElement('div');
        gate.className = 'hall-gate is-open';
        gate.innerHTML = `<svg viewBox="0 0 24 24">${came.d}</svg><p>${came.name.replace(/</g, '&lt;')}</p>`;
        document.body.appendChild(gate);
        setTimeout(() => { gate.style.transitionDuration = '1.1s'; gate.classList.remove('is-open'); }, 700);
        setTimeout(() => gate.remove(), 2000);
      }
    } catch (e) {}

    /* The field: engravings scattered at random each visit, at three depths, never in a pattern you can learn. */
    const SAYINGS = [
      'We say what we can prove', 'Know your regulator before your font', 'The college reads your ads too',
      'Lore first. Then the sword', 'If we cannot help, we say so', 'AI is the squire, not the knght',
      'The I became the blade', 'Light the KNGHT', 'The price is the price', 'Sell the care, not the cure',
      'Every sign is a signature', 'Systems keep promises when people are busy', 'Earn the second visit',
      'What you leave out matters', 'We only show work we built', 'Check the label before the print run',
    ];
    const WORLDS = [
      ['restoration-medical', 'Restoration Medical', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M7.5 12h9"/><path d="M5.2 17.6c2-1.4 4.3-2.1 6.8-2.1s4.8.7 6.8 2.1"/>'],
      ['black-lotus-coffee', 'Black Lotus Coffee', '<path d="M12 4c2.2 2.6 2.2 6.6 0 9.2-2.2-2.6-2.2-6.6 0-9.2z"/><path d="M12 13.2c-1.6-2.8-4.6-4.2-7.6-3.8.4 3 2.8 5.4 7.6 3.8zM12 13.2c1.6-2.8 4.6-4.2 7.6-3.8-.4 3-2.8 5.4-7.6 3.8z"/><path d="M5 17.5h14M8 20.5h8"/>'],
      ['castleblack-spirits', 'Castleblack Spirits', '<path d="M7 21V8h2V5.5h2V8h2V5.5h2V8h2v13z"/><path d="M10.5 21v-3.5a1.5 1.5 0 0 1 3 0V21M10.5 12h3"/>'],
      ['lisa-dang-immigration-law', 'Lisa Dang Immigration Law', '<path d="M5 21V10a7 7 0 0 1 14 0v11"/><path d="M9 21v-9a3 3 0 0 1 6 0v9"/><path d="M3 21h18"/>'],
      ['lorelyns', 'Lorelyns Gourmet Desserts', '<path d="M6 11h12l-1.6 9H7.6z"/><path d="M6 11a6 4.5 0 0 1 12 0"/><path d="M12 6.5V4M9.5 15.5h5"/>'],
      ['rum-raiders-ring', 'Rum Raiders Ring', '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M8 10h8"/><path d="M4.5 13.5c0 4 3.4 6.5 7.5 6.5s7.5-2.5 7.5-6.5M4.5 13.5 3 15.5M19.5 13.5 21 15.5"/>'],
      ['toronto-beauty', 'Toronto Beauty', '<ellipse cx="12" cy="9.5" rx="5.5" ry="6.5"/><path d="M12 16v5M9 21h6"/><path d="M9.5 7.5c.8-1.2 2-1.8 3.3-1.6"/>'],
      ['wellfit-social-club', 'Wellfit Social Club', '<path d="M8.6 10.2V8.5a3.4 3.4 0 0 1 6.8 0v1.7"/><circle cx="12" cy="15" r="5.6"/><path d="M10 15h4"/>'],
      ['art-colouring', 'Art Colouring', '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.6 0 2-1.2 1.4-2.2-.7-1.2.1-2.6 1.6-2.6H18a2.5 2.5 0 0 0 2.5-2.5A8.5 8.5 0 0 0 12 3.5z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10" r="1"/>'],
    ];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const shuffle = (arr) => { const c = arr.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const rosette = (c, R, r, d, turns, steps) => {
      let path = '';
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2 * turns;
        const px = c + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
        const py = c + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
        path += (i ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1);
      }
      return path;
    };
    const engraving = () => {
      // A banknote rosette, a seal of rings or a patch of hatching: never the same twice.
      const kind = Math.random();
      const size = Math.round(rnd(90, 560));
      const c = size / 2;
      const sw = rnd(0.35, 0.95).toFixed(2);
      if (kind < 0.62) {
        const R = c * rnd(0.6, 0.92), r = R * [0.18, 0.21, 0.24, 0.27, 0.31][Math.floor(Math.random() * 5)], d = r * rnd(0.6, 2.2);
        const turns = Math.round(rnd(9, 47));
        let g = `<path d="${rosette(c, R, r, d, turns, Math.round(Math.min(2400, size * 4)))}"/>`;
        if (Math.random() < 0.6) g += `<path d="${rosette(c, R * 0.55, r * 0.6, d * 0.5, Math.round(turns * 0.7), Math.round(size * 2))}"/>`;
        if (Math.random() < 0.5) for (let k = 0; k < Math.round(rnd(3, 9)); k++) g += `<circle cx="${c}" cy="${c}" r="${(R + 8 + k * rnd(3, 6)).toFixed(1)}"/>`;
        return { size, html: `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><g fill="none" stroke="#fff" stroke-width="${sw}">${g}</g></svg>` };
      }
      if (kind < 0.8) {
        let g = '';
        const n = Math.round(rnd(6, 22));
        for (let k = 1; k <= n; k++) g += `<circle cx="${c}" cy="${c}" r="${((c - 2) * k / n).toFixed(1)}"/>`;
        return { size, html: `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><g fill="none" stroke="#fff" stroke-width="${sw}">${g}</g></svg>` };
      }
      const gap = rnd(5, 11), ang = Math.random() < 0.5 ? 1 : -1;
      let h = '';
      for (let x0 = -size; x0 < size * 2; x0 += gap) h += `M${x0.toFixed(1)} 0L${(x0 + ang * size).toFixed(1)} ${size}`;
      const id = 'h' + Math.random().toString(36).slice(2, 8);
      return { size, html: `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><defs><radialGradient id="${id}g"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${id}"><rect width="${size}" height="${size}" fill="url(#${id}g)"/></mask></defs><path d="${h}" stroke="#fff" stroke-width="${(sw * 0.7).toFixed(2)}" mask="url(#${id})"/></svg>` };
    };

    const layers = $$('.hall-field__d', hall).map((el) => ({ el, f: +el.dataset.f }));
    const field = $('.hall-field', hall);
    const here = location.pathname.split('/').filter(Boolean);
    const thisWorld = here[0] === 'worlds' ? here[1] : null;
    let portals = [], sayings = [], startY = 1e9;
    // Where the field may begin, measured live: the top of the worlds on the homepage, else the end of the hero.
    const startEl = $('#worlds') || $('main > :first-child');
    const startTop = () => { const r = startEl.getBoundingClientRect(); return $('#worlds') ? r.top : r.bottom; };
    const measure = document.createElement('canvas').getContext('2d');
    // The page's own height: the body's in-flow content (main and the footer). Never scrollHeight, which counts the
    // portal layer itself: measured while the page was briefly taller, it would hold the page open below the footer.
    // Unrounded, so the layer ends exactly where the footer does (rounding up would leave a 1 px strip).
    const pageH = () => Math.max(document.body.getBoundingClientRect().height, innerHeight);
    const build = () => {
      const docH = pageH();
      const vw = document.documentElement.clientWidth, vh = innerHeight, sx = scrollX, sy = scrollY;
      // Where words must not go: anything a visitor reads, clicks or looks at, and the white rooms.
      const avoid = [];
      $$('h1,h2,h3,h4,h5,p,a,button,li,img,video,figure,input,select,textarea,label,dt,dd,blockquote,.btn,.cat,.ck__marked,.rp__ink,.footer__word,.chap__num,.dial,.rung').forEach((el) => {
        if (el.closest('.hall,.hall-portals,.nav,.mnav,.codex')) return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        avoid.push([r.left + sx, r.top + sy, r.right + sx, r.bottom + sy]);
      });
      // Anything that sticks while you scroll covers its whole track, so keep that track clear.
      $$('main *, footer *').forEach((el) => {
        if (getComputedStyle(el).position !== 'sticky') return;
        const r = el.getBoundingClientRect(), pr = (el.parentElement || el).getBoundingClientRect();
        avoid.push([r.left + sx, pr.top + sy, r.right + sx, pr.bottom + sy]);
      });
      // The white rooms, and the pinned rooms whose contents move while you scroll (the hero, the worlds gallery).
      $$('.engage,.score,.worlds,.hero,.lx,.lring,.kp__wall,.hb,.lk,.arm,.wm,.ct,.ln,.pl__plain').forEach((el) => { const r = el.getBoundingClientRect(); avoid.push([-1e5, r.top + sy - 60, 1e5, r.bottom + sy + 60]); });
      const hits = (b, px, py, list) => list.some((a) => b[0] - px < a[2] && b[2] + px > a[0] && b[1] - py < a[3] && b[3] + py > a[1]);
      // The field never touches a hero. On the homepage it begins with the worlds.
      if (startEl) startY = startTop() + sy;
      avoid.push([-1e5, -1e5, 1e5, startY + 40]);
      const placed = [];
      // padY covers how far an item drifts against the page as it scrolls past.
      const find = (w, h, padX, padY, minY, tries = 260) => {
        for (let i = 0; i < tries; i++) {
          const x0 = rnd(84, Math.max(85, vw - w - 130)), y0 = rnd(minY, Math.max(minY + 1, docH - h - 60));
          const box = [x0, y0, x0 + w, y0 + h];
          if (!hits(box, padX, padY, avoid) && !hits(box, padX * 2, padY * 1.6, placed)) { placed.push(box); return box; }
        }
        return null;
      };
      layers.forEach((l) => { l.el.innerHTML = ''; l.el.style.height = (docH * l.f + vh) + 'px'; });

      // Engravings: spread through every depth, smaller and fainter the deeper they sit.
      const count = Math.round(docH / 420);
      for (let i = 0; i < count; i++) {
        const l = layers[Math.floor(Math.random() * layers.length)];
        const e = engraving();
        const s = e.size * (0.55 + l.f * 0.5);
        const div = document.createElement('div');
        div.className = 'hall-engr';
        div.innerHTML = e.html;
        const top0 = (startY - vh * 0.5) * l.f + vh * 0.5;
        div.style.cssText = `left:${rnd(-s * 0.3, vw - s * 0.7).toFixed(0)}px;top:${rnd(top0, docH * l.f + vh - s).toFixed(0)}px;width:${s.toFixed(0)}px;height:${s.toFixed(0)}px;opacity:${(rnd(0.35, 1) * (0.45 + l.f * 0.55)).toFixed(2)};transform:rotate(${rnd(0, 360).toFixed(0)}deg)${l.f < 0.6 ? ';filter:blur(.6px)' : ''}`;
        l.el.appendChild(div);
      }

      // Sayings: each used once, scattered, at different sizes, never across the text.
      const front = layers[layers.length - 1].el;
      const n = Math.max(3, Math.min(SAYINGS.length, Math.round(docH / (vh * 1.05))));
      sayings = [];
      shuffle(SAYINGS).slice(0, n).forEach((line) => {
        const size = Math.round(rnd(10, 24));
        const txt = line.toUpperCase();
        measure.font = `500 ${size}px Georgia, serif`;
        const w = measure.measureText(txt).width + txt.length * size * 0.34 + 4, h = size * 1.9;
        const f = rnd(0.86, 0.95);
        const box = find(w, h, 22, (1 - f) * vh * 0.4 + 10, startY);
        if (!box) return;
        const el = document.createElement('p');
        el.className = 'hall-say';
        el.textContent = txt;
        el.style.cssText = `left:${box[0].toFixed(0)}px;top:${box[1].toFixed(0)}px;font-size:${size}px;opacity:${rnd(0.16, 0.38).toFixed(2)}`;
        front.appendChild(el);
        // Each saying drifts at its own speed; it lines up with its clear spot as it crosses the middle of the screen.
        sayings.push({ el, y: (box[1] + box[3]) / 2, f });
      });

      // Portals: a few world sigils hidden in the dark. Find one and it takes you there.
      portalsEl.innerHTML = '';
      portalsEl.style.height = docH + 'px';
      const pick = shuffle(WORLDS.filter((w) => w[0] !== thisWorld)).slice(0, $('.hero') ? 3 : 2);
      portals = [];
      pick.forEach(([slug, name, d]) => {
        const f = rnd(0.9, 0.95);
        const box = find(56, 56, 22, (1 - f) * vh * 0.4 + 12, startY + vh * 0.2, 700);
        if (!box) return;
        const a = document.createElement('a');
        a.className = 'hall-portal';
        a.href = `/worlds/${slug}/`;
        a.tabIndex = -1;
        a.setAttribute('aria-hidden', 'true');
        a.innerHTML = `<span class="hall-portal__ring"></span><svg viewBox="0 0 24 24">${d}</svg><span class="hall-portal__label">${esc(name)}</span>`;
        a.style.left = box[0].toFixed(0) + 'px'; a.style.top = box[1].toFixed(0) + 'px';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          if (reduce) { location.href = a.href; return; }
          const r = a.getBoundingClientRect();
          const gate = document.createElement('div');
          gate.className = 'hall-gate';
          gate.style.setProperty('--gx', (r.left + r.width / 2) + 'px');
          gate.style.setProperty('--gy', (r.top + r.height / 2) + 'px');
          gate.innerHTML = `<svg viewBox="0 0 24 24">${d}</svg><p>${esc(name)}</p>`;
          document.body.appendChild(gate);
          requestAnimationFrame(() => gate.classList.add('is-open'));
          try { sessionStorage.setItem('knght-portal', JSON.stringify({ slug, name, d })); } catch (err) {}
          setTimeout(() => { location.href = a.href; }, 1150);
        });
        portalsEl.appendChild(a);
        portals.push({ a, x: box[0] + 28, y: box[1] + 28, f, found: false });
      });
    };
    // Live guard: the page shifts after it loads, so a saying or portal that ends up over content steps back.
    const CONTENT = 'h1,h2,h3,h4,h5,p,a,button,li,img,video,figure,input,select,textarea,label,dt,dd,blockquote,.btn,.dial,.rung,.chap__num';
    const blocked = (el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return null;
      for (let i = 0; i <= 4; i++) {
        const px = r.left + (r.width * i) / 4, py = r.top + r.height / 2;
        if (px < 0 || px > innerWidth) continue;
        for (const hit of document.elementsFromPoint(px, py)) {
          if (hit === el || el.contains(hit) || hit.closest('.hall,.hall-floor,.hall-portals')) continue;
          if (hit.closest(CONTENT)) return true;
        }
      }
      return false;
    };
    setInterval(() => {
      if (document.hidden) return;
      sayings.forEach((s2) => { const b = blocked(s2.el); if (b !== null) s2.el.classList.toggle('is-blocked', b); });
      portals.forEach((p) => { const b = blocked(p.a); if (b !== null) { p.blocked = b; p.a.classList.toggle('is-blocked', b); } });
    }, 220);

    let lastH = 0, buildT = 0;
    const rebuild = () => { clearTimeout(buildT); buildT = setTimeout(() => { lastH = pageH(); build(); }, 400); };
    if (document.readyState === 'complete') rebuild(); else addEventListener('load', rebuild, { once: true });
    setTimeout(rebuild, 60);
    let lastW = innerWidth;
    addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; rebuild(); } });
    // The portal layer follows the page at once, shorter as well as taller (it clips what falls outside, site.css),
    // so it can never keep the page open past the footer. A big change also places the hall again.
    if ('ResizeObserver' in window) new ResizeObserver(() => {
      const h = pageH();
      if (portalsEl.style.height) portalsEl.style.height = h + 'px';
      if (Math.abs(h - lastH) > 300) rebuild();
    }).observe(document.body);

    // Light sections (the offer, the self-check) hide the engraving.
    const rooms = $$('main > section, .chap, .footer');
    if ('IntersectionObserver' in window && rooms.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const next = /\b(engage|score)\b/.test(e.target.className) ? 'light' : 'dark';
          hall.dataset.tone = next;
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      rooms.forEach((r) => io.observe(r));
    }

    let tx = innerWidth * 0.5, ty = innerHeight * 0.32, x = tx, y = ty, lastX = x, lastY = y;
    if (reduce) {
      setVar('--lx', '50%'); setVar('--ly', '30%');
      return;
    }
    if (fine) addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });

    // Steel catches the light: marks, numerals, sigils and chips glint as the light passes.
    const STEEL = '.mark, .chap__num, .footer__word .sheen, .layer__sigil, .rung__sigil, .cat, .wfilter__chip, .nring__sig';
    const steel = new Set();
    if ('IntersectionObserver' in window) {
      const sio = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? steel.add(e.target) : steel.delete(e.target))));
      $$(STEEL).forEach((el) => { el.classList.add('steel'); sio.observe(el); });
    }
    const start = performance.now();
    const frame = (now) => {
      requestAnimationFrame(frame); // keep the light alive even if one step below fails
      const t = (now - start) / 1000;
      if (!fine) {
        // No cursor: the light drifts with the reading position.
        tx = innerWidth * (0.5 + Math.sin(t * 0.23) * 0.18);
        ty = innerHeight * (0.34 + Math.sin(t * 0.17 + 1.3) * 0.08);
      }
      x += (tx - x) * 0.09; y += (ty - y) * 0.09;
      // A candle never holds still.
      const flick = 1 + Math.sin(t * 7.3) * 0.012 + Math.sin(t * 13.1 + 2) * 0.008 + Math.sin(t * 2.1) * 0.02;
      setVar('--lx', x.toFixed(1) + 'px');
      setVar('--ly', y.toFixed(1) + 'px');
      setVar('--lr', flick.toFixed(4));
      layers.forEach((l) => { l.el.style.transform = `translate3d(0,${(-scrollY * l.f).toFixed(1)}px,0)`; });
      const vh2 = innerHeight / 2;
      // A hard edge: nothing from the field is drawn above the end of the hero (the worlds, on the homepage).
      // Measured every frame, so a page that settles taller after loading (fonts, pins) can never pull it up over the film.
      const edge = Math.max(0, Math.min(innerHeight, startEl ? startTop() : startY - scrollY));
      if (field) field.style.clipPath = `inset(${edge.toFixed(0)}px 0 0 0)`;
      sayings.forEach((s2) => {
        const off = (scrollY + vh2 - s2.y) * (1 - s2.f);
        if (Math.abs(s2.y - scrollY - vh2) < innerHeight * 1.2) s2.el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
      });
      portals.forEach((p) => {
        const off = (scrollY + vh2 - p.y) * (1 - p.f);
        p.a.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
        const d = Math.hypot(p.x - scrollX - x, p.y + off - scrollY - y);
        const v = Math.max(0, Math.min(1, 1 - (d - 40) / 170)) * (p.y + off - scrollY > edge ? 1 : 0);
        p.a.style.opacity = (v * 0.8).toFixed(3);
        p.a.style.pointerEvents = v > 0.3 && !p.blocked ? 'auto' : 'none';
        p.a.classList.toggle('is-near', v > 0.75);
        if (v > 0.75 && !p.found) { p.found = true; p.a.classList.add('is-found'); }
      });
      steel.forEach((el) => {
        const r = el.getBoundingClientRect();
        const gx = ((x - r.left) / Math.max(r.width, 1)) * 100;
        const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
        const ga = Math.max(0, 1 - d / 520);
        el.style.setProperty('--gx', Math.max(-60, Math.min(160, gx)).toFixed(1) + '%');
        el.style.setProperty('--ga', ga.toFixed(3));
      });
    };
    requestAnimationFrame(frame);
  })();

  /* ---------- Colour belongs to the clients: KNGHT stays black and white, each world blooms ---------- */
  (() => {
    const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    // Homepage and category cards: colour on hover, or as a card reaches the centre on touch screens.
    const cards = $$('.world, .fcard, .wnext__link');
    if (!hover && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-bloom', e.isIntersecting)), { rootMargin: '-35% 0px -35% 0px' });
      cards.forEach((c) => io.observe(c));
    }
    // A world page: the plate blooms as you arrive.
    const plate = $('.whero__plate');
    if (plate) {
      if (reduce) plate.classList.add('is-bloom');
      else setTimeout(() => plate.classList.add('is-bloom'), 700);
    }
    // The work: colour sweeps across each row as it comes into view.
    $$('.wwork__item').forEach((fig) => {
      const img = $('img', fig);
      if (!img) return;
      const c = img.cloneNode();
      c.removeAttribute('alt'); c.alt = ''; c.setAttribute('aria-hidden', 'true');
      c.className = 'wwork__color';
      fig.appendChild(c);
    });
    if (reduce || !('IntersectionObserver' in window)) { $$('.wwork__item').forEach((f) => f.classList.add('is-bloom')); return; }
    const rio = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      $$('.wwork__item', e.target).forEach((f, i) => setTimeout(() => f.classList.add('is-bloom'), 650 + i * 200));
      rio.unobserve(e.target);
    }), { rootMargin: '0px 0px -25% 0px' });
    $$('.wwork__row').forEach((r) => rio.observe(r));
  })();

  /* ---------- Desktop nav: a line of light under the link, and two panels ---------- */
  (() => {
    const nav = $('.nav'), ul = nav && $('nav ul', nav);
    if (!ul) return;
    const links = $$('a', ul);
    const line = document.createElement('span');
    line.className = 'nav__line'; line.setAttribute('aria-hidden', 'true');
    ul.appendChild(line);
    let hovering = null;
    const current = () => links.find((a) => { const v = a.getAttribute('aria-current'); return v && v !== 'false'; });
    const moveTo = (a) => {
      if (!a) { line.style.opacity = '0'; return; }
      line.style.setProperty('--lx', a.offsetLeft + 'px');
      line.style.setProperty('--lw', a.offsetWidth + 'px');
      line.style.opacity = '1';
    };
    links.forEach((a) => {
      a.addEventListener('pointerenter', () => { hovering = a; moveTo(a); });
      a.addEventListener('focus', () => { hovering = a; moveTo(a); });
      a.addEventListener('blur', () => { hovering = null; moveTo(current()); });
    });
    ul.addEventListener('pointerleave', () => { hovering = null; moveTo(current()); });
    new MutationObserver(() => { if (!hovering) moveTo(current()); }).observe(ul, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
    moveTo(current());

    const desk = matchMedia('(min-width: 901px) and (hover: hover)');
    const panels = { worlds: $('#np-worlds', nav), layers: $('#np-layers', nav) };
    let open = null, timer = 0, openY = 0;
    const hide = (k) => {
      const el = panels[k]; if (!el) return;
      el.classList.remove('is-open'); el.inert = true;
      if (open === k) open = null;
    };
    const show = (k) => {
      clearTimeout(timer);
      if (!desk.matches || !panels[k]) return;
      if (open && open !== k) hide(open);
      open = k; openY = scrollY;
      panels[k].classList.add('is-open'); panels[k].inert = false;
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(() => { if (open) hide(open); }, 240); };
    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const k = /#worlds$/.test(href) ? 'worlds' : /#layers$/.test(href) ? 'layers' : null;
      if (k && panels[k]) {
        a.setAttribute('aria-controls', panels[k].id);
        a.addEventListener('pointerenter', () => show(k));
        a.addEventListener('focus', () => show(k));
        a.addEventListener('click', () => hide(k));
      } else {
        a.addEventListener('pointerenter', () => { if (open) hide(open); });
        a.addEventListener('focus', () => { if (open) hide(open); });
      }
    });
    Object.values(panels).forEach((p) => {
      if (!p) return;
      p.addEventListener('focusout', (e) => { if (!p.contains(e.relatedTarget) && !links.includes(e.relatedTarget)) later(); });
      $$('a', p).forEach((a) => a.addEventListener('click', () => hide(p.dataset.npanel)));
    });
    // A panel stays open while the pointer is anywhere in the header; leaving it closes the panel.
    nav.addEventListener('pointerenter', () => clearTimeout(timer));
    nav.addEventListener('pointerleave', later);
    // The brand mark and the buttons on the right close it too.
    $$('.mark, .nav__end a, .nav__end button', nav).forEach((el) => el.addEventListener('pointerenter', () => { if (open) hide(open); }));
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !open) return;
      const id = panels[open].id; hide(open);
      const a = links.find((x) => x.getAttribute('aria-controls') === id); if (a) a.focus();
    });
    addEventListener('scroll', () => { if (open && Math.abs(scrollY - openY) > 60) hide(open); }, { passive: true });

    // The ring: hover a sigil and its layer speaks
    const lp = panels.layers;
    if (lp) {
      const n = $('[data-nl-n]', lp), nm = $('[data-nl-name]', lp), ln = $('[data-nl-line]', lp), lk = $('[data-nl-link]', lp);
      const sigs = $$('.nring__sig', lp);
      const say = (s) => {
        sigs.forEach((x) => x.classList.toggle('is-on', x === s));
        n.textContent = `Layer ${s.dataset.n} of 7`; nm.textContent = s.dataset.name; ln.textContent = s.dataset.line;
        lk.href = s.getAttribute('href'); lk.textContent = `Open the ${s.dataset.name} layer`;
      };
      sigs.forEach((s) => { s.addEventListener('pointerenter', () => say(s)); s.addEventListener('focus', () => say(s)); });
    }
  })();

  /* ---------- Year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
