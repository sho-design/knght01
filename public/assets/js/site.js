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

  /* ---------- Sound: synthesised in the browser, off until the visitor asks ---------- */
  const Sound = (() => {
    let ctx = null, master = null, droneNodes = [], on = false;
    const noiseBuffer = (c, seconds) => {
      const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    };
    const startDrone = () => {
      const t = ctx.currentTime;
      const bus = ctx.createGain(); bus.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.6;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 160;
      lfo.connect(lfoGain).connect(lp.frequency);
      [[55, 0], [82.41, 4], [110, -6]].forEach(([f, det], i) => {
        const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine';
        o.frequency.value = f; o.detune.value = det;
        const g = ctx.createGain(); g.gain.value = i === 2 ? 0.18 : 0.5;
        o.connect(g).connect(lp); o.start(); droneNodes.push(o);
      });
      const air = ctx.createBufferSource(); air.buffer = noiseBuffer(ctx, 4); air.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
      const ag = ctx.createGain(); ag.gain.value = 0.05;
      air.connect(bp).connect(ag).connect(bus); air.start();
      lp.connect(bus); bus.connect(master); lfo.start();
      bus.gain.linearRampToValueAtTime(0.09, t + 3);
      droneNodes.push(air, lfo);
    };
    const shing = (level = 1) => {
      if (!on || !ctx) return;
      const t = ctx.currentTime + 0.02;
      const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx, 0.6);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(2400, t); bp.frequency.exponentialRampToValueAtTime(9000, t + 0.38);
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.16 * level, t + 0.08); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      n.connect(bp).connect(ng).connect(master); n.start(t); n.stop(t + 0.6);
      [1870, 2960, 4410, 6230, 8150].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(f, t + 0.12); o.frequency.linearRampToValueAtTime(f * 1.004, t + 2.4);
        const g = ctx.createGain(); const peak = [0.07, 0.05, 0.035, 0.022, 0.014][i] * level;
        const tail = 2.6 / (1 + i * 0.45);
        g.gain.setValueAtTime(0, t + 0.12); g.gain.linearRampToValueAtTime(peak, t + 0.14);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14 + tail);
        o.connect(g).connect(master); o.start(t + 0.12); o.stop(t + 0.2 + tail);
      });
    };
    const tick = () => {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1320, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.08);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.14);
    };
    const enable = async () => {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
        startDrone();
      }
      try { await ctx.resume(); } catch (e) { return false; }
      on = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.4);
      shing();
      return true;
    };
    const disable = () => {
      on = false;
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setTimeout(() => { if (!on) ctx.suspend().catch(() => {}); }, 450);
    };
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else if (on) ctx.resume().catch(() => {});
    });
    return { enable, disable, shing, tick, get on() { return on; } };
  })();

  const soundBtn = $('[data-sound]');
  if (soundBtn) {
    soundBtn.addEventListener('click', async () => {
      const next = !Sound.on;
      const ok = next ? await Sound.enable() : (Sound.disable(), true);
      if (!ok) return;
      soundBtn.setAttribute('aria-pressed', String(next));
      soundBtn.setAttribute('aria-label', next ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on');
    });
  }

  /* ---------- Loader ---------- */
  let seen = false;
  try { seen = sessionStorage.getItem('knght-intro') === '1'; } catch (e) {}
  const finishIntro = () => {
    root.classList.add('is-loaded');
    if (lenis) lenis.start();
    try { sessionStorage.setItem('knght-intro', '1'); } catch (e) {}
  };
  if (reduce || seen || !$('.loader')) {
    root.classList.add('no-loader');
    requestAnimationFrame(finishIntro);
  } else {
    const count = $('.loader__count');
    const start = performance.now();
    const dur = 800;
    const tick = (t) => {
      const p = clamp((t - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (count) count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finishIntro, 180);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Smooth scroll ---------- */
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, anchors: true, autoRaf: true });
    if (!root.classList.contains('is-loaded') && !root.classList.contains('no-loader')) lenis.stop();
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
  const CLARITY_ID = 'yrly3zmoyn';
  if (/^[a-z0-9]{8,12}$/.test(CLARITY_ID)) {
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
          verdictVideo.play().then(() => setTimeout(() => Sound.shing(0.8), 900)).catch(() => {});
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
      Sound.shing(0.6);
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
      Sound.tick();
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

    /* Sigils: hairline heraldry drawn on a 24 grid, same stroke as the mark. */
    const SIGILS = {
      orb: '<circle cx="12" cy="14" r="7"/><ellipse cx="12" cy="14" rx="3" ry="7"/><path d="M5 14h14M12 7V2M9.6 4h4.8"/>',
      shield: '<path d="M4.5 4h15v7.5c0 5-3.6 8.2-7.5 10-3.9-1.8-7.5-5-7.5-10z"/><path d="M4.5 8.5h15M4.7 13h14.6M6.4 17.3h11.2"/>',
      banner: '<path d="M5 2.5v19M5 3.5h14v13l-3.5-2.6L12 16.5V3.5"/>',
      compass: '<circle cx="12" cy="12" r="9"/><path d="M12 5.5l2 6.5-2 6.5-2-6.5z"/><path d="M12 1.5v2M12 20.5v2M1.5 12h2M20.5 12h2"/>',
      seal: '<path d="M5 3h11.5a2.5 2.5 0 0 1 2.5 2.5V8M5 3a2 2 0 0 0-2 2v1h2M5 3v15"/><path d="M8 7.5h7M8 10.5h5"/><circle cx="15" cy="17" r="4.2"/><path d="M15 15.2l.6 1.2 1.3.2-.95.9.22 1.3-1.17-.62-1.17.62.22-1.3-.95-.9 1.3-.2z"/>',
      crest: '<path d="M5 4.5h14V11c0 4.6-3.3 7.6-7 9.4-3.7-1.8-7-4.8-7-9.4z"/><path d="M12 7.5v8M8.5 10.5h7"/>',
      scales: '<path d="M12 3v18M7.5 21h9M4 6.5h16"/><path d="M6.5 6.5L3.5 13h6zM17.5 6.5l-3 6.5h6z"/><path d="M3.5 13a3 2 0 0 0 6 0M14.5 13a3 2 0 0 0 6 0"/>'
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
      { label: 'Score your world', sigil: 'scales', href: '#score' },
      { label: 'Your sigil', sigil: 'crest', href: 'sigil/' }
    ];
    const link = ([label, p], cls, n) => `<li><a class="${cls}" href="${to(p)}"${here(p) ? ' aria-current="page"' : ''}>${n ? `<span class="mnav__num">${n}</span>` : ''}${label}</a></li>`;
    const group = (m, i) => {
      const head = `${sigil(m.sigil)}<span class="mnav__label">${m.label}</span>`;
      if (!m.items) return `<li class="mnav__item" style="--i:${i}"><a class="mnav__top" href="${to(m.href)}"${here(m.href) ? ' aria-current="page"' : ''}>${head}</a></li>`;
      const open = m.items.concat(m.all ? [m.all] : []).some(([, p]) => here(p));
      const subs = (m.all ? [link(m.all, 'mnav__all')] : []).concat(m.items.map((it, k) => link(it, '', m.sigil === 'seal' || m.sigil === 'banner' ? '' : ROMAN[k])));
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
      + '<path class="tg__knight" pathLength="1" d="M2.53 19.5Q1.35 19 0.77 17.5Q1.52 17.6 2.03 16.9Q0.85 16.1 0.6 14.3Q1.35 14.6 1.94 14Q0.85 12.9 0.85 11Q1.61 11.5 2.19 11.1Q1.52 9.7 1.77 8Q2.45 8.7 3.03 8.5Q2.78 6.9 3.45 5.5Q3.87 6.3 4.63 6.3L5.72 2.5L6.98 4.7C9.25 5.2 11.35 7.5 12.27 10.7C12.61 11.9 12.27 13.3 11.18 13.3L9.75 12.8C8.91 12.5 8.24 13 8.24 14C8.41 16 10.09 17.5 10.85 19.5ZM1.35 19.5H11.94"/>'
      + '<circle class="tg__eye" cx="8.91" cy="8.5" r=".6"/></svg>';
    ($('.nav__end', navBar) || $('.wrap', navBar)).appendChild(toggle);

    const cta = $('.btn', navBar);
    const panel = document.createElement('div');
    panel.id = 'mnav';
    panel.className = 'mnav';
    panel.hidden = true;
    panel.innerHTML = `<nav aria-label="Menu"><ol class="mnav__list">${MENU.map(group).join('')}</ol></nav>`
      + `<div class="mnav__foot"><a class="btn" href="${to('book/')}">${cta && /verdict/i.test(cta.textContent) ? cta.textContent.trim() : 'Book a Verdict'}</a><a class="link" href="mailto:sho@knght.com">sho@knght.com</a></div>`;
    document.body.appendChild(panel);

    $$('button.mnav__top', panel).forEach((btn) => btn.addEventListener('click', () => {
      const item = btn.parentElement, open = !item.classList.contains('is-open');
      $$('.mnav__item.is-open', panel).forEach((o) => { if (o !== item) { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false'); } });
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
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
    'AI is the squire, not the knight.',
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
      <svg class="codex__knight" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 19.4Q5.6 18.9 4.9 17.4Q5.8 17.5 6.4 16.8Q5 16 4.7 14.2Q5.6 14.5 6.3 13.9Q5 12.8 5 10.9Q5.9 11.4 6.6 11Q5.8 9.6 6.1 7.9Q6.9 8.6 7.6 8.4Q7.3 6.8 8.1 5.4Q8.6 6.2 9.5 6.2L10.8 2.4L12.3 4.6C15 5.1 17.5 7.4 18.6 10.6C19 11.8 18.6 13.2 17.3 13.2L15.6 12.7C14.6 12.4 13.8 12.9 13.8 13.9C14 15.9 16 17.4 16.9 19.4ZM5.6 19.4H18.2M4.6 21.5H19.2"/><circle cx="14.6" cy="8.4" r=".6"/></svg>
      <p class="eyebrow">You found the knight's move</p>
      <h2 class="display codex__h" id="codex-title">The <em>Codex</em></h2>
      <p class="codex__lede">Seven rules we keep. Few people see this page.</p>
      <ol class="codex__list">${CODEX.map((r, i) => `<li style="--i:${i}"><span>${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i]}</span>${r}</li>`).join('')}</ol>
      <div class="codex__actions"><a class="btn" href="${up}book/">Book a Verdict</a><button type="button" class="link" data-codex-close>Close the codex</button></div>
    </div>`;
    document.body.appendChild(codexEl);
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => codexEl.classList.add('is-on'));
    Sound.shing && Sound.shing(0.6);
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
    let hold = 0, held = false;
    const start = () => { held = false; clearTimeout(hold); hold = setTimeout(() => { held = true; markEl.classList.remove('is-holding'); openCodex(); }, 900); markEl.classList.add('is-holding'); };
    const stop = () => { clearTimeout(hold); markEl.classList.remove('is-holding'); };
    markEl.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => markEl.addEventListener(ev, stop));
    markEl.addEventListener('click', (e) => { if (held) { e.preventDefault(); held = false; } });
    markEl.addEventListener('contextmenu', (e) => e.preventDefault());
  }

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

  window.KNGHT = { Sound, get lenis() { return lenis; }, resize: () => { sizeWorlds(); onScroll(); } };

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
